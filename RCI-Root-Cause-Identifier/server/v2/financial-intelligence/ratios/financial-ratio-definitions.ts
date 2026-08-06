import { ConfigurationError } from "../../shared/index.js";
import type { FinancialRatioCategory } from "../../shared/index.js";

/**
 * INTERNAL — the knowledge-level definition of a Financial Ratio: what it is
 * called, which category it belongs to (per `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`
 * Chapter 7's eleven categories), and which FinancialMetricDefinitions
 * conceptually feed it. Metadata/identity only — no formula, per this
 * milestone's explicit scope.
 */
export interface FinancialRatioDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: FinancialRatioCategory;
  /** References FinancialMetricDefinition ids this ratio is conceptually
   * computed from — documentation of intent, not a computation graph. */
  readonly requiredMetricDefinitionIds: readonly string[];
}

export class FinancialRatioRegistry {
  private readonly definitions = new Map<string, FinancialRatioDefinition>();

  register(definition: FinancialRatioDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new ConfigurationError(`Financial ratio definition "${definition.id}" is already registered`, {
        details: { id: definition.id },
      });
    }
    this.definitions.set(definition.id, definition);
  }

  get(id: string): FinancialRatioDefinition | undefined {
    return this.definitions.get(id);
  }

  byCategory(category: FinancialRatioCategory): readonly FinancialRatioDefinition[] {
    return this.all().filter((d) => d.category === category);
  }

  all(): readonly FinancialRatioDefinition[] {
    return Array.from(this.definitions.values());
  }
}

/**
 * Ten of the eleven FIF Chapter 7 categories are represented. `operational` (the
 * boundary category — ratios combining financial and operational data, e.g.
 * revenue per employee) is deliberately unpopulated: it requires data from
 * `operational-intelligence/`, which does not exist yet, and this module must
 * never depend on it (per `server/v2/README.md`'s "no lateral dependencies
 * between domain modules" rule) — that ratio category becomes real only once
 * `correlation/` exists to combine the two modules' output, not before.
 *
 * `net_margin` and `operating_margin` were added during the Profitability
 * Capability Pack milestone (`capabilities/profitability/`) — both share
 * `profitability`'s existing category (no new category introduced) and both
 * currently resolve to the same underlying `net_profit` metric, since this
 * platform's Financial Object Model does not yet distinguish operating from
 * non-operating Expense (interest, tax); see `docs/98_TECHNICAL_BACKLOG.md`
 * PC-002 for the disclosed limitation this causes.
 *
 * `cash_coverage_ratio` was added during the Cash Flow Capability Pack
 * milestone (`capabilities/cash-flow/`) — "Cash Coverage Ratio" has more
 * than one competing real-world definition (an interest-coverage style using
 * EBIT/Interest Expense, or a liquidity style using a period-end Cash
 * Balance); this platform tracks neither Interest Expense (PC-001) nor a
 * Cash Balance (only period cash movements), so this pack instead defines it
 * as Cash Generated relative to Current Liabilities — a defensible,
 * computable variant, disclosed rather than presented as the one true
 * definition (see `docs/98_TECHNICAL_BACKLOG.md` CF-002). Both this ratio
 * and `operating_cash_flow_ratio` are the first ratios in the registry whose
 * `requiredMetricDefinitionIds` cross a domain boundary — `total_current_liabilities`
 * is a Liquidity Capability Pack metric, reused (not duplicated) by
 * `capabilities/cash-flow/`.
 *
 * `revenue_growth_rate`'s `requiredMetricDefinitionIds` was **updated** (not
 * merely populated) during the Growth Capability Pack milestone
 * (`capabilities/growth/`) — from its Sprint 2 Foundation placeholder value
 * `["total_revenue"]` to `["current_period_revenue", "prior_period_revenue"]`,
 * the two new Metric definitions Growth introduced. This is the first time a
 * pack has changed a pre-existing definition's metadata rather than only
 * adding to it; disclosed here because it is a genuine, if narrow, departure
 * from the "each pack only populates a previously-empty calculator" pattern
 * every prior milestone followed. The original placeholder value was set
 * before any calculator existed for this ratio and could not have been
 * correct as written: a single `total_revenue` Metric (one aggregate value)
 * cannot express "change... across periods" on its own — the field is
 * corrected to match the real, working calculator this milestone implements,
 * not changed for its own sake. See `docs/98_TECHNICAL_BACKLOG.md` GR-002.
 */
const BUILT_IN_DEFINITIONS: readonly FinancialRatioDefinition[] = [
  { id: "current_ratio", name: "Current Ratio", description: "Current assets relative to current liabilities.", category: "liquidity", requiredMetricDefinitionIds: ["total_current_assets", "total_current_liabilities"] },
  { id: "gross_margin", name: "Gross Margin", description: "Gross profit relative to revenue.", category: "profitability", requiredMetricDefinitionIds: ["gross_profit", "total_revenue"] },
  { id: "net_margin", name: "Net Margin", description: "Net profit relative to revenue.", category: "profitability", requiredMetricDefinitionIds: ["net_profit", "total_revenue"] },
  { id: "operating_margin", name: "Operating Margin", description: "Operating profit relative to revenue.", category: "profitability", requiredMetricDefinitionIds: ["net_profit", "total_revenue"] },
  { id: "asset_turnover", name: "Asset Turnover", description: "Revenue relative to total assets.", category: "efficiency", requiredMetricDefinitionIds: ["total_revenue", "total_assets"] },
  { id: "debt_to_equity", name: "Debt to Equity", description: "Total liabilities relative to total equity.", category: "leverage", requiredMetricDefinitionIds: ["total_liabilities", "total_equity"] },
  { id: "days_inventory_outstanding", name: "Days Inventory Outstanding", description: "How many days of expense the inventory balance represents.", category: "activity", requiredMetricDefinitionIds: ["inventory_balance", "total_expense"] },
  { id: "operating_cash_flow_ratio", name: "Operating Cash Flow Ratio", description: "Net cash flow relative to current liabilities.", category: "cash_flow", requiredMetricDefinitionIds: ["net_cash_flow", "total_current_liabilities"] },
  { id: "cash_coverage_ratio", name: "Cash Coverage Ratio", description: "Cash generated relative to current liabilities.", category: "cash_flow", requiredMetricDefinitionIds: ["cash_generated", "total_current_liabilities"] },
  { id: "revenue_growth_rate", name: "Revenue Growth Rate", description: "Change in total revenue across periods.", category: "growth", requiredMetricDefinitionIds: ["current_period_revenue", "prior_period_revenue"] },
  { id: "working_capital_ratio", name: "Working Capital Ratio", description: "Current assets minus current liabilities, relative to current liabilities.", category: "working_capital", requiredMetricDefinitionIds: ["total_current_assets", "total_current_liabilities"] },
  { id: "return_on_assets", name: "Return on Assets", description: "Gross profit relative to total assets.", category: "return", requiredMetricDefinitionIds: ["gross_profit", "total_assets"] },
  { id: "return_on_equity", name: "Return on Equity", description: "Gross profit relative to total equity.", category: "investment", requiredMetricDefinitionIds: ["gross_profit", "total_equity"] },
];

export function createDefaultFinancialRatioRegistry(): FinancialRatioRegistry {
  const registry = new FinancialRatioRegistry();
  for (const definition of BUILT_IN_DEFINITIONS) {
    registry.register(definition);
  }
  return registry;
}
