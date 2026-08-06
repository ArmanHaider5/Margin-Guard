import { describe, it, expect } from "vitest";
import { Confidence } from "../../../shared/index.js";
import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../../__tests__/fixtures.js";
import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";
import { CapabilityPackRegistry } from "../capability-pack-registry.js";
import { FinancialIntelligenceOrchestrator } from "../financial-intelligence-orchestrator.js";
import { createDefaultCapabilityPackRegistry } from "../default-capability-pack-registry.js";
import type { CapabilityResult } from "../../internal/capability-support/capability-result.js";

describe("CapabilityPackRegistry", () => {
  it("all() returns packs in registration order", () => {
    const registry = new CapabilityPackRegistry();
    registry.register({ id: "b", name: "B", run: () => ({ metrics: [], ratios: [], observations: [], evidence: [], signals: [] }) });
    registry.register({ id: "a", name: "A", run: () => ({ metrics: [], ratios: [], observations: [], evidence: [], signals: [] }) });
    expect(registry.all().map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("rejects duplicate pack ids", () => {
    const registry = new CapabilityPackRegistry();
    registry.register({ id: "x", name: "X", run: () => ({ metrics: [], ratios: [], observations: [], evidence: [], signals: [] }) });
    expect(() =>
      registry.register({ id: "x", name: "X2", run: () => ({ metrics: [], ratios: [], observations: [], evidence: [], signals: [] }) }),
    ).toThrow();
  });

  it("get() returns undefined for an unregistered id", () => {
    const registry = new CapabilityPackRegistry();
    expect(registry.get("nope")).toBeUndefined();
  });

  it("the default registry registers all eight completed packs, in the documented recommended order", () => {
    const registry = createDefaultCapabilityPackRegistry();
    expect(registry.all().map((p) => p.id)).toEqual(["liquidity", "profitability", "cash_flow", "working_capital", "leverage", "efficiency", "growth", "investment"]);
  });
});

/** A minimal fake CapabilityResult, for orchestrator unit tests that don't
 * need real formulas — only the aggregation/dedup mechanics. */
function makeFakeItem<T extends { id: string }>(overrides: T): T {
  return overrides;
}

function makeFakeResult(overrides: Partial<CapabilityResult> = {}): CapabilityResult {
  return { metrics: [], ratios: [], observations: [], evidence: [], signals: [], ...overrides };
}

describe("FinancialIntelligenceOrchestrator — unit tests with test-double packs", () => {
  const document = makeDocument({ documentId: "doc-1" });

  it("runs every registered pack and records packsExecuted in registration order", () => {
    const registry = new CapabilityPackRegistry();
    registry.register({ id: "pack-a", name: "A", run: () => makeFakeResult() });
    registry.register({ id: "pack-b", name: "B", run: () => makeFakeResult() });
    const orchestrator = new FinancialIntelligenceOrchestrator(registry);
    const result = orchestrator.analyze(document, []);
    expect(result.packsExecuted).toEqual(["pack-a", "pack-b"]);
    expect(result.documentId).toBe("doc-1");
  });

  it("concatenates every pack's metrics/ratios/observations/evidence/signals", () => {
    const registry = new CapabilityPackRegistry();
    const metricA = makeFakeItem({ id: "m-a", definitionId: "d", value: 1, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: Confidence.create(0.8), basis: "" });
    const metricB = makeFakeItem({ id: "m-b", definitionId: "d", value: 2, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: Confidence.create(0.8), basis: "" });
    registry.register({ id: "pack-a", name: "A", run: () => makeFakeResult({ metrics: [metricA] }) });
    registry.register({ id: "pack-b", name: "B", run: () => makeFakeResult({ metrics: [metricB] }) });
    const orchestrator = new FinancialIntelligenceOrchestrator(registry);
    const result = orchestrator.analyze(document, []);
    expect(result.metrics.map((m) => m.id)).toEqual(["m-a", "m-b"]);
  });

  it("deduplicates by id across packs — a metric/ratio/observation/evidence/signal with the same id from two packs appears once", () => {
    const registry = new CapabilityPackRegistry();
    const sharedMetric = makeFakeItem({ id: "shared", definitionId: "total_current_liabilities", value: 100, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: Confidence.create(0.8), basis: "" });
    const ownMetric = makeFakeItem({ id: "own", definitionId: "cash_generated", value: 50, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: Confidence.create(0.8), basis: "" });
    registry.register({ id: "pack-a", name: "A", run: () => makeFakeResult({ metrics: [sharedMetric] }) });
    registry.register({ id: "pack-b", name: "B", run: () => makeFakeResult({ metrics: [sharedMetric, ownMetric] }) });
    const orchestrator = new FinancialIntelligenceOrchestrator(registry);
    const result = orchestrator.analyze(document, []);
    expect(result.metrics).toHaveLength(2);
    expect(result.metrics.map((m) => m.id).sort()).toEqual(["own", "shared"]);
  });

  it("does NOT merge two DIFFERENT records of the same type — only bit-identical (same id) records are deduplicated", () => {
    const registry = new CapabilityPackRegistry();
    const signalA = makeFakeItem({ id: "signal-a", type: "liquidity_stress" as const, financialEvidenceIds: ["e1"], documentId: "doc-1", confidence: Confidence.create(0.6), basis: "from pack A" });
    const signalB = makeFakeItem({ id: "signal-b", type: "liquidity_stress" as const, financialEvidenceIds: ["e2"], documentId: "doc-1", confidence: Confidence.create(0.6), basis: "from pack B" });
    registry.register({ id: "pack-a", name: "A", run: () => makeFakeResult({ signals: [signalA] }) });
    registry.register({ id: "pack-b", name: "B", run: () => makeFakeResult({ signals: [signalB] }) });
    const orchestrator = new FinancialIntelligenceOrchestrator(registry);
    const result = orchestrator.analyze(document, []);
    // Both signals are of the same TYPE but have different ids (genuinely
    // different evidence) — the orchestrator keeps both, it does not
    // semantically consolidate same-type signals (see FIO-002).
    expect(result.signals).toHaveLength(2);
    expect(result.signals.every((s) => s.type === "liquidity_stress")).toBe(true);
  });

  it("is deterministic: identical registry and input always produce identical output", () => {
    const registry = new CapabilityPackRegistry();
    registry.register({
      id: "pack-a",
      name: "A",
      run: () =>
        makeFakeResult({
          metrics: [makeFakeItem({ id: "m1", definitionId: "d", value: 1, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: Confidence.create(0.8), basis: "" })],
        }),
    });
    const orchestrator = new FinancialIntelligenceOrchestrator(registry);
    const first = orchestrator.analyze(document, []);
    const second = orchestrator.analyze(document, []);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("introduces no Finding, Root Cause, Recommendation, or Report field — result stops at signals", () => {
    const registry = new CapabilityPackRegistry();
    const orchestrator = new FinancialIntelligenceOrchestrator(registry);
    const result = orchestrator.analyze(document, []);
    expect(Object.keys(result).sort()).toEqual(["documentId", "evidence", "metrics", "observations", "packsExecuted", "ratios", "signals"]);
  });
});

/**
 * A minimal balance-sheet-shaped fixture: only a "Total Current Assets" row
 * and both a "Total Current Liabilities" and "Total Non-Current Liabilities"
 * row. Deliberately minimal — no Revenue/Expense/CashMovement/Equity table —
 * to isolate exactly which packs produce real output versus contribute only
 * a cross-reused, genuinely duplicate Metric.
 */
function makeMultiPackFixture(): { document: StructuredDocument; evidence: EvidenceObject[] } {
  const assetsTable = makeTable({
    id: "assets",
    headers: ["Description", "Amount"],
    rows: [["Total Current Assets", "60000"]],
  });
  const liabilitiesTable = makeTable({
    id: "liabilities",
    headers: ["Description", "Amount"],
    rows: [
      ["Total Current Liabilities", "100000"],
      ["Total Non-Current Liabilities", "50000"],
    ],
  });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "ae-total-current-assets", sourceLocation: { tableId: "assets", column: 1, row: 0 }, rawValue: "RM60,000.00", observedValue: 60000, normalizedValue: "60000 MYR" }),
    makeEvidence({ id: "le-total-current-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 0 }, rawValue: "RM100,000.00", observedValue: 100000, normalizedValue: "100000 MYR" }),
    makeEvidence({ id: "le-total-non-current-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 1 }, rawValue: "RM50,000.00", observedValue: 50000, normalizedValue: "50000 MYR" }),
  ];

  const document = makeDocument({
    tables: [assetsTable, liabilitiesTable],
    normalizedTerms: [
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Asset", sourceLocation: { tableId: "assets", column: 1 } }),
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Liability", sourceLocation: { tableId: "liabilities", column: 1 } }),
    ],
  });

  return { document, evidence };
}

describe("FinancialIntelligenceOrchestrator — full end-to-end integration with the real default registry", () => {
  it("runs all eight real Capability Packs and deduplicates a genuinely cross-reused Metric", () => {
    const { document, evidence } = makeMultiPackFixture();
    const orchestrator = new FinancialIntelligenceOrchestrator(createDefaultCapabilityPackRegistry());
    const result = orchestrator.analyze(document, evidence);

    expect(result.packsExecuted).toEqual(["liquidity", "profitability", "cash_flow", "working_capital", "leverage", "efficiency", "growth", "investment"]);

    // Investment finds no Revenue or Equity table in this fixture, so it
    // correctly produces nothing (reused Metrics still come back empty).
    expect(result.ratios.some((r) => r.definitionId === "return_on_equity")).toBe(false);

    // Efficiency's total_assets sums every Asset regardless of classification
    // — here just the one "current" Asset the fixture provides (no
    // non-current Asset row, no Revenue table, so asset_turnover itself
    // cannot be calculated and correctly does not appear).
    expect(result.metrics.some((m) => m.definitionId === "total_assets" && m.value === 60000)).toBe(true);
    expect(result.ratios.some((r) => r.definitionId === "asset_turnover")).toBe(false);

    // Growth's builder finds no Revenue-normalized column in this fixture
    // (no Revenue table at all) — it correctly produces nothing.
    expect(result.ratios.some((r) => r.definitionId === "revenue_growth_rate")).toBe(false);

    // total_current_liabilities is independently computed by Liquidity
    // (directly) and reused by Cash Flow and Working Capital (both call
    // Liquidity's TotalCurrentLiabilitiesCalculator internally) — three
    // sources, same content-derived id, must collapse to exactly one entry.
    const totalCurrentLiabilitiesMetrics = result.metrics.filter((m) => m.definitionId === "total_current_liabilities");
    expect(totalCurrentLiabilitiesMetrics).toHaveLength(1);

    // total_current_assets is similarly reused by Liquidity and Working Capital.
    const totalCurrentAssetsMetrics = result.metrics.filter((m) => m.definitionId === "total_current_assets");
    expect(totalCurrentAssetsMetrics).toHaveLength(1);

    // Leverage's total_liabilities (current + non-current) is a genuinely
    // different Metric (different definitionId, different id) — not deduped away.
    expect(result.metrics.some((m) => m.definitionId === "total_liabilities" && m.value === 150000)).toBe(true);
  });

  it("aggregates real Evidence/Signals from multiple packs without merging genuinely distinct same-type records", () => {
    const { document, evidence } = makeMultiPackFixture();
    const orchestrator = new FinancialIntelligenceOrchestrator(createDefaultCapabilityPackRegistry());
    const result = orchestrator.analyze(document, evidence);

    // current_ratio = 60000/100000 = 0.6 (Liquidity fires); working_capital_ratio
    // = (60000-100000)/100000 = -0.4 (Working Capital fires) — both
    // independently produce working_capital_pressure evidence and a
    // liquidity_stress signal, with genuinely different ids (different
    // triggering Observations) — both are real, both are kept.
    const workingCapitalPressureEvidence = result.evidence.filter((e) => e.type === "working_capital_pressure");
    expect(workingCapitalPressureEvidence).toHaveLength(2);
    expect(new Set(workingCapitalPressureEvidence.map((e) => e.id)).size).toBe(2);

    const liquidityStressSignals = result.signals.filter((s) => s.type === "liquidity_stress");
    expect(liquidityStressSignals).toHaveLength(2);

    // Every evidence record still traces back to real EvidenceObject ids —
    // explainability preserved through the orchestrator's aggregation.
    for (const evidenceRecord of result.evidence) {
      expect(evidenceRecord.evidenceObjectIds.length).toBeGreaterThan(0);
      for (const id of evidenceRecord.evidenceObjectIds) {
        expect(evidence.some((e) => e.id === id)).toBe(true);
      }
    }
  });

  it("is deterministic against the real default registry", () => {
    const { document, evidence } = makeMultiPackFixture();
    const orchestrator = new FinancialIntelligenceOrchestrator(createDefaultCapabilityPackRegistry());
    const first = orchestrator.analyze(document, evidence);
    const second = orchestrator.analyze(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("a document with no recognizable columns produces empty results from every pack, without throwing", () => {
    const document = makeDocument({ tables: [], normalizedTerms: [] });
    const orchestrator = new FinancialIntelligenceOrchestrator(createDefaultCapabilityPackRegistry());
    expect(() => orchestrator.analyze(document, [])).not.toThrow();
    const result = orchestrator.analyze(document, []);
    expect(result.metrics).toHaveLength(0);
    expect(result.ratios).toHaveLength(0);
    expect(result.observations).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.signals).toHaveLength(0);
    expect(result.packsExecuted).toEqual(["liquidity", "profitability", "cash_flow", "working_capital", "leverage", "efficiency", "growth", "investment"]);
  });
});
