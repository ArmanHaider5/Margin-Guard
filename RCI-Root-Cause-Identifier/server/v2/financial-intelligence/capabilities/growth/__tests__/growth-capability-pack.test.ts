import { describe, it, expect } from "vitest";
import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../../../__tests__/fixtures.js";
import type { StructuredDocument, EvidenceObject } from "../../../../shared/index.js";
import { buildPeriodRevenueSequence } from "../period-revenue-builder.js";
import { CurrentPeriodRevenueCalculator, PriorPeriodRevenueCalculator } from "../growth-metric-calculators.js";
import { RevenueGrowthRateCalculator } from "../revenue-growth-rate-calculator.js";
import { RevenueGrowthNegativeCalculator } from "../revenue-growth-negative-calculator.js";
import { generateGrowthEvidence } from "../growth-evidence-generator.js";
import { runGrowthCapabilityPack } from "../growth-capability-pack.js";

/**
 * A Revenue table with three monthly rows (Jan/Feb/Mar) and a trailing
 * "Total Revenue" subtotal row — proving the builder takes the *last two
 * individual* rows (Feb, Mar) as prior/current, not the subtotal. `marValue`
 * may be lower than `febValue`, to exercise the negative-growth Observation.
 */
function makeGrowthFixture(janValue: number, febValue: number, marValue: number): {
  document: StructuredDocument;
  evidence: EvidenceObject[];
} {
  const total = janValue + febValue + marValue;
  const revenueTable = makeTable({
    id: "revenue",
    headers: ["Description", "Amount"],
    rows: [
      ["Jan 2026", String(janValue)],
      ["Feb 2026", String(febValue)],
      ["Mar 2026", String(marValue)],
      ["Total Revenue", String(total)],
    ],
  });

  const revenueNormalizedTerm = makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Revenue", sourceLocation: { tableId: "revenue", column: 1 } });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "re-jan", sourceLocation: { tableId: "revenue", column: 1, row: 0 }, rawValue: `RM${janValue}.00`, observedValue: janValue, normalizedValue: `${janValue} MYR` }),
    makeEvidence({ id: "re-feb", sourceLocation: { tableId: "revenue", column: 1, row: 1 }, rawValue: `RM${febValue}.00`, observedValue: febValue, normalizedValue: `${febValue} MYR` }),
    makeEvidence({ id: "re-mar", sourceLocation: { tableId: "revenue", column: 1, row: 2 }, rawValue: `RM${marValue}.00`, observedValue: marValue, normalizedValue: `${marValue} MYR` }),
    makeEvidence({ id: "re-total", sourceLocation: { tableId: "revenue", column: 1, row: 3 }, rawValue: `RM${total}.00`, observedValue: total, normalizedValue: `${total} MYR` }),
  ];

  const document = makeDocument({
    tables: [revenueTable],
    normalizedTerms: [revenueNormalizedTerm],
  });

  return { document, evidence };
}

describe("buildPeriodRevenueSequence", () => {
  it("tags the last two non-subtotal rows as prior/current, excluding the Total Revenue row", () => {
    const { document, evidence } = makeGrowthFixture(1000, 1200, 1500);
    const periodRevenue = buildPeriodRevenueSequence(document, evidence);

    expect(periodRevenue).toHaveLength(2);
    const prior = periodRevenue.find((r) => r.periodSequence === "prior");
    const current = periodRevenue.find((r) => r.periodSequence === "current");
    expect(prior?.totalValue.amount).toBe(1200); // Feb
    expect(current?.totalValue.amount).toBe(1500); // Mar
    expect(prior?.evidenceObjectIds).toEqual(["re-feb"]);
    expect(current?.evidenceObjectIds).toEqual(["re-mar"]);
  });

  it("excludes January (only the last two of three qualifying rows are used)", () => {
    const { document, evidence } = makeGrowthFixture(1000, 1200, 1500);
    const periodRevenue = buildPeriodRevenueSequence(document, evidence);
    expect(periodRevenue.map((r) => r.totalValue.amount)).not.toContain(1000);
  });

  it("produces nothing when fewer than two qualifying rows exist", () => {
    const revenueTable = makeTable({ id: "revenue", headers: ["Description", "Amount"], rows: [["Total Revenue", "1000"]] });
    const document = makeDocument({
      tables: [revenueTable],
      normalizedTerms: [makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Revenue", sourceLocation: { tableId: "revenue", column: 1 } })],
    });
    const evidence = [makeEvidence({ id: "re-total", sourceLocation: { tableId: "revenue", column: 1, row: 0 }, rawValue: "RM1,000.00", observedValue: 1000, normalizedValue: "1000 MYR" })];
    expect(buildPeriodRevenueSequence(document, evidence)).toHaveLength(0);
  });
});

describe("Growth Metric calculators", () => {
  it("CurrentPeriodRevenueCalculator / PriorPeriodRevenueCalculator read only their own tagged Revenue entries", () => {
    const { document, evidence } = makeGrowthFixture(1000, 1200, 1500);
    const periodRevenue = buildPeriodRevenueSequence(document, evidence);
    const context = {
      documentId: document.documentId,
      financialObjects: { assets: [], liabilities: [], equity: [], revenue: periodRevenue, expense: [], workingCapitalComponents: [], cashMovements: [] },
    };
    expect(new CurrentPeriodRevenueCalculator().calculate(context)?.value).toBe(1500);
    expect(new PriorPeriodRevenueCalculator().calculate(context)?.value).toBe(1200);
  });

  it("produce no metric when their tagged subset is empty", () => {
    const context = {
      documentId: "doc-1",
      financialObjects: { assets: [], liabilities: [], equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    };
    expect(new CurrentPeriodRevenueCalculator().canCalculate(context)).toBe(false);
    expect(new PriorPeriodRevenueCalculator().canCalculate(context)).toBe(false);
  });
});

describe("RevenueGrowthRateCalculator", () => {
  it("computes (current - prior) / prior", () => {
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "current_period_revenue", value: 1500, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "prior_period_revenue", value: 1200, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    const ratio = new RevenueGrowthRateCalculator().calculate(context);
    expect(ratio?.value).toBeCloseTo(0.25, 5);
    expect(ratio?.category).toBe("growth");
  });

  it("refuses to divide by zero prior-period revenue", () => {
    const calculator = new RevenueGrowthRateCalculator();
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "current_period_revenue", value: 1500, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "prior_period_revenue", value: 0, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    expect(calculator.canCalculate(context)).toBe(false);
    expect(calculator.calculate(context)).toBeUndefined();
  });
});

describe("RevenueGrowthNegativeCalculator", () => {
  it("only fires when revenue_growth_rate is negative", () => {
    const calculator = new RevenueGrowthNegativeCalculator();
    const healthy = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "revenue_growth_rate", category: "growth" as const, value: 0.25, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(healthy)).toBe(false);

    const negative = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "revenue_growth_rate", category: "growth" as const, value: -0.2, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(negative)).toBe(true);
    expect(calculator.calculate(negative)?.statement).toBe("Revenue growth is negative.");
  });
});

