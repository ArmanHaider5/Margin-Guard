import { ValidationError } from "../errors/index.js";
import { Currency } from "./currency.js";

/**
 * A monetary amount paired with its Currency. Amount is stored as a finite `number`
 * in major units (e.g. 1000 = "1,000.00"); this sprint does not need minor-unit/bigint
 * precision since no arithmetic beyond equality/comparison is performed here — that
 * refinement is deferred to whichever future module first needs to sum or subtract
 * Money values, so precision requirements are driven by a real use case, not guessed.
 */
export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: Currency,
  ) {}

  static create(amount: number, currency: Currency | string): Money {
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      throw new ValidationError("Money amount must be a finite number", {
        details: { amount },
      });
    }
    const resolvedCurrency = currency instanceof Currency ? currency : Currency.create(currency);
    return new Money(amount, resolvedCurrency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency.equals(other.currency);
  }

  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency.toString()}`;
  }
}
