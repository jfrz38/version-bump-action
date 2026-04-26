import { describe, expect, it } from 'vitest';
import { ActionConfig } from '../../src/domain/action-config';
import { Branch } from '../../src/domain/branch';
import { BooleanInput } from '../../src/domain/boolean-input';
import { Bump } from '../../src/domain/bump';
import { SimpleVersion } from '../../src/domain/simple-version';
import { StrategyName } from '../../src/domain/strategy-name';
import type { ActionInputs } from '../../src/inputs';

describe('domain value objects', () => {
  it('parses boolean inputs with defaults', () => {
    expect(BooleanInput.fromInput('draft', '', true).value).toBe(true);
    expect(BooleanInput.fromInput('draft', 'false', true).value).toBe(false);
    expect(() => BooleanInput.fromInput('draft', 'maybe', true)).toThrow('must be either "true" or "false"');
  });

  it('validates bump values', () => {
    expect(Bump.fromInput('MINOR').value).toBe('minor');
    expect(() => Bump.fromInput('release')).toThrow('Invalid bump');
  });

  it('validates strategy names', () => {
    expect(StrategyName.fromInput('npm').value).toBe('npm');
    expect(StrategyName.fromInput('regex').isRegex()).toBe(true);
    expect(() => StrategyName.fromInput('maven')).toThrow('Invalid strategy');
  });

  it('bumps simple versions', () => {
    expect(SimpleVersion.parse('1.2.3').bump('major').toString()).toBe('2.0.0');
    expect(() => SimpleVersion.parse('1.2.3-beta.1')).toThrow('Invalid SemVer');
  });

  it('builds version bump branch names', () => {
    const branch = Branch.forVersion('chore/bump-version-', SimpleVersion.parse('1.2.4'));

    expect(branch.name).toBe('chore/bump-version-1.2.4');
    expect(branch.toString()).toBe('chore/bump-version-1.2.4');
  });

  it('guards existing remote branches unless overwriting is explicitly enabled', () => {
    const branch = Branch.forVersion('chore/bump-version-', SimpleVersion.parse('1.2.4'));

    expect(() => branch.assertCanUseRemoteState('abc123', false)).toThrow(
      'Branch chore/bump-version-1.2.4 already exists on origin',
    );
    expect(() => branch.assertCanUseRemoteState('abc123', true)).not.toThrow();
    expect(() => branch.assertCanUseRemoteState(undefined, false)).not.toThrow();
  });

  it('builds a validated action config from raw inputs', () => {
    const config = new ActionConfig({
      ...baseInputs(),
      strategy: 'regex',
      versionPattern: 'version=(\\d+\\.\\d+\\.\\d+)',
      versionReplacement: 'version={version}',
    });

    expect(config.strategy.value).toBe('regex');
    expect(config.bump.value).toBe('patch');
    expect(config.draft).toBe(true);
  });

  it('requires regex pattern and replacement for regex strategy', () => {
    expect(() => new ActionConfig({ ...baseInputs(), strategy: 'regex' })).toThrow('version-pattern');
    expect(() => new ActionConfig({ ...baseInputs(), strategy: 'regex', versionPattern: 'v(\\d+\\.\\d+\\.\\d+)' })).toThrow('version-replacement');
  });
});

function baseInputs(): ActionInputs {
  return {
    baseBranch: 'develop',
    branchPrefix: '',
    bump: 'patch',
    commitMessage: '',
    draft: '',
    failIfReleaseExists: '',
    failIfTagExists: '',
    githubToken: 'token',
    overwriteExistingBranch: '',
    prBody: '',
    prTitle: '',
    strategy: 'gradle-kts',
    tagPrefix: '',
    versionFile: 'build.gradle.kts',
    versionPattern: '',
    versionReplacement: '',
  };
}
