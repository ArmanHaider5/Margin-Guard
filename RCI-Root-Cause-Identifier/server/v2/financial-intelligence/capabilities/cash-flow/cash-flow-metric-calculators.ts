import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric } from "../../../shared/index.js";
import type { MetricCalculator, MetricCalculationContext } from "../../metrics/metric-calculator.js";
import { createDefaultFinancialMetricRegistry } from "../../metrics/financial-metric-definitions.js";
import type { CashMovement } from "../../models/financial-object-model.js";

/**
 * The Cash Flow Capability Pack's four real `MetricCalculator`
 * implementations, grouped for the same reason as
 * `capabilities/profitability/profitability-metric-calculators.ts`. Each
 * reads directly from `context.financialObjects.cashMovements` — never from
 * another calculator's output, matching the established Metric-layer
 * convention. `OperatingCashFlowCalculator` and `NetCashFlowCalculator` are
 * mathematically identical today (Cash Generated − Cash Used, computed
 * independently by each), for the same disclosed reason
 * `NetMarginCalculator`/`OperatingMarginCalculator` are in
 * `capabilities/profitability/` — this pack does not distinguish Operating
 * from Investing/Financing cash flow (see `docs/98_TECHNICAL_BACKLOG.md`
 * CF-001), so there is no separate figure to compute.
 */

const metricRegistry = createDefaultFinancialMetricRegistry();

function requireDefinition(id: string) {
  const definition = metricRegistry.get(id);
  if (!definition) throw new Error(`${id} metric definition is missing from the default registry`);
  return definition;
}

const CASH_GENERATED_DEFINITION = requireDefinition("cash_generated");
const CASH_USED_DEFINITION = requireDefinition("cash_used");
const OPERATING_CASH_FLOW_DEFINITION = requireDefinition("operating_cash_flow");
const NET_CASH_FLOW_DEFINITION = requireDefinition("net_cash_flow");

function sum(items: readonly CashMovement[]): { total: number; currencyCode: string } {
  const currencyCode = items[0]!.amount.currency.code;
  const total = items.reduce((s, item) => s + item.amount.amount, 0);
  return { total, currencyCode };
}

function averageConfidence(items: readonly CashMovement[]): number {
  return items.reduce((s, item) => s + item.confidence.value, 0) / items.length;
}

function inflowsOf(cashMovements: readonly CashMovement[]): CashMovement[] {
  return cashMovements.filter((c) => c.direction === "inflow");
}

function outflowsOf(cashMovements: readonly CashMovement[]): CashMovement[] {
  return cashMovements.filter((c) => c.direction === "outflow");
}

export class CashGeneratedCalculator implements MetricCalculator {
  readonly definition = CASH_GENERATED_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return inflowsOf(context.financialObjects.cashMovements).length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const inflows = inflowsOf(context.financialObjects.cashMovements);
    if (inflows.length === 0) return undefined;
    const { total, currencyCode } = sum(inflows);
    return {
      id: deriveCompositeId(["financial-metric", "cash_generated", context.documentId, ...inflows.map((c) => c.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: inflows.map((c) => c.id),
      confidence: Confidence.create(averageConfidence(inflows)),
      basis: `Sum of ${inflows.length} CashMovement entr${inflows.length === 1 ? "y" : "ies"} with direction 'inflow' (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}

export class CashUsedCalculator implements MetricCalculator {
  readonly definition = CASH_USED_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return outflowsOf(context.financialObjects.cashMovements).length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const outflows = outflowsOf(context.financialObjects.cashMovements);
    if (outflows.length === 0) return undefined;
    const { total, currencyCode } = sum(outflows);
    return {
      id: deriveCompositeId(["financial-metric", "cash_used", context.documentId, ...outflows.map((c) => c.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: outflows.map((c) => c.id),
      confidence: Confidence.create(averageConfidence(outflows)),
      basis: `Sum of ${outflows.length} CashMovement entr${outflows.length === 1 ? "y" : "ies"} with direction 'outflow' (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}

function calculateNetOfInflowsAndOutflows(
  context: MetricCalculationContext,
  definitionId: string,
  metricId: string,
): FinancialMetric | undefined {
  const inflows = inflowsOf(context.financialObjects.cashMovements);
  const outflows = outflowsOf(context.financialObjects.cashMovements);
  if (inflows.length === 0 || outflows.length === 0) return undefined;

  const { total: cashGenerated, currencyCode } = sum(inflows);
  const { total: cashUsed } = sum(outflows);
  const value = cashGenerated - cashUsed;
  const contributors = [...inflows, ...outflows];

  return {
    id: deriveCompositeId(["financial-metric", metricId, context.documentId, ...contributors.map((c) => c.id)]).slice(0, 16),
    definitionId,
    value,
    unit: "currency",
    documentId: context.documentId,
    financialObjectIds: contributors.map((c) => c.id),
    confidence: Confidence.create(averageConfidence(contributors)),
    basis: `Cash Generated (${currencyCode} ${cashGenerated.toFixed(2)}) − Cash Used (${currencyCode} ${cashUsed.toFixed(2)}) = ${value.toFixed(2)}.`,
  };
}

function canCalculateNet(context: MetricCalculationContext): boolean {
  return inflowsOf(context.financialObjects.cashMovements).length > 0 && outflowsOf(context.financialObjects.cashMovements).length > 0;
}

export class OperatingCashFlowCalculator implements MetricCalculator {
  readonly definition = OPERATING_CASH_FLOW_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return canCalculateNet(context);
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    return calculateNetOfInflowsAndOutflows(context, this.definition.id, "operating_cash_flow");
  }
}

export class NetCashFlowCalculator implements MetricCalculator {
  readonly definition = NET_CASH_FLOW_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return canCalculateNet(context);
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    return calculateNetOfInflowsAndOutflows(context, this.definition.id, "net_cash_flow");
  }
}
