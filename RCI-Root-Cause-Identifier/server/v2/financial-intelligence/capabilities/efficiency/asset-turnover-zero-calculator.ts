import { deriveCompositeId } from "../../../shared/index.js";
import type { FinancialObservation } from "../../../shared/index.js";
import type { ObservationCalculator, ObservationCalculationContext } from "../../observations/observation-calculator.js";
import { createDefaultFinancialObservationRegistry } from "../../observations/financial-observation-definitions.js";

const DEFINITION = createDefaultFinancialObservationRegistry().get("asset_turnover_zero");
if (!DEFINITION) {
  throw new Error("asset_turnover_zero observation definition is missing from the default registry");
}

function findAssetTurnoverRatio(context: ObservationCalculationContext) {
  return context.ratios.find((r) => r.definitionId === "asset_turnover");
}

/**
 * The Efficiency Capability Pack's `ObservationCalculator` — fires only when
 * Asset Turnover is exactly zero (no revenue generated relative to the asset
 * base), per `asset_turnover_zero`'s documented rationale for an exact-zero
 * rather than a low-turnover threshold condition (see the definition's own
 * doc comment in `financial-observation-definitions.ts`).
 */
export class AssetTurnoverZeroCalculator implements ObservationCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: ObservationCalculationContext): boolean {
    const ratio = findAssetTurnoverRatio(context);
    return ratio !== undefined && ratio.value === 0;
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    const ratio = findAssetTurnoverRatio(context);
    if (!ratio || ratio.value !== 0) return undefined;

    return {
      id: deriveCompositeId(["financial-observation", "asset_turnover_zero", context.documentId, ratio.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      statement: this.definition.statementTemplate,
      documentId: context.documentId,
      metricIds: [],
      ratioIds: [ratio.id],
      confidence: ratio.confidence,
      basis: `Asset turnover ratio of ${ratio.value.toFixed(2)} indicates no revenue was generated relative to the asset base for the period.`,
    };
  }
}
