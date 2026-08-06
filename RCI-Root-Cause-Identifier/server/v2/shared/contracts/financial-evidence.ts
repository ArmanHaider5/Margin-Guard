import type { Confidence } from "../value-objects/index.js";

/**
 * The fifteen Financial Evidence categories defined conceptually in
 * `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md` Chapter 5. The type union is complete —
 * every category is a valid `FinancialEvidence.type` — even though, in this
 * foundation sprint, `financial-intelligence/`'s classifier only implements
 * detection rules for a subset (see `financial-intelligence/README.md` for exactly
 * which, and why the remainder are deferred rather than implemented shallowly).
 */
export type FinancialEvidenceType =
  | "revenue_growth"
  | "margin_erosion"
  | "negative_cash_flow"
  | "inventory_accumulation"
  | "receivable_ageing"
  | "payable_ageing"
  | "debt_growth"
  | "cost_escalation"
  | "cash_shortages"
  | "working_capital_pressure"
  | "duplicate_payments"
  | "missing_reconciliations"
  | "revenue_concentration"
  | "supplier_dependency"
  | "customer_dependency";

/**
 * A domain-classified grouping of one or more EvidenceObjects into a recognized
 * financial evidence category. Per the mandatory Evidence Chain
 * (`03_MGD_DATA_MODEL.md` Chapter 5), a FinancialEvidence record is never produced
 * without referencing the specific EvidenceObject(s) it was derived from —
 * `evidenceObjectIds` is never empty.
 */
export interface FinancialEvidence {
  readonly id: string;
  readonly type: FinancialEvidenceType;
  readonly evidenceObjectIds: readonly string[];
  readonly documentId: string;
  readonly confidence: Confidence;
  /** A human-readable note on what was observed and why it was classified this
   * way — the explainability record for this specific classification. */
  readonly basis: string;
}
