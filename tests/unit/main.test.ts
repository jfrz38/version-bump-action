import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const coreMock = vi.hoisted(() => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
}));

const execMock = vi.hoisted(() => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

const githubMock = vi.hoisted(() => ({
  context: {
    repo: { owner: 'jfrz38', repo: 'demo' },
    payload: {
      repository: {
        default_branch: 'main',
      },
    },
  },
  getOctokit: vi.fn(),
}));

vi.mock('@actions/core', () => coreMock);
vi.mock('@actions/exec', () => execMock);
vi.mock('@actions/github', () => githubMock);

describe('main action', () => {
  let tempDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;
  let octokit: {
    rest: {
      git: { getRef: ReturnType<typeof vi.fn> };
      pulls: { create: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
      repos: { getReleaseByTag: ReturnType<typeof vi.fn> };
    };
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-bump-action-main-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'version = "1.2.3"\n');

    vi.resetModules();
    vi.clearAllMocks();

    octokit = {
      rest: {
        git: { getRef: vi.fn().mockRejectedValue({ status: 404 }) },
        pulls: {
          create: vi.fn().mockResolvedValue({ data: { html_url: 'https://github.com/jfrz38/demo/pull/1' } }),
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
        repos: { getReleaseByTag: vi.fn().mockRejectedValue({ status: 404 }) },
      },
    };
    githubMock.getOctokit.mockReturnValue(octokit);
    execMock.exec.mockResolvedValue(0);
    execMock.getExecOutput.mockImplementation((_command: string, args: string[]) => {
      if (args[0] === 'status') {
        return Promise.resolve({ stdout: ' M build.gradle.kts\n', stderr: '', exitCode: 0 });
      }

      return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
    });

    coreMock.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        bump: 'patch',
        strategy: 'gradle-kts',
        'version-file': 'build.gradle.kts',
        'version-pattern': '',
        'version-replacement': '',
        'base-branch': 'develop',
        'branch-prefix': 'chore/bump-version-',
        'tag-prefix': 'v',
        draft: 'true',
        'github-token': 'token',
        'commit-message': 'Bump version to {version}',
        'pr-title': 'Bump version to {version}',
        'pr-body': 'Bumps version from {current-version} to {next-version} using a {bump} release bump.',
        'fail-if-tag-exists': 'true',
        'fail-if-release-exists': 'true',
      };
      return inputs[name] ?? '';
    });
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('bumps the version, pushes a branch, and creates a draft pull request', async () => {
    const { run } = await import('../../src/main');

    const result = await run();

    expect(result).toMatchObject({
      currentVersion: '1.2.3',
      nextVersion: '1.2.4',
      tag: 'v1.2.4',
      branch: 'chore/bump-version-1.2.4',
      prUrl: 'https://github.com/jfrz38/demo/pull/1',
      changedFiles: 'build.gradle.kts',
    });
    expect(fs.readFileSync(path.join(tempDir, 'build.gradle.kts'), 'utf8')).toBe('version = "1.2.4"\n');
    expect(execMock.exec).toHaveBeenCalledWith('git', ['fetch', 'origin', 'develop', '--depth=1']);
    expect(execMock.exec).toHaveBeenCalledWith('git', ['checkout', '-B', 'chore/bump-version-1.2.4', 'origin/develop']);
    expect(execMock.exec).toHaveBeenCalledWith('git', ['commit', '-m', 'Bump version to 1.2.4']);
    expect(execMock.exec).toHaveBeenCalledWith('git', ['push', '--set-upstream', 'origin', 'chore/bump-version-1.2.4']);
    expect(octokit.rest.pulls.create).toHaveBeenCalledWith(
      expect.objectContaining({
        base: 'develop',
        draft: true,
        head: 'chore/bump-version-1.2.4',
        title: 'Bump version to 1.2.4',
      }),
    );
    expect(coreMock.setOutput).toHaveBeenCalledWith('next-version', '1.2.4');
  });

  it('fails before changing files when the remote bump branch already exists without an open pull request', async () => {
    execMock.getExecOutput.mockImplementation((_command: string, args: string[]) => {
      if (args[0] === 'status') {
        return Promise.resolve({ stdout: ' M build.gradle.kts\n', stderr: '', exitCode: 0 });
      }
      if (args[0] === 'ls-remote') {
        return Promise.resolve({
          stdout: 'abc1234567890abcdef\trefs/heads/chore/bump-version-1.2.4\n',
          stderr: '',
          exitCode: 0,
        });
      }

      return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
    });

    const { run } = await import('../../src/main');

    await expect(run()).rejects.toThrow(
      'Branch chore/bump-version-1.2.4 already exists on origin, but no open pull request was found for it.',
    );
    expect(fs.readFileSync(path.join(tempDir, 'build.gradle.kts'), 'utf8')).toBe('version = "1.2.3"\n');
    expect(execMock.exec).not.toHaveBeenCalledWith('git', ['checkout', '-B', 'chore/bump-version-1.2.4', 'origin/develop']);
    expect(execMock.exec).not.toHaveBeenCalledWith('git', ['commit', '-m', expect.any(String)]);
    expect(execMock.exec).not.toHaveBeenCalledWith('git', expect.arrayContaining(['push']));
  });

  it('returns an existing open pull request without creating a duplicate', async () => {
    octokit.rest.pulls.list.mockResolvedValue({ data: [{ html_url: 'https://github.com/jfrz38/demo/pull/99' }] });
    const { run } = await import('../../src/main');

    const result = await run();

    expect(result.prUrl).toBe('https://github.com/jfrz38/demo/pull/99');
    expect(result.changedFiles).toBe('');
    expect(octokit.rest.pulls.create).not.toHaveBeenCalled();
    expect(execMock.exec).not.toHaveBeenCalledWith('git', ['commit', '-m', expect.any(String)]);
  });

  it('fails when the tag already exists and the safeguard is enabled', async () => {
    octokit.rest.git.getRef.mockResolvedValue({ data: { ref: 'refs/tags/v1.2.4' } });
    const { run } = await import('../../src/main');

    await expect(run()).rejects.toThrow('Tag v1.2.4 already exists');
  });

  it('fails when the release already exists and the safeguard is enabled', async () => {
    octokit.rest.repos.getReleaseByTag.mockResolvedValue({ data: { tag_name: 'v1.2.4' } });
    const { run } = await import('../../src/main');

    await expect(run()).rejects.toThrow('GitHub Release v1.2.4 already exists');
  });
});
