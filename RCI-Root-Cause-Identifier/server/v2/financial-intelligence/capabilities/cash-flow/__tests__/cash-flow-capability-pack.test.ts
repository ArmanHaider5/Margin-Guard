import { describe, it, expect } from "vitest";
import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../../../__tests__/fixtures.js";
import type { StructuredDocument, EvidenceObject } from "../../../../shared/index.js";
import { buildCashMovements } from "../cash-movement-builder.js";
import { CashGeneratedCalculator, CashUsedCalculator, OperatingCashFlowCalculator, NetCashFlowCalculator } from "../cash-flow-metric-calculators.js";
import { OperatingCashFlowRatioCalculator, CashCoverageRatioCalculator } from "../cash-flow-ratio-calculators.js";
import { OperatingCashFlowNegativeCalculator, CashCoverageRatioLowCalculator, CASH_COVERAGE_RATIO_MINIMUM } from "../cash-flow-observation-calculators.js";
import { generateCashFlowEvidence } from "../cash-flow-evidence-generator.js";
import { runCashFlowCapabilityPack } from "../cash-flow-capability-pack.js";

/**
 * A cash-flow-statement-shaped fixture: one "inflow" line, two "outflow"
 * lines, and a "Net Cash from Operating Activities" subtotal row (excluded —
 * proving the subtotal-exclusion heuristic), plus a Liabilities table
 * (reused from Liquidity's own fixture shape) supplying
 * total_current_liabilities.
 */
function makeCashFlowFixture(cashGenerated: number, cashUsed: number, currentLiabilities: number): {
  document: StructuredDocument;
  evidence: EvidenceObject[];
} {
  const netCashFlow = cashGenerated - cashUsed;
  const cashFlowTable = makeTable({
    id: "cash-flow",
    headers: ["Description", "Amount"],
    rows: [
      ["Cash received from customers", String(cashGenerated)],
      ["Cash paid to suppliers", String(-cashUsed)],
      ["Net Cash from Operating Activities", String(netCashFlow)],
    ],
  });
  const liabilitiesTable = makeTable({
    id: "liabilities",
    headers: ["Description", "Amount"],
    rows: [
      ["Trade Payables", "40000"],
      ["Total Current Liabilities", String(currentLiabilities)],
      ["Long-Term Loan", "150000"],
    ],
  });

  const cashFlowNormalizedTerm = makeNormalizedTerm({
    originalTerm: "Amount",
    canonicalTerm: "Cash Movement",
    sourceLocation: { tableId: "cash-flow", column: 1 },
  });
  const liabilitiesNormalizedTerm = makeNormalizedTerm({
    originalTerm: "Amount",
    canonicalTerm: "Liability",
    sourceLocation: { tableId: "liabilities", column: 1 },
  });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "ce-inflow", sourceLocation: { tableId: "cash-flow", column: 1, row: 0 }, rawValue: `RM${cashGenerated}.00`, observedValue: cashGenerated, normalizedValue: `${cashGenerated} MYR` }),
    makeEvidence({ id: "ce-outflow", sourceLocation: { tableId: "cash-flow", column: 1, row: 1 }, rawValue: `RM${-cashUsed}.00`, observedValue: -cashUsed, normalizedValue: `${-cashUsed} MYR` }),
    makeEvidence({ id: "ce-net", sourceLocation: { tableId: "cash-flow", column: 1, row: 2 }, rawValue: `RM${netCashFlow}.00`, observedValue: netCashFlow, normalizedValue: `${netCashFlow} MYR` }),
    makeEvidence({ id: "le-payables", sourceLocation: { tableId: "liabilities", column: 1, row: 0 }, rawValue: "RM40,000.00", observedValue: 40000, normalizedValue: "40000 MYR" }),
    makeEvidence({ id: "le-total-current-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 1 }, rawValue: `RM${currentLiabilities}.00`, observedValue: currentLiabilities, normalizedValue: `${currentLiabilities} MYR` }),
    makeEvidence({ id: "le-loan", sourceLocation: { tableId: "liabilities", column: 1, row: 2 }, rawValue: "RM150,000.00", observedValue: 150000, normalizedValue: "150000 MYR" }),
  ];

  const document = makeDocument({
    tables: [cashFlowTable, liabilitiesTable],
    normalizedTerms: [cashFlowNormalizedTerm, liabilitiesNormalizedTerm],
  });

  return { document, evidence };
}

