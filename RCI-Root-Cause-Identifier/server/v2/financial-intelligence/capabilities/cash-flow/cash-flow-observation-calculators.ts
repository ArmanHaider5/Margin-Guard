import { deriveCompositeId } from "../../../shared/index.js";
import type { FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import type { ObservationCalculator, ObservationCalculationContext } from "../../observations/observation-calculator.js";
import { createDefaultFinancialObservationRegistry } from "../../observations/financial-observation-definitions.js";

/**
 * The Cash Flow Capability Pack's two real `ObservationCalculator`
 * implementations. `OperatingCashFlowNegativeCalculator` mirrors
 * Profitability's "below zero" pattern exactly. `CashCoverageRatioLowCalculator`
 * uses a "below 1.0" threshold instead — below 1.0 means gross Cash
 * Generated does not even cover Current Liabilities once, a defensible
 * universal cutoff (unlike an arbitrary "preferred" ratio such as
 * `current_ratio_below_range`'s 1.5 — see `docs/98_TECHNICAL_BACKLOG.md`
 * CF-002).
 */

const observationRegistry = createDefaultFinancialObservationRegistry();

function requireDefinition(id: string) {
  const definition = observationRegistry.get(id);
  if (!definition) throw new Error(`${id} observation definition is missing from the default registry`);
  return definition;
}

const OPERATING_CASH_FLOW_NEGATIVE_DEFINITION = requireDefinition("operating_cash_flow_negative");
const CASH_COVERAGE_RATIO_LOW_DEFINITION = requireDefinition("cash_coverage_ratio_low");

export const CASH_COVERAGE_RATIO_MINIMUM = 1.0;

function findRatio(context: ObservationCalculationContext, definitionId: string): FinancialRatio | undefined {
  return context.ratios.find((r) => r.definitionId === definitionId);
}

export class OperatingCashFlowNegativeCalculator implements ObservationCalculator {
  readonly definition = OPERATING_CASH_FLOW_NEGATIVE_DEFINITION;

  canCalculate(context: ObservationCalculationContext): boolean {
    const ratio = findRatio(context, "operating_cash_flow_ratio");
    return ratio !== undefined && ratio.value < 0;
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    const ratio = findRatio(context, "operating_cash_flow_ratio");
    if (!ratio || ratio.value >= 0) return undefined;

    return {
      id: deriveCompositeId(["financial-observation", "operating_cash_flow_negative", context.documentId, ratio.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      statement: this.definition.statementTemplate,
      documentId: context.documentId,
      metricIds: [],
      ratioIds: [ratio.id],
      confidence: ratio.confidence,
      basis: `Operating cash flow ratio of ${ratio.value.toFixed(2)} indicates negative operating cash flow.`,
    };
  }
}

export class CashCoverageRatioLowCalculator implements ObservationCalculator {
  readonly definition = CASH_COVERAGE_RATIO_LOW_DEFINITION;

  canCalculate(context: ObservationCalculationContext): boolean {
    const ratio = findRatio(context, "cash_coverage_ratio");
    return ratio !== undefined && ratio.value < CASH_COVERAGE_RATIO_MINIMUM;
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    const ratio = findRatio(context, "cash_coverage_ratio");
    if (!ratio || ratio.value >= CASH_COVERAGE_RATIO_MINIMUM) return undefined;

    return {
      id: deriveCompositeId(["financial-observation", "cash_coverage_ratio_low", context.documentId, ratio.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      statement: this.definition.statementTemplate,
      documentId: context.documentId,
      metricIds: [],
      ratioIds: [ratio.id],
      confidence: ratio.confidence,
      basis: `Cash coverage ratio of ${ratio.value.toFixed(2)} is below the minimum of ${CASH_COVERAGE_RATIO_MINIMUM.toFixed(2)}.`,
    };
  }
}
