export type BumpValue = 'patch' | 'minor' | 'major';

export class Bump {
  private constructor(readonly value: BumpValue) {}

  static fromInput(value: string): Bump {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'patch' || normalized === 'minor' || normalized === 'major') {
      return new Bump(normalized);
    }

    throw new Error(`Invalid bump "${value}". Expected patch, minor, or major.`);
  }
}
