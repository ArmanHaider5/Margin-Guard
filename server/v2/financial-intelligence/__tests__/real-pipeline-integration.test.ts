import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import XLSX from "xlsx";
import { parseDocument } from "../../document-parser/index.js";
import { analyzeFinancialSignals } from "../index.js";

const FIXED_CLOCK = () => new Date("2026-01-01T00:00:00.000Z");

/**
 * Integration coverage against the REAL Document Parser pipeline — proving
 * `financial-intelligence/` correctly consumes genuine `StructuredDocument`/
 * `EvidenceObject[]` output, not just the hand-built fixtures used by the unit
 * test files in this directory.
 */
describe("Financial Intelligence — real Document Parser pipeline integration", () => {
  function buildSyntheticPnlBuffer(): Buffer {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Revenue", "Expense"],
      ["RM1,000.00", "RM500.00"],
      ["RM1,200.00", "RM650.00"],
      ["RM1,500.00", "RM900.00"],
      ["RM1,500.00", "RM900.00"], // duplicate row -> duplicate_payments
      ["RM4,200.00", "RM2,950.00"], // deliberately wrong total -> missing_reconciliations
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "PnL");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  it("produces revenue_growth, cost_escalation, margin_erosion, and duplicate_payments evidence, and margin_compression / operating_cost_inflation / profit_quality_concerns / revenue_instability signals, from a real parsed xlsx", async () => {
    const { document, evidence } = await parseDocument("synthetic_pnl.xlsx", buildSyntheticPnlBuffer(), {
      clock: FIXED_CLOCK,
    });

    const { financialEvidence, financialSignals } = analyzeFinancialSignals(document, evidence);

    expect(financialEvidence.some((e) => e.type === "revenue_growth")).toBe(true);
    expect(financialEvidence.some((e) => e.type === "cost_escalation")).toBe(true);
    expect(financialEvidence.some((e) => e.type === "margin_erosion")).toBe(true);
    expect(financialEvidence.some((e) => e.type === "duplicate_payments")).toBe(true);
    expect(financialEvidence.some((e) => e.type === "missing_reconciliations")).toBe(true);

    expect(financialSignals.some((s) => s.type === "margin_compression")).toBe(true);
    expect(financialSignals.some((s) => s.type === "operating_cost_inflation")).toBe(true);
    expect(financialSignals.some((s) => s.type === "profit_quality_concerns")).toBe(true);

    // EFF-002: `revenue_instability`'s rule was extended (Efficiency Capability
    // Pack milestone) to also trigger on `revenue_growth` alone, per FIF
    // Chapter 6's own documented "Erratic Revenue growth pattern" trigger.
    // Unlike every prior signal-rule extension, `revenue_growth` evidence was
    // already producible by the frozen `FinancialEvidenceClassifier`, so this
    // is the one rule change that genuinely widens `analyzeFinancialSignals()`'s
    // reachable output — verified explicitly here, not left as an untested
    // side effect.
    expect(financialSignals.some((s) => s.type === "revenue_instability")).toBe(true);
  });

  it("ontology-first: FinancialEvidence only fires against columns whose header the Ontology Registry actually normalized", async () => {
    const { document, evidence } = await parseDocument("synthetic_pnl.xlsx", buildSyntheticPnlBuffer(), {
      clock: FIXED_CLOCK,
    });
    // Sanity: the real pipeline's TerminologyNormalizer did in fact resolve
    // "Revenue" and "Expense" against the Ontology Registry for this fixture —
    // financial-intelligence's trend detectors depend entirely on this having
    // already happened upstream, never re-deriving it themselves.
    expect(document.normalizedTerms.some((t) => t.canonicalTerm === "Revenue")).toBe(true);
    expect(document.normalizedTerms.some((t) => t.canonicalTerm === "Expense")).toBe(true);

    const { financialEvidence } = analyzeFinancialSignals(document, evidence);
    expect(financialEvidence.length).toBeGreaterThan(0);
  });

  it("does not throw and produces no false evidence on a real, non-financial file", async () => {
    const buffer = readFileSync("uploads/1775625706459-791250478-dispatch_log.xlsx");
    const { document, evidence } = await parseDocument("dispatch_log.xlsx", buffer, { clock: FIXED_CLOCK });

    expect(() => analyzeFinancialSignals(document, evidence)).not.toThrow();
  });

  it("is deterministic end-to-end across both modules: identical bytes -> identical FinancialEvidence[] and FinancialSignal[]", async () => {
    const buffer = buildSyntheticPnlBuffer();
    const run1 = await parseDocument("synthetic_pnl.xlsx", buffer, { clock: FIXED_CLOCK });
    const run2 = await parseDocument("synthetic_pnl.xlsx", buffer, { clock: FIXED_CLOCK });

    const analysis1 = analyzeFinancialSignals(run1.document, run1.evidence);
    const analysis2 = analyzeFinancialSignals(run2.document, run2.evidence);

    expect(JSON.stringify(analysis1.financialEvidence)).toBe(JSON.stringify(analysis2.financialEvidence));
    expect(JSON.stringify(analysis1.financialSignals)).toBe(JSON.stringify(analysis2.financialSignals));
  });
});
