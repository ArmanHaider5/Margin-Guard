import { ConfigurationError } from "../../shared/index.js";
import type { FinancialMetricUnit } from "../../shared/index.js";

/**
 * INTERNAL — the knowledge-level definition of a Financial Metric: what it is
 * called, what it means, what Financial Object types it is conceptually computed
 * from, and what unit its value carries. This is metadata/identity only, per
 * this milestone's scope — it deliberately does NOT specify a formula or
 * computation logic (see `metric-calculator.ts`'s interface for where a future
 * milestone's real calculation logic will live).
 *
 * Follows the same in-code-data-table pattern, under the same stated ADR-003
 * exception, as `document-parser/rules/document-type-rules.ts` and
 * `financial-intelligence/signals/financial-signal-rules.ts`.
 */
export interface FinancialMetricDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly unit: FinancialMetricUnit;
  /** Traceable to an Ontology canonical term where one exists — never invented. */
  readonly ontologyReference?: string;
  /** Which Financial Object Model types (conceptually) feed this metric — e.g.
   * `["Revenue"]` or `["Asset", "Liability"]`. Documentation of intent, not a
   * computation graph; a future MetricCalculator implementation decides how. */
  readonly requiredFinancialObjectTypes: readonly string[];
}

export class FinancialMetricRegistry {
  private readonly definitions = new Map<string, FinancialMetricDefinition>();

  register(definition: FinancialMetricDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new ConfigurationError(`Financial metric definition "${definition.id}" is already registered`, {
        details: { id: definition.id },
      });
    }
    this.definitions.set(definition.id, definition);
  }

  get(id: string): FinancialMetricDefinition | undefined {
    return this.definitions.get(id);
  }

  all(): readonly FinancialMetricDefinition[] {
    return Array.from(this.definitions.values());
  }
}

/**
 * Twenty metric definitions grounded in the Financial Object Model already
 * built (`financial-intelligence/models/financial-object-model.ts`) —
 * definitions/metadata only. `cost_of_goods_sold`, `total_operating_expenses`,
 * and `net_profit` were added during the Profitability Capability Pack
 * milestone; `cash_generated`, `cash_used`, and `operating_cash_flow` during
 * the Cash Flow Capability Pack milestone (`capabilities/cash-flow/`).
 * `total_revenue`/`gross_profit`/`net_cash_flow` (all already registered)
 * are reused unchanged by their respective packs.
 *
 * `current_period_revenue`/`prior_period_revenue` were added during the
 * Growth Capability Pack milestone (`capabilities/growth/`) — the **first**
 * new Metric definitions added by any Capability Pack (every prior pack only
 * populated calculators for definitions already registered at Sprint 2
 * Foundation). Necessary because no existing Metric represents a *single
 * period's* Revenue in isolation — `total_revenue` deliberately aggregates
 * every Revenue Financial Object a document has, undifferentiated by period,
 * which cannot express a growth rate (a growth rate structurally needs two
 * distinct period values, not one aggregate). Both are fed by `Revenue`
 * objects carrying the new `periodSequence` field (see that type's own doc
 * comment) — a disclosed, row-sequence proxy for genuine periods, not a
 * validated date-boundary comparison (`docs/98_TECHNICAL_BACKLOG.md` GR-001).
 */
