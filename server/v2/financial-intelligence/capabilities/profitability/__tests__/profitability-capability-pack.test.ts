import { describe, it, expect } from "vitest";
import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../../../__tests__/fixtures.js";
import type { StructuredDocument, EvidenceObject } from "../../../../shared/index.js";
import { buildRevenueAndExpenses } from "../revenue-expense-builder.js";
import {
  TotalRevenueCalculator,
  CostOfGoodsSoldCalculator,
  GrossProfitCalculator,
  TotalOperatingExpensesCalculator,
  NetProfitCalculator,
} from "../profitability-metric-calculators.js";
import { GrossMarginCalculator, NetMarginCalculator, OperatingMarginCalculator } from "../profitability-ratio-calculators.js";
import {
  GrossMarginNegativeCalculator,
  NetMarginNegativeCalculator,
  OperatingMarginNegativeCalculator,
} from "../profitability-observation-calculators.js";
import { generateProfitabilityEvidence } from "../profitability-evidence-generator.js";
import { runProfitabilityCapabilityPack } from "../profitability-capability-pack.js";

/**
 * A small, realistic P&L-shaped fixture: a Revenue table (one non-total line
 * item + a "Total Revenue" subtotal, proving the non-total row is excluded)
 * and an Expense table mixing a COGS line, an individual (non-total)
 * operating-expense line item, a "Total Operating Expenses" subtotal, and an
 * unclassifiable line (Interest Expense) that should be excluded entirely.
 */
function makeProfitAndLossFixture(revenue: number, cogs: number, operatingExpenses: number): {
  document: StructuredDocument;
  evidence: EvidenceObject[];
} {
  const revenueTable = makeTable({
    id: "revenue",
    headers: ["Description", "Amount"],
    rows: [
      ["Product Sales", "300000"],
      ["Total Revenue", String(revenue)],
    ],
  });
  const expenseTable = makeTable({
    id: "expenses",
    headers: ["Description", "Amount"],
    rows: [
      ["Cost of Goods Sold", String(cogs)],
      ["Rent", "20000"],
      ["Total Operating Expenses", String(operatingExpenses)],
      ["Interest Expense", "5000"],
    ],
  });

  const revenueNormalizedTerm = makeNormalizedTerm({
    originalTerm: "Amount",
    canonicalTerm: "Revenue",
    sourceLocation: { tableId: "revenue", column: 1 },
  });
  const expenseNormalizedTerm = makeNormalizedTerm({
    originalTerm: "Amount",
    canonicalTerm: "Expense",
    sourceLocation: { tableId: "expenses", column: 1 },
  });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "re-product-sales", sourceLocation: { tableId: "revenue", column: 1, row: 0 }, rawValue: "RM300,000.00", observedValue: 300000, normalizedValue: "300000 MYR" }),
    makeEvidence({ id: "re-total-revenue", sourceLocation: { tableId: "revenue", column: 1, row: 1 }, rawValue: `RM${revenue}.00`, observedValue: revenue, normalizedValue: `${revenue} MYR` }),
    makeEvidence({ id: "ee-cogs", sourceLocation: { tableId: "expenses", column: 1, row: 0 }, rawValue: `RM${cogs}.00`, observedValue: cogs, normalizedValue: `${cogs} MYR` }),
    makeEvidence({ id: "ee-rent", sourceLocation: { tableId: "expenses", column: 1, row: 1 }, rawValue: "RM20,000.00", observedValue: 20000, normalizedValue: "20000 MYR" }),
    makeEvidence({ id: "ee-total-opex", sourceLocation: { tableId: "expenses", column: 1, row: 2 }, rawValue: `RM${operatingExpenses}.00`, observedValue: operatingExpenses, normalizedValue: `${operatingExpenses} MYR` }),
    makeEvidence({ id: "ee-interest", sourceLocation: { tableId: "expenses", column: 1, row: 3 }, rawValue: "RM5,000.00", observedValue: 5000, normalizedValue: "5000 MYR" }),
  ];

  const document = makeDocument({
    tables: [revenueTable, expenseTable],
    normalizedTerms: [revenueNormalizedTerm, expenseNormalizedTerm],
  });

  return { document, evidence };
}

