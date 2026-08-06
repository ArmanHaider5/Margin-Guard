import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric, FinancialRatio } from "../../../shared/index.js";
import type { RatioCalculator, RatioCalculationContext } from "../../ratios/ratio-calculator.js";
import { createDefaultFinancialRatioRegistry } from "../../ratios/financial-ratio-definitions.js";

/**
 * The Profitability Capability Pack's three real `RatioCalculator`
 * implementations, grouped for the same reason as
 * `profitability-metric-calculators.ts`. `NetMarginCalculator` and
 * `OperatingMarginCalculator` both divide `net_profit` by `total_revenue` —
 * genuinely the same formula today, since this platform's Financial Object
 * Model does not yet distinguish operating from non-operating Expense
 * (interest, tax). Disclosed in full in
 * `financial-ratio-definitions.ts`'s doc comment and
 * `docs/98_TECHNICAL_BACKLOG.md` PC-002 — not silently hidden behind two
 * differently-worded but identical calculators.
 */

const ratioRegistry = createDefaultFinancialRatioRegistry();

function requireDefinition(id: string) {
  const definition = ratioRegistry.get(id);
  if (!definition) throw new Error(`${id} ratio definition is missing from the default registry`);
  return definition;
}

const GROSS_MARGIN_DEFINITION = requireDefinition("gross_margin");
const NET_MARGIN_DEFINITION = requireDefinition("net_margin");
const OPERATING_MARGIN_DEFINITION = requireDefinition("operating_margin");

function findMetric(context: RatioCalculationContext, definitionId: string): FinancialMetric | undefined {
  return context.metrics.find((m) => m.definitionId === definitionId);
}

/** Shared division-by-revenue shape: `numerator ÷ total_revenue`, refusing
 * to divide by zero revenue — a business with zero revenue has no
 * meaningful margin, not an infinite or undefined one this ratio should
 * report. */
function calculateMarginRatio(
  context: RatioCalculationContext,
  numeratorDefinitionId: string,
  ratioDefinitionId: string,
  category: FinancialRatio["category"],
  label: string,
): FinancialRatio | undefined {
  const numerator = findMetric(context, numeratorDefinitionId);
  const totalRevenue = findMetric(context, "total_revenue");
  if (!numerator || !totalRevenue || totalRevenue.value === 0) return undefined;

  const value = numerator.value / totalRevenue.value;
  const confidence = (numerator.confidence.value + totalRevenue.confidence.value) / 2;

  return {
    id: deriveCompositeId(["financial-ratio", ratioDefinitionId, context.documentId, numerator.id, totalRevenue.id]).slice(0, 16),
    definitionId: ratioDefinitionId,
    category,
    value,
    documentId: context.documentId,
    metricIds: [numerator.id, totalRevenue.id],
    confidence: Confidence.create(confidence),
    basis: `${label} (${numerator.value.toFixed(2)}) ÷ Total Revenue (${totalRevenue.value.toFixed(2)}) = ${value.toFixed(2)}.`,
  };
}

function canCalculateMarginRatio(context: RatioCalculationContext, numeratorDefinitionId: string): boolean {
  const numerator = findMetric(context, numeratorDefinitionId);
  const totalRevenue = findMetric(context, "total_revenue");
  return numerator !== undefined && totalRevenue !== undefined && totalRevenue.value !== 0;
}

export class GrossMarginCalculator implements RatioCalculator {
  readonly definition = GROSS_MARGIN_DEFINITION;

  canCalculate(context: RatioCalculationContext): boolean {
    return canCalculateMarginRatio(context, "gross_profit");
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    return calculateMarginRatio(context, "gross_profit", this.definition.id, this.definition.category, "Gross Profit");
  }
}

export class NetMarginCalculator implements RatioCalculator {
  readonly definition = NET_MARGIN_DEFINITION;

  canCalculate(context: RatioCalculationContext): boolean {
    return canCalculateMarginRatio(context, "net_profit");
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    return calculateMarginRatio(context, "net_profit", this.definition.id, this.definition.category, "Net Profit");
  }
}

export class OperatingMarginCalculator implements RatioCalculator {
  readonly definition = OPERATING_MARGIN_DEFINITION;

  canCalculate(context: RatioCalculationContext): boolean {
    return canCalculateMarginRatio(context, "net_profit");
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    return calculateMarginRatio(context, "net_profit", this.definition.id, this.definition.category, "Operating Profit");
  }
}
