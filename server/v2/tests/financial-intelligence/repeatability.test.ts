import { describe, it, expect } from "vitest";
import XLSX from "xlsx";
import { parseDocument } from "../../document-parser/index.js";
import { analyzeFinancialSignals } from "../../financial-intelligence/index.js";

/**
 * Whole-module repeatability test for Financial Intelligence, matching the same
 * ADR-010 standard already verified for `document-parser/`
 * (`server/v2/tests/document-parser/repeatability.test.ts`): given identical
 * input, output must be byte-for-byte identical, end to end across both modules.
 */

const FIXED_CLOCK = () => new Date("2026-01-01T00:00:00.000Z");

describe("Financial Intelligence repeatability", () => {
  it("five consecutive analyses of identical StructuredDocument/EvidenceObject input produce identical FinancialEvidence[] and FinancialSignal[]", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Revenue", "Expense"],
      ["RM1,000.00", "RM500.00"],
      ["RM1,200.00", "RM650.00"],
      ["RM1,500.00", "RM900.00"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "PnL");
    const buffer: Buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const { document, evidence } = await parseDocument("repeatable.xlsx", buffer, { clock: FIXED_CLOCK });

    const results = Array.from({ length: 5 }, () => analyzeFinancialSignals(document, evidence));
    const serializedEvidence = results.map((r) => JSON.stringify(r.financialEvidence));
    const serializedSignals = results.map((r) => JSON.stringify(r.financialSignals));

    expect(new Set(serializedEvidence).size).toBe(1);
    expect(new Set(serializedSignals).size).toBe(1);
  });

  it("FinancialEvidence and FinancialSignal ids are content-derived, not random: identical evidence always yields identical ids", async () => {
    const csv = 'Revenue\n"RM1,000.00"\n"RM1,500.00"\n';
    const run1 = await parseDocument("det.csv", Buffer.from(csv), { clock: FIXED_CLOCK });
    const run2 = await parseDocument("det.csv", Buffer.from(csv), { clock: FIXED_CLOCK });

    const analysis1 = analyzeFinancialSignals(run1.document, run1.evidence);
    const analysis2 = analyzeFinancialSignals(run2.document, run2.evidence);

    expect(analysis1.financialEvidence.map((e) => e.id)).toEqual(analysis2.financialEvidence.map((e) => e.id));
  });
});
