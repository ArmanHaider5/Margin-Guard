import { ValidationError } from "../errors/index.js";

/**
 * A generic, inclusive date range with no business semantics of its own. `Period`
 * (below) composes this with a label/kind for fiscal/reporting-period use — DateRange
 * itself is used anywhere two dates bound a range (e.g. an ageing bucket, an evidence
 * window).
 */
export class DateRange {
  private constructor(
    readonly start: Date,
    readonly end: Date,
  ) {}

  static create(start: Date, end: Date): DateRange {
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      throw new ValidationError("DateRange start must be a valid Date", {
        details: { start },
      });
    }
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
      throw new ValidationError("DateRange end must be a valid Date", { details: { end } });
    }
    if (start.getTime() > end.getTime()) {
      throw new ValidationError("DateRange start must not be after end", {
        details: { start: start.toISOString(), end: end.toISOString() },
      });
    }
    return new DateRange(start, end);
  }

  contains(date: Date): boolean {
    return date.getTime() >= this.start.getTime() && date.getTime() <= this.end.getTime();
  }

  equals(other: DateRange): boolean {
    return this.start.getTime() === other.start.getTime() && this.end.getTime() === other.end.getTime();
  }
}
