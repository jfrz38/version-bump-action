export class BooleanInput {
  private constructor(readonly value: boolean) {}

  static fromInput(name: string, rawValue: string, defaultValue: boolean): BooleanInput {
    if (!rawValue) {
      return new BooleanInput(defaultValue);
    }

    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'true') {
      return new BooleanInput(true);
    }
    if (normalized === 'false') {
      return new BooleanInput(false);
    }

    throw new Error(`Input "${name}" must be either "true" or "false".`);
  }
}
