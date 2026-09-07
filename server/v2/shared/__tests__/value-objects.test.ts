import { describe, it, expect } from "vitest";
import {
  Identifier,
  Currency,
  Money,
  Percentage,
  Quantity,
  Confidence,
  DateRange,
  Period,
  ValidationError,
  ThresholdBandResolver,
} from "../index.js";

describe("Identifier", () => {
  it("equals compares both kind and value", () => {
    expect(Identifier.create("a", "document").equals(Identifier.create("a", "document"))).toBe(true);
    expect(Identifier.create("a", "document").equals(Identifier.create("a", "evidence"))).toBe(false);
  });

  it("rejects an empty value", () => {
    expect(() => Identifier.create("", "document")).toThrow(ValidationError);
  });
});

describe("Currency", () => {
  it("normalizes to uppercase", () => {
    expect(Currency.create("myr").code).toBe("MYR");
  });

  it("rejects a non-3-letter code", () => {
    expect(() => Currency.create("MY")).toThrow(ValidationError);
    expect(() => Currency.create("MYRR")).toThrow(ValidationError);
  });
});

describe("Money", () => {
  it("formats with two decimal places and the currency code", () => {
    expect(Money.create(1000, "MYR").toString()).toBe("1000.00 MYR");
  });

  it("accepts a Currency instance or a raw code interchangeably", () => {
    const viaInstance = Money.create(5, Currency.create("USD"));
    const viaCode = Money.create(5, "USD");
    expect(viaInstance.equals(viaCode)).toBe(true);
  });

  it("rejects a non-finite amount", () => {
    expect(() => Money.create(Number.NaN, "MYR")).toThrow(ValidationError);
    expect(() => Money.create(Number.POSITIVE_INFINITY, "MYR")).toThrow(ValidationError);
  });
});

describe("Percentage", () => {
  it("round-trips fraction <-> percent value", () => {
    expect(Percentage.fromPercentValue(50).fraction).toBe(0.5);
    expect(Percentage.fromFraction(0.5).toPercentValue()).toBe(50);
  });

  it("permits negative and >100% values (growth rates)", () => {
    expect(() => Percentage.fromPercentValue(-20)).not.toThrow();
    expect(() => Percentage.fromPercentValue(150)).not.toThrow();
  });
});

describe("Quantity", () => {
  it("requires a non-empty unit when one is provided", () => {
    expect(() => Quantity.create(5, "")).toThrow(ValidationError);
    expect(Quantity.create(5).toString()).toBe("5");
    expect(Quantity.create(5, "units").toString()).toBe("5 units");
  });
});

describe("Confidence", () => {
  it("rejects values outside [0, 1]", () => {
    expect(() => Confidence.create(-0.1)).toThrow(ValidationError);
    expect(() => Confidence.create(1.1)).toThrow(ValidationError);
  });

  it("bands against the platform default without an explicit resolver", () => {
    expect(Confidence.create(0.1).band()).toBe("low");
    expect(Confidence.create(0.5).band()).toBe("medium");
    expect(Confidence.create(0.9).band()).toBe("high");
  });

  it("accepts a caller-supplied BandResolver with its own vocabulary", () => {
    const resolver = new ThresholdBandResolver<"poor" | "excellent">([
      { min: 0, band: "poor" },
      { min: 0.5, band: "excellent" },
    ]);
    expect(Confidence.create(0.9).band(resolver)).toBe("excellent");
    expect(Confidence.create(0.1).band(resolver)).toBe("poor");
  });
});

describe("DateRange / Period", () => {
  it("rejects a range where start is after end", () => {
    expect(() => DateRange.create(new Date("2026-02-01"), new Date("2026-01-01"))).toThrow(ValidationError);
  });

  it("contains checks inclusive boundaries", () => {
    const range = DateRange.create(new Date("2026-01-01"), new Date("2026-03-31"));
    expect(range.contains(new Date("2026-01-01"))).toBe(true);
    expect(range.contains(new Date("2026-03-31"))).toBe(true);
    expect(range.contains(new Date("2026-04-01"))).toBe(false);
  });

  it("Period requires a non-empty label", () => {
    expect(() => Period.create(new Date("2026-01-01"), new Date("2026-03-31"), "")).toThrow(ValidationError);
    expect(Period.create(new Date("2026-01-01"), new Date("2026-03-31"), "Q1 2026").toString()).toBe("Q1 2026");
  });
});
