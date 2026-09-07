import { deriveCompositeId } from "../../../shared/index.js";
import type { FinancialObservation } from "../../../shared/index.js";
import type { ObservationCalculator, ObservationCalculationContext } from "../../observations/observation-calculator.js";
import { createDefaultFinancialObservationRegistry } from "../../observations/financial-observation-definitions.js";

const DEFINITION = createDefaultFinancialObservationRegistry().get("debt_to_equity_negative");
if (!DEFINITION) {
  throw new Error("debt_to_equity_negative observation definition is missing from the default registry");
}

function findDebtToEquityRatio(context: ObservationCalculationContext) {
  return context.ratios.find((r) => r.definitionId === "debt_to_equity");
}

/**
 * The Leverage Capability Pack's `ObservationCalculator` — fires only when
 * Debt to Equity is genuinely negative, meaning Total Equity itself is
 * negative (total liabilities exceed total assets) — negative shareholders'
 * equity, a severe, single-period, universally-defensible solvency
 * condition, the same "below zero" pattern as every other pack's negative
 * Observation.
 */
export class DebtToEquityNegativeCalculator implements ObservationCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: ObservationCalculationContext): boolean {
    const ratio = findDebtToEquityRatio(context);
    return ratio !== undefined && ratio.value < 0;
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    const ratio = findDebtToEquityRatio(context);
    if (!ratio || ratio.value >= 0) return undefined;

    return {
      id: deriveCompositeId(["financial-observation", "debt_to_equity_negative", context.documentId, ratio.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      statement: this.definition.statementTemplate,
      documentId: context.documentId,
      metricIds: [],
      ratioIds: [ratio.id],
      confidence: ratio.confidence,
      basis: `Debt to equity ratio of ${ratio.value.toFixed(2)} indicates negative equity — total liabilities exceed total equity/assets.`,
    };
  }
}
