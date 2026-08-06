import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";
import type { Asset, Liability } from "../../models/financial-object-model.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import type { CapabilityResult } from "../../internal/capability-support/capability-result.js";
import { DefaultFinancialCalculationPipeline } from "../../pipeline/financial-calculation-pipeline.js";
import { FinancialSignalGenerator } from "../../signals/financial-signal-generator.js";
import { buildCurrentAssetsAndLiabilities } from "./current-asset-liability-builder.js";
import { TotalCurrentAssetsCalculator } from "./total-current-assets-calculator.js";
import { TotalCurrentLiabilitiesCalculator } from "./total-current-liabilities-calculator.js";
import { CurrentRatioCalculator } from "./current-ratio-calculator.js";
import { CurrentRatioBelowRangeCalculator } from "./current-ratio-below-range-calculator.js";
import { generateLiquidityEvidence } from "./liquidity-evidence-generator.js";

/**
 * Extends the shared internal `CapabilityResult` (`internal/capability-support/`)
 * with Liquidity's own raw Financial Objects — same field names/types as
 * before this refactor, so this is a structural, not behavioural, change.
 */
export interface LiquidityCapabilityResult extends CapabilityResult {
  readonly assets: readonly Asset[];
  readonly liabilities: readonly Liability[];
}

/**
 * The Liquidity Capability Pack — the first complete, real, end-to-end
 * business capability built on the Financial Intelligence architecture:
 *
 *   EvidenceObject[] → Asset/Liability (Financial Objects) →
 *   total_current_assets/total_current_liabilities (Financial Metrics) →
 *   current_ratio (Financial Ratio) → current_ratio_below_range
 *   (Financial Observation) → working_capital_pressure (Financial Evidence) →
 *   liquidity_stress (Financial Signal, when corroborated).
 *
 * Every step is a real formula/rule, not an interface stub — the first
 * milestone where that is true. Independently testable and demonstrable:
 * this function is a self-contained entry point, callable directly with just
 * a `StructuredDocument` and its `EvidenceObject[]`, exactly like
 * `analyzeFinancialSignals()`'s own signature.
 *
 * Deliberately NOT wired into `analyzeFinancialSignals()` and NOT exported
 * from `financial-intelligence/index.ts` this milestone — `analyzeFinancialSignals()`
 * remains frozen, unchanged, still deriving `FinancialEvidence` directly from
 * `EvidenceObject[]` via `FinancialEvidenceClassifier`. Assembling every
 * Capability Pack into one production entry point is future integration work,
 * once more packs exist (per "one complete business capability at a time").
 *
 * Produces no Finding, Root Cause, Recommendation, or Report — Signals remain
 * the highest output of Financial Intelligence, per this milestone's scope.
 */
export function runLiquidityCapabilityPack(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): LiquidityCapabilityResult {
  const { assets, liabilities } = buildCurrentAssetsAndLiabilities(document, evidence);

  const financialObjects: FinancialObjectSet = {
    assets,
    liabilities,
    equity: [],
    revenue: [],
    expense: [],
    workingCapitalComponents: [],
    cashMovements: [],
  };

  const pipeline = new DefaultFinancialCalculationPipeline(
    [new TotalCurrentAssetsCalculator(), new TotalCurrentLiabilitiesCalculator()],
    [new CurrentRatioCalculator()],
    [new CurrentRatioBelowRangeCalculator()],
  );

  const { metrics, ratios, observations } = pipeline.run({
    documentId: document.documentId,
    financialObjects,
  });

  const liquidityEvidence = generateLiquidityEvidence(document.documentId, observations, ratios, metrics, financialObjects);

  const signalGenerator = new FinancialSignalGenerator();
  const signals = signalGenerator.generate(document.documentId, liquidityEvidence);

  return { assets, liabilities, metrics, ratios, observations, evidence: liquidityEvidence, signals };
}