describe("buildCashMovements", () => {
  it("classifies by sign (positive = inflow, negative = outflow) and excludes the Net Cash subtotal row", () => {
    const { document, evidence } = makeCashFlowFixture(500000, 450000, 200000);
    const cashMovements = buildCashMovements(document, evidence);

    expect(cashMovements).toHaveLength(2);
    const inflow = cashMovements.find((c) => c.direction === "inflow");
    const outflow = cashMovements.find((c) => c.direction === "outflow");
    expect(inflow?.amount.amount).toBe(500000);
    expect(outflow?.amount.amount).toBe(450000); // stored as a positive magnitude
    expect(cashMovements.map((c) => c.amount.amount)).not.toContain(50000); // the Net Cash subtotal row
  });
});

describe("Cash Flow Metric calculators", () => {
  it("compute Cash Generated, Cash Used, Operating Cash Flow, and Net Cash Flow", () => {
    const { document, evidence } = makeCashFlowFixture(500000, 450000, 200000);
    const cashMovements = buildCashMovements(document, evidence);
    const context = {
      documentId: document.documentId,
      financialObjects: { assets: [], liabilities: [], equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements },
    };

    expect(new CashGeneratedCalculator().calculate(context)?.value).toBe(500000);
    expect(new CashUsedCalculator().calculate(context)?.value).toBe(450000);
    expect(new OperatingCashFlowCalculator().calculate(context)?.value).toBe(50000);
    expect(new NetCashFlowCalculator().calculate(context)?.value).toBe(50000);
  });
});

describe("Cash Flow Ratio calculators", () => {
  it("Operating Cash Flow Ratio and Cash Coverage Ratio both divide by total_current_liabilities", () => {
    const netCashFlowMetric = { id: "m1", definitionId: "net_cash_flow", value: 50000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" };
    const cashGeneratedMetric = { id: "m2", definitionId: "cash_generated", value: 500000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" };
    const liabilitiesMetric = { id: "m3", definitionId: "total_current_liabilities", value: 200000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" };
    const context = { documentId: "doc-1", metrics: [netCashFlowMetric, cashGeneratedMetric, liabilitiesMetric] };

    const operatingCashFlowRatio = new OperatingCashFlowRatioCalculator().calculate(context);
    const cashCoverageRatio = new CashCoverageRatioCalculator().calculate(context);
    expect(operatingCashFlowRatio?.value).toBeCloseTo(0.25, 5);
    expect(cashCoverageRatio?.value).toBeCloseTo(2.5, 5);
    expect(operatingCashFlowRatio?.category).toBe("cash_flow");
  });

  it("refuses to divide by zero current liabilities", () => {
    const calculator = new OperatingCashFlowRatioCalculator();
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "net_cash_flow", value: 100, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_current_liabilities", value: 0, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    expect(calculator.canCalculate(context)).toBe(false);
    expect(calculator.calculate(context)).toBeUndefined();
  });
});

describe("Cash Flow Observation calculators", () => {
  it("OperatingCashFlowNegativeCalculator only fires when the ratio is below zero", () => {
    const calculator = new OperatingCashFlowNegativeCalculator();
    const healthy = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "operating_cash_flow_ratio", category: "cash_flow" as const, value: 0.1, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(healthy)).toBe(false);

    const negative = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "operating_cash_flow_ratio", category: "cash_flow" as const, value: -0.1, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(negative)).toBe(true);
    expect(calculator.calculate(negative)?.statement).toBe("Operating cash flow is negative.");
  });

  it("CashCoverageRatioLowCalculator only fires when the ratio is below 1.0", () => {
    const calculator = new CashCoverageRatioLowCalculator();
    expect(CASH_COVERAGE_RATIO_MINIMUM).toBe(1.0);
    const healthy = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "cash_coverage_ratio", category: "cash_flow" as const, value: 1.2, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(healthy)).toBe(false);

    const low = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "cash_coverage_ratio", category: "cash_flow" as const, value: 0.5, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(low)).toBe(true);
    expect(calculator.calculate(low)?.statement).toBe("Cash coverage ratio is below 1.0.");
  });
});

