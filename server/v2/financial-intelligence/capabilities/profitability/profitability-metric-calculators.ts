import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric } from "../../../shared/index.js";
import type { MetricCalculator, MetricCalculationContext } from "../../metrics/metric-calculator.js";
import { createDefaultFinancialMetricRegistry } from "../../metrics/financial-metric-definitions.js";
import type { Revenue, Expense } from "../../models/financial-object-model.js";

/**
 * The Profitability Capability Pack's five real `MetricCalculator`
 * implementations, grouped in one file (unlike Liquidity's one-file-per-calculator
 * layout) since there are five of them and each is a small, uniform
 * "sum some subset of Revenue/Expense objects" shape — see
 * `financial-intelligence/README.md`'s "Capability Packs" section for why
 * this file-organization choice was made here specifically.
 *
 * Every calculator here reads directly from `context.financialObjects` —
 * never from another calculator's output — matching the established
 * Metric-layer convention (`gross_profit`'s own definition,
 * "requiredFinancialObjectTypes: ['Revenue', 'Expense']", already implied
 * this) and the frozen execution architecture's `MetricCalculationContext`
 * shape, which deliberately has no visibility into sibling calculators'
 * results. `NetProfitCalculator` is therefore NOT "Gross Profit minus
 * Operating Expenses" computed by subtracting the `gross_profit` Metric — it
 * independently sums Revenue/COGS/Operating Expense objects itself. The two
 * are mathematically equivalent (Revenue − COGS − OpEx = (Revenue − COGS) −
 * OpEx) but computed independently, by design.
 */

const metricRegistry = createDefaultFinancialMetricRegistry();

function requireDefinition(id: string) {
  const definition = metricRegistry.get(id);
  if (!definition) throw new Error(`${id} metric definition is missing from the default registry`);
  return definition;
}

const TOTAL_REVENUE_DEFINITION = requireDefinition("total_revenue");
const COST_OF_GOODS_SOLD_DEFINITION = requireDefinition("cost_of_goods_sold");
const GROSS_PROFIT_DEFINITION = requireDefinition("gross_profit");
const TOTAL_OPERATING_EXPENSES_DEFINITION = requireDefinition("total_operating_expenses");
const NET_PROFIT_DEFINITION = requireDefinition("net_profit");

function sum(items: readonly { totalValue: { amount: number; currency: { code: string } } }[]): { total: number; currencyCode: string } {
  const currencyCode = items[0]!.totalValue.currency.code;
  const total = items.reduce((s, item) => s + item.totalValue.amount, 0);
  return { total, currencyCode };
}

function averageConfidence(items: readonly { confidence: Confidence }[]): number {
  return items.reduce((s, item) => s + item.confidence.value, 0) / items.length;
}

function cogsOf(expenses: readonly Expense[]): Expense[] {
  return expenses.filter((e) => e.category === "cogs");
}

function operatingExpensesOf(expenses: readonly Expense[]): Expense[] {
  return expenses.filter((e) => e.category === "operating");
}