describe("buildRevenueAndExpenses", () => {
  it("constructs exactly one Revenue and two Expense entries (COGS + operating), from subtotal/labeled rows only", () => {
    const { document, evidence } = makeProfitAndLossFixture(500000, 200000, 200000);
    const { revenue, expenses } = buildRevenueAndExpenses(document, evidence);

    expect(revenue).toHaveLength(1);
    expect(revenue[0]?.totalValue.amount).toBe(500000);

    expect(expenses).toHaveLength(2);
    const cogs = expenses.find((e) => e.category === "cogs");
    const opex = expenses.find((e) => e.category === "operating");
    expect(cogs?.totalValue.amount).toBe(200000);
    expect(opex?.totalValue.amount).toBe(200000);
  });

  it("excludes the non-total revenue line item, the individual (non-total) rent line, and the unclassifiable Interest Expense line", () => {
    const { document, evidence } = makeProfitAndLossFixture(500000, 200000, 200000);
    const { revenue, expenses } = buildRevenueAndExpenses(document, evidence);
    expect(revenue.map((r) => r.totalValue.amount)).not.toContain(300000);
    expect(expenses.map((e) => e.totalValue.amount)).not.toContain(20000);
    expect(expenses.map((e) => e.totalValue.amount)).not.toContain(5000);
  });
});

describe("Profitability Metric calculators", () => {
  it("compute Revenue, COGS, Gross Profit, Operating Expenses, and Net Profit", () => {
    const { document, evidence } = makeProfitAndLossFixture(500000, 200000, 200000);
    const { revenue, expenses } = buildRevenueAndExpenses(document, evidence);
    const context = {
      documentId: document.documentId,
      financialObjects: { assets: [], liabilities: [], equity: [], revenue, expense: expenses, workingCapitalComponents: [], cashMovements: [] },
    };

    expect(new TotalRevenueCalculator().calculate(context)?.value).toBe(500000);
    expect(new CostOfGoodsSoldCalculator().calculate(context)?.value).toBe(200000);
    expect(new GrossProfitCalculator().calculate(context)?.value).toBe(300000);
    expect(new TotalOperatingExpensesCalculator().calculate(context)?.value).toBe(200000);
    expect(new NetProfitCalculator().calculate(context)?.value).toBe(100000);
  });

  it("NetProfitCalculator and (GrossProfit - OperatingExpenses) agree, despite being computed independently", () => {
    const { document, evidence } = makeProfitAndLossFixture(100000, 90000, 50000);
    const { revenue, expenses } = buildRevenueAndExpenses(document, evidence);
    const context = {
      documentId: document.documentId,
      financialObjects: { assets: [], liabilities: [], equity: [], revenue, expense: expenses, workingCapitalComponents: [], cashMovements: [] },
    };
    const grossProfit = new GrossProfitCalculator().calculate(context)!;
    const operatingExpenses = new TotalOperatingExpensesCalculator().calculate(context)!;
    const netProfit = new NetProfitCalculator().calculate(context)!;
    expect(netProfit.value).toBe(grossProfit.value - operatingExpenses.value);
  });
});

describe("Profitability Ratio calculators", () => {
  it("Gross/Net/Operating Margin = numerator / total_revenue; Net Margin and Operating Margin are equal (disclosed limitation)", () => {
    const { document, evidence } = makeProfitAndLossFixture(100000, 90000, 50000);
    const { revenue, expenses } = buildRevenueAndExpenses(document, evidence);
    const financialObjects = { assets: [], liabilities: [], equity: [], revenue, expense: expenses, workingCapitalComponents: [], cashMovements: [] };
    const metricContext = { documentId: document.documentId, financialObjects };

    const metrics = [
      new TotalRevenueCalculator().calculate(metricContext)!,
      new GrossProfitCalculator().calculate(metricContext)!,
      new NetProfitCalculator().calculate(metricContext)!,
    ];
    const ratioContext = { documentId: document.documentId, metrics };

    const grossMargin = new GrossMarginCalculator().calculate(ratioContext)!;
    const netMargin = new NetMarginCalculator().calculate(ratioContext)!;
    const operatingMargin = new OperatingMarginCalculator().calculate(ratioContext)!;

    expect(grossMargin.value).toBeCloseTo(10000 / 100000, 5);
    expect(netMargin.value).toBeCloseTo(-40000 / 100000, 5);
    expect(operatingMargin.value).toBeCloseTo(netMargin.value, 10);
    expect(grossMargin.category).toBe("profitability");
  });

  it("refuses to divide by zero revenue", () => {
    const calculator = new GrossMarginCalculator();
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "gross_profit", value: 100, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_revenue", value: 0, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    expect(calculator.canCalculate(context)).toBe(false);
    expect(calculator.calculate(context)).toBeUndefined();
  });
});