describe("generateCashFlowEvidence", () => {
  it("resolves the full Observation → Ratio → Metric → CashMovement/Liability → EvidenceObject chain, including the cross-domain Liquidity side", () => {
    const { document, evidence } = makeCashFlowFixture(100000, 250000, 200000); // both observations fire
    const result = runCashFlowCapabilityPack(document, evidence);

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("negative_cash_flow");
    // Both ratios depend on total_current_liabilities (a Liquidity metric) —
    // the evidence chain must include the Liability-side EvidenceObject too,
    // not only the CashMovement-side ones (see docs/98_TECHNICAL_BACKLOG.md CF-004).
    expect(result.evidence[0]?.evidenceObjectIds).toEqual(
      expect.arrayContaining(["ce-inflow", "ce-outflow", "le-total-current-liabilities"]),
    );
  });

  it("produces no evidence when there is nothing to resolve", () => {
    const evidence = generateCashFlowEvidence("doc-1", [], [], [], []);
    expect(evidence).toHaveLength(0);
  });
});

describe("runCashFlowCapabilityPack — full end-to-end integration", () => {
  it("a healthy cash position produces metrics and ratios, but no observation, evidence, or signal", () => {
    const { document, evidence } = makeCashFlowFixture(500000, 450000, 200000);
    const result = runCashFlowCapabilityPack(document, evidence);

    expect(result.metrics.some((m) => m.definitionId === "total_current_liabilities")).toBe(true);
    expect(result.ratios).toHaveLength(2);
    expect(result.ratios.find((r) => r.definitionId === "operating_cash_flow_ratio")?.value).toBeCloseTo(0.25, 5);
    expect(result.observations).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.signals).toHaveLength(0);
  });

  it("weak cash coverage alone (positive operating cash flow, but coverage below 1.0) fires exactly one observation", () => {
    const { document, evidence } = makeCashFlowFixture(150000, 140000, 200000);
    const result = runCashFlowCapabilityPack(document, evidence);

    const observationIds = result.observations.map((o) => o.definitionId);
    expect(observationIds).toEqual(["cash_coverage_ratio_low"]);
    expect(result.evidence).toHaveLength(1);
    expect(result.signals.some((s) => s.type === "cash_conversion_deterioration")).toBe(true);
  });

  it("negative operating cash flow AND weak coverage fire both observations", () => {
    const { document, evidence } = makeCashFlowFixture(100000, 250000, 200000);
    const result = runCashFlowCapabilityPack(document, evidence);

    const observationIds = result.observations.map((o) => o.definitionId).sort();
    expect(observationIds).toEqual(["cash_coverage_ratio_low", "operating_cash_flow_negative"]);
    expect(result.evidence).toHaveLength(1);

    // Mandatory Evidence Chain, verified end to end:
    const signal = result.signals.find((s) => s.type === "cash_conversion_deterioration")!;
    expect(signal.financialEvidenceIds).toEqual(result.evidence.map((e) => e.id));
    for (const evidenceRecord of result.evidence) {
      expect(evidenceRecord.evidenceObjectIds.length).toBeGreaterThan(0);
      for (const id of evidenceRecord.evidenceObjectIds) {
        expect(evidence.some((e) => e.id === id)).toBe(true);
      }
    }
  });

  it("a document with no recognizable Cash Movement/Liability columns produces empty results without throwing", () => {
    const document = makeDocument({ tables: [], normalizedTerms: [] });
    expect(() => runCashFlowCapabilityPack(document, [])).not.toThrow();
    const result = runCashFlowCapabilityPack(document, []);
    expect(result).toEqual({ cashMovements: [], metrics: [], ratios: [], observations: [], evidence: [], signals: [] });
  });

  it("is deterministic: identical input always produces identical output, including all derived ids", () => {
    const { document, evidence } = makeCashFlowFixture(100000, 250000, 200000);
    const first = runCashFlowCapabilityPack(document, evidence);
    const second = runCashFlowCapabilityPack(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
