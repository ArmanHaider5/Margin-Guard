import { deriveCompositeId } from "../../../shared/index.js";
import type { FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import type { ObservationCalculator, ObservationCalculationContext } from "../../observations/observation-calculator.js";
import { createDefaultFinancialObservationRegistry } from "../../observations/financial-observation-definitions.js";

/**
 * The Profitability Capability Pack's three real `ObservationCalculator`
 * implementations, grouped for the same reason as the metric/ratio
 * calculator files. Each fires only when its Ratio is genuinely negative
 * (below zero) — a single-period, universally-defensible threshold, unlike
 * a "healthy margin" percentage (industry-dependent — see
 * `docs/98_TECHNICAL_BACKLOG.md` LC-002's reasoning, which applies equally
 * here). None of the three attempts the period-over-period "declined
 * compared with previous periods" trend the already-registered
 * `gross_margin_declined` definition describes — no multi-period Ratio
 * comparison exists yet (see `docs/98_TECHNICAL_BACKLOG.md` PC-003).
 */

const observationRegistry = createDefaultFinancialObservationRegistry();

function requireDefinition(id: string) {
  const definition = observationRegistry.get(id);
  if (!definition) throw new Error(`${id} observation definition is missing from the default registry`);
  return definition;
}

const GROSS_MARGIN_NEGATIVE_DEFINITION = requireDefinition("gross_margin_negative");
const NET_MARGIN_NEGATIVE_DEFINITION = requireDefinition("net_margin_negative");
const OPERATING_MARGIN_NEGATIVE_DEFINITION = requireDefinition("operating_margin_negative");

function findRatio(context: ObservationCalculationContext, definitionId: string): FinancialRatio | undefined {
  return context.ratios.find((r) => r.definitionId === definitionId);
}

function calculateNegativeMarginObservation(
  context: ObservationCalculationContext,
  ratioDefinitionId: string,
  observationDefinitionId: string,
  category: FinancialObservation["category"],
  statement: string,
): FinancialObservation | undefined {
  const ratio = findRatio(context, ratioDefinitionId);
  if (!ratio || ratio.value >= 0) return undefined;

  return {
    id: deriveCompositeId(["financial-observation", observationDefinitionId, context.documentId, ratio.id]).slice(0, 16),
    definitionId: observationDefinitionId,
    category,
    statement,
    documentId: context.documentId,
    metricIds: [],
    ratioIds: [ratio.id],
    confidence: ratio.confidence,
    basis: `${statement.replace(/\.$/, "")} — value of ${ratio.value.toFixed(2)}.`,
  };
}

function canCalculateNegativeMarginObservation(context: ObservationCalculationContext, ratioDefinitionId: string): boolean {
  const ratio = findRatio(context, ratioDefinitionId);
  return ratio !== undefined && ratio.value < 0;
}

export class GrossMarginNegativeCalculator implements ObservationCalculator {
  readonly definition = GROSS_MARGIN_NEGATIVE_DEFINITION;

  canCalculate(context: ObservationCalculationContext): boolean {
    return canCalculateNegativeMarginObservation(context, "gross_margin");
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    return calculateNegativeMarginObservation(context, "gross_margin", this.definition.id, this.definition.category, this.definition.statementTemplate);
  }
}

export class NetMarginNegativeCalculator implements ObservationCalculator {
  readonly definition = NET_MARGIN_NEGATIVE_DEFINITION;

  canCalculate(context: ObservationCalculationContext): boolean {
    return canCalculateNegativeMarginObservation(context, "net_margin");
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    return calculateNegativeMarginObservation(context, "net_margin", this.definition.id, this.definition.category, this.definition.statementTemplate);
  }
}

export class OperatingMarginNegativeCalculator implements ObservationCalculator {
  readonly definition = OPERATING_MARGIN_NEGATIVE_DEFINITION;

  canCalculate(context: ObservationCalculationContext): boolean {
    return canCalculateNegativeMarginObservation(context, "operating_margin");
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    return calculateNegativeMarginObservation(context, "operating_margin", this.definition.id, this.definition.category, this.definition.statementTemplate);
  }
}
