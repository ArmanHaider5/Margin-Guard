import type { Confidence } from "../value-objects/index.js";

/**
 * The ten Financial Signal categories defined conceptually in
 * `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md` Chapter 6.
 */
export type FinancialSignalType =
  | "liquidity_stress"
  | "margin_compression"
  | "operating_cost_inflation"
  | "inventory_build_up"
  | "revenue_instability"
  | "cash_conversion_deterioration"
  | "over_reliance_on_debt"
  | "supplier_concentration"
  | "working_capital_deterioration"
  | "profit_quality_concerns";

/**
 * A classified pattern built from one or more FinancialEvidence records — the
 * Financial Intelligence module's terminal output for this sprint (per its
 * founding scope: stop after Financial Signals, no Findings, no Root Causes). Per
 * the mandatory Evidence Chain, `financialEvidenceIds` is never empty.
 */
export interface FinancialSignal {
  readonly id: string;
  readonly type: FinancialSignalType;
  readonly financialEvidenceIds: readonly string[];
  readonly documentId: string;
  readonly confidence: Confidence;
  readonly basis: string;
}
