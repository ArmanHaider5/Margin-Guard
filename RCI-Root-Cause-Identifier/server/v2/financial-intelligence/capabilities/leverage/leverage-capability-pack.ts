import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";
import type { Equity, Liability } from "../../models/financial-object-model.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import type { CapabilityResult } from "../../internal/capability-support/capability-result.js";
import { runMetricCalculators } from "../../metrics/metric-calculation-stage.js";
import { runRatioCalculators } from "../../ratios/ratio-calculation-stage.js";
import { runObservationCalculators } from "../../observations/observation-calculation-stage.js";
import { FinancialSignalGenerator } from "../../signals/financial-signal-generator.js";
import { buildLeverageFinancialObjects } from "./leverage-object-builder.js";
import { TotalLiabilitiesCalculator, TotalEquityCalculator } from "./leverage-metric-calculators.js";
import { DebtToEquityCalculator } from "./debt-to-equity-calculator.js";
import { DebtToEquityNegativeCalculator } from "./debt-to-equity-negative-calculator.js";
import { generateLeverageEvidence } from "./leverage-evidence-generator.js";
import { buildCurrentAssetsAndLiabilities } from "../liquidity/current-asset-liability-builder.js";
import { TotalCurrentLiabilitiesCalculator } from "../liquidity/total-current-liabilities-calculator.js";

/** Extends the shared internal `CapabilityResult` — see Liquidity's own
 * result type doc comment for the rationale. */
export interface LeverageCapabilityResult extends CapabilityResult {
  readonly equity: readonly Equity[];
  readonly liabilities: readonly Liability[];
}

/**
 * The Leverage Capability Pack — the fifth complete, real, end-to-end
 * business capability, following the same vertical-slice pattern every
 * prior pack established:
 *
 *   EvidenceObject[] → Equity / Liability (current, reused from Liquidity +
 *   non_current, this pack's own) → total_liabilities/total_equity
 *   (Financial Metrics) → debt_to_equity (Financial Ratio) →
 *   debt_to_equity_negative (Financial Observation) → debt_growth (Financial
 *   Evidence) → over_reliance_on_debt (Financial Signal, when corroborated).
 *
 * The third Capability Pack (after Cash Flow and Working Capital) whose
 * Metric layer needs another pack's Metric — `total_liabilities` sums
 * Liquidity's `"current"`-classified Liabilities (reused, not duplicated)
 * together with this pack's own `"non_current"`-classified ones. The
 * evidence generator is given the full set of Financial Objects any of this
 * pack's Ratios/Metrics could trace back to (current liabilities,
 * non-current liabilities, and equity), per the CF-004 lesson.
 *
 * Independently testable and demonstrable, same `(StructuredDocument,
 * EvidenceObject[])` signature as every other pack and
 * `analyzeFinancialSignals()`. Deliberately NOT wired into
 * `analyzeFinancialSignals()` and NOT exported from
 * `financial-intelligence/index.ts` — the new Financial Intelligence
 * Orchestrator (`orchestration/`) is the first thing that runs this pack
 * alongside every other one, and even that stays internal.
 *
 * Produces no Finding, Root Cause, Recommendation, or Report — Signals
 * remain the highest output of Financial Intelligence.
 */
export function runLeverageCapabilityPack(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): LeverageCapabilityResult {
  const { equity, nonCurrentLiabilities } = buildLeverageFinancialObjects(document, evidence);
  const { liabilities: currentLiabilities } = buildCurrentAssetsAndLiabilities(document, evidence);
  const liabilities = [...currentLiabilities, ...nonCurrentLiabilities];

  const financialObjects: FinancialObjectSet = {
    assets: [],
    liabilities,
    equity,
    revenue: [],
    expense: [],
    workingCapitalComponents: [],
    cashMovements: [],
  };

  const metrics = runMetricCalculators(
    [new TotalLiabilitiesCalculator(), new TotalEquityCalculator()],
    { documentId: document.documentId, financialObjects },
  );

  const ratios = runRatioCalculators([new DebtToEquityCalculator()], { documentId: document.documentId, metrics });

  const observations = runObservationCalculators(
    [new DebtToEquityNegativeCalculator()],
    { documentId: document.documentId, metrics, ratios },
  );

  const leverageEvidence = generateLeverageEvidence(document.documentId, observations, ratios, metrics, [
    ...liabilities,
    ...equity,
  ]);

  const signalGenerator = new FinancialSignalGenerator();
  const signals = signalGenerator.generate(document.documentId, leverageEvidence);

  return { equity, liabilities, metrics, ratios, observations, evidence: leverageEvidence, signals };
}
