import { describe, expect, it } from 'vitest';
import { bumpVersion, parseBump, parseSimpleSemver } from '../../src/semver';

describe('semver', () => {
  it('bumps patch versions', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4');
  });

  it('bumps minor versions', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
  });

  it('bumps major versions', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0');
  });

  it('rejects invalid versions', () => {
    expect(() => parseSimpleSemver('1.2')).toThrow('Invalid SemVer');
    expect(() => parseSimpleSemver('1.2.3-beta.1')).toThrow('Invalid SemVer');
  });

  it('rejects invalid bump values', () => {
    expect(() => parseBump('release')).toThrow('Invalid bump');
  });
});
