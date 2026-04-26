import fs from 'node:fs/promises';
import path from 'node:path';
import { type ActionConfig } from '../domain/action-config';
import { SimpleVersion } from '../domain/simple-version';
import { type VersionStrategy } from '../domain/version-strategy';
import { assertReleaseDoesNotExist, assertTagDoesNotExist, createGitHubClient, createPullRequest, findOpenPullRequest, getDefaultBranch } from '../github';
import { assertRemoteBranchDoesNotExist, checkoutBumpBranch, commitAndPush } from '../git';
import { toGitPath, uniqueValues } from '../path-utils';
import { renderTemplate } from '../templates';

export interface ActionOutputs {
  branch: string;
  changedFiles: string;
  currentVersion: string;
  nextVersion: string;
  prUrl: string;
  tag: string;
}

export type VersionStrategyFactory = (cwd: string, config: ActionConfig) => VersionStrategy;

export async function executeVersionBumpPr(config: ActionConfig, cwd: string, createStrategy: VersionStrategyFactory): Promise<ActionOutputs> {
  const octokit = createGitHubClient(config.githubToken);
  const initialStrategy = createStrategy(cwd, config);
  const currentVersion = SimpleVersion.parse(await initialStrategy.readCurrentVersion());
  const nextVersion = currentVersion.bump(config.bump.value);
  const currentVersionText = currentVersion.toString();
  const nextVersionText = nextVersion.toString();
  const branch = `${config.branchPrefix}${nextVersionText}`;
  const tag = `${config.tagPrefix}${nextVersionText}`;
  const baseBranch = config.baseBranch || getDefaultBranch();

  if (!baseBranch) {
    throw new Error('Could not resolve base branch. Provide input "base-branch".');
  }

  if (config.failIfTagExists) {
    await assertTagDoesNotExist(octokit, tag);
  }
  if (config.failIfReleaseExists) {
    await assertReleaseDoesNotExist(octokit, tag);
  }

  const existingPullRequest = await findOpenPullRequest(octokit, baseBranch, branch);
  if (existingPullRequest) {
    return {
      branch,
      changedFiles: '',
      currentVersion: currentVersionText,
      nextVersion: nextVersionText,
      prUrl: existingPullRequest.url,
      tag,
    };
  }

  await assertRemoteBranchDoesNotExist(branch);
  await checkoutBumpBranch(baseBranch, branch);

  const strategy = createStrategy(cwd, config);
  const branchCurrentVersion = SimpleVersion.parse(await strategy.readCurrentVersion()).toString();
  if (branchCurrentVersion !== currentVersionText) {
    throw new Error(`Version changed after checking out ${baseBranch}: expected ${currentVersionText}, found ${branchCurrentVersion}.`);
  }

  const beforeContents = await snapshotFiles(cwd, potentialChangedFiles(config.versionFile));
  const changedFiles = uniqueValues((await strategy.writeNextVersion(nextVersionText)).map((filePath) => toGitPath(cwd, filePath)));
  const changedAfterWrite = await filterActuallyChangedFiles(cwd, changedFiles, beforeContents);

  if (changedAfterWrite.length === 0) {
    throw new Error('No version change was applied.');
  }

  const templateValues = { bump: config.bump.value, currentVersion: currentVersionText, nextVersion: nextVersionText };
  const commitMessage = renderTemplate(config.commitMessage, templateValues);
  const prTitle = renderTemplate(config.prTitle, templateValues);
  const prBody = renderTemplate(config.prBody, templateValues);

  await commitAndPush(branch, changedAfterWrite, commitMessage);
  const pullRequest = await createPullRequest(octokit, {
    baseBranch,
    branch,
    draft: config.draft,
    githubToken: config.githubToken,
    prBody,
    prTitle,
    tag,
  });

  return {
    branch,
    changedFiles: changedAfterWrite.join('\n'),
    currentVersion: currentVersionText,
    nextVersion: nextVersionText,
    prUrl: pullRequest.url,
    tag,
  };
}

async function snapshotFiles(cwd: string, files: string[]): Promise<Map<string, string | undefined>> {
  const snapshots = new Map<string, string | undefined>();
  for (const filePath of files) {
    const gitPath = toGitPath(cwd, filePath);
    try {
      snapshots.set(gitPath, await fs.readFile(path.resolve(cwd, gitPath), 'utf8'));
    } catch {
      snapshots.set(gitPath, undefined);
    }
  }
  return snapshots;
}

async function filterActuallyChangedFiles(cwd: string, files: string[], beforeContents: Map<string, string | undefined>): Promise<string[]> {
  const changedFiles: string[] = [];
  for (const filePath of files) {
    const gitPath = toGitPath(cwd, filePath);
    let currentContent: string | undefined;
    try {
      currentContent = await fs.readFile(path.resolve(cwd, gitPath), 'utf8');
    } catch {
      currentContent = undefined;
    }
    if (beforeContents.get(gitPath) !== currentContent || !beforeContents.has(gitPath)) {
      changedFiles.push(gitPath);
    }
  }
  return changedFiles;
}

function potentialChangedFiles(versionFile: string): string[] {
  if (path.basename(versionFile) !== 'package.json') {
    return [versionFile];
  }

  return [versionFile, path.join(path.dirname(versionFile), 'package-lock.json')];
}
