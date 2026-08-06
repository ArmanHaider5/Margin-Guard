import { deriveCompositeId } from "../../../shared/index.js";
import type { FinancialObservation } from "../../../shared/index.js";
import type { ObservationCalculator, ObservationCalculationContext } from "../../observations/observation-calculator.js";
import { createDefaultFinancialObservationRegistry } from "../../observations/financial-observation-definitions.js";

const DEFINITION = createDefaultFinancialObservationRegistry().get("current_ratio_below_range");
if (!DEFINITION) {
  throw new Error("current_ratio_below_range observation definition is missing from the default registry");
}

/**
 * A standard, widely-cited financial-analysis heuristic (a current ratio
 * comfortably above 1 is generally considered a minimum sign of short-term
 * solvency; 1.5 is a commonly-used "healthy" threshold) — not sourced from a
 * specific Scope Optix approved document, since no formal, versioned
 * Benchmark object exists yet for this concept
 * (`00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md` §3.21 names "Benchmark" as a future
 * Knowledge object, not yet implemented). Disclosed here as a stated,
 * promotion-path exception — see `docs/98_TECHNICAL_BACKLOG.md` — the same
 * pattern already used elsewhere for values not yet backed by a real
 * Knowledge System entity.
 */
export const PREFERRED_CURRENT_RATIO_MINIMUM = 1.5;

function findCurrentRatio(context: ObservationCalculationContext) {
  return context.ratios.find((r) => r.definitionId === "current_ratio");
}

/**
 * The Liquidity Capability Pack's `ObservationCalculator`. An Observation is
 * only ever produced when the condition it states is actually true — this
 * calculator does not emit a "current ratio is healthy" counterpart
 * Observation, since no such definition is registered
 * (`observations/financial-observation-definitions.ts` defines
 * `current_ratio_below_range` only). Purely a threshold comparison against an
 * already-computed Ratio — states the fact, per Financial Observations'
 * defining rule, never explains why it happened.
 */
export class CurrentRatioBelowRangeCalculator implements ObservationCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: ObservationCalculationContext): boolean {
    const currentRatio = findCurrentRatio(context);
    return currentRatio !== undefined && currentRatio.value < PREFERRED_CURRENT_RATIO_MINIMUM;
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    const currentRatio = findCurrentRatio(context);
    if (!currentRatio || currentRatio.value >= PREFERRED_CURRENT_RATIO_MINIMUM) return undefined;

    return {
      id: deriveCompositeId(["financial-observation", "current_ratio_below_range", context.documentId, currentRatio.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      statement: this.definition.statementTemplate,
      documentId: context.documentId,
      metricIds: [],
      ratioIds: [currentRatio.id],
      confidence: currentRatio.confidence,
      basis: `Current ratio of ${currentRatio.value.toFixed(2)} is below the preferred minimum of ${PREFERRED_CURRENT_RATIO_MINIMUM.toFixed(2)}.`,
    };
  }
}
