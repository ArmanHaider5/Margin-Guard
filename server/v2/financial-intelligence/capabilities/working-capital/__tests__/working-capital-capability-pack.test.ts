import { describe, it, expect } from "vitest";
import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../../../__tests__/fixtures.js";
import type { StructuredDocument, EvidenceObject } from "../../../../shared/index.js";
import { buildWorkingCapitalComponents } from "../working-capital-component-builder.js";
import {
  AccountsReceivableBalanceCalculator,
  AccountsPayableBalanceCalculator,
  InventoryBalanceCalculator,
} from "../working-capital-metric-calculators.js";
import { WorkingCapitalRatioCalculator } from "../working-capital-ratio-calculator.js";
import { WorkingCapitalRatioNegativeCalculator } from "../working-capital-observation-calculator.js";
import { generateWorkingCapitalEvidence } from "../working-capital-evidence-generator.js";
import { runWorkingCapitalCapabilityPack } from "../working-capital-capability-pack.js";

/**
 * A balance-sheet-shaped fixture reusing Liquidity's own table conventions:
 * an Assets table with a "Total Current Assets" subtotal (Liquidity's
 * target) *and* "Accounts Receivable"/"Inventory" line items (this pack's
 * target, in the *same* Asset-normalized column, proving the two builders
 * never collide); a Liabilities table with "Total Current Liabilities" and
 * "Accounts Payable" likewise.
 */
function makeWorkingCapitalFixture(currentAssets: number, currentLiabilities: number): {
  document: StructuredDocument;
  evidence: EvidenceObject[];
} {
  const assetsTable = makeTable({
    id: "assets",
    headers: ["Description", "Amount"],
    rows: [
      ["Cash", "50000"],
      ["Accounts Receivable", "30000"],
      ["Inventory", "20000"],
      ["Total Current Assets", String(currentAssets)],
      ["Property, Plant & Equipment", "200000"],
    ],
  });
  const liabilitiesTable = makeTable({
    id: "liabilities",
    headers: ["Description", "Amount"],
    rows: [
      ["Accounts Payable", "25000"],
      ["Total Current Liabilities", String(currentLiabilities)],
      ["Long-Term Loan", "150000"],
    ],
  });

  const assetsNormalizedTerm = makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Asset", sourceLocation: { tableId: "assets", column: 1 } });
  const liabilitiesNormalizedTerm = makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Liability", sourceLocation: { tableId: "liabilities", column: 1 } });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "ae-cash", sourceLocation: { tableId: "assets", column: 1, row: 0 }, rawValue: "RM50,000.00", observedValue: 50000, normalizedValue: "50000 MYR" }),
    makeEvidence({ id: "ae-receivable", sourceLocation: { tableId: "assets", column: 1, row: 1 }, rawValue: "RM30,000.00", observedValue: 30000, normalizedValue: "30000 MYR" }),
    makeEvidence({ id: "ae-inventory", sourceLocation: { tableId: "assets", column: 1, row: 2 }, rawValue: "RM20,000.00", observedValue: 20000, normalizedValue: "20000 MYR" }),
    makeEvidence({ id: "ae-total-current-assets", sourceLocation: { tableId: "assets", column: 1, row: 3 }, rawValue: `RM${currentAssets}.00`, observedValue: currentAssets, normalizedValue: `${currentAssets} MYR` }),
    makeEvidence({ id: "ae-ppe", sourceLocation: { tableId: "assets", column: 1, row: 4 }, rawValue: "RM200,000.00", observedValue: 200000, normalizedValue: "200000 MYR" }),
    makeEvidence({ id: "le-payable", sourceLocation: { tableId: "liabilities", column: 1, row: 0 }, rawValue: "RM25,000.00", observedValue: 25000, normalizedValue: "25000 MYR" }),
    makeEvidence({ id: "le-total-current-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 1 }, rawValue: `RM${currentLiabilities}.00`, observedValue: currentLiabilities, normalizedValue: `${currentLiabilities} MYR` }),
    makeEvidence({ id: "le-loan", sourceLocation: { tableId: "liabilities", column: 1, row: 2 }, rawValue: "RM150,000.00", observedValue: 150000, normalizedValue: "150000 MYR" }),
  ];

  const document = makeDocument({
    tables: [assetsTable, liabilitiesTable],
    normalizedTerms: [assetsNormalizedTerm, liabilitiesNormalizedTerm],
  });

  return { document, evidence };
}

describe("buildWorkingCapitalComponents", () => {
  it("constructs receivables and inventory from the Asset column, and payables from the Liability column", () => {
    const { document, evidence } = makeWorkingCapitalFixture(100000, 80000);
    const components = buildWorkingCapitalComponents(document, evidence);

    expect(components).toHaveLength(3);
    expect(components.find((c) => c.kind === "receivables")?.amount.amount).toBe(30000);
    expect(components.find((c) => c.kind === "inventory")?.amount.amount).toBe(20000);
    expect(components.find((c) => c.kind === "payables")?.amount.amount).toBe(25000);
  });

  it("does not construct a component for Cash, Total Current Assets, PPE, Total Current Liabilities, or Long-Term Loan", () => {
    const { document, evidence } = makeWorkingCapitalFixture(100000, 80000);
    const components = buildWorkingCapitalComponents(document, evidence);
    const amounts = components.map((c) => c.amount.amount);
    expect(amounts).not.toContain(50000);
    expect(amounts).not.toContain(100000);
    expect(amounts).not.toContain(200000);
    expect(amounts).not.toContain(80000);
    expect(amounts).not.toContain(150000);
  });
});

describe("Working Capital Metric calculators", () => {
  it("compute Accounts Receivable Balance, Accounts Payable Balance, and Inventory Balance", () => {
    const { document, evidence } = makeWorkingCapitalFixture(100000, 80000);
    const workingCapitalComponents = buildWorkingCapitalComponents(document, evidence);
    const context = {
      documentId: document.documentId,
      financialObjects: { assets: [], liabilities: [], equity: [], revenue: [], expense: [], workingCapitalComponents, cashMovements: [] },
    };

    expect(new AccountsReceivableBalanceCalculator().calculate(context)?.value).toBe(30000);
    expect(new AccountsPayableBalanceCalculator().calculate(context)?.value).toBe(25000);
    expect(new InventoryBalanceCalculator().calculate(context)?.value).toBe(20000);
  });
});

describe("WorkingCapitalRatioCalculator", () => {
  it("computes (total_current_assets - total_current_liabilities) / total_current_liabilities", () => {
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "total_current_assets", value: 100000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_current_liabilities", value: 80000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    const ratio = new WorkingCapitalRatioCalculator().calculate(context);
    expect(ratio?.value).toBeCloseTo(0.25, 5);
    expect(ratio?.category).toBe("working_capital");
  });

  it("refuses to divide by zero current liabilities", () => {
    const calculator = new WorkingCapitalRatioCalculator();
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "total_current_assets", value: 100, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_current_liabilities", value: 0, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    expect(calculator.canCalculate(context)).toBe(false);
    expect(calculator.calculate(context)).toBeUndefined();
  });
});

describe("WorkingCapitalRatioNegativeCalculator", () => {
  it("only fires when working_capital_ratio is negative", () => {
    const calculator = new WorkingCapitalRatioNegativeCalculator();
    const healthy = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "working_capital_ratio", category: "working_capital" as const, value: 0.1, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(healthy)).toBe(false);

    const negative = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "working_capital_ratio", category: "working_capital" as const, value: -0.25, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(negative)).toBe(true);
    expect(calculator.calculate(negative)?.statement).toBe("Working capital ratio is negative.");
  });
});

