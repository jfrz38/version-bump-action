import { Bump as BumpVo, type BumpValue } from './domain/bump';
import { SimpleVersion } from './domain/simple-version';

export type Bump = BumpValue;

export interface SimpleSemver {
  major: number;
  minor: number;
  patch: number;
}

export function parseSimpleSemver(version: string): SimpleSemver {
  const parsed = SimpleVersion.parse(version);
  const [major, minor, patch] = parsed.toString().split('.').map(Number);
  return {
    major,
    minor,
    patch,
  };
}

export function formatSimpleSemver(version: SimpleSemver): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function parseBump(value: string): Bump {
  return BumpVo.fromInput(value).value;
}

export function bumpVersion(currentVersion: string, bump: BumpValue): string {
  return SimpleVersion.parse(currentVersion).bump(bump).toString();
}
