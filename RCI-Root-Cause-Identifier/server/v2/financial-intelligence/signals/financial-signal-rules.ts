import { ConfigurationError } from "../../shared/index.js";
import type { FinancialEvidenceType, FinancialSignalType } from "../../shared/index.js";

/**
 * A data-driven rule mapping one or more FinancialEvidence types to a
 * FinancialSignal type — the same in-code-data-table pattern used by
 * `document-parser/rules/document-type-rules.ts`, under the same stated
 * ADR-003 exception (not yet a Knowledge System entity, same promotion path).
 * A signal fires when the evidence set for a document contains AT LEAST ONE of
 * `triggeringEvidenceTypes`.
 */
export interface FinancialSignalRule {
  readonly id: string;
  readonly signalType: FinancialSignalType;
  readonly version: string;
  readonly triggeringEvidenceTypes: readonly FinancialEvidenceType[];
}

export class FinancialSignalRuleRegistry {
  private readonly rules: FinancialSignalRule[] = [];

  register(rule: FinancialSignalRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new ConfigurationError(`Financial signal rule "${rule.id}" is already registered`, {
        details: { id: rule.id },
      });
    }
    this.rules.push(rule);
  }

  all(): readonly FinancialSignalRule[] {
    return this.rules;
  }
}

/**
 * Rules for the eight FinancialSignalType categories derivable from the
 * FinancialEvidenceType categories with real detection logic.
 * `inventory_build_up` and `working_capital_deterioration` are intentionally
 * absent — their triggering evidence types (`inventory_accumulation`, and
 * `receivable_ageing`/`payable_ageing` respectively) have no detection logic
 * yet (see `financial-evidence-rules.ts`), and a signal rule with no
 * evidence that can ever trigger it would be a dead, misleading entry.
 * `working_capital_deterioration` specifically requires
 * `working_capital_pressure` **plus** `receivable_ageing`/`payable_ageing`
 * together per `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md` Chapter 6 — the
 * first evidence type now exists (Liquidity Capability Pack), the latter two
 * still do not.
 *
 * `liquidity_stress` now includes `working_capital_pressure` as a
 * co-triggering evidence type, per Chapter 6's "Cash shortages + Working
 * capital pressure" — added during the Liquidity Capability Pack milestone,
 * which implemented `working_capital_pressure` detection for the first time
 * (`capabilities/liquidity/liquidity-evidence-generator.ts`), but only via
 * that Observation-based path, not via `FinancialEvidenceClassifier` (still
 * frozen, still never producing this type). This rule change is data-only —
 * `FinancialSignalRuleRegistry`'s shape is unchanged — and does not alter
 * `analyzeFinancialSignals()`'s behaviour: its evidence still comes solely
 * from `FinancialEvidenceClassifier`, which never emits
 * `working_capital_pressure`, so the added trigger is reachable only through
 * `runLiquidityCapabilityPack()`.
 *
 * `cash_conversion_deterioration` was added during the Cash Flow Capability
 * Pack milestone — `negative_cash_flow` now has real detection logic for the
 * first time (`capabilities/cash-flow/cash-flow-evidence-generator.ts`), and
 * per Chapter 6 it is the (sole, for now — `receivable_ageing` still has no
 * detection logic) documented trigger for this signal. Same data-only,
 * `analyzeFinancialSignals()`-unaffected pattern as `liquidity_stress`'s
 * change above — reachable only through `runCashFlowCapabilityPack()`.
 *
 * `revenue_instability` now includes `revenue_growth` as a co-triggering
 * evidence type, per Chapter 6's own documented trigger — "Erratic Revenue
 * growth pattern, or Revenue concentration + Customer dependency" — added
 * during the Efficiency Capability Pack milestone. This was a pre-existing
 * gap independent of Efficiency's own domain: `revenue_growth` evidence
 * already existed (`FinancialEvidenceClassifier`'s own trend detector, since
 * Sprint 2 Foundation) but had never been connected to `revenue_instability`,
 * even though FIF's own table always named it as a valid trigger. Efficiency's
 * `asset_turnover_zero` Observation (see `capabilities/efficiency/`) also
 * emits `revenue_growth`-typed evidence via its Observation-based generator,
 * which is what surfaced the gap. Same data-only,
 * `analyzeFinancialSignals()`-unaffected pattern as every prior rule
 * extension — reachable only through `runEfficiencyCapabilityPack()` and
 * (now, for the first time) genuinely also through
 * `FinancialEvidenceClassifier`'s own pre-existing `revenue_growth` trend
 * detection, via `analyzeFinancialSignals()` — the one rule change in this
 * module's history that *does* change `analyzeFinancialSignals()`'s
 * reachable output, since `revenue_growth` (unlike `working_capital_pressure`/
 * `negative_cash_flow`/`debt_growth`) was already producible by the frozen
 * classifier. See `docs/98_TECHNICAL_BACKLOG.md` EFF-002.
 */
const BUILT_IN_RULES: readonly FinancialSignalRule[] = [
  { id: "liquidity_stress", signalType: "liquidity_stress", version: "1.1.0", triggeringEvidenceTypes: ["cash_shortages", "working_capital_pressure"] },
  { id: "margin_compression", signalType: "margin_compression", version: "1.0.0", triggeringEvidenceTypes: ["margin_erosion"] },
  { id: "operating_cost_inflation", signalType: "operating_cost_inflation", version: "1.0.0", triggeringEvidenceTypes: ["cost_escalation"] },
  { id: "revenue_instability", signalType: "revenue_instability", version: "1.1.0", triggeringEvidenceTypes: ["revenue_concentration", "customer_dependency", "revenue_growth"] },
  { id: "cash_conversion_deterioration", signalType: "cash_conversion_deterioration", version: "1.0.0", triggeringEvidenceTypes: ["negative_cash_flow"] },
  { id: "over_reliance_on_debt", signalType: "over_reliance_on_debt", version: "1.0.0", triggeringEvidenceTypes: ["debt_growth"] },
  { id: "supplier_concentration", signalType: "supplier_concentration", version: "1.0.0", triggeringEvidenceTypes: ["supplier_dependency"] },
  { id: "profit_quality_concerns", signalType: "profit_quality_concerns", version: "1.0.0", triggeringEvidenceTypes: ["missing_reconciliations", "duplicate_payments"] },
];

export function createDefaultFinancialSignalRuleRegistry(): FinancialSignalRuleRegistry {
  const registry = new FinancialSignalRuleRegistry();
  for (const rule of BUILT_IN_RULES) {
    registry.register(rule);
  }
  return registry;
}
