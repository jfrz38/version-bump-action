import { describe, expect, it } from 'vitest';
import { SimpleVersion } from '../../../src/domain/simple-version';
import { Tag } from '../../../src/domain/tag';

describe('Tag', () => {
  it('builds version tag names', () => {
    const tag = Tag.forVersion('v', SimpleVersion.parse('1.2.4'));

    expect(tag.name).toBe('v1.2.4');
    expect(tag.toString()).toBe('v1.2.4');
  });
});
