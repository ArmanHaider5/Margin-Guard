import { deriveCompositeId } from "../../../shared/index.js";
import type { FinancialObservation } from "../../../shared/index.js";
import type { ObservationCalculator, ObservationCalculationContext } from "../../observations/observation-calculator.js";
import { createDefaultFinancialObservationRegistry } from "../../observations/financial-observation-definitions.js";

const DEFINITION = createDefaultFinancialObservationRegistry().get("working_capital_ratio_negative");
if (!DEFINITION) {
  throw new Error("working_capital_ratio_negative observation definition is missing from the default registry");
}

function findWorkingCapitalRatio(context: ObservationCalculationContext) {
  return context.ratios.find((r) => r.definitionId === "working_capital_ratio");
}

/**
 * The Working Capital Capability Pack's `ObservationCalculator` — fires only
 * when Working Capital Ratio is genuinely negative (current liabilities
 * exceed current assets), the same single-period, universally-defensible
 * "below zero" pattern used by every other pack's negative-condition
 * Observation.
 */
export class WorkingCapitalRatioNegativeCalculator implements ObservationCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: ObservationCalculationContext): boolean {
    const ratio = findWorkingCapitalRatio(context);
    return ratio !== undefined && ratio.value < 0;
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    const ratio = findWorkingCapitalRatio(context);
    if (!ratio || ratio.value >= 0) return undefined;

    return {
      id: deriveCompositeId(["financial-observation", "working_capital_ratio_negative", context.documentId, ratio.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      statement: this.definition.statementTemplate,
      documentId: context.documentId,
      metricIds: [],
      ratioIds: [ratio.id],
      confidence: ratio.confidence,
      basis: `Working capital ratio of ${ratio.value.toFixed(2)} is negative — current liabilities exceed current assets.`,
    };
  }
}
