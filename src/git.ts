import * as exec from '@actions/exec';

export async function checkoutBumpBranch(baseBranch: string, branch: string): Promise<void> {
  await git(['fetch', 'origin', baseBranch, '--depth=1']);
  await git(['checkout', '-B', branch, `origin/${baseBranch}`]);
}

export async function assertRemoteBranchDoesNotExist(branch: string): Promise<void> {
  const result = await exec.getExecOutput('git', ['ls-remote', '--heads', 'origin', branch], { ignoreReturnCode: true });
  if (result.exitCode !== 0) {
    return;
  }

  const [sha] = result.stdout.trim().split(/\s+/);
  if (sha) {
    throw new Error(
      `Branch ${branch} already exists on origin, but no open pull request was found for it. Delete the branch or use a different branch-prefix.`,
    );
  }
}

export async function commitAndPush(branch: string, changedFiles: string[], commitMessage: string): Promise<void> {
  await git(['config', 'user.name', 'github-actions[bot]']);
  await git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  await git(['add', ...changedFiles]);

  const status = await gitOutput(['status', '--porcelain', '--', ...changedFiles]);
  if (!status.trim()) {
    throw new Error('No version change was applied.');
  }

  await git(['commit', '-m', commitMessage]);
  await git(['push', '--set-upstream', 'origin', branch]);
}

async function git(args: string[]): Promise<void> {
  await exec.exec('git', args);
}

async function gitOutput(args: string[]): Promise<string> {
  const result = await exec.getExecOutput('git', args, { ignoreReturnCode: false });
  return result.stdout;
}
