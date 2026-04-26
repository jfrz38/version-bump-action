import { describe, expect, it } from 'vitest';
import { Branch } from '../../../src/domain/branch';
import { PullRequest } from '../../../src/domain/pull-request';
import { SimpleVersion } from '../../../src/domain/simple-version';
import { Tag } from '../../../src/domain/tag';

describe('PullRequest', () => {
  it('builds pull requests from rendered content', () => {
    const branch = Branch.forVersion('chore/bump-version-', SimpleVersion.parse('1.2.4'));
    const tag = Tag.forVersion('v', SimpleVersion.parse('1.2.4'));
    const pullRequest = PullRequest.create(
      'main',
      branch,
      true,
      'Bump version to 1.2.4',
      'Bumps version from 1.2.3 to 1.2.4 using a patch release bump.',
      tag,
    );

    expect(pullRequest.baseBranch).toBe('main');
    expect(pullRequest.branch).toBe(branch);
    expect(pullRequest.draft).toBe(true);
    expect(pullRequest.title).toBe('Bump version to 1.2.4');
    expect(pullRequest.body).toBe('Bumps version from 1.2.3 to 1.2.4 using a patch release bump.');
    expect(pullRequest.tag).toBe(tag);
  });

  it('rejects blank base branches and titles', () => {
    const branch = Branch.forVersion('chore/bump-version-', SimpleVersion.parse('1.2.4'));
    const tag = Tag.forVersion('v', SimpleVersion.parse('1.2.4'));

    expect(() => PullRequest.create('', branch, true, 'Bump version to 1.2.4', 'Body', tag)).toThrow(
      'base branch must not be empty',
    );
    expect(() => PullRequest.create('main', branch, true, '', 'Body', tag)).toThrow('title must not be empty');
  });
});
