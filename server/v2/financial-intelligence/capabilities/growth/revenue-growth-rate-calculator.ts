import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialRatio } from "../../../shared/index.js";
import type { RatioCalculator, RatioCalculationContext } from "../../ratios/ratio-calculator.js";
import { createDefaultFinancialRatioRegistry } from "../../ratios/financial-ratio-definitions.js";

const DEFINITION = createDefaultFinancialRatioRegistry().get("revenue_growth_rate");
if (!DEFINITION) {
  throw new Error("revenue_growth_rate ratio definition is missing from the default registry");
}

function findMetrics(context: RatioCalculationContext) {
  const currentPeriodRevenue = context.metrics.find((m) => m.definitionId === "current_period_revenue");
  const priorPeriodRevenue = context.metrics.find((m) => m.definitionId === "prior_period_revenue");
  return { currentPeriodRevenue, priorPeriodRevenue };
}

/**
 * The Growth Capability Pack's `RatioCalculator` — Revenue Growth Rate =
 * (current_period_revenue − prior_period_revenue) ÷ prior_period_revenue, a
 * single, universally-standard formula for period-over-period growth. Unlike
 * every prior pack's Ratio, this one does not reuse another pack's Metric —
 * no other pack's Metric represents a single period's Revenue in isolation
 * (Profitability's `total_revenue` deliberately aggregates across whatever
 * Revenue rows exist, undifferentiated by period), so Growth's own
 * `CurrentPeriodRevenueCalculator`/`PriorPeriodRevenueCalculator` were
 * necessary (see `growth-metric-calculators.ts`). Refuses to divide by zero
 * prior-period revenue.
 */
export class RevenueGrowthRateCalculator implements RatioCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: RatioCalculationContext): boolean {
    const { currentPeriodRevenue, priorPeriodRevenue } = findMetrics(context);
    return currentPeriodRevenue !== undefined && priorPeriodRevenue !== undefined && priorPeriodRevenue.value !== 0;
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    const { currentPeriodRevenue, priorPeriodRevenue } = findMetrics(context);
    if (!currentPeriodRevenue || !priorPeriodRevenue || priorPeriodRevenue.value === 0) return undefined;

    const value = (currentPeriodRevenue.value - priorPeriodRevenue.value) / priorPeriodRevenue.value;
    const confidence = (currentPeriodRevenue.confidence.value + priorPeriodRevenue.confidence.value) / 2;

    return {
      id: deriveCompositeId([
        "financial-ratio",
        "revenue_growth_rate",
        context.documentId,
        currentPeriodRevenue.id,
        priorPeriodRevenue.id,
      ]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      value,
      documentId: context.documentId,
      metricIds: [currentPeriodRevenue.id, priorPeriodRevenue.id],
      confidence: Confidence.create(confidence),
      basis: `(Current Period Revenue ${currentPeriodRevenue.value.toFixed(2)} − Prior Period Revenue ${priorPeriodRevenue.value.toFixed(2)}) ÷ Prior Period Revenue ${priorPeriodRevenue.value.toFixed(2)} = ${value.toFixed(4)}.`,
    };
  }
}
