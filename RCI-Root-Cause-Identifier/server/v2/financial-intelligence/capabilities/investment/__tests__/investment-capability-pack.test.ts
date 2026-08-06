import { describe, it, expect } from "vitest";
import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../../../__tests__/fixtures.js";
import type { StructuredDocument, EvidenceObject } from "../../../../shared/index.js";
import { ReturnOnEquityCalculator } from "../return-on-equity-calculator.js";
import { ReturnOnEquityNegativeCalculator } from "../return-on-equity-negative-calculator.js";
import { generateInvestmentEvidence } from "../investment-evidence-generator.js";
import { runInvestmentCapabilityPack } from "../investment-capability-pack.js";

/**
 * A P&L-plus-Equity fixture: a Revenue table with a "Total Revenue" row, an
 * Expense table with a "Cost of Goods Sold" row (feeding Profitability's
 * `GrossProfitCalculator`, reused unmodified), and an Equity table with a
 * "Total Equity" row (feeding Leverage's `TotalEquityCalculator`, reused
 * unmodified). `equityValue` may be small/negative relative to gross profit,
 * to exercise the negative-ROE Observation.
 */
function makeInvestmentFixture(revenueValue: number, cogsValue: number, equityValue: number): {
  document: StructuredDocument;
  evidence: EvidenceObject[];
} {
  const revenueTable = makeTable({ id: "revenue", headers: ["Description", "Amount"], rows: [["Total Revenue", String(revenueValue)]] });
  const expenseTable = makeTable({ id: "expense", headers: ["Description", "Amount"], rows: [["Cost of Goods Sold", String(cogsValue)]] });
  const equityTable = makeTable({ id: "equity", headers: ["Description", "Amount"], rows: [["Total Equity", String(equityValue)]] });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "re-total-revenue", sourceLocation: { tableId: "revenue", column: 1, row: 0 }, rawValue: `RM${revenueValue}.00`, observedValue: revenueValue, normalizedValue: `${revenueValue} MYR` }),
    makeEvidence({ id: "ee-cogs", sourceLocation: { tableId: "expense", column: 1, row: 0 }, rawValue: `RM${cogsValue}.00`, observedValue: cogsValue, normalizedValue: `${cogsValue} MYR` }),
    makeEvidence({ id: "eq-total-equity", sourceLocation: { tableId: "equity", column: 1, row: 0 }, rawValue: `RM${equityValue}.00`, observedValue: equityValue, normalizedValue: `${equityValue} MYR` }),
  ];

  const document = makeDocument({
    tables: [revenueTable, expenseTable, equityTable],
    normalizedTerms: [
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Revenue", sourceLocation: { tableId: "revenue", column: 1 } }),
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Expense", sourceLocation: { tableId: "expense", column: 1 } }),
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Equity", sourceLocation: { tableId: "equity", column: 1 } }),
    ],
  });

  return { document, evidence };
}

describe("ReturnOnEquityCalculator", () => {
  it("computes gross_profit / total_equity", () => {
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "gross_profit", value: 50000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_equity", value: 100000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    const ratio = new ReturnOnEquityCalculator().calculate(context);
    expect(ratio?.value).toBeCloseTo(0.5, 5);
    expect(ratio?.category).toBe("investment");
  });

  it("refuses to divide by zero equity", () => {
    const calculator = new ReturnOnEquityCalculator();
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "gross_profit", value: 50000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_equity", value: 0, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    expect(calculator.canCalculate(context)).toBe(false);
    expect(calculator.calculate(context)).toBeUndefined();
  });
});

describe("ReturnOnEquityNegativeCalculator", () => {
  it("only fires when return_on_equity is negative", () => {
    const calculator = new ReturnOnEquityNegativeCalculator();
    const healthy = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "return_on_equity", category: "investment" as const, value: 0.5, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(healthy)).toBe(false);

    const negative = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "return_on_equity", category: "investment" as const, value: -0.3, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(negative)).toBe(true);
    expect(calculator.calculate(negative)?.statement).toBe("Return on equity is negative.");
  });
});

describe("generateInvestmentEvidence", () => {
  it("resolves the full chain including revenue, cogs expense, and equity", () => {
    const { document, evidence } = makeInvestmentFixture(50000, 80000, 20000); // gross profit negative -> ROE negative
    const result = runInvestmentCapabilityPack(document, evidence);

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("margin_erosion");
    expect(result.evidence[0]?.evidenceObjectIds).toEqual(
      expect.arrayContaining(["re-total-revenue", "ee-cogs", "eq-total-equity"]),
    );
  });

  it("produces no evidence when there is nothing to resolve", () => {
    const evidence = generateInvestmentEvidence("doc-1", [], [], [], []);
    expect(evidence).toHaveLength(0);
  });
});

describe("runInvestmentCapabilityPack — full end-to-end integration", () => {
  it("a healthy investment position produces metrics and a ratio, but no observation, evidence, or signal", () => {
    const { document, evidence } = makeInvestmentFixture(150000, 80000, 100000);
    const result = runInvestmentCapabilityPack(document, evidence);

    expect(result.revenue).toHaveLength(1);
    expect(result.expenses).toHaveLength(1);
    expect(result.equity).toHaveLength(1);
    expect(result.metrics.some((m) => m.definitionId === "gross_profit" && m.value === 70000)).toBe(true);
    expect(result.metrics.some((m) => m.definitionId === "total_equity" && m.value === 100000)).toBe(true);
    expect(result.ratios).toHaveLength(1);
    expect(result.ratios[0]?.value).toBeCloseTo(0.7, 5);
    expect(result.observations).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.signals).toHaveLength(0);
  });

  it("negative gross profit relative to equity produces an observation, evidence, and a margin_compression signal", () => {
    const { document, evidence } = makeInvestmentFixture(50000, 80000, 20000);
    const result = runInvestmentCapabilityPack(document, evidence);

    expect(result.ratios[0]?.value).toBeCloseTo(-1.5, 5);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.definitionId).toBe("return_on_equity_negative");
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("margin_erosion");
    expect(result.signals.some((s) => s.type === "margin_compression")).toBe(true);

    // Mandatory Evidence Chain, verified end to end:
    const signal = result.signals.find((s) => s.type === "margin_compression")!;
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
    expect(() => runInvestmentCapabilityPack(document, [])).not.toThrow();
    const result = runInvestmentCapabilityPack(document, []);
    expect(result).toEqual({ revenue: [], expenses: [], equity: [], metrics: [], ratios: [], observations: [], evidence: [], signals: [] });
  });

  it("is deterministic: identical input always produces identical output, including all derived ids", () => {
    const { document, evidence } = makeInvestmentFixture(50000, 80000, 20000);
    const first = runInvestmentCapabilityPack(document, evidence);
    const second = runInvestmentCapabilityPack(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
