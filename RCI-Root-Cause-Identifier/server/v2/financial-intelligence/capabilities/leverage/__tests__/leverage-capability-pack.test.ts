import { describe, it, expect } from "vitest";
import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../../../__tests__/fixtures.js";
import { Confidence, Money } from "../../../../shared/index.js";
import type { StructuredDocument, EvidenceObject } from "../../../../shared/index.js";
import { buildLeverageFinancialObjects } from "../leverage-object-builder.js";
import { TotalLiabilitiesCalculator, TotalEquityCalculator } from "../leverage-metric-calculators.js";
import { DebtToEquityCalculator } from "../debt-to-equity-calculator.js";
import { DebtToEquityNegativeCalculator } from "../debt-to-equity-negative-calculator.js";
import { generateLeverageEvidence } from "../leverage-evidence-generator.js";
import { runLeverageCapabilityPack } from "../leverage-capability-pack.js";

/**
 * A balance-sheet-shaped fixture: a Liabilities table with both a "Total
 * Current Liabilities" row (Liquidity's target, reused) and a "Total
 * Non-Current Liabilities" row (this pack's own target, in the *same*
 * Liability-normalized column, proving the two builders never collide), and
 * an Equity table with a "Total Equity" row. `equityValue` may be negative,
 * to exercise the negative-equity Observation.
 */
