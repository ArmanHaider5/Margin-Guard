import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";
import type { Revenue, Expense } from "../../models/financial-object-model.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import type { CapabilityResult } from "../../internal/capability-support/capability-result.js";
import { DefaultFinancialCalculationPipeline } from "../../pipeline/financial-calculation-pipeline.js";
import { FinancialSignalGenerator } from "../../signals/financial-signal-generator.js";
import { buildRevenueAndExpenses } from "./revenue-expense-builder.js";
import {
  TotalRevenueCalculator,
  CostOfGoodsSoldCalculator,
  GrossProfitCalculator,
  TotalOperatingExpensesCalculator,
  NetProfitCalculator,
} from "./profitability-metric-calculators.js";
import { GrossMarginCalculator, NetMarginCalculator, OperatingMarginCalculator } from "./profitability-ratio-calculators.js";
import {
  GrossMarginNegativeCalculator,
  NetMarginNegativeCalculator,
  OperatingMarginNegativeCalculator,
} from "./profitability-observation-calculators.js";
import { generateProfitabilityEvidence } from "./profitability-evidence-generator.js";

/** Extends the shared internal `CapabilityResult` — see Liquidity's own
 * result type doc comment for the rationale. */
export interface ProfitabilityCapabilityResult extends CapabilityResult {
  readonly revenue: readonly Revenue[];
  readonly expenses: readonly Expense[];
}

/**
 * The Profitability Capability Pack — the second complete, real, end-to-end
 * business capability, following the same vertical-slice pattern the
 * Liquidity Capability Pack established:
 *
 *   EvidenceObject[] → Revenue/Expense (Financial Objects) →
 *   total_revenue/cost_of_goods_sold/gross_profit/total_operating_expenses/
 *   net_profit (Financial Metrics) → gross_margin/net_margin/operating_margin
 *   (Financial Ratios) → *_margin_negative (Financial Observations) →
 *   margin_erosion (Financial Evidence) → margin_compression (Financial
 *   Signal, when corroborated).
 *
 * Independently testable and demonstrable, same `(StructuredDocument,
 * EvidenceObject[])` signature as `runLiquidityCapabilityPack()` and
 * `analyzeFinancialSignals()`. Deliberately NOT wired into
 * `analyzeFinancialSignals()` and NOT exported from
 * `financial-intelligence/index.ts` — same reasoning as the Liquidity pack.
 *
 * Produces no Finding, Root Cause, Recommendation, or Report — Signals
 * remain the highest output of Financial Intelligence.
 */
export function runProfitabilityCapabilityPack(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): ProfitabilityCapabilityResult {
  const { revenue, expenses } = buildRevenueAndExpenses(document, evidence);

  const financialObjects: FinancialObjectSet = {
    assets: [],
    liabilities: [],
    equity: [],
    revenue,
    expense: expenses,
    workingCapitalComponents: [],
    cashMovements: [],
  };

  const pipeline = new DefaultFinancialCalculationPipeline(
    [
      new TotalRevenueCalculator(),
      new CostOfGoodsSoldCalculator(),
      new GrossProfitCalculator(),
      new TotalOperatingExpensesCalculator(),
      new NetProfitCalculator(),
    ],
    [new GrossMarginCalculator(), new NetMarginCalculator(), new OperatingMarginCalculator()],
    [new GrossMarginNegativeCalculator(), new NetMarginNegativeCalculator(), new OperatingMarginNegativeCalculator()],
  );

  const { metrics, ratios, observations } = pipeline.run({
    documentId: document.documentId,
    financialObjects,
  });

  const profitabilityEvidence = generateProfitabilityEvidence(document.documentId, observations, ratios, metrics, financialObjects);

  const signalGenerator = new FinancialSignalGenerator();
  const signals = signalGenerator.generate(document.documentId, profitabilityEvidence);

  return { revenue, expenses, metrics, ratios, observations, evidence: profitabilityEvidence, signals };
}
