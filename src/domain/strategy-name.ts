export type StrategyNameValue = 'gradle-kts' | 'npm' | 'regex';

export class StrategyName {
  private constructor(readonly value: StrategyNameValue) {}

  static fromInput(value: string): StrategyName {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'gradle-kts' || normalized === 'npm' || normalized === 'regex') {
      return new StrategyName(normalized);
    }

    throw new Error(`Invalid strategy "${value}". Expected gradle-kts, npm, or regex.`);
  }

  isRegex(): boolean {
    return this.value === 'regex';
  }
}
