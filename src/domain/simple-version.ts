import { type BumpValue } from './bump';

const SIMPLE_SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export class SimpleVersion {
  private constructor(
    private readonly major: number,
    private readonly minor: number,
    private readonly patch: number,
  ) {}

  static parse(version: string): SimpleVersion {
    const match = SIMPLE_SEMVER_PATTERN.exec(version.trim());
    if (!match) {
      throw new Error(`Invalid SemVer version "${version}". Expected MAJOR.MINOR.PATCH.`);
    }

    return new SimpleVersion(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  bump(component: BumpValue): SimpleVersion {
    if (component === 'patch') {
      return new SimpleVersion(this.major, this.minor, this.patch + 1);
    }

    if (component === 'minor') {
      return new SimpleVersion(this.major, this.minor + 1, 0);
    }

    return new SimpleVersion(this.major + 1, 0, 0);
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
}
