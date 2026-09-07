import { ConfigurationError } from "../../shared/index.js";
import type { FinancialObservationCategory } from "../../shared/index.js";

/**
 * INTERNAL — the knowledge-level definition of a Financial Observation: what
 * objective statement it makes, which category it belongs to, and which
 * FinancialMetricDefinitions and/or FinancialRatioDefinitions it is
 * conceptually derived from. Metadata/identity only, per this milestone's
 * explicit scope — it deliberately does NOT specify the comparison logic that
 * decides *when* the statement is true (see `observation-calculator.ts`'s
 * interface for where a future milestone's real generation logic will live).
 *
 * Follows the same in-code-data-table pattern, under the same stated ADR-003
 * exception, as `financial-intelligence/metrics/financial-metric-definitions.ts`
 * and `financial-intelligence/ratios/financial-ratio-definitions.ts`.
 */
export interface FinancialObservationDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: FinancialObservationCategory;
  /** The objective statement this definition produces, in plain business
   * language — a fixed template, not an evaluated expression. e.g. "Current
   * ratio is below the preferred operating range." A future
   * ObservationCalculator decides only *whether* to emit it, never rewrites
   * its wording into a conclusion. */
  readonly statementTemplate: string;
  /** References FinancialMetricDefinition ids this observation is
   * conceptually derived from. May be empty if the observation is
   * ratio-derived only. */
  readonly requiredMetricDefinitionIds: readonly string[];
  /** References FinancialRatioDefinition ids this observation is
   * conceptually derived from. May be empty if the observation is
   * metric-derived only. At least one of `requiredMetricDefinitionIds` /
   * `requiredRatioDefinitionIds` must be non-empty — an Observation with
   * neither has no basis. */
  readonly requiredRatioDefinitionIds: readonly string[];
}

export class FinancialObservationRegistry {
  private readonly definitions = new Map<string, FinancialObservationDefinition>();

  register(definition: FinancialObservationDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new ConfigurationError(`Financial observation definition "${definition.id}" is already registered`, {
        details: { id: definition.id },
      });
    }
    this.definitions.set(definition.id, definition);
  }

  get(id: string): FinancialObservationDefinition | undefined {
    return this.definitions.get(id);
  }

  byCategory(category: FinancialObservationCategory): readonly FinancialObservationDefinition[] {
    return this.all().filter((d) => d.category === category);
  }

  all(): readonly FinancialObservationDefinition[] {
    return Array.from(this.definitions.values());
  }
}

