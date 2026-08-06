import { describe, it, expect } from "vitest";
import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../../../__tests__/fixtures.js";
import type { StructuredDocument, EvidenceObject } from "../../../../shared/index.js";
import { buildCurrentAssetsAndLiabilities } from "../current-asset-liability-builder.js";
import { TotalCurrentAssetsCalculator } from "../total-current-assets-calculator.js";
import { TotalCurrentLiabilitiesCalculator } from "../total-current-liabilities-calculator.js";
import { CurrentRatioCalculator } from "../current-ratio-calculator.js";
import { CurrentRatioBelowRangeCalculator, PREFERRED_CURRENT_RATIO_MINIMUM } from "../current-ratio-below-range-calculator.js";
import { generateLiquidityEvidence } from "../liquidity-evidence-generator.js";
import { runLiquidityCapabilityPack } from "../liquidity-capability-pack.js";

/**
 * A small, realistic balance-sheet-shaped fixture: an Assets table and a
 * Liabilities table, each with a label column (0) and an amount column (1),
 * normalized to "Asset"/"Liability" respectively, each containing an
 * explicit "Total Current ..." subtotal row alongside a non-current row (to
 * prove non-current rows are correctly excluded).
 */
function makeBalanceSheetFixture(currentAssets: number, currentLiabilities: number): {
  document: StructuredDocument;
  evidence: EvidenceObject[];
} {
  const assetsTable = makeTable({
    id: "assets",
    headers: ["Description", "Amount"],
    rows: [
      ["Cash", "50000"],
      ["Total Current Assets", String(currentAssets)],
      ["Property, Plant & Equipment", "200000"],
      ["Total Assets", String(currentAssets + 200000)],
    ],
  });
  const liabilitiesTable = makeTable({
    id: "liabilities",
    headers: ["Description", "Amount"],
    rows: [
      ["Trade Payables", "40000"],
      ["Total Current Liabilities", String(currentLiabilities)],
      ["Long-Term Loan", "150000"],
      ["Total Liabilities", String(currentLiabilities + 150000)],
    ],
  });

  const assetsNormalizedTerm = makeNormalizedTerm({
    originalTerm: "Amount",
    canonicalTerm: "Asset",
    sourceLocation: { tableId: "assets", column: 1 },
  });
  const liabilitiesNormalizedTerm = makeNormalizedTerm({
    originalTerm: "Amount",
    canonicalTerm: "Liability",
    sourceLocation: { tableId: "liabilities", column: 1 },
  });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "ae-cash", sourceLocation: { tableId: "assets", column: 1, row: 0 }, rawValue: "RM50,000.00", observedValue: 50000, normalizedValue: "50000 MYR" }),
    makeEvidence({ id: "ae-total-current-assets", sourceLocation: { tableId: "assets", column: 1, row: 1 }, rawValue: `RM${currentAssets}.00`, observedValue: currentAssets, normalizedValue: `${currentAssets} MYR` }),
    makeEvidence({ id: "ae-ppe", sourceLocation: { tableId: "assets", column: 1, row: 2 }, rawValue: "RM200,000.00", observedValue: 200000, normalizedValue: "200000 MYR" }),
    makeEvidence({ id: "ae-total-assets", sourceLocation: { tableId: "assets", column: 1, row: 3 }, rawValue: "RM250,000.00", observedValue: currentAssets + 200000, normalizedValue: `${currentAssets + 200000} MYR` }),
    makeEvidence({ id: "le-payables", sourceLocation: { tableId: "liabilities", column: 1, row: 0 }, rawValue: "RM40,000.00", observedValue: 40000, normalizedValue: "40000 MYR" }),
    makeEvidence({ id: "le-total-current-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 1 }, rawValue: `RM${currentLiabilities}.00`, observedValue: currentLiabilities, normalizedValue: `${currentLiabilities} MYR` }),
    makeEvidence({ id: "le-loan", sourceLocation: { tableId: "liabilities", column: 1, row: 2 }, rawValue: "RM150,000.00", observedValue: 150000, normalizedValue: "150000 MYR" }),
    makeEvidence({ id: "le-total-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 3 }, rawValue: "RM190,000.00", observedValue: currentLiabilities + 150000, normalizedValue: `${currentLiabilities + 150000} MYR` }),
  ];

  const document = makeDocument({
    tables: [assetsTable, liabilitiesTable],
    normalizedTerms: [assetsNormalizedTerm, liabilitiesNormalizedTerm],
  });

  return { document, evidence };
}

describe("buildCurrentAssetsAndLiabilities", () => {
  it("constructs exactly one current Asset and one current Liability, from the 'Total Current ...' subtotal rows only", () => {
    const { document, evidence } = makeBalanceSheetFixture(80000, 100000);
    const { assets, liabilities } = buildCurrentAssetsAndLiabilities(document, evidence);

    expect(assets).toHaveLength(1);
    expect(assets[0]?.classification).toBe("current");
    expect(assets[0]?.totalValue.amount).toBe(80000);
    expect(assets[0]?.totalValue.currency.code).toBe("MYR");
    expect(assets[0]?.evidenceObjectIds).toEqual(["ae-total-current-assets"]);

    expect(liabilities).toHaveLength(1);
    expect(liabilities[0]?.classification).toBe("current");
    expect(liabilities[0]?.totalValue.amount).toBe(100000);
  });

  it("does not construct an entry for non-current rows (Property/Plant, Total Assets, Long-Term Loan, Total Liabilities)", () => {
    const { document, evidence } = makeBalanceSheetFixture(80000, 100000);
    const { assets, liabilities } = buildCurrentAssetsAndLiabilities(document, evidence);
    expect(assets.map((a) => a.totalValue.amount)).not.toContain(200000);
    expect(assets.map((a) => a.totalValue.amount)).not.toContain(280000);
    expect(liabilities.map((l) => l.totalValue.amount)).not.toContain(150000);
  });

  it("falls back to a default currency when no currency was detected in normalizedValue", () => {
    const { document, evidence } = makeBalanceSheetFixture(80000, 100000);
    const bareEvidence = evidence.map((e) => ({ ...e, normalizedValue: undefined }));
    const { assets } = buildCurrentAssetsAndLiabilities(document, bareEvidence);
    expect(assets[0]?.totalValue.currency.code).toBe("MYR");
  });

  it("LC-003 regression: a 'Total Non-Current Liabilities'/'Total Non-Current Assets' row is not misclassified as current", () => {
    // \bcurrent\b alone also matches inside "Non-Current" (the hyphen is a
    // non-word character, creating a word boundary immediately before
    // "Current") — this fixture reproduces the exact shape that surfaced the
    // defect: a "Total Current ..." row alongside a "Total Non-Current ..."
    // row in the same table, which no fixture before the Leverage Capability
    // Pack milestone ever exercised.
    const assetsTable = makeTable({
      id: "assets",
      headers: ["Description", "Amount"],
      rows: [
        ["Total Current Assets", "80000"],
        ["Total Non-Current Assets", "200000"],
      ],
    });
    const liabilitiesTable = makeTable({
      id: "liabilities",
      headers: ["Description", "Amount"],
      rows: [
        ["Total Current Liabilities", "100000"],
        ["Total Non-Current Liabilities", "50000"],
      ],
    });
    const document = makeDocument({
      tables: [assetsTable, liabilitiesTable],
      normalizedTerms: [
        makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Asset", sourceLocation: { tableId: "assets", column: 1 } }),
        makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Liability", sourceLocation: { tableId: "liabilities", column: 1 } }),
      ],
    });
    const evidence: EvidenceObject[] = [
      makeEvidence({ id: "ae-total-current", sourceLocation: { tableId: "assets", column: 1, row: 0 }, rawValue: "RM80,000.00", observedValue: 80000, normalizedValue: "80000 MYR" }),
      makeEvidence({ id: "ae-total-non-current", sourceLocation: { tableId: "assets", column: 1, row: 1 }, rawValue: "RM200,000.00", observedValue: 200000, normalizedValue: "200000 MYR" }),
      makeEvidence({ id: "le-total-current", sourceLocation: { tableId: "liabilities", column: 1, row: 0 }, rawValue: "RM100,000.00", observedValue: 100000, normalizedValue: "100000 MYR" }),
      makeEvidence({ id: "le-total-non-current", sourceLocation: { tableId: "liabilities", column: 1, row: 1 }, rawValue: "RM50,000.00", observedValue: 50000, normalizedValue: "50000 MYR" }),
    ];

    const { assets, liabilities } = buildCurrentAssetsAndLiabilities(document, evidence);
    expect(assets).toHaveLength(1);
    expect(assets[0]?.totalValue.amount).toBe(80000);
    expect(liabilities).toHaveLength(1);
    expect(liabilities[0]?.totalValue.amount).toBe(100000);
  });
});

describe("TotalCurrentAssetsCalculator / TotalCurrentLiabilitiesCalculator", () => {
  it("sum current Asset/Liability entries into a FinancialMetric", () => {
    const { document, evidence } = makeBalanceSheetFixture(80000, 100000);
    const { assets, liabilities } = buildCurrentAssetsAndLiabilities(document, evidence);

    const assetsMetric = new TotalCurrentAssetsCalculator().calculate({
      documentId: document.documentId,
      financialObjects: { assets, liabilities: [], equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    });
    const liabilitiesMetric = new TotalCurrentLiabilitiesCalculator().calculate({
      documentId: document.documentId,
      financialObjects: { assets: [], liabilities, equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    });

    expect(assetsMetric?.value).toBe(80000);
    expect(assetsMetric?.unit).toBe("currency");
    expect(liabilitiesMetric?.value).toBe(100000);
  });

  it("canCalculate()/calculate() agree: no current entries means no metric", () => {
    const calculator = new TotalCurrentAssetsCalculator();
    const emptyContext = {
      documentId: "doc-1",
      financialObjects: { assets: [], liabilities: [], equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    };
    expect(calculator.canCalculate(emptyContext)).toBe(false);
    expect(calculator.calculate(emptyContext)).toBeUndefined();
  });
});

describe("CurrentRatioCalculator", () => {
  it("computes value = total_current_assets / total_current_liabilities", () => {
    const { document, evidence } = makeBalanceSheetFixture(80000, 100000);
    const { assets, liabilities } = buildCurrentAssetsAndLiabilities(document, evidence);
    const financialObjects = { assets, liabilities, equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] };

    const assetsMetric = new TotalCurrentAssetsCalculator().calculate({ documentId: document.documentId, financialObjects })!;
    const liabilitiesMetric = new TotalCurrentLiabilitiesCalculator().calculate({ documentId: document.documentId, financialObjects })!;

    const ratio = new CurrentRatioCalculator().calculate({
      documentId: document.documentId,
      metrics: [assetsMetric, liabilitiesMetric],
    });

    expect(ratio?.value).toBeCloseTo(0.8, 5);
    expect(ratio?.category).toBe("liquidity");
    expect(ratio?.metricIds).toEqual([assetsMetric.id, liabilitiesMetric.id]);
  });

  it("refuses to divide by zero — zero current liabilities produces no ratio", () => {
    const calculator = new CurrentRatioCalculator();
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

describe("CurrentRatioBelowRangeCalculator", () => {
  it("only fires when the current ratio is below the preferred minimum", () => {
    const calculator = new CurrentRatioBelowRangeCalculator();
    const healthyContext = {
      documentId: "doc-1",
      metrics: [],
      ratios: [{ id: "r1", definitionId: "current_ratio", category: "liquidity" as const, value: PREFERRED_CURRENT_RATIO_MINIMUM + 0.5, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }],
    };
    expect(calculator.canCalculate(healthyContext)).toBe(false);
    expect(calculator.calculate(healthyContext)).toBeUndefined();

    const belowRangeContext = {
      documentId: "doc-1",
      metrics: [],
      ratios: [{ id: "r1", definitionId: "current_ratio", category: "liquidity" as const, value: PREFERRED_CURRENT_RATIO_MINIMUM - 0.5, documentId: "doc-1", metricIds: [], confidence: { value: 0.8 } as any, basis: "" }],
    };
    expect(calculator.canCalculate(belowRangeContext)).toBe(true);
    const observation = calculator.calculate(belowRangeContext);
    expect(observation?.category).toBe("liquidity");
    expect(observation?.statement).toBe("Current ratio is below the preferred operating range.");
    expect(observation?.ratioIds).toEqual(["r1"]);
  });
});

describe("generateLiquidityEvidence", () => {
  it("resolves the full Observation → Ratio → Metric → FinancialObject → EvidenceObject chain into evidenceObjectIds", () => {
    const { document, evidence } = makeBalanceSheetFixture(80000, 100000);
    const result = runLiquidityCapabilityPack(document, evidence);

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("working_capital_pressure");
    expect(result.evidence[0]?.evidenceObjectIds).toEqual(
      expect.arrayContaining(["ae-total-current-assets", "le-total-current-liabilities"]),
    );
    expect(result.evidence[0]?.evidenceObjectIds).toHaveLength(2);
  });

  it("produces no evidence when there is nothing to resolve", () => {
    const evidence = generateLiquidityEvidence(
      "doc-1",
      [],
      [],
      [],
      { assets: [], liabilities: [], equity: [], revenue: [], expense: [], workingCapitalComponents: [], cashMovements: [] },
    );
    expect(evidence).toHaveLength(0);
  });
});

describe("runLiquidityCapabilityPack — full end-to-end integration", () => {
  it("a weak liquidity position (current ratio well below 1.5) produces evidence and a liquidity_stress signal", () => {
    const { document, evidence } = makeBalanceSheetFixture(80000, 100000); // ratio = 0.8
    const result = runLiquidityCapabilityPack(document, evidence);

    expect(result.assets).toHaveLength(1);
    expect(result.liabilities).toHaveLength(1);
    expect(result.metrics).toHaveLength(2);
    expect(result.ratios).toHaveLength(1);
    expect(result.ratios[0]?.value).toBeCloseTo(0.8, 5);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.definitionId).toBe("current_ratio_below_range");
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.type).toBe("working_capital_pressure");
    expect(result.signals.some((s) => s.type === "liquidity_stress")).toBe(true);

    // Mandatory Evidence Chain, verified end to end, not merely asserted:
    const signal = result.signals.find((s) => s.type === "liquidity_stress")!;
    expect(signal.financialEvidenceIds).toEqual(result.evidence.map((e) => e.id));
    for (const evidenceRecord of result.evidence) {
      expect(evidenceRecord.evidenceObjectIds.length).toBeGreaterThan(0);
      for (const id of evidenceRecord.evidenceObjectIds) {
        expect(evidence.some((e) => e.id === id)).toBe(true);
      }
    }
  });

  it("a healthy liquidity position (current ratio at/above 1.5) produces metrics and a ratio, but no observation, evidence, or signal", () => {
    const { document, evidence } = makeBalanceSheetFixture(150000, 100000); // ratio = 1.5
    const result = runLiquidityCapabilityPack(document, evidence);

    expect(result.ratios[0]?.value).toBeCloseTo(1.5, 5);
    expect(result.observations).toHaveLength(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.signals).toHaveLength(0);
  });

  it("a document with no recognizable Asset/Liability columns produces empty results without throwing", () => {
    const document = makeDocument({ tables: [], normalizedTerms: [] });
    expect(() => runLiquidityCapabilityPack(document, [])).not.toThrow();
    const result = runLiquidityCapabilityPack(document, []);
    expect(result).toEqual({ assets: [], liabilities: [], metrics: [], ratios: [], observations: [], evidence: [], signals: [] });
  });

  it("is deterministic: identical input always produces identical output, including all derived ids", () => {
    const { document, evidence } = makeBalanceSheetFixture(80000, 100000);
    const first = runLiquidityCapabilityPack(document, evidence);
    const second = runLiquidityCapabilityPack(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
