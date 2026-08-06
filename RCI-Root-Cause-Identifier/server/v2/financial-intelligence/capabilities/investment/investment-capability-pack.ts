import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";
import type { Equity, Expense, Revenue } from "../../models/financial-object-model.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import type { CapabilityResult } from "../../internal/capability-support/capability-result.js";
import { runMetricCalculators } from "../../metrics/metric-calculation-stage.js";
import { runRatioCalculators } from "../../ratios/ratio-calculation-stage.js";
import { runObservationCalculators } from "../../observations/observation-calculation-stage.js";
import { FinancialSignalGenerator } from "../../signals/financial-signal-generator.js";
import { buildRevenueAndExpenses } from "../profitability/revenue-expense-builder.js";
import { GrossProfitCalculator } from "../profitability/profitability-metric-calculators.js";
import { buildLeverageFinancialObjects } from "../leverage/leverage-object-builder.js";
import { TotalEquityCalculator } from "../leverage/leverage-metric-calculators.js";
import { ReturnOnEquityCalculator } from "./return-on-equity-calculator.js";
import { ReturnOnEquityNegativeCalculator } from "./return-on-equity-negative-calculator.js";
import { generateInvestmentEvidence } from "./investment-evidence-generator.js";

/** Extends the shared internal `CapabilityResult` — see Liquidity's own
 * result type doc comment for the rationale. */
export interface InvestmentCapabilityResult extends CapabilityResult {
  readonly revenue: readonly Revenue[];
  readonly expenses: readonly Expense[];
  readonly equity: readonly Equity[];
}

/**
 * The Investment Capability Pack — the eighth complete, real, end-to-end
 * business capability, following the same vertical-slice pattern every
 * prior pack established:
 *
 *   EvidenceObject[] → Revenue/Expense (reused from Profitability) / Equity
 *   (reused from Leverage) → gross_profit (reused from Profitability) /
 *   total_equity (reused from Leverage) → return_on_equity (this pack's own
 *   Financial Ratio) → return_on_equity_negative (this pack's own Financial
 *   Observation) → margin_erosion (Financial Evidence, fourth source) →
 *   margin_compression (Financial Signal, when corroborated).
 *
 * **The first pack with no new Financial Object builder and no new Metric
 * calculator at all.** Return on Equity's two inputs — Gross Profit and
 * Total Equity — are both already real, frozen, fully-tested calculations
 * (`GrossProfitCalculator` from Profitability, `TotalEquityCalculator` from
 * Leverage) built from already-frozen builders (`buildRevenueAndExpenses`,
 * `buildLeverageFinancialObjects`). This pack imports and calls all four
 * directly, unmodified — the natural conclusion of "reuse existing
 * calculations whenever possible, do not duplicate builders" once a
 * category's Ratio happens to need only Metrics two *other* packs already
 * fully compute. Only the Ratio and Observation layers, and the Evidence
 * generator, are genuinely new to this pack.
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
export function runInvestmentCapabilityPack(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): InvestmentCapabilityResult {
  const { revenue, expenses } = buildRevenueAndExpenses(document, evidence);
  const { equity } = buildLeverageFinancialObjects(document, evidence);

  const financialObjects: FinancialObjectSet = {
    assets: [],
    liabilities: [],
    equity,
    revenue,
    expense: expenses,
    workingCapitalComponents: [],
    cashMovements: [],
  };

  const metrics = runMetricCalculators(
    [new GrossProfitCalculator(), new TotalEquityCalculator()],
    { documentId: document.documentId, financialObjects },
  );

  const ratios = runRatioCalculators([new ReturnOnEquityCalculator()], { documentId: document.documentId, metrics });

  const observations = runObservationCalculators(
    [new ReturnOnEquityNegativeCalculator()],
    { documentId: document.documentId, metrics, ratios },
  );

  const investmentEvidence = generateInvestmentEvidence(document.documentId, observations, ratios, metrics, [
    ...revenue,
    ...expenses,
    ...equity,
  ]);

  const signalGenerator = new FinancialSignalGenerator();
  const signals = signalGenerator.generate(document.documentId, investmentEvidence);

  return { revenue, expenses, equity, metrics, ratios, observations, evidence: investmentEvidence, signals };
}
