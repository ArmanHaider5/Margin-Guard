import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";
import type { WorkingCapitalComponent } from "../../models/financial-object-model.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import type { CapabilityResult } from "../../internal/capability-support/capability-result.js";
import { runMetricCalculators } from "../../metrics/metric-calculation-stage.js";
import { runRatioCalculators } from "../../ratios/ratio-calculation-stage.js";
import { runObservationCalculators } from "../../observations/observation-calculation-stage.js";
import { FinancialSignalGenerator } from "../../signals/financial-signal-generator.js";
import { buildWorkingCapitalComponents } from "./working-capital-component-builder.js";
import {
  AccountsReceivableBalanceCalculator,
  AccountsPayableBalanceCalculator,
  InventoryBalanceCalculator,
} from "./working-capital-metric-calculators.js";
import { WorkingCapitalRatioCalculator } from "./working-capital-ratio-calculator.js";
import { WorkingCapitalRatioNegativeCalculator } from "./working-capital-observation-calculator.js";
import { generateWorkingCapitalEvidence } from "./working-capital-evidence-generator.js";
import { buildCurrentAssetsAndLiabilities } from "../liquidity/current-asset-liability-builder.js";
import { TotalCurrentAssetsCalculator } from "../liquidity/total-current-assets-calculator.js";
import { TotalCurrentLiabilitiesCalculator } from "../liquidity/total-current-liabilities-calculator.js";

/** Extends the shared internal `CapabilityResult` — see Liquidity's own
 * result type doc comment for the rationale. */
export interface WorkingCapitalCapabilityResult extends CapabilityResult {
  readonly workingCapitalComponents: readonly WorkingCapitalComponent[];
}

/**
 * The Working Capital Capability Pack — the fourth complete, real,
 * end-to-end business capability, following the same vertical-slice pattern
 * every prior pack established:
 *
 *   EvidenceObject[] → WorkingCapitalComponent (Financial Objects:
 *   receivables/payables/inventory) → accounts_receivable_balance/
 *   accounts_payable_balance/inventory_balance (Financial Metrics) →
 *   working_capital_ratio (Financial Ratio) → working_capital_ratio_negative
 *   (Financial Observation) → working_capital_pressure (Financial Evidence)
 *   → liquidity_stress (Financial Signal, when corroborated).
 *
 * The second Capability Pack (after Cash Flow) whose Ratio layer needs
 * Metrics from another domain: `working_capital_ratio` requires both
 * `total_current_assets` and `total_current_liabilities` — Liquidity
 * metrics, reused directly by calling Liquidity's already-frozen
 * `buildCurrentAssetsAndLiabilities`/`TotalCurrentAssetsCalculator`/
 * `TotalCurrentLiabilitiesCalculator`, not duplicated. The evidence
 * generator is given the full set of Financial Objects any of this pack's
 * Ratios/Metrics could trace back to — `workingCapitalComponents` (this
 * pack's own) **and** `assets`/`liabilities` (Liquidity's, reused) — per the
 * defect-fix lesson recorded for Cash Flow (`docs/98_TECHNICAL_BACKLOG.md`
 * CF-004): omitting the cross-domain side would silently produce an
 * incomplete, not merely a shorter, evidence chain.
 *
 * Independently testable and demonstrable, same `(StructuredDocument,
 * EvidenceObject[])` signature as every other pack and
 * `analyzeFinancialSignals()`. Deliberately NOT wired into
 * `analyzeFinancialSignals()` and NOT exported from
 * `financial-intelligence/index.ts`.
 *
 * Produces no Finding, Root Cause, Recommendation, or Report — Signals
 * remain the highest output of Financial Intelligence.
 */
export function runWorkingCapitalCapabilityPack(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): WorkingCapitalCapabilityResult {
  const workingCapitalComponents = buildWorkingCapitalComponents(document, evidence);
  const { assets, liabilities } = buildCurrentAssetsAndLiabilities(document, evidence);

  const financialObjects: FinancialObjectSet = {
    assets,
    liabilities,
    equity: [],
    revenue: [],
    expense: [],
    workingCapitalComponents,
    cashMovements: [],
  };

  const workingCapitalMetrics = runMetricCalculators(
    [new AccountsReceivableBalanceCalculator(), new AccountsPayableBalanceCalculator(), new InventoryBalanceCalculator()],
    { documentId: document.documentId, financialObjects },
  );

  const liquidityMetrics = runMetricCalculators(
    [new TotalCurrentAssetsCalculator(), new TotalCurrentLiabilitiesCalculator()],
    { documentId: document.documentId, financialObjects },
  );

  const metrics = [...workingCapitalMetrics, ...liquidityMetrics];

  const ratios = runRatioCalculators([new WorkingCapitalRatioCalculator()], { documentId: document.documentId, metrics });

  const observations = runObservationCalculators(
    [new WorkingCapitalRatioNegativeCalculator()],
    { documentId: document.documentId, metrics, ratios },
  );

  const workingCapitalEvidence = generateWorkingCapitalEvidence(document.documentId, observations, ratios, metrics, [
    ...workingCapitalComponents,
    ...assets,
    ...liabilities,
  ]);

  const signalGenerator = new FinancialSignalGenerator();
  const signals = signalGenerator.generate(document.documentId, workingCapitalEvidence);

  return { workingCapitalComponents, metrics, ratios, observations, evidence: workingCapitalEvidence, signals };
}
