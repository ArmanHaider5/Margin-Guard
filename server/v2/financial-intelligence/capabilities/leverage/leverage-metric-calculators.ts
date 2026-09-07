import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric } from "../../../shared/index.js";
import type { MetricCalculator, MetricCalculationContext } from "../../metrics/metric-calculator.js";
import { createDefaultFinancialMetricRegistry } from "../../metrics/financial-metric-definitions.js";
import type { Equity, Liability } from "../../models/financial-object-model.js";

/**
 * The Leverage Capability Pack's two real `MetricCalculator` implementations,
 * populating two definitions registered since Sprint 2 Foundation that had
 * no calculator until now.
 *
 * `TotalLiabilitiesCalculator` sums **every** Liability in
 * `context.financialObjects.liabilities` unconditionally — no
 * `classification` filter, unlike `TotalCurrentLiabilitiesCalculator`.
 * This is deliberate: the orchestrator (`leverage-capability-pack.ts`) feeds
 * this calculator a `liabilities` array merged from Liquidity's
 * `"current"`-classified entries (reused) and this pack's own
 * `"non_current"`-classified entries — summing both together is exactly
 * "Total Liabilities." Not filtering here means the calculator makes no
 * assumption about *which* classifications are present; it trusts its
 * caller to have assembled the right set, per the standard
 * `MetricCalculationContext` contract every calculator already follows.
 */

const metricRegistry = createDefaultFinancialMetricRegistry();

function requireDefinition(id: string) {
  const definition = metricRegistry.get(id);
  if (!definition) throw new Error(`${id} metric definition is missing from the default registry`);
  return definition;
}

const TOTAL_LIABILITIES_DEFINITION = requireDefinition("total_liabilities");
const TOTAL_EQUITY_DEFINITION = requireDefinition("total_equity");

function sum(items: readonly { totalValue: { amount: number; currency: { code: string } } }[]): { total: number; currencyCode: string } {
  const currencyCode = items[0]!.totalValue.currency.code;
  const total = items.reduce((s, item) => s + item.totalValue.amount, 0);
  return { total, currencyCode };
}

function averageConfidence(items: readonly { confidence: Confidence }[]): number {
  return items.reduce((s, item) => s + item.confidence.value, 0) / items.length;
}

export class TotalLiabilitiesCalculator implements MetricCalculator {
  readonly definition = TOTAL_LIABILITIES_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return context.financialObjects.liabilities.length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const liabilities: readonly Liability[] = context.financialObjects.liabilities;
    if (liabilities.length === 0) return undefined;
    const { total, currencyCode } = sum(liabilities);
    return {
      id: deriveCompositeId(["financial-metric", "total_liabilities", context.documentId, ...liabilities.map((l) => l.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: liabilities.map((l) => l.id),
      confidence: Confidence.create(averageConfidence(liabilities)),
      basis: `Sum of ${liabilities.length} Liability entr${liabilities.length === 1 ? "y" : "ies"} (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}

export class TotalEquityCalculator implements MetricCalculator {
  readonly definition = TOTAL_EQUITY_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return context.financialObjects.equity.length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const equity: readonly Equity[] = context.financialObjects.equity;
    if (equity.length === 0) return undefined;
    const { total, currencyCode } = sum(equity);
    return {
      id: deriveCompositeId(["financial-metric", "total_equity", context.documentId, ...equity.map((e) => e.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: equity.map((e) => e.id),
      confidence: Confidence.create(averageConfidence(equity)),
      basis: `Sum of ${equity.length} Equity entr${equity.length === 1 ? "y" : "ies"} (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}
