import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric } from "../../../shared/index.js";
import type { MetricCalculator, MetricCalculationContext } from "../../metrics/metric-calculator.js";
import { createDefaultFinancialMetricRegistry } from "../../metrics/financial-metric-definitions.js";
import type { Revenue } from "../../models/financial-object-model.js";

/**
 * The Growth Capability Pack's two real `MetricCalculator` implementations,
 * populating the two Metric definitions this pack introduced (see
 * `financial-metric-definitions.ts`'s own doc comment). Both filter
 * `context.financialObjects.revenue` by the `periodSequence` tag
 * `period-revenue-builder.ts` sets — the same "filter one shared array by a
 * distinguishing field" shape Profitability's `cogsOf`/`operatingExpensesOf`
 * already established for `Expense.category`, applied here to `Revenue`.
 *
 * If a document contains more than one qualifying Revenue-normalized column
 * (multiple Revenue sequences), all of that column's period-tagged entries
 * are summed together — the same "sum whatever the caller assembled" pattern
 * used throughout this codebase (e.g. `TotalAssetsCalculator`).
 */

const metricRegistry = createDefaultFinancialMetricRegistry();

function requireDefinition(id: string) {
  const definition = metricRegistry.get(id);
  if (!definition) throw new Error(`${id} metric definition is missing from the default registry`);
  return definition;
}

const CURRENT_PERIOD_REVENUE_DEFINITION = requireDefinition("current_period_revenue");
const PRIOR_PERIOD_REVENUE_DEFINITION = requireDefinition("prior_period_revenue");

function sum(items: readonly Revenue[]): { total: number; currencyCode: string } {
  const currencyCode = items[0]!.totalValue.currency.code;
  const total = items.reduce((s, item) => s + item.totalValue.amount, 0);
  return { total, currencyCode };
}

function averageConfidence(items: readonly Revenue[]): number {
  return items.reduce((s, item) => s + item.confidence.value, 0) / items.length;
}

function currentPeriodOf(revenue: readonly Revenue[]): Revenue[] {
  return revenue.filter((r) => r.periodSequence === "current");
}

function priorPeriodOf(revenue: readonly Revenue[]): Revenue[] {
  return revenue.filter((r) => r.periodSequence === "prior");
}

export class CurrentPeriodRevenueCalculator implements MetricCalculator {
  readonly definition = CURRENT_PERIOD_REVENUE_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return currentPeriodOf(context.financialObjects.revenue).length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const current = currentPeriodOf(context.financialObjects.revenue);
    if (current.length === 0) return undefined;
    const { total, currencyCode } = sum(current);
    return {
      id: deriveCompositeId(["financial-metric", "current_period_revenue", context.documentId, ...current.map((r) => r.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: current.map((r) => r.id),
      confidence: Confidence.create(averageConfidence(current)),
      basis: `Sum of ${current.length} current-period Revenue entr${current.length === 1 ? "y" : "ies"} (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}

export class PriorPeriodRevenueCalculator implements MetricCalculator {
  readonly definition = PRIOR_PERIOD_REVENUE_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return priorPeriodOf(context.financialObjects.revenue).length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const prior = priorPeriodOf(context.financialObjects.revenue);
    if (prior.length === 0) return undefined;
    const { total, currencyCode } = sum(prior);
    return {
      id: deriveCompositeId(["financial-metric", "prior_period_revenue", context.documentId, ...prior.map((r) => r.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: prior.map((r) => r.id),
      confidence: Confidence.create(averageConfidence(prior)),
      basis: `Sum of ${prior.length} prior-period Revenue entr${prior.length === 1 ? "y" : "ies"} (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}
