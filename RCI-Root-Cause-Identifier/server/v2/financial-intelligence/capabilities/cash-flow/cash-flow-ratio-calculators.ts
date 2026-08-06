import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric, FinancialRatio } from "../../../shared/index.js";
import type { RatioCalculator, RatioCalculationContext } from "../../ratios/ratio-calculator.js";
import { createDefaultFinancialRatioRegistry } from "../../ratios/financial-ratio-definitions.js";

/**
 * The Cash Flow Capability Pack's two real `RatioCalculator` implementations.
 * Both require `total_current_liabilities` — a **Liquidity** Capability Pack
 * metric, not a Cash Flow one. Neither calculator here cares where that
 * metric came from; it simply looks it up in `context.metrics`, exactly like
 * every other calculator looks up its own domain's metrics. The cross-domain
 * wiring — actually computing `total_current_liabilities` by reusing
 * Liquidity's already-frozen `buildCurrentAssetsAndLiabilities`/
 * `TotalCurrentLiabilitiesCalculator` and merging it into the metrics array —
 * lives entirely in `cash-flow-capability-pack.ts`, the orchestrator, not
 * here. This is the first Capability Pack whose Ratio layer genuinely
 * depends on another pack's Metric.
 */

const ratioRegistry = createDefaultFinancialRatioRegistry();

function requireDefinition(id: string) {
  const definition = ratioRegistry.get(id);
  if (!definition) throw new Error(`${id} ratio definition is missing from the default registry`);
  return definition;
}

const OPERATING_CASH_FLOW_RATIO_DEFINITION = requireDefinition("operating_cash_flow_ratio");
const CASH_COVERAGE_RATIO_DEFINITION = requireDefinition("cash_coverage_ratio");

function findMetric(context: RatioCalculationContext, definitionId: string): FinancialMetric | undefined {
  return context.metrics.find((m) => m.definitionId === definitionId);
}

/** Shared division-by-current-liabilities shape, refusing to divide by
 * zero — a business with zero current liabilities has no meaningful
 * coverage ratio to report. */
function calculateLiabilityCoverageRatio(
  context: RatioCalculationContext,
  numeratorDefinitionId: string,
  ratioDefinitionId: string,
  category: FinancialRatio["category"],
  label: string,
): FinancialRatio | undefined {
  const numerator = findMetric(context, numeratorDefinitionId);
  const totalCurrentLiabilities = findMetric(context, "total_current_liabilities");
  if (!numerator || !totalCurrentLiabilities || totalCurrentLiabilities.value === 0) return undefined;

  const value = numerator.value / totalCurrentLiabilities.value;
  const confidence = (numerator.confidence.value + totalCurrentLiabilities.confidence.value) / 2;

  return {
    id: deriveCompositeId(["financial-ratio", ratioDefinitionId, context.documentId, numerator.id, totalCurrentLiabilities.id]).slice(0, 16),
    definitionId: ratioDefinitionId,
    category,
    value,
    documentId: context.documentId,
    metricIds: [numerator.id, totalCurrentLiabilities.id],
    confidence: Confidence.create(confidence),
    basis: `${label} (${numerator.value.toFixed(2)}) ÷ Total Current Liabilities (${totalCurrentLiabilities.value.toFixed(2)}) = ${value.toFixed(2)}.`,
  };
}

function canCalculateLiabilityCoverageRatio(context: RatioCalculationContext, numeratorDefinitionId: string): boolean {
  const numerator = findMetric(context, numeratorDefinitionId);
  const totalCurrentLiabilities = findMetric(context, "total_current_liabilities");
  return numerator !== undefined && totalCurrentLiabilities !== undefined && totalCurrentLiabilities.value !== 0;
}

export class OperatingCashFlowRatioCalculator implements RatioCalculator {
  readonly definition = OPERATING_CASH_FLOW_RATIO_DEFINITION;

  canCalculate(context: RatioCalculationContext): boolean {
    return canCalculateLiabilityCoverageRatio(context, "net_cash_flow");
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    return calculateLiabilityCoverageRatio(context, "net_cash_flow", this.definition.id, this.definition.category, "Net Cash Flow");
  }
}

export class CashCoverageRatioCalculator implements RatioCalculator {
  readonly definition = CASH_COVERAGE_RATIO_DEFINITION;

  canCalculate(context: RatioCalculationContext): boolean {
    return canCalculateLiabilityCoverageRatio(context, "cash_generated");
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    return calculateLiabilityCoverageRatio(context, "cash_generated", this.definition.id, this.definition.category, "Cash Generated");
  }
}
