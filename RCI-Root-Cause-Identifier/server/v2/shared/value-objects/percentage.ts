import { ValidationError } from "../errors/index.js";

/**
 * A percentage value, stored internally as a fraction (0.5 = "50%"). Deliberately not
 * clamped to [0, 1] — financial percentages (growth rates, variances) can legitimately
 * be negative or exceed 100%. Only finiteness is validated.
 */
export class Percentage {
  private constructor(readonly fraction: number) {}

  /** @param fraction e.g. 0.5 for 50% */
  static fromFraction(fraction: number): Percentage {
    if (typeof fraction !== "number" || !Number.isFinite(fraction)) {
      throw new ValidationError("Percentage fraction must be a finite number", {
        details: { fraction },
      });
    }
    return new Percentage(fraction);
  }

  /** @param value e.g. 50 for 50% */
  static fromPercentValue(value: number): Percentage {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ValidationError("Percentage value must be a finite number", {
        details: { value },
      });
    }
    return new Percentage(value / 100);
  }

  toPercentValue(): number {
    return this.fraction * 100;
  }

  toDisplayString(fractionDigits = 1): string {
    return `${this.toPercentValue().toFixed(fractionDigits)}%`;
  }

  equals(other: Percentage): boolean {
    return this.fraction === other.fraction;
  }
}