describe("generateWorkingCapitalEvidence", () => {
  it("resolves the full chain including the cross-domain Liquidity Asset/Liability side, not only WorkingCapitalComponents", () => {
    const { document, evidence } = makeWorkingCapitalFixture(60000, 80000); // negative working capital ratio
    const result = runWorkingCapitalCapabilityPack(document, evidence);

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("working_capital_pressure");
    expect(result.evidence[0]?.evidenceObjectIds).toEqual(
      expect.arrayContaining(["ae-total-current-assets", "le-total-current-liabilities"]),
    );
  });

  it("produces no evidence when there is nothing to resolve", () => {
    const evidence = generateWorkingCapitalEvidence("doc-1", [], [], [], []);
    expect(evidence).toHaveLength(0);
  });
});

describe("runWorkingCapitalCapabilityPack — full end-to-end integration", () => {
  it("a healthy working capital position produces metrics and a ratio, but no observation, evidence, or signal", () => {
    const { document, evidence } = makeWorkingCapitalFixture(100000, 80000);
    const result = runWorkingCapitalCapabilityPack(document, evidence);

    expect(result.workingCapitalComponents).toHaveLength(3);
    expect(result.metrics.some((m) => m.definitionId === "accounts_receivable_balance")).toBe(true);
    expect(result.metrics.some((m) => m.definitionId === "accounts_payable_balance")).toBe(true);
    expect(result.metrics.some((m) => m.definitionId === "inventory_balance")).toBe(true);
    expect(result.ratios).toHaveLength(1);
    expect(result.ratios[0]?.value).toBeCloseTo(0.25, 5);
    expect(result.observations).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.signals).toHaveLength(0);
  });

  it("negative working capital (current liabilities exceed current assets) produces an observation, evidence, and a liquidity_stress signal", () => {
    const { document, evidence } = makeWorkingCapitalFixture(60000, 80000);
    const result = runWorkingCapitalCapabilityPack(document, evidence);

    expect(result.ratios[0]?.value).toBeCloseTo(-0.25, 5);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.definitionId).toBe("working_capital_ratio_negative");
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("working_capital_pressure");
    expect(result.signals.some((s) => s.type === "liquidity_stress")).toBe(true);

    // Mandatory Evidence Chain, verified end to end:
    const signal = result.signals.find((s) => s.type === "liquidity_stress")!;
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
    expect(() => runWorkingCapitalCapabilityPack(document, [])).not.toThrow();
    const result = runWorkingCapitalCapabilityPack(document, []);
    expect(result).toEqual({ workingCapitalComponents: [], metrics: [], ratios: [], observations: [], evidence: [], signals: [] });
  });

  it("is deterministic: identical input always produces identical output, including all derived ids", () => {
    const { document, evidence } = makeWorkingCapitalFixture(60000, 80000);
    const first = runWorkingCapitalCapabilityPack(document, evidence);
    const second = runWorkingCapitalCapabilityPack(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
