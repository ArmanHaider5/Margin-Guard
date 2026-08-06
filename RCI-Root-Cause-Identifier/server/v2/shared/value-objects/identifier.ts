import { ValidationError } from "../errors/index.js";

/**
 * A branded string identifier. Wrapping a bare `string` in `Identifier` prevents a
 * `documentId` from being accidentally passed where an `evidenceId` was expected —
 * two Identifiers are only `.equals()` if both their `kind` and `value` match.
 */
export class Identifier {
  private constructor(
    readonly value: string,
    readonly kind: string,
  ) {}

  static create(value: string, kind: string): Identifier {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ValidationError("Identifier value must be a non-empty string", {
        details: { value, kind },
      });
    }
    if (typeof kind !== "string" || kind.trim().length === 0) {
      throw new ValidationError("Identifier kind must be a non-empty string", {
        details: { value, kind },
      });
    }
    return new Identifier(value, kind);
  }

  equals(other: Identifier): boolean {
    return this.kind === other.kind && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