const BUILT_IN_DEFINITIONS: readonly FinancialMetricDefinition[] = [
  { id: "total_revenue", name: "Total Revenue", description: "Sum of Revenue for a period.", unit: "currency", ontologyReference: "Revenue", requiredFinancialObjectTypes: ["Revenue"] },
  { id: "total_expense", name: "Total Expense", description: "Sum of Expense for a period.", unit: "currency", ontologyReference: "Expense", requiredFinancialObjectTypes: ["Expense"] },
  { id: "gross_profit", name: "Gross Profit", description: "Revenue minus cost-of-goods-classified Expense for a period.", unit: "currency", requiredFinancialObjectTypes: ["Revenue", "Expense"] },
  { id: "cost_of_goods_sold", name: "Cost of Goods Sold", description: "Sum of Expense entries classified as COGS (cost of goods/sales).", unit: "currency", requiredFinancialObjectTypes: ["Expense"] },
  { id: "total_operating_expenses", name: "Total Operating Expenses", description: "Sum of Expense entries classified as operating (non-COGS) expenses.", unit: "currency", requiredFinancialObjectTypes: ["Expense"] },
  { id: "net_profit", name: "Net Profit", description: "Revenue minus COGS minus Operating Expenses for a period.", unit: "currency", requiredFinancialObjectTypes: ["Revenue", "Expense"] },
  { id: "total_current_assets", name: "Total Current Assets", description: "Sum of Asset entries classified as current.", unit: "currency", ontologyReference: "Asset", requiredFinancialObjectTypes: ["Asset"] },
  { id: "total_current_liabilities", name: "Total Current Liabilities", description: "Sum of Liability entries classified as current.", unit: "currency", ontologyReference: "Liability", requiredFinancialObjectTypes: ["Liability"] },
  { id: "total_assets", name: "Total Assets", description: "Sum of all Asset entries.", unit: "currency", ontologyReference: "Asset", requiredFinancialObjectTypes: ["Asset"] },
  { id: "total_liabilities", name: "Total Liabilities", description: "Sum of all Liability entries.", unit: "currency", ontologyReference: "Liability", requiredFinancialObjectTypes: ["Liability"] },
  { id: "total_equity", name: "Total Equity", description: "Sum of Equity entries.", unit: "currency", ontologyReference: "Equity", requiredFinancialObjectTypes: ["Equity"] },
  { id: "accounts_receivable_balance", name: "Accounts Receivable Balance", description: "Sum of WorkingCapitalComponent entries of kind 'receivables'.", unit: "currency", requiredFinancialObjectTypes: ["WorkingCapitalComponent"] },
  { id: "accounts_payable_balance", name: "Accounts Payable Balance", description: "Sum of WorkingCapitalComponent entries of kind 'payables'.", unit: "currency", requiredFinancialObjectTypes: ["WorkingCapitalComponent"] },
  { id: "inventory_balance", name: "Inventory Balance", description: "Sum of WorkingCapitalComponent entries of kind 'inventory'.", unit: "currency", requiredFinancialObjectTypes: ["WorkingCapitalComponent"] },
  { id: "net_cash_flow", name: "Net Cash Flow", description: "Sum of CashMovement inflows minus outflows for a period.", unit: "currency", requiredFinancialObjectTypes: ["CashMovement"] },
  { id: "cash_generated", name: "Cash Generated", description: "Sum of CashMovement entries with direction 'inflow' for a period.", unit: "currency", requiredFinancialObjectTypes: ["CashMovement"] },
  { id: "cash_used", name: "Cash Used", description: "Sum of CashMovement entries with direction 'outflow' for a period.", unit: "currency", requiredFinancialObjectTypes: ["CashMovement"] },
  { id: "operating_cash_flow", name: "Operating Cash Flow", description: "Cash Generated minus Cash Used from operating activities for a period.", unit: "currency", requiredFinancialObjectTypes: ["CashMovement"] },
  { id: "current_period_revenue", name: "Current Period Revenue", description: "Revenue for the most recent detected period.", unit: "currency", ontologyReference: "Revenue", requiredFinancialObjectTypes: ["Revenue"] },
  { id: "prior_period_revenue", name: "Prior Period Revenue", description: "Revenue for the period immediately preceding the most recent detected period.", unit: "currency", ontologyReference: "Revenue", requiredFinancialObjectTypes: ["Revenue"] },
];

export function createDefaultFinancialMetricRegistry(): FinancialMetricRegistry {
  const registry = new FinancialMetricRegistry();
  for (const definition of BUILT_IN_DEFINITIONS) {
    registry.register(definition);
  }
  return registry;
}
