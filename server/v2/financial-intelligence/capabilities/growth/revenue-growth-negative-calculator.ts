import { deriveCompositeId } from "../../../shared/index.js";
import type { FinancialObservation } from "../../../shared/index.js";
import type { ObservationCalculator, ObservationCalculationContext } from "../../observations/observation-calculator.js";
import { createDefaultFinancialObservationRegistry } from "../../observations/financial-observation-definitions.js";

const DEFINITION = createDefaultFinancialObservationRegistry().get("revenue_growth_negative");
if (!DEFINITION) {
  throw new Error("revenue_growth_negative observation definition is missing from the default registry");
}

function findRevenueGrowthRateRatio(context: ObservationCalculationContext) {
  return context.ratios.find((r) => r.definitionId === "revenue_growth_rate");
}

/**
 * The Growth Capability Pack's `ObservationCalculator` — fires only when
 * Revenue Growth Rate is genuinely negative (current-period revenue declined
 * relative to the prior detected period) — the same single-period,
 * universally-defensible "below zero" pattern as every other pack's
 * "negative" Observation. Deliberately distinct from the pre-existing,
 * still-unimplemented `revenue_growth_slowed` (a genuine deceleration trend
 * needing three periods' worth of data; see the definition's own doc
 * comment in `financial-observation-definitions.ts`).
 */
export class RevenueGrowthNegativeCalculator implements ObservationCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: ObservationCalculationContext): boolean {
    const ratio = findRevenueGrowthRateRatio(context);
    return ratio !== undefined && ratio.value < 0;
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    const ratio = findRevenueGrowthRateRatio(context);
    if (!ratio || ratio.value >= 0) return undefined;

    return {
      id: deriveCompositeId(["financial-observation", "revenue_growth_negative", context.documentId, ratio.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      statement: this.definition.statementTemplate,
      documentId: context.documentId,
      metricIds: [],
      ratioIds: [ratio.id],
      confidence: ratio.confidence,
      basis: `Revenue growth rate of ${(ratio.value * 100).toFixed(1)}% indicates revenue declined from the prior detected period to the current one.`,
    };
  }
}
