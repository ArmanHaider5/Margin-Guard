import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric } from "../../../shared/index.js";
import type { MetricCalculator, MetricCalculationContext } from "../../metrics/metric-calculator.js";
import { createDefaultFinancialMetricRegistry } from "../../metrics/financial-metric-definitions.js";
import type { WorkingCapitalComponent } from "../../models/financial-object-model.js";

/**
 * The Working Capital Capability Pack's three real `MetricCalculator`
 * implementations, grouped for the same reason as
 * `capabilities/profitability/profitability-metric-calculators.ts`. Each
 * populates a definition that has been registered since Sprint 2 Foundation
 * but had no calculator until this milestone.
 */

const metricRegistry = createDefaultFinancialMetricRegistry();

function requireDefinition(id: string) {
  const definition = metricRegistry.get(id);
  if (!definition) throw new Error(`${id} metric definition is missing from the default registry`);
  return definition;
}

const ACCOUNTS_RECEIVABLE_BALANCE_DEFINITION = requireDefinition("accounts_receivable_balance");
const ACCOUNTS_PAYABLE_BALANCE_DEFINITION = requireDefinition("accounts_payable_balance");
const INVENTORY_BALANCE_DEFINITION = requireDefinition("inventory_balance");

function componentsOfKind(context: MetricCalculationContext, kind: WorkingCapitalComponent["kind"]): WorkingCapitalComponent[] {
  return context.financialObjects.workingCapitalComponents.filter((c) => c.kind === kind);
}

function sum(items: readonly WorkingCapitalComponent[]): { total: number; currencyCode: string } {
  const currencyCode = items[0]!.amount.currency.code;
  const total = items.reduce((s, item) => s + item.amount.amount, 0);
  return { total, currencyCode };
}

function averageConfidence(items: readonly WorkingCapitalComponent[]): number {
  return items.reduce((s, item) => s + item.confidence.value, 0) / items.length;
}

function calculateBalance(
  context: MetricCalculationContext,
  kind: WorkingCapitalComponent["kind"],
  definitionId: string,
  metricIdPrefix: string,
): FinancialMetric | undefined {
  const components = componentsOfKind(context, kind);
  if (components.length === 0) return undefined;
  const { total, currencyCode } = sum(components);
  return {
    id: deriveCompositeId(["financial-metric", metricIdPrefix, context.documentId, ...components.map((c) => c.id)]).slice(0, 16),
    definitionId,
    value: total,
    unit: "currency",
    documentId: context.documentId,
    financialObjectIds: components.map((c) => c.id),
    confidence: Confidence.create(averageConfidence(components)),
    basis: `Sum of ${components.length} WorkingCapitalComponent entr${components.length === 1 ? "y" : "ies"} of kind '${kind}' (${currencyCode} ${total.toFixed(2)}).`,
  };
}

export class AccountsReceivableBalanceCalculator implements MetricCalculator {
  readonly definition = ACCOUNTS_RECEIVABLE_BALANCE_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return componentsOfKind(context, "receivables").length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    return calculateBalance(context, "receivables", this.definition.id, "accounts_receivable_balance");
  }
}

export class AccountsPayableBalanceCalculator implements MetricCalculator {
  readonly definition = ACCOUNTS_PAYABLE_BALANCE_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return componentsOfKind(context, "payables").length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    return calculateBalance(context, "payables", this.definition.id, "accounts_payable_balance");
  }
}

export class InventoryBalanceCalculator implements MetricCalculator {
  readonly definition = INVENTORY_BALANCE_DEFINITION;

  canCalculate(context: MetricCalculationContext): boolean {
    return componentsOfKind(context, "inventory").length > 0;
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    return calculateBalance(context, "inventory", this.definition.id, "inventory_balance");
  }
}
