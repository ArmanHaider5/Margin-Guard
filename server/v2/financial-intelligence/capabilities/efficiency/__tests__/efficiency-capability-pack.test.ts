import { describe, it, expect } from "vitest";
import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../../../__tests__/fixtures.js";
import { Confidence, Money } from "../../../../shared/index.js";
import type { StructuredDocument, EvidenceObject } from "../../../../shared/index.js";
import { buildNonCurrentAssets } from "../non-current-asset-builder.js";
import { TotalAssetsCalculator } from "../total-assets-calculator.js";
import { AssetTurnoverCalculator } from "../asset-turnover-calculator.js";
import { AssetTurnoverZeroCalculator } from "../asset-turnover-zero-calculator.js";
import { generateEfficiencyEvidence } from "../efficiency-evidence-generator.js";
import { runEfficiencyCapabilityPack } from "../efficiency-capability-pack.js";

/**
 * An Assets table with a "Total Current Assets" row (Liquidity's target,
 * reused) and a "Total Non-Current Assets" row (this pack's own target, in
 * the *same* Asset-normalized column, proving the two builders never
 * collide), plus a Revenue table with a "Total Revenue" row (Profitability's
 * target, reused). `revenue` may be zero, to exercise the zero-turnover
 * Observation.
 */
function makeEfficiencyFixture(currentAssets: number, nonCurrentAssets: number, revenue: number): {
  document: StructuredDocument;
  evidence: EvidenceObject[];
} {
  const assetsTable = makeTable({
    id: "assets",
    headers: ["Description", "Amount"],
    rows: [
      ["Cash and Bank", "10000"],
      ["Total Current Assets", String(currentAssets)],
      ["Property, Plant and Equipment", "40000"],
      ["Total Non-Current Assets", String(nonCurrentAssets)],
    ],
  });
  const revenueTable = makeTable({
    id: "revenue",
    headers: ["Description", "Amount"],
    rows: [["Total Revenue", String(revenue)]],
  });

  const assetsNormalizedTerm = makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Asset", sourceLocation: { tableId: "assets", column: 1 } });
  const revenueNormalizedTerm = makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Revenue", sourceLocation: { tableId: "revenue", column: 1 } });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "ae-cash", sourceLocation: { tableId: "assets", column: 1, row: 0 }, rawValue: "RM10,000.00", observedValue: 10000, normalizedValue: "10000 MYR" }),
    makeEvidence({ id: "ae-total-current-assets", sourceLocation: { tableId: "assets", column: 1, row: 1 }, rawValue: `RM${currentAssets}.00`, observedValue: currentAssets, normalizedValue: `${currentAssets} MYR` }),
    makeEvidence({ id: "ae-ppe", sourceLocation: { tableId: "assets", column: 1, row: 2 }, rawValue: "RM40,000.00", observedValue: 40000, normalizedValue: "40000 MYR" }),
    makeEvidence({ id: "ae-total-non-current-assets", sourceLocation: { tableId: "assets", column: 1, row: 3 }, rawValue: `RM${nonCurrentAssets}.00`, observedValue: nonCurrentAssets, normalizedValue: `${nonCurrentAssets} MYR` }),
    makeEvidence({ id: "re-total-revenue", sourceLocation: { tableId: "revenue", column: 1, row: 0 }, rawValue: `RM${revenue}.00`, observedValue: revenue, normalizedValue: `${revenue} MYR` }),
  ];

  const document = makeDocument({
    tables: [assetsTable, revenueTable],
    normalizedTerms: [assetsNormalizedTerm, revenueNormalizedTerm],
  });

  return { document, evidence };
}

describe("buildNonCurrentAssets", () => {
  it("constructs one non-current Asset, from the subtotal row only", () => {
    const { document, evidence } = makeEfficiencyFixture(50000, 40000, 100000);
    const nonCurrentAssets = buildNonCurrentAssets(document, evidence);

    expect(nonCurrentAssets).toHaveLength(1);
    expect(nonCurrentAssets[0]?.classification).toBe("non_current");
    expect(nonCurrentAssets[0]?.totalValue.amount).toBe(40000);
  });

  it("excludes Cash and Bank, Total Current Assets, and Property Plant and Equipment", () => {
    const { document, evidence } = makeEfficiencyFixture(50000, 40000, 100000);
    const nonCurrentAssets = buildNonCurrentAssets(document, evidence);
    expect(nonCurrentAssets.map((a) => a.totalValue.amount)).not.toContain(10000);
    expect(nonCurrentAssets.map((a) => a.totalValue.amount)).not.toContain(50000);
    // Only the subtotal row (row 3, "Total Non-Current Assets") is included —
    // not the PPE line item (row 2) — verified structurally via evidenceObjectIds:
    expect(nonCurrentAssets[0]?.evidenceObjectIds).toEqual(["ae-total-non-current-assets"]);
    expect(nonCurrentAssets).toHaveLength(1);
  });
});

