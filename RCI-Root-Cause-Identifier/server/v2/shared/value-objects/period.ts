import { ValidationError } from "../errors/index.js";
import { DateRange } from "./date-range.js";

/**
 * A fiscal/reporting period — a DateRange plus a business-facing label (e.g. "Q1 2026",
 * "FY2025"). Corresponds to the Period object in `03_MGD_DATA_MODEL.md` §2's Financial
 * Object Model. Distinct from a bare DateRange in that a Period is always meant to be
 * shown to a reader, never merely used for internal range-containment checks.
 */
export class Period {
  private constructor(
    readonly range: DateRange,
    readonly label: string,
  ) {}

  static create(start: Date, end: Date, label: string): Period {
    if (typeof label !== "string" || label.trim().length === 0) {
      throw new ValidationError("Period label must be a non-empty string", {
        details: { label },
      });
    }
    return new Period(DateRange.create(start, end), label);
  }

  equals(other: Period): boolean {
    return this.label === other.label && this.range.equals(other.range);
  }

  toString(): string {
    return this.label;
  }
}
