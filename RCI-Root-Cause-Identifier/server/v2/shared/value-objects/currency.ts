import { ValidationError } from "../errors/index.js";

const ISO_4217_SHAPE = /^[A-Z]{3}$/;

/**
 * An ISO-4217-shaped currency code (e.g. "MYR", "USD"). Validates format only — this
 * is a framework Value Object, not a currency reference-data lookup; a real ISO
 * whitelist belongs to a future Knowledge Library entry, not here.
 */
export class Currency {
  private constructor(readonly code: string) {}

  static create(code: string): Currency {
    const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
    if (!ISO_4217_SHAPE.test(normalized)) {
      throw new ValidationError(
        "Currency code must be a 3-letter ISO-4217-shaped code",
        { details: { code } },
      );
    }
    return new Currency(normalized);
  }

  equals(other: Currency): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}
