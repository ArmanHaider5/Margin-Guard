import { describe, it, expect } from "vitest";
import { EntityExtractor } from "../../services/entity-extractor.js";
import { Confidence } from "../../../shared/index.js";
import type { DetectedTable } from "../../../shared/index.js";

const extractor = new EntityExtractor();

function tableWithCell(cell: string): DetectedTable[] {
  return [
    {
      id: "t1",
      headers: ["Value"],
      rows: [[cell]],
      confidence: Confidence.create(0.8),
    },
  ];
}

describe("EntityExtractor", () => {
  it("extracts a currency-formatted amount with high confidence", () => {
    const { value } = extractor.extract(tableWithCell("RM1,000.00"));
    const amount = value.find((e) => e.type === "amount");
    expect(amount).toBeDefined();
    expect(amount?.observedValue).toBe(1000);
    expect(amount?.confidence.value).toBeGreaterThan(0.8);
  });

  it("does not treat a bare integer as an amount (avoids false positives on counts/quantities)", () => {
    const { value } = extractor.extract(tableWithCell("1000"));
    expect(value.some((e) => e.type === "amount")).toBe(false);
  });

  it("extracts an ISO date", () => {
    const { value } = extractor.extract(tableWithCell("2026-03-15"));
    const date = value.find((e) => e.type === "date");
    expect(date?.observedValue).toBe("2026-03-15");
  });

  it("extracts a percentage", () => {
    const { value } = extractor.extract(tableWithCell("42.5%"));
    const pct = value.find((e) => e.type === "percentage");
    expect(pct?.observedValue).toBe(42.5);
  });

  it("extracts a reference id", () => {
    const { value } = extractor.extract(tableWithCell("INV-2026-001"));
    expect(value.some((e) => e.type === "reference_id" && e.rawValue === "INV-2026-001")).toBe(true);
  });

  it("finds multiple different entity types within the same cell/line", () => {
    const { value } = extractor.extract(tableWithCell("Invoice INV-2026-001 dated 2026-01-15 for RM1,000.00"));
    const types = new Set(value.map((e) => e.type));
    expect(types.has("reference_id")).toBe(true);
    expect(types.has("date")).toBe(true);
    expect(types.has("amount")).toBe(true);
  });

  it("never produces two entities of the SAME type from overlapping patterns in one cell", () => {
    // "RM1,000.00" matches both the currency-prefixed and bare-decimal amount
    // patterns; only one "amount" entity should ever be produced per cell.
    const { value } = extractor.extract(tableWithCell("RM1,000.00"));
    expect(value.filter((e) => e.type === "amount")).toHaveLength(1);
  });

  it("edge case: empty table produces no entities and does not throw", () => {
    const { value } = extractor.extract([], undefined);
    expect(value).toHaveLength(0);
  });

  it("edge case: blank cells are skipped", () => {
    const table: DetectedTable[] = [{ id: "t1", headers: ["A"], rows: [[""], ["  "]], confidence: Confidence.create(0.8) }];
    const { value } = extractor.extract(table);
    expect(value).toHaveLength(0);
  });

  it("falls back to scanning free text line-by-line when no tables are present", () => {
    const { value } = extractor.extract([], "Total due: RM500.00\nDate: 2026-02-01");
    expect(value.some((e) => e.type === "amount")).toBe(true);
    expect(value.some((e) => e.type === "date")).toBe(true);
  });
});
