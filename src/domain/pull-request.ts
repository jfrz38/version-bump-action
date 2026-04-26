import type { Branch } from './branch';
import type { Tag } from './tag';

export class PullRequest {
  private constructor(
    readonly baseBranch: string,
    readonly branch: Branch,
    readonly draft: boolean,
    readonly title: string,
    readonly body: string,
    readonly tag: Tag,
  ) {
    if (!baseBranch.trim()) {
      throw new Error('Pull request base branch must not be empty.');
    }
    if (!title.trim()) {
      throw new Error('Pull request title must not be empty.');
    }
  }

  static create(baseBranch: string, branch: Branch, draft: boolean, title: string, body: string, tag: Tag): PullRequest {
    return new PullRequest(baseBranch, branch, draft, title, body, tag);
  }
}
