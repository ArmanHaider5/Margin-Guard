import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";
import type { CashMovement } from "../../models/financial-object-model.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import type { CapabilityResult } from "../../internal/capability-support/capability-result.js";
import { runMetricCalculators } from "../../metrics/metric-calculation-stage.js";
import { runRatioCalculators } from "../../ratios/ratio-calculation-stage.js";
import { runObservationCalculators } from "../../observations/observation-calculation-stage.js";
import { FinancialSignalGenerator } from "../../signals/financial-signal-generator.js";
import { buildCashMovements } from "./cash-movement-builder.js";
import { CashGeneratedCalculator, CashUsedCalculator, OperatingCashFlowCalculator, NetCashFlowCalculator } from "./cash-flow-metric-calculators.js";
import { OperatingCashFlowRatioCalculator, CashCoverageRatioCalculator } from "./cash-flow-ratio-calculators.js";
import { OperatingCashFlowNegativeCalculator, CashCoverageRatioLowCalculator } from "./cash-flow-observation-calculators.js";
import { generateCashFlowEvidence } from "./cash-flow-evidence-generator.js";
import { buildCurrentAssetsAndLiabilities } from "../liquidity/current-asset-liability-builder.js";
import { TotalCurrentLiabilitiesCalculator } from "../liquidity/total-current-liabilities-calculator.js";

/** Extends the shared internal `CapabilityResult` — see Liquidity's own
 * result type doc comment for the rationale. */
export interface CashFlowCapabilityResult extends CapabilityResult {
  readonly cashMovements: readonly CashMovement[];
}

/**
 * The Cash Flow Capability Pack — the third complete, real, end-to-end
 * business capability, following the same vertical-slice pattern Liquidity
 * and Profitability established:
 *
 *   EvidenceObject[] → CashMovement (Financial Objects) →
 *   cash_generated/cash_used/operating_cash_flow/net_cash_flow (Financial
 *   Metrics) → operating_cash_flow_ratio/cash_coverage_ratio (Financial
 *   Ratios) → operating_cash_flow_negative/cash_coverage_ratio_low
 *   (Financial Observations) → negative_cash_flow (Financial Evidence) →
 *   cash_conversion_deterioration (Financial Signal, when corroborated).
 *
 * The first Capability Pack whose Ratio layer needs a Metric from another
 * domain: both ratios require `total_current_liabilities`, a **Liquidity**
 * metric. Rather than duplicating Asset/Liability construction, this pack
 * directly reuses Liquidity's already-frozen, already-tested
 * `buildCurrentAssetsAndLiabilities`/`TotalCurrentLiabilitiesCalculator` and
 * merges the resulting metric into its own metrics array before running its
 * Ratio calculators — which is why this orchestrator calls
 * `runMetricCalculators`/`runRatioCalculators`/`runObservationCalculators`
 * directly (the same real, frozen stage runners
 * `DefaultFinancialCalculationPipeline` itself calls) instead of using
 * `DefaultFinancialCalculationPipeline`, whose single `run()` call has no
 * point to inject a cross-domain metric between the Metric and Ratio stages.
 * Liquidity's own tests already cover the reused code's correctness — this
 * pack's tests supply their own Asset/Liability fixture data and assert
 * Cash-Flow-specific outputs, so it remains independently testable, not
 * dependent on Liquidity's test suite passing first.
 *
 * Independently testable and demonstrable, same `(StructuredDocument,
 * EvidenceObject[])` signature as the other packs and
 * `analyzeFinancialSignals()`. Deliberately NOT wired into
 * `analyzeFinancialSignals()` and NOT exported from
 * `financial-intelligence/index.ts`.
 *
 * Produces no Finding, Root Cause, Recommendation, or Report — Signals
 * remain the highest output of Financial Intelligence.
 */
export function runCashFlowCapabilityPack(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): CashFlowCapabilityResult {
  const cashMovements = buildCashMovements(document, evidence);
  const { liabilities } = buildCurrentAssetsAndLiabilities(document, evidence);

  const financialObjects: FinancialObjectSet = {
    assets: [],
    liabilities,
    equity: [],
    revenue: [],
    expense: [],
    workingCapitalComponents: [],
    cashMovements,
  };

  const cashFlowMetrics = runMetricCalculators(
    [new CashGeneratedCalculator(), new CashUsedCalculator(), new OperatingCashFlowCalculator(), new NetCashFlowCalculator()],
    { documentId: document.documentId, financialObjects },
  );

  const liabilitiesMetric = new TotalCurrentLiabilitiesCalculator().calculate({
    documentId: document.documentId,
    financialObjects,
  });
  const metrics = liabilitiesMetric ? [...cashFlowMetrics, liabilitiesMetric] : cashFlowMetrics;

  const ratios = runRatioCalculators(
    [new OperatingCashFlowRatioCalculator(), new CashCoverageRatioCalculator()],
    { documentId: document.documentId, metrics },
  );

  const observations = runObservationCalculators(
    [new OperatingCashFlowNegativeCalculator(), new CashCoverageRatioLowCalculator()],
    { documentId: document.documentId, metrics, ratios },
  );

  const cashFlowEvidence = generateCashFlowEvidence(document.documentId, observations, ratios, metrics, [
    ...cashMovements,
    ...liabilities,
  ]);

  const signalGenerator = new FinancialSignalGenerator();
  const signals = signalGenerator.generate(document.documentId, cashFlowEvidence);

  return { cashMovements, metrics, ratios, observations, evidence: cashFlowEvidence, signals };
}
