import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";
import type { Revenue } from "../../models/financial-object-model.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import type { CapabilityResult } from "../../internal/capability-support/capability-result.js";
import { runMetricCalculators } from "../../metrics/metric-calculation-stage.js";
import { runRatioCalculators } from "../../ratios/ratio-calculation-stage.js";
import { runObservationCalculators } from "../../observations/observation-calculation-stage.js";
import { FinancialSignalGenerator } from "../../signals/financial-signal-generator.js";
import { buildPeriodRevenueSequence } from "./period-revenue-builder.js";
import { CurrentPeriodRevenueCalculator, PriorPeriodRevenueCalculator } from "./growth-metric-calculators.js";
import { RevenueGrowthRateCalculator } from "./revenue-growth-rate-calculator.js";
import { RevenueGrowthNegativeCalculator } from "./revenue-growth-negative-calculator.js";
import { generateGrowthEvidence } from "./growth-evidence-generator.js";

/** Extends the shared internal `CapabilityResult` — see Liquidity's own
 * result type doc comment for the rationale. */
export interface GrowthCapabilityResult extends CapabilityResult {
  readonly periodRevenue: readonly Revenue[];
}

/**
 * The Growth Capability Pack — the seventh complete, real, end-to-end
 * business capability, following the same vertical-slice pattern every prior
 * pack established:
 *
 *   EvidenceObject[] → Revenue tagged "prior"/"current" by row sequence
 *   (this pack's own Financial Objects) → current_period_revenue /
 *   prior_period_revenue (this pack's own Financial Metrics) →
 *   revenue_growth_rate (Financial Ratio) → revenue_growth_negative
 *   (Financial Observation) → revenue_growth (Financial Evidence, third
 *   source) → revenue_instability (Financial Signal, when corroborated).
 *
 * Unlike every prior pack, Growth does **not** cross-reuse another pack's
 * Metric or builder for its core calculation — no existing Metric
 * represents a single period's Revenue in isolation (Profitability's
 * `total_revenue` aggregates every Revenue row a document has). Growth's
 * Financial Object and Metric layers are therefore entirely its own,
 * disclosed as a genuine, honest exception to "reuse whenever possible"
 * rather than forced into a reuse that would not actually work (see
 * `docs/98_TECHNICAL_BACKLOG.md` GR-001/GR-002 and this pack's own file-level
 * doc comments for the full reasoning).
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
export function runGrowthCapabilityPack(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): GrowthCapabilityResult {
  const periodRevenue = buildPeriodRevenueSequence(document, evidence);

  const financialObjects: FinancialObjectSet = {
    assets: [],
    liabilities: [],
    equity: [],
    revenue: periodRevenue,
    expense: [],
    workingCapitalComponents: [],
    cashMovements: [],
  };

  const metrics = runMetricCalculators(
    [new CurrentPeriodRevenueCalculator(), new PriorPeriodRevenueCalculator()],
    { documentId: document.documentId, financialObjects },
  );

  const ratios = runRatioCalculators([new RevenueGrowthRateCalculator()], { documentId: document.documentId, metrics });

  const observations = runObservationCalculators(
    [new RevenueGrowthNegativeCalculator()],
    { documentId: document.documentId, metrics, ratios },
  );

  const growthEvidence = generateGrowthEvidence(document.documentId, observations, ratios, metrics, periodRevenue);

  const signalGenerator = new FinancialSignalGenerator();
  const signals = signalGenerator.generate(document.documentId, growthEvidence);

  return { periodRevenue, metrics, ratios, observations, evidence: growthEvidence, signals };
}