/**
 * Eighteen observation definitions, grounded in the Metric/Ratio definitions
 * already registered (`financial-intelligence/metrics/`,
 * `financial-intelligence/ratios/`) — definitions/metadata only. No
 * FinancialObservation instance is ever generated from these yet; that is
 * explicitly out of scope for this milestone. Each statement is objective and
 * non-diagnostic by construction — it names a condition, never a cause.
 *
 * Covers nine of the eleven `FinancialObservationCategory` values
 * (liquidity, profitability ×5, activity ×2, leverage ×2, working_capital ×2,
 * growth ×2, cash_flow ×2, efficiency, investment). The remaining two
 * (`return`, `operational`) have no registered definition yet — an honest,
 * partial-coverage gap, not a claim of completeness, consistent with how
 * `FinancialEvidenceType`/`FinancialSignalType` were only partially
 * implemented in earlier milestones.
 *
 * `return_on_equity_negative` was added during the Investment Capability
 * Pack milestone (`capabilities/investment/`) — the `investment` category's
 * first coverage, the same "below zero, single-period, universally
 * defensible" pattern as every other pack's "negative" definition.
 *
 * `revenue_growth_negative` was added during the Growth Capability Pack
 * milestone (`capabilities/growth/`) — the same "below zero, single-period,
 * universally-defensible" pattern as every other pack's "negative"
 * definition (`gross_margin_negative`, `debt_to_equity_negative`, etc.),
 * deliberately distinct from the pre-existing, still-unimplemented
 * `revenue_growth_slowed` immediately above (a genuine multi-period
 * *deceleration* trend — comparing one growth rate against an *earlier*
 * growth rate, which needs three periods' worth of Revenue data, not two;
 * still blocked by the same PC-003 gap `revenue_growth_negative` was
 * designed specifically to avoid). "Negative growth" (revenue declining from
 * one detected period to the next) is computable from exactly the two-period
 * comparison Growth's Ratio layer already performs.
 *
 * `asset_turnover_zero` was added during the Efficiency Capability Pack
 * milestone (`capabilities/efficiency/`). Unlike every prior pack's "below
 * zero" condition, Asset Turnover (Revenue ÷ Total Assets) cannot itself go
 * negative in the ordinary case (Revenue and Assets are both normally
 * non-negative) — there is no natural zero-crossing to detect. Instead of
 * inventing an industry-dependent "low turnover" threshold (which asset
 * turnover varies on far more by industry than Current Ratio does), this
 * definition uses the one condition that *is* single-period and universally
 * defensible: Asset Turnover being **exactly zero** — the business generated
 * no revenue at all relative to a non-zero asset base, an objectively
 * notable condition in any industry.
 *
 * `debt_to_equity_negative` was added during the Leverage Capability Pack
 * milestone (`capabilities/leverage/`) — the same "below zero" pattern as
 * every other pack's "negative" definitions, deliberately distinct from the
 * pre-existing, still-unimplemented `leverage_increased` (a period-over-period
 * trend; PC-003). Unlike the others, a negative Debt to Equity here is not
 * merely "unhealthy" but a distinct, severe condition — negative equity,
 * i.e. total liabilities exceed total assets.
 *
 * `working_capital_ratio_negative` was added during the Working Capital
 * Capability Pack milestone (`capabilities/working-capital/`) — the same
 * "below zero, not a period-over-period trend" pattern as the
 * profitability/cash-flow "negative" definitions below, deliberately
 * distinct from the pre-existing, still-unimplemented `working_capital_weakened`
 * (a trend this platform cannot yet detect — see PC-003).
 *
 * `gross_margin_negative`/`net_margin_negative`/`operating_margin_negative`
 * were added during the Profitability Capability Pack milestone
 * (`capabilities/profitability/`) — deliberately a *different* condition from
 * the already-registered `gross_margin_declined`/`expense_growth_outpaced_revenue`
 * above, both of which describe a period-over-period trend this platform
 * cannot yet detect (no multi-period Ratio/Metric comparison exists). "Below
 * zero" is a single-period, universally-defensible threshold (unlike a
 * "healthy margin" percentage, which is industry-dependent) — see
 * `docs/98_TECHNICAL_BACKLOG.md` PC-002/PC-003.
 *
 * `operating_cash_flow_negative`/`cash_coverage_ratio_low` were added during
 * the Cash Flow Capability Pack milestone (`capabilities/cash-flow/`) — the
 * `cash_flow` category's first coverage. `operating_cash_flow_negative`
 * mirrors the "negative" pattern above (a value below zero — a business
 * genuinely burning cash from operations, regardless of industry).
 * `cash_coverage_ratio_low` instead uses a "below 1.0" threshold — below 1.0
 * means gross cash generated does not even cover current liabilities once,
 * a more defensible universal cutoff than an arbitrary "preferred" ratio
 * like `current_ratio_below_range`'s 1.5 (see `docs/98_TECHNICAL_BACKLOG.md`
 * CF-002).
 */
