import { describe, it, expect } from "vitest";
import { FinancialSignalGenerator } from "../signals/financial-signal-generator.js";
import { Confidence } from "../../shared/index.js";
import type { FinancialEvidence } from "../../shared/index.js";

const generator = new FinancialSignalGenerator();

function makeFinancialEvidence(overrides: Partial<FinancialEvidence> = {}): FinancialEvidence {
  return {
    id: `fe-${Math.random().toString(36).slice(2)}`,
    type: "cash_shortages",
    evidenceObjectIds: ["e1"],
    documentId: "doc-1",
    confidence: Confidence.create(0.6),
    basis: "test fixture",
    ...overrides,
  };
}

describe("FinancialSignalGenerator — isolated unit tests", () => {
  it("liquidity_stress fires from cash_shortages evidence", () => {
    const evidence = [makeFinancialEvidence({ type: "cash_shortages" })];
    const signals = generator.generate("doc-1", evidence);
    expect(signals.some((s) => s.type === "liquidity_stress")).toBe(true);
  });

  it("margin_compression fires from margin_erosion evidence", () => {
    const evidence = [makeFinancialEvidence({ type: "margin_erosion" })];
    const signals = generator.generate("doc-1", evidence);
    expect(signals.some((s) => s.type === "margin_compression")).toBe(true);
  });

  it("profit_quality_concerns fires from EITHER missing_reconciliations OR duplicate_payments (multi-trigger rule)", () => {
    const viaReconciliation = generator.generate("doc-1", [makeFinancialEvidence({ type: "missing_reconciliations" })]);
    const viaDuplicate = generator.generate("doc-1", [makeFinancialEvidence({ type: "duplicate_payments" })]);
    expect(viaReconciliation.some((s) => s.type === "profit_quality_concerns")).toBe(true);
    expect(viaDuplicate.some((s) => s.type === "profit_quality_concerns")).toBe(true);
  });

  it("a rule with no triggering evidence present never fires (no false positives)", () => {
    const evidence = [makeFinancialEvidence({ type: "cash_shortages" })];
    const signals = generator.generate("doc-1", evidence);
    expect(signals.some((s) => s.type === "over_reliance_on_debt")).toBe(false);
    expect(signals.some((s) => s.type === "supplier_concentration")).toBe(false);
  });

  it("the two signal types with no wired detection rule never appear, by design", () => {
    // inventory_build_up and working_capital_deterioration have no registered
    // rule (their triggering evidence types have no detector) — confirm the
    // registry genuinely cannot produce them, not merely that this particular
    // input didn't happen to trigger them. cash_conversion_deterioration is
    // no longer in this list — negative_cash_flow now has real detection
    // logic (Cash Flow Capability Pack) and is its registered trigger.
    const allEvidenceTypes: FinancialEvidence["type"][] = [
      "revenue_growth", "margin_erosion", "negative_cash_flow", "inventory_accumulation",
      "receivable_ageing", "payable_ageing", "debt_growth", "cost_escalation",
      "cash_shortages", "working_capital_pressure", "duplicate_payments",
      "missing_reconciliations", "revenue_concentration", "supplier_dependency", "customer_dependency",
    ];
    const evidence = allEvidenceTypes.map((type) => makeFinancialEvidence({ type }));
    const signals = generator.generate("doc-1", evidence);
    const producedTypes = new Set(signals.map((s) => s.type));
    expect(producedTypes.has("inventory_build_up")).toBe(false);
    expect(producedTypes.has("working_capital_deterioration")).toBe(false);
    expect(producedTypes.has("cash_conversion_deterioration")).toBe(true);
  });

  it("corroboration bonus: two independent triggering evidence records yield higher confidence than one alone", () => {
    const single = generator.generate("doc-1", [
      makeFinancialEvidence({ type: "missing_reconciliations", confidence: Confidence.create(0.5) }),
    ]);
    const double = generator.generate("doc-1", [
      makeFinancialEvidence({ id: "fe1", type: "missing_reconciliations", confidence: Confidence.create(0.5) }),
      makeFinancialEvidence({ id: "fe2", type: "duplicate_payments", confidence: Confidence.create(0.5) }),
    ]);
    const singleSignal = single.find((s) => s.type === "profit_quality_concerns");
    const doubleSignal = double.find((s) => s.type === "profit_quality_concerns");
    expect(doubleSignal!.confidence.value).toBeGreaterThan(singleSignal!.confidence.value);
  });

  it("confidence is always clamped to [0, 1], even with many high-confidence corroborating records", () => {
    const evidence = Array.from({ length: 10 }, (_, i) =>
      makeFinancialEvidence({ id: `fe${i}`, type: "cash_shortages", confidence: Confidence.create(0.95) }),
    );
    const signals = generator.generate("doc-1", evidence);
    const signal = signals.find((s) => s.type === "liquidity_stress");
    expect(signal!.confidence.value).toBeLessThanOrEqual(1);
  });

  it("every FinancialSignal traces back to non-empty, real FinancialEvidence ids (mandatory Evidence Chain)", () => {
    const evidence = [makeFinancialEvidence({ type: "cash_shortages" })];
    const signals = generator.generate("doc-1", evidence);
    for (const signal of signals) {
      expect(signal.financialEvidenceIds.length).toBeGreaterThan(0);
      for (const id of signal.financialEvidenceIds) {
        expect(evidence.some((e) => e.id === id)).toBe(true);
      }
    }
  });

  it("edge case: no evidence produces no signals and does not throw", () => {
    expect(() => generator.generate("doc-1", [])).not.toThrow();
    expect(generator.generate("doc-1", [])).toHaveLength(0);
  });

  it("is deterministic: identical input always produces identical output", () => {
    const evidence = [makeFinancialEvidence({ id: "fe-fixed", type: "cash_shortages" })];
    const first = generator.generate("doc-1", evidence);
    const second = generator.generate("doc-1", evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