describe("generateGrowthEvidence", () => {
  it("resolves the full chain back to the prior/current Revenue EvidenceObjects", () => {
    const { document, evidence } = makeGrowthFixture(1000, 1500, 1200); // Feb->Mar decline
    const result = runGrowthCapabilityPack(document, evidence);

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("revenue_growth");
    expect(result.evidence[0]?.evidenceObjectIds).toEqual(expect.arrayContaining(["re-feb", "re-mar"]));
  });

  it("produces no evidence when there is nothing to resolve", () => {
    const evidence = generateGrowthEvidence("doc-1", [], [], [], []);
    expect(evidence).toHaveLength(0);
  });
});

describe("runGrowthCapabilityPack — full end-to-end integration", () => {
  it("healthy (positive) growth produces metrics and a ratio, but no observation, evidence, or signal", () => {
    const { document, evidence } = makeGrowthFixture(1000, 1200, 1500);
    const result = runGrowthCapabilityPack(document, evidence);

    expect(result.periodRevenue).toHaveLength(2);
    expect(result.metrics.some((m) => m.definitionId === "current_period_revenue" && m.value === 1500)).toBe(true);
    expect(result.metrics.some((m) => m.definitionId === "prior_period_revenue" && m.value === 1200)).toBe(true);
    expect(result.ratios).toHaveLength(1);
    expect(result.ratios[0]?.value).toBeCloseTo(0.25, 5);
    expect(result.observations).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.signals).toHaveLength(0);
  });

  it("negative growth (revenue declined) produces an observation, evidence, and a revenue_instability signal", () => {
    const { document, evidence } = makeGrowthFixture(1000, 1500, 1200);
    const result = runGrowthCapabilityPack(document, evidence);

    expect(result.ratios[0]?.value).toBeCloseTo(-0.2, 5);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.definitionId).toBe("revenue_growth_negative");
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("revenue_growth");
    expect(result.signals.some((s) => s.type === "revenue_instability")).toBe(true);

    // Mandatory Evidence Chain, verified end to end:
    const signal = result.signals.find((s) => s.type === "revenue_instability")!;
    expect(signal.financialEvidenceIds).toEqual(result.evidence.map((e) => e.id));
    for (const evidenceRecord of result.evidence) {
      expect(evidenceRecord.evidenceObjectIds.length).toBeGreaterThan(0);
      for (const id of evidenceRecord.evidenceObjectIds) {
        expect(evidence.some((e) => e.id === id)).toBe(true);
      }
    }
  });

  it("a document with no recognizable columns produces empty results without throwing", () => {
    const document = makeDocument({ tables: [], normalizedTerms: [] });
    expect(() => runGrowthCapabilityPack(document, [])).not.toThrow();
    const result = runGrowthCapabilityPack(document, []);
    expect(result).toEqual({ periodRevenue: [], metrics: [], ratios: [], observations: [], evidence: [], signals: [] });
  });

  it("is deterministic: identical input always produces identical output, including all derived ids", () => {
    const { document, evidence } = makeGrowthFixture(1000, 1500, 1200);
    const first = runGrowthCapabilityPack(document, evidence);
    const second = runGrowthCapabilityPack(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