describe("Profitability Observation calculators", () => {
  it("only fire when the corresponding margin ratio is negative", () => {
    const calculator = new GrossMarginNegativeCalculator();
    const healthy = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "gross_margin", category: "profitability" as const, value: 0.1, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(healthy)).toBe(false);
    expect(calculator.calculate(healthy)).toBeUndefined();

    const negative = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "gross_margin", category: "profitability" as const, value: -0.1, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(negative)).toBe(true);
    const observation = calculator.calculate(negative);
    expect(observation?.category).toBe("profitability");
    expect(observation?.statement).toBe("Gross margin is negative.");
  });
});

describe("generateProfitabilityEvidence", () => {
  it("resolves the full Observation → Ratio → Metric → FinancialObject → EvidenceObject chain", () => {
    const { document, evidence } = makeProfitAndLossFixture(100000, 90000, 50000); // net/operating margin negative, gross positive
    const result = runProfitabilityCapabilityPack(document, evidence);

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("margin_erosion");
    expect(result.evidence[0]?.evidenceObjectIds).toEqual(
      expect.arrayContaining(["re-total-revenue", "ee-cogs", "ee-total-opex"]),
    );
  });

  it("produces no evidence when there is nothing to resolve", () => {
    const evidence = generateProfitabilityEvidence(
      "doc-1",
      [],
      [],
      [],
      { assets: [], liabilities: [], equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    );
    expect(evidence).toHaveLength(0);
  });
});

describe("runProfitabilityCapabilityPack — full end-to-end integration", () => {
  it("a healthy, profitable company produces metrics and ratios, but no observation, evidence, or signal", () => {
    const { document, evidence } = makeProfitAndLossFixture(500000, 200000, 200000);
    const result = runProfitabilityCapabilityPack(document, evidence);

    expect(result.metrics).toHaveLength(5);
    expect(result.ratios).toHaveLength(3);
    expect(result.ratios.find((r) => r.definitionId === "gross_margin")?.value).toBeCloseTo(0.6, 5);
    expect(result.observations).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.signals).toHaveLength(0);
  });

  it("a company unprofitable only at the bottom line produces exactly two negative-margin observations (not gross)", () => {
    const { document, evidence } = makeProfitAndLossFixture(100000, 90000, 50000);
    const result = runProfitabilityCapabilityPack(document, evidence);

    const observationIds = result.observations.map((o) => o.definitionId).sort();
    expect(observationIds).toEqual(["net_margin_negative", "operating_margin_negative"]);
    expect(result.evidence).toHaveLength(1);
    expect(result.signals.some((s) => s.type === "margin_compression")).toBe(true);
  });

  it("a company unprofitable at every level produces all three negative-margin observations", () => {
    const { document, evidence } = makeProfitAndLossFixture(100000, 150000, 20000);
    const result = runProfitabilityCapabilityPack(document, evidence);

    const observationIds = result.observations.map((o) => o.definitionId).sort();
    expect(observationIds).toEqual(["gross_margin_negative", "net_margin_negative", "operating_margin_negative"]);
    expect(result.evidence).toHaveLength(1);

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

  it("a document with no recognizable Revenue/Expense columns produces empty results without throwing", () => {
    const document = makeDocument({ tables: [], normalizedTerms: [] });
    expect(() => runProfitabilityCapabilityPack(document, [])).not.toThrow();
    const result = runProfitabilityCapabilityPack(document, []);
    expect(result).toEqual({ revenue: [], expenses: [], metrics: [], ratios: [], observations: [], evidence: [], signals: [] });
  });

  it("is deterministic: identical input always produces identical output, including all derived ids", () => {
    const { document, evidence } = makeProfitAndLossFixture(100000, 150000, 20000);
    const first = runProfitabilityCapabilityPack(document, evidence);
    const second = runProfitabilityCapabilityPack(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
