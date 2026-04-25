import * as github from '@actions/github';

export interface PullRequestResult {
  url: string;
}

export interface GitHubClientOptions {
  baseBranch: string;
  branch: string;
  draft: boolean;
  githubToken: string;
  prBody: string;
  prTitle: string;
  tag: string;
}

type Octokit = ReturnType<typeof github.getOctokit>;

function ensureRepositoryContext(): { owner: string; repo: string } {
  const { owner, repo } = github.context.repo;
  if (!owner || !repo) {
    throw new Error('GitHub repository context is unavailable. This action must run inside a GitHub repository workflow.');
  }

  return { owner, repo };
}

export function getDefaultBranch(): string {
  const repository = github.context.payload.repository;
  const defaultBranch = typeof repository?.default_branch === 'string' ? repository.default_branch : '';
  if (defaultBranch) {
    return defaultBranch;
  }

  return process.env.GITHUB_REF_NAME ?? '';
}

export function createGitHubClient(githubToken: string): Octokit {
  if (!githubToken) {
    throw new Error('Input "github-token" is required for tag/release checks and pull request creation.');
  }

  return github.getOctokit(githubToken);
}

export async function assertTagDoesNotExist(octokit: Octokit, tag: string): Promise<void> {
  const { owner, repo } = ensureRepositoryContext();

  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `tags/${tag}` });
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }

  throw new Error(`Tag ${tag} already exists.`);
}

export async function assertReleaseDoesNotExist(octokit: Octokit, tag: string): Promise<void> {
  const { owner, repo } = ensureRepositoryContext();

  try {
    await octokit.rest.repos.getReleaseByTag({ owner, repo, tag });
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }

  throw new Error(`GitHub Release ${tag} already exists.`);
}

export async function findOpenPullRequest(octokit: Octokit, baseBranch: string, branch: string): Promise<PullRequestResult | undefined> {
  const { owner, repo } = ensureRepositoryContext();
  const response = await octokit.rest.pulls.list({
    owner,
    repo,
    base: baseBranch,
    head: `${owner}:${branch}`,
    state: 'open',
    per_page: 1,
  });

  const [pullRequest] = response.data;
  if (!pullRequest) {
    return undefined;
  }

  return { url: pullRequest.html_url };
}

export async function createPullRequest(octokit: Octokit, options: GitHubClientOptions): Promise<PullRequestResult> {
  const { owner, repo } = ensureRepositoryContext();
  const response = await octokit.rest.pulls.create({
    owner,
    repo,
    base: options.baseBranch,
    head: options.branch,
    title: options.prTitle,
    body: options.prBody,
    draft: options.draft,
  });

  return { url: response.data.html_url };
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}