describe("TotalAssetsCalculator", () => {
  it("sums both current (reused) and non-current (own) Asset entries, regardless of classification", () => {
    const { document, evidence } = makeEfficiencyFixture(50000, 40000, 100000);
    const nonCurrentAssets = buildNonCurrentAssets(document, evidence);
    const currentAsset = {
      id: "current-asset-1",
      accountGroupId: "current-assets",
      classification: "current" as const,
      totalValue: Money.create(50000, "MYR"),
      confidence: Confidence.create(0.8),
      evidenceObjectIds: ["ae-total-current-assets"],
    };
    const context = {
      documentId: document.documentId,
      financialObjects: { assets: [currentAsset, ...nonCurrentAssets], liabilities: [], equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    };
    const metric = new TotalAssetsCalculator().calculate(context);
    expect(metric?.value).toBe(50000 + 40000);
  });

  it("produces no metric when there are no Assets", () => {
    const context = {
      documentId: "doc-1",
      financialObjects: { assets: [], liabilities: [], equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    };
    const calculator = new TotalAssetsCalculator();
    expect(calculator.canCalculate(context)).toBe(false);
    expect(calculator.calculate(context)).toBeUndefined();
  });
});

describe("AssetTurnoverCalculator", () => {
  it("computes total_revenue / total_assets", () => {
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "total_revenue", value: 180000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_assets", value: 90000, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    const ratio = new AssetTurnoverCalculator().calculate(context);
    expect(ratio?.value).toBeCloseTo(2, 5);
    expect(ratio?.category).toBe("efficiency");
  });

  it("refuses to divide by zero total assets", () => {
    const calculator = new AssetTurnoverCalculator();
    const context = {
      documentId: "doc-1",
      metrics: [
        { id: "m1", definitionId: "total_revenue", value: 100, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
        { id: "m2", definitionId: "total_assets", value: 0, unit: "currency" as const, documentId: "doc-1", financialObjectIds: [], confidence: { value: 0.8 } as any, basis: "" },
      ],
    };
    expect(calculator.canCalculate(context)).toBe(false);
    expect(calculator.calculate(context)).toBeUndefined();
  });
});

describe("AssetTurnoverZeroCalculator", () => {
  it("only fires when asset_turnover is exactly zero", () => {
    const calculator = new AssetTurnoverZeroCalculator();
    const healthy = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "asset_turnover", category: "efficiency" as const, value: 2, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(healthy)).toBe(false);

    const zero = { documentId: "doc-1", metrics: [], ratios: [{ id: "r1", definitionId: "asset_turnover", category: "efficiency" as const, value: 0, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }] };
    expect(calculator.canCalculate(zero)).toBe(true);
    expect(calculator.calculate(zero)?.statement).toBe("Asset turnover is zero.");
  });
});

describe("generateEfficiencyEvidence", () => {
  it("resolves the full chain including current assets, non-current assets, and revenue", () => {
    const { document, evidence } = makeEfficiencyFixture(50000, 40000, 0); // zero revenue -> zero turnover
    const result = runEfficiencyCapabilityPack(document, evidence);

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("revenue_growth");
    expect(result.evidence[0]?.evidenceObjectIds).toEqual(
      expect.arrayContaining(["ae-total-current-assets", "ae-total-non-current-assets", "re-total-revenue"]),
    );
  });

  it("produces no evidence when there is nothing to resolve", () => {
    const evidence = generateEfficiencyEvidence("doc-1", [], [], [], []);
    expect(evidence).toHaveLength(0);
  });
});

describe("runEfficiencyCapabilityPack — full end-to-end integration", () => {
  it("a healthy efficiency position produces metrics and a ratio, but no observation, evidence, or signal", () => {
    const { document, evidence } = makeEfficiencyFixture(50000, 40000, 180000);
    const result = runEfficiencyCapabilityPack(document, evidence);

    expect(result.assets).toHaveLength(2); // current (reused) + non-current (own)
    expect(result.revenue).toHaveLength(1);
    expect(result.metrics.some((m) => m.definitionId === "total_revenue")).toBe(true);
    expect(result.metrics.some((m) => m.definitionId === "total_assets" && m.value === 90000)).toBe(true);
    expect(result.ratios).toHaveLength(1);
    expect(result.ratios[0]?.value).toBeCloseTo(2, 5);
    expect(result.observations).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.signals).toHaveLength(0);
  });

  it("zero revenue (zero asset turnover) produces an observation, evidence, and a revenue_instability signal", () => {
    const { document, evidence } = makeEfficiencyFixture(50000, 40000, 0);
    const result = runEfficiencyCapabilityPack(document, evidence);

    expect(result.ratios[0]?.value).toBe(0);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.definitionId).toBe("asset_turnover_zero");
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
    expect(() => runEfficiencyCapabilityPack(document, [])).not.toThrow();
    const result = runEfficiencyCapabilityPack(document, []);
    expect(result).toEqual({ assets: [], revenue: [], metrics: [], ratios: [], observations: [], evidence: [], signals: [] });
  });

  it("is deterministic: identical input always produces identical output, including all derived ids", () => {
    const { document, evidence } = makeEfficiencyFixture(50000, 40000, 0);
    const first = runEfficiencyCapabilityPack(document, evidence);
    const second = runEfficiencyCapabilityPack(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