const BUILT_IN_DEFINITIONS: readonly FinancialObservationDefinition[] = [
  {
    id: "current_ratio_below_range",
    name: "Current Ratio Below Preferred Range",
    description: "The current ratio has fallen below the preferred operating range.",
    category: "liquidity",
    statementTemplate: "Current ratio is below the preferred operating range.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["current_ratio"],
  },
  {
    id: "gross_margin_declined",
    name: "Gross Margin Declined",
    description: "Gross margin has declined relative to previous periods.",
    category: "profitability",
    statementTemplate: "Gross margin declined compared with previous periods.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["gross_margin"],
  },
  {
    id: "expense_growth_outpaced_revenue",
    name: "Expense Growth Outpaced Revenue",
    description: "Operating expenses have grown faster than revenue across periods.",
    category: "profitability",
    statementTemplate: "Operating expenses increased faster than revenue.",
    requiredMetricDefinitionIds: ["total_expense", "total_revenue"],
    requiredRatioDefinitionIds: [],
  },
  {
    id: "gross_margin_negative",
    name: "Gross Margin Negative",
    description: "Gross margin has fallen below zero.",
    category: "profitability",
    statementTemplate: "Gross margin is negative.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["gross_margin"],
  },
  {
    id: "net_margin_negative",
    name: "Net Margin Negative",
    description: "Net margin has fallen below zero.",
    category: "profitability",
    statementTemplate: "Net margin is negative.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["net_margin"],
  },
  {
    id: "operating_margin_negative",
    name: "Operating Margin Negative",
    description: "Operating margin has fallen below zero.",
    category: "profitability",
    statementTemplate: "Operating margin is negative.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["operating_margin"],
  },
  {
    id: "operating_cash_flow_negative",
    name: "Operating Cash Flow Negative",
    description: "Operating cash flow has fallen below zero.",
    category: "cash_flow",
    statementTemplate: "Operating cash flow is negative.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["operating_cash_flow_ratio"],
  },
  {
    id: "cash_coverage_ratio_low",
    name: "Cash Coverage Ratio Low",
    description: "Cash generated does not cover current liabilities.",
    category: "cash_flow",
    statementTemplate: "Cash coverage ratio is below 1.0.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["cash_coverage_ratio"],
  },
  {
    id: "inventory_turnover_slowing",
    name: "Inventory Turnover Slowing",
    description: "Days Inventory Outstanding has been increasing across periods.",
    category: "activity",
    statementTemplate: "Inventory turnover is slowing.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["days_inventory_outstanding"],
  },
  {
    id: "receivable_collection_period_increased",
    name: "Receivable Collection Period Increased",
    description: "The accounts receivable balance has been growing relative to revenue across periods.",
    category: "activity",
    statementTemplate: "Receivable collection period has increased.",
    requiredMetricDefinitionIds: ["accounts_receivable_balance"],
    requiredRatioDefinitionIds: [],
  },
  {
    id: "leverage_increased",
    name: "Leverage Increased",
    description: "Debt to Equity has risen across periods.",
    category: "leverage",
    statementTemplate: "Leverage has increased relative to equity.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["debt_to_equity"],
  },
  {
    id: "debt_to_equity_negative",
    name: "Debt to Equity Negative",
    description: "Debt to Equity is negative, indicating negative equity (total liabilities exceed total equity).",
    category: "leverage",
    statementTemplate: "Debt to equity ratio is negative.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["debt_to_equity"],
  },
  {
    id: "asset_turnover_zero",
    name: "Asset Turnover Zero",
    description: "Asset Turnover is zero — no revenue was generated relative to the asset base for the period.",
    category: "efficiency",
    statementTemplate: "Asset turnover is zero.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["asset_turnover"],
  },
  {
    id: "working_capital_ratio_negative",
    name: "Working Capital Ratio Negative",
    description: "The Working Capital Ratio has fallen below zero (current liabilities exceed current assets).",
    category: "working_capital",
    statementTemplate: "Working capital ratio is negative.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["working_capital_ratio"],
  },
  {
    id: "working_capital_weakened",
    name: "Working Capital Position Weakened",
    description: "The Working Capital Ratio has declined across periods.",
    category: "working_capital",
    statementTemplate: "Working capital position has weakened compared with previous periods.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["working_capital_ratio"],
  },
  {
    id: "revenue_growth_slowed",
    name: "Revenue Growth Slowed",
    description: "The Revenue Growth Rate has declined across periods.",
    category: "growth",
    statementTemplate: "Revenue growth has slowed compared with previous periods.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["revenue_growth_rate"],
  },
  {
    id: "revenue_growth_negative",
    name: "Revenue Growth Negative",
    description: "Revenue Growth Rate is negative — revenue declined from the prior detected period to the current one.",
    category: "growth",
    statementTemplate: "Revenue growth is negative.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["revenue_growth_rate"],
  },
  {
    id: "return_on_equity_negative",
    name: "Return on Equity Negative",
    description: "Return on Equity has fallen below zero.",
    category: "investment",
    statementTemplate: "Return on equity is negative.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: ["return_on_equity"],
  },
];

export function createDefaultFinancialObservationRegistry(): FinancialObservationRegistry {
  const registry = new FinancialObservationRegistry();
  for (const definition of BUILT_IN_DEFINITIONS) {
    registry.register(definition);
  }
  return registry;
}
