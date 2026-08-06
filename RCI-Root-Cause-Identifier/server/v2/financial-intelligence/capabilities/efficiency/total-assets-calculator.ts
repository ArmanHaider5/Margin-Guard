import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric } from "../../../shared/index.js";
import type { MetricCalculator, MetricCalculationContext } from "../../metrics/metric-calculator.js";
import { createDefaultFinancialMetricRegistry } from "../../metrics/financial-metric-definitions.js";
import type { Asset } from "../../models/financial-object-model.js";

function requireDefinition(id: string) {
  const definition = createDefaultFinancialMetricRegistry().get(id);
  if (!definition) throw new Error(`${id} metric definition is missing from the default registry`);
  return definition;
}

const DEFINITION = requireDefinition("total_assets");

/**
 * The Efficiency Capability Pack's `MetricCalculator` — sums **every** Asset
 * in `context.financialObjects.assets` unconditionally, no `classification`
 * filter, the same shape as `capabilities/leverage/leverage-metric-calculators.ts`'s
 * `TotalLiabilitiesCalculator`. This is the **second** independent
 * occurrence of the "sum-all-regardless-of-classification" pattern —
 * documented here, not yet factored into a shared helper; per this
 * milestone's instruction, that decision is deferred until a third
 * occurrence appears (see `docs/98_TECHNICAL_BACKLOG.md` EFF-003). Trusts
 * its caller (`efficiency-capability-pack.ts`) to have already merged
 * Liquidity's `"current"`-classified Assets with this pack's own
 * `"non_current"`-classified ones into one array before calling it.
 */
export class TotalAssetsCalculator implements MetricCalculator {
  readonly definition = DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return context.financialObjects.assets.length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const assets: readonly Asset[] = context.financialObjects.assets;
    if (assets.length === 0) return undefined;

    const currencyCode = assets[0]!.totalValue.currency.code;
    const total = assets.reduce((sum, a) => sum + a.totalValue.amount, 0);
    const averageConfidence = assets.reduce((sum, a) => sum + a.confidence.value, 0) / assets.length;

    return {
      id: deriveCompositeId(["financial-metric", "total_assets", context.documentId, ...assets.map((a) => a.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: assets.map((a) => a.id),
      confidence: Confidence.create(averageConfidence),
      basis: `Sum of ${assets.length} Asset entr${assets.length === 1 ? "y" : "ies"} (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}
