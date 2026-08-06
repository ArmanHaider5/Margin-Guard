import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";
import type { Asset, Revenue } from "../../models/financial-object-model.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import type { CapabilityResult } from "../../internal/capability-support/capability-result.js";
import { runMetricCalculators } from "../../metrics/metric-calculation-stage.js";
import { runRatioCalculators } from "../../ratios/ratio-calculation-stage.js";
import { runObservationCalculators } from "../../observations/observation-calculation-stage.js";
import { FinancialSignalGenerator } from "../../signals/financial-signal-generator.js";
import { buildNonCurrentAssets } from "./non-current-asset-builder.js";
import { TotalAssetsCalculator } from "./total-assets-calculator.js";
import { AssetTurnoverCalculator } from "./asset-turnover-calculator.js";
import { AssetTurnoverZeroCalculator } from "./asset-turnover-zero-calculator.js";
import { generateEfficiencyEvidence } from "./efficiency-evidence-generator.js";
import { buildCurrentAssetsAndLiabilities } from "../liquidity/current-asset-liability-builder.js";
import { buildRevenueAndExpenses } from "../profitability/revenue-expense-builder.js";
import { TotalRevenueCalculator } from "../profitability/profitability-metric-calculators.js";

/** Extends the shared internal `CapabilityResult` — see Liquidity's own
 * result type doc comment for the rationale. */
export interface EfficiencyCapabilityResult extends CapabilityResult {
  readonly assets: readonly Asset[];
  readonly revenue: readonly Revenue[];
}

/**
 * The Efficiency Capability Pack — the sixth complete, real, end-to-end
 * business capability, following the same vertical-slice pattern every prior
 * pack established:
 *
 *   EvidenceObject[] → Asset (current, reused from Liquidity + non_current,
 *   this pack's own) / Revenue (reused from Profitability) →
 *   total_assets (this pack's own Metric) / total_revenue (reused from
 *   Profitability) → asset_turnover (Financial Ratio) → asset_turnover_zero
 *   (Financial Observation) → revenue_growth (Financial Evidence, second
 *   source) → revenue_instability (Financial Signal, when corroborated).
 *
 * The fourth Capability Pack (after Cash Flow, Working Capital, Leverage)
 * whose Metric layer needs another pack's Metric — here, TWO distinct
 * cross-pack reuses at once: `total_revenue` reuses Profitability's own
 * `TotalRevenueCalculator` and `Revenue` construction
 * (`buildRevenueAndExpenses`) directly, unmodified; `total_assets`'s current-
 * Asset portion reuses Liquidity's `buildCurrentAssetsAndLiabilities`
 * directly, unmodified, merged with this pack's own `"non_current"`-classified
 * Assets before `TotalAssetsCalculator` sums them. No calculation is
 * duplicated anywhere in this pack.
 *
 * The evidence generator is given the full set of Financial Objects any of
 * this pack's Ratios/Metrics could trace back to (current assets, non-current
 * assets, and revenue), per the CF-004 lesson.
 *
 * Independently testable and demonstrable, same `(StructuredDocument,
 * EvidenceObject[])` signature as every other pack and
 * `analyzeFinancialSignals()`. Deliberately NOT wired into
 * `analyzeFinancialSignals()` and NOT exported from
 * `financial-intelligence/index.ts` — the Financial Intelligence Orchestrator
 * (`orchestration/`) is what runs this pack alongside every other one, and
 * even that stays internal. This pack is registered with, but does not
 * modify, the frozen Orchestrator/CapabilityPackRegistry mechanism — only
 * `orchestration/default-capability-pack-registry.ts` gains one new
 * `register()` call, per that file's own designated purpose.
 *
 * Produces no Finding, Root Cause, Recommendation, or Report — Signals
 * remain the highest output of Financial Intelligence.
 */
export function runEfficiencyCapabilityPack(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): EfficiencyCapabilityResult {
  const { assets: currentAssets } = buildCurrentAssetsAndLiabilities(document, evidence);
  const nonCurrentAssets = buildNonCurrentAssets(document, evidence);
  const assets = [...currentAssets, ...nonCurrentAssets];

  const { revenue } = buildRevenueAndExpenses(document, evidence);

  const financialObjects: FinancialObjectSet = {
    assets,
    liabilities: [],
    equity: [],
    revenue,
    expense: [],
    workingCapitalComponents: [],
    cashMovements: [],
  };

  const metrics = runMetricCalculators(
    [new TotalRevenueCalculator(), new TotalAssetsCalculator()],
    { documentId: document.documentId, financialObjects },
  );

  const ratios = runRatioCalculators([new AssetTurnoverCalculator()], { documentId: document.documentId, metrics });

  const observations = runObservationCalculators(
    [new AssetTurnoverZeroCalculator()],
    { documentId: document.documentId, metrics, ratios },
  );

  const efficiencyEvidence = generateEfficiencyEvidence(document.documentId, observations, ratios, metrics, [
    ...assets,
    ...revenue,
  ]);

  const signalGenerator = new FinancialSignalGenerator();
  const signals = signalGenerator.generate(document.documentId, efficiencyEvidence);

  return { assets, revenue, metrics, ratios, observations, evidence: efficiencyEvidence, signals };
}