function makeLeverageFixture(currentLiabilities: number, nonCurrentLiabilities: number, equityValue: number): {
  document: StructuredDocument;
  evidence: EvidenceObject[];
} {
  const liabilitiesTable = makeTable({
    id: "liabilities",
    headers: ["Description", "Amount"],
    rows: [
      ["Trade Payables", "25000"],
      ["Total Current Liabilities", String(currentLiabilities)],
      ["Bank Loan (Long-Term)", "80000"],
      ["Total Non-Current Liabilities", String(nonCurrentLiabilities)],
    ],
  });
  const equityTable = makeTable({
    id: "equity",
    headers: ["Description", "Amount"],
    rows: [
      ["Share Capital", "50000"],
      ["Retained Earnings", "30000"],
      ["Total Equity", String(equityValue)],
    ],
  });

  const liabilitiesNormalizedTerm = makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Liability", sourceLocation: { tableId: "liabilities", column: 1 } });
  const equityNormalizedTerm = makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Equity", sourceLocation: { tableId: "equity", column: 1 } });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "le-payables", sourceLocation: { tableId: "liabilities", column: 1, row: 0 }, rawValue: "RM25,000.00", observedValue: 25000, normalizedValue: "25000 MYR" }),
    makeEvidence({ id: "le-total-current-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 1 }, rawValue: `RM${currentLiabilities}.00`, observedValue: currentLiabilities, normalizedValue: `${currentLiabilities} MYR` }),
    makeEvidence({ id: "le-bank-loan", sourceLocation: { tableId: "liabilities", column: 1, row: 2 }, rawValue: "RM80,000.00", observedValue: 80000, normalizedValue: "80000 MYR" }),
    makeEvidence({ id: "le-total-non-current-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 3 }, rawValue: `RM${nonCurrentLiabilities}.00`, observedValue: nonCurrentLiabilities, normalizedValue: `${nonCurrentLiabilities} MYR` }),
    makeEvidence({ id: "ee-share-capital", sourceLocation: { tableId: "equity", column: 1, row: 0 }, rawValue: "RM50,000.00", observedValue: 50000, normalizedValue: "50000 MYR" }),
    makeEvidence({ id: "ee-retained-earnings", sourceLocation: { tableId: "equity", column: 1, row: 1 }, rawValue: "RM30,000.00", observedValue: 30000, normalizedValue: "30000 MYR" }),
    makeEvidence({ id: "ee-total-equity", sourceLocation: { tableId: "equity", column: 1, row: 2 }, rawValue: `RM${equityValue}.00`, observedValue: equityValue, normalizedValue: `${equityValue} MYR` }),
  ];

  const document = makeDocument({
    tables: [liabilitiesTable, equityTable],
    normalizedTerms: [liabilitiesNormalizedTerm, equityNormalizedTerm],
  });

  return { document, evidence };
}

describe("buildLeverageFinancialObjects", () => {
  it("constructs one non-current Liability and one Equity, from subtotal rows only", () => {
    const { document, evidence } = makeLeverageFixture(80000, 50000, 100000);
    const { equity, nonCurrentLiabilities } = buildLeverageFinancialObjects(document, evidence);

    expect(nonCurrentLiabilities).toHaveLength(1);
    expect(nonCurrentLiabilities[0]?.classification).toBe("non_current");
    expect(nonCurrentLiabilities[0]?.totalValue.amount).toBe(50000);

    expect(equity).toHaveLength(1);
    expect(equity[0]?.totalValue.amount).toBe(100000);
  });

  it("excludes Trade Payables, Total Current Liabilities, Bank Loan, Share Capital, and Retained Earnings", () => {
    const { document, evidence } = makeLeverageFixture(80000, 50000, 100000);
    const { equity, nonCurrentLiabilities } = buildLeverageFinancialObjects(document, evidence);
    expect(nonCurrentLiabilities.map((l) => l.totalValue.amount)).not.toContain(25000);
    expect(nonCurrentLiabilities.map((l) => l.totalValue.amount)).not.toContain(80000); // Bank Loan line item, not the subtotal
    expect(equity.map((e) => e.totalValue.amount)).not.toContain(50000);
    expect(equity.map((e) => e.totalValue.amount)).not.toContain(30000);
  });
});

describe("Leverage Metric calculators", () => {
  it("TotalLiabilitiesCalculator sums both current (reused) and non-current (own) Liability entries", () => {
    const { document, evidence } = makeLeverageFixture(80000, 50000, 100000);
    const { nonCurrentLiabilities } = buildLeverageFinancialObjects(document, evidence);
    // Simulate the orchestrator's merge of Liquidity's current liabilities + this pack's non-current ones:
    const currentLiability = {
      id: "current-liab-1",
      accountGroupId: "current-liabilities",
      classification: "current" as const,
      totalValue: Money.create(80000, "MYR"),
      confidence: Confidence.create(0.8),
      evidenceObjectIds: ["le-total-current-liabilities"],
    };
    const context = {
      documentId: document.documentId,
      financialObjects: { assets: [], liabilities: [currentLiability, ...nonCurrentLiabilities], equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    };
    const metric = new TotalLiabilitiesCalculator().calculate(context);
    expect(metric?.value).toBe(80000 + 50000);
  });

  it("TotalEquityCalculator sums Equity entries", () => {
    const { document, evidence } = makeLeverageFixture(80000, 50000, 100000);
    const { equity } = buildLeverageFinancialObjects(document, evidence);
    const context = {
      documentId: document.documentId,
      financialObjects: { assets: [], liabilities: [], equity, revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    };
    expect(new TotalEquityCalculator().calculate(context)?.value).toBe(100000);
  });
});

describe("DebtToEquityCalculator", () => {
  it("computes total_liabilities / total_equity", () => {
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "total_liabilities", value: 130000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_equity", value: 100000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    const ratio = new DebtToEquityCalculator().calculate(context);
    expect(ratio?.value).toBeCloseTo(1.3, 5);
    expect(ratio?.category).toBe("leverage");
  });

  it("refuses to divide by zero equity", () => {
    const calculator = new DebtToEquityCalculator();
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "total_liabilities", value: 100, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_equity", value: 0, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    expect(calculator.canCalculate(context)).toBe(false);
    expect(calculator.calculate(context)).toBeUndefined();
  });
});

describe("DebtToEquityNegativeCalculator", () => {
  it("only fires when debt_to_equity is negative", () => {
    const calculator = new DebtToEquityNegativeCalculator();
    const healthy = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "debt_to_equity", category: "leverage" as const, value: 1.3, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(healthy)).toBe(false);

    const negative = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "debt_to_equity", category: "leverage" as const, value: -6.5, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(negative)).toBe(true);
    expect(calculator.calculate(negative)?.statement).toBe("Debt to equity ratio is negative.");
  });
});

describe("generateLeverageEvidence", () => {
  it("resolves the full chain including current liabilities, non-current liabilities, and equity", () => {
    const { document, evidence } = makeLeverageFixture(80000, 50000, -20000); // negative equity
    const result = runLeverageCapabilityPack(document, evidence);

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("debt_growth");
    expect(result.evidence[0]?.evidenceObjectIds).toEqual(
      expect.arrayContaining(["le-total-current-liabilities", "le-total-non-current-liabilities", "ee-total-equity"]),
    );
  });

  it("produces no evidence when there is nothing to resolve", () => {
    const evidence = generateLeverageEvidence("doc-1", [], [], [], []);
    expect(evidence).toHaveLength(0);
  });
});

describe("runLeverageCapabilityPack — full end-to-end integration", () => {
  it("a healthy leverage position produces metrics and a ratio, but no observation, evidence, or signal", () => {
    const { document, evidence } = makeLeverageFixture(80000, 50000, 100000);
    const result = runLeverageCapabilityPack(document, evidence);

    expect(result.liabilities).toHaveLength(2); // current (reused) + non-current (own)
    expect(result.equity).toHaveLength(1);
    expect(result.metrics.some((m) => m.definitionId === "total_liabilities")).toBe(true);
    expect(result.metrics.some((m) => m.definitionId === "total_equity")).toBe(true);
    expect(result.ratios).toHaveLength(1);
    expect(result.ratios[0]?.value).toBeCloseTo(1.3, 5);
    expect(result.observations).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.signals).toHaveLength(0);
  });

  it("negative equity (total liabilities exceed total equity) produces an observation, evidence, and an over_reliance_on_debt signal", () => {
    const { document, evidence } = makeLeverageFixture(80000, 50000, -20000);
    const result = runLeverageCapabilityPack(document, evidence);

    expect(result.ratios[0]?.value).toBeCloseTo(-6.5, 5);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.definitionId).toBe("debt_to_equity_negative");
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("debt_growth");
    expect(result.signals.some((s) => s.type === "over_reliance_on_debt")).toBe(true);

    // Mandatory Evidence Chain, verified end to end:
    const signal = result.signals.find((s) => s.type === "over_reliance_on_debt")!;
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
    expect(() => runLeverageCapabilityPack(document, [])).not.toThrow();
    const result = runLeverageCapabilityPack(document, []);
    expect(result).toEqual({ equity: [], liabilities: [], metrics: [], ratios: [], observations: [], evidence: [], signals: [] });
  });

  it("is deterministic: identical input always produces identical output, including all derived ids", () => {
    const { document, evidence } = makeLeverageFixture(80000, 50000, -20000);
    const first = runLeverageCapabilityPack(document, evidence);
    const second = runLeverageCapabilityPack(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
