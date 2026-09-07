import { ValidationError } from "../errors/index.js";

/**
 * A numeric quantity with an optional unit of measure (e.g. "units", "kg", "hours").
 * Distinct from a raw `number` so downstream code can carry the unit alongside the
 * value instead of losing it, and distinct from Money in that a Quantity is never
 * currency-denominated.
 */
export class Quantity {
  private constructor(
    readonly value: number,
    readonly unit?: string,
  ) {}

  static create(value: number, unit?: string): Quantity {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ValidationError("Quantity value must be a finite number", {
        details: { value, unit },
      });
    }
    if (unit !== undefined && (typeof unit !== "string" || unit.trim().length === 0)) {
      throw new ValidationError("Quantity unit, when provided, must be a non-empty string", {
        details: { value, unit },
      });
    }
    return new Quantity(value, unit);
  }

  equals(other: Quantity): boolean {
    return this.value === other.value && this.unit === other.unit;
  }

  toString(): string {
    return this.unit ? `${this.value} ${this.unit}` : `${this.value}`;
  }
}