export class TotalRevenueCalculator implements MetricCalculator {
  readonly definition = TOTAL_REVENUE_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return context.financialObjects.revenue.length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const revenue = context.financialObjects.revenue;
    if (revenue.length === 0) return undefined;
    const { total, currencyCode } = sum(revenue);
    return {
      id: deriveCompositeId(["financial-metric", "total_revenue", context.documentId, ...revenue.map((r) => r.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: revenue.map((r) => r.id),
      confidence: Confidence.create(averageConfidence(revenue)),
      basis: `Sum of ${revenue.length} Revenue entr${revenue.length === 1 ? "y" : "ies"} (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}

export class CostOfGoodsSoldCalculator implements MetricCalculator {
  readonly definition = COST_OF_GOODS_SOLD_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return cogsOf(context.financialObjects.expense).length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const cogs = cogsOf(context.financialObjects.expense);
    if (cogs.length === 0) return undefined;
    const { total, currencyCode } = sum(cogs);
    return {
      id: deriveCompositeId(["financial-metric", "cost_of_goods_sold", context.documentId, ...cogs.map((e) => e.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: cogs.map((e) => e.id),
      confidence: Confidence.create(averageConfidence(cogs)),
      basis: `Sum of ${cogs.length} Expense entr${cogs.length === 1 ? "y" : "ies"} classified as COGS (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}

export class GrossProfitCalculator implements MetricCalculator {
  readonly definition = GROSS_PROFIT_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return context.financialObjects.revenue.length > 0 && cogsOf(context.financialObjects.expense).length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const revenue = context.financialObjects.revenue;
    const cogs = cogsOf(context.financialObjects.expense);
    if (revenue.length === 0 || cogs.length === 0) return undefined;

    const { total: totalRevenue, currencyCode } = sum(revenue);
    const { total: totalCogs } = sum(cogs);
    const value = totalRevenue - totalCogs;
    const contributors: readonly (Revenue | Expense)[] = [...revenue, ...cogs];

    return {
      id: deriveCompositeId(["financial-metric", "gross_profit", context.documentId, ...contributors.map((c) => c.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: contributors.map((c) => c.id),
      confidence: Confidence.create(averageConfidence(contributors)),
      basis: `Revenue (${currencyCode} ${totalRevenue.toFixed(2)}) − COGS (${currencyCode} ${totalCogs.toFixed(2)}) = ${value.toFixed(2)}.`,
    };
  }
}

export class TotalOperatingExpensesCalculator implements MetricCalculator {
  readonly definition = TOTAL_OPERATING_EXPENSES_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return operatingExpensesOf(context.financialObjects.expense).length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const operatingExpenses = operatingExpensesOf(context.financialObjects.expense);
    if (operatingExpenses.length === 0) return undefined;
    const { total, currencyCode } = sum(operatingExpenses);
    return {
      id: deriveCompositeId([
        "financial-metric",
        "total_operating_expenses",
        context.documentId,
        ...operatingExpenses.map((e) => e.id),
      ]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: operatingExpenses.map((e) => e.id),
      confidence: Confidence.create(averageConfidence(operatingExpenses)),
      basis: `Sum of ${operatingExpenses.length} Expense entr${operatingExpenses.length === 1 ? "y" : "ies"} classified as operating (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}

export class NetProfitCalculator implements MetricCalculator {
  readonly definition = NET_PROFIT_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return (
      context.financialObjects.revenue.length > 0 &&
      cogsOf(context.financialObjects.expense).length > 0 &&
      operatingExpensesOf(context.financialObjects.expense).length > 0
    );
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const revenue = context.financialObjects.revenue;
    const cogs = cogsOf(context.financialObjects.expense);
    const operatingExpenses = operatingExpensesOf(context.financialObjects.expense);
    if (revenue.length === 0 || cogs.length === 0 || operatingExpenses.length === 0) return undefined;

    const { total: totalRevenue, currencyCode } = sum(revenue);
    const { total: totalCogs } = sum(cogs);
    const { total: totalOperatingExpenses } = sum(operatingExpenses);
    const value = totalRevenue - totalCogs - totalOperatingExpenses;
    const contributors: readonly (Revenue | Expense)[] = [...revenue, ...cogs, ...operatingExpenses];

    return {
      id: deriveCompositeId(["financial-metric", "net_profit", context.documentId, ...contributors.map((c) => c.id)]).slice(0, 16),
      definitionId: this.definition.id,
      value,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: contributors.map((c) => c.id),
      confidence: Confidence.create(averageConfidence(contributors)),
      basis: `Revenue (${currencyCode} ${totalRevenue.toFixed(2)}) − COGS (${currencyCode} ${totalCogs.toFixed(2)}) − Operating Expenses (${currencyCode} ${totalOperatingExpenses.toFixed(2)}) = ${value.toFixed(2)}.`,
    };
  }
}
