import type { Confidence, Money, Period } from "../../shared/index.js";

/**
 * INTERNAL TYPES ONLY — the Financial Object Model, per `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`
 * Chapter 4 / `03_MGD_DATA_MODEL.md`'s Financial Object Model. Analogous in role to
 * `document-parser/`'s internal `DocumentModel` (ADR-009): this is the low-level
 * accounting representation `financial-intelligence/` reasons over internally. It
 * is NEVER exported from this module's `index.ts` and never consumed by any other
 * module — `FinancialEvidence` and `FinancialSignal` (both in `shared/contracts/`)
 * are this module's public output surface, exactly as `StructuredDocument` and
 * `EvidenceObject` are `document-parser/`'s.
 *
 * `Money` and `Period` are the platform's existing shared Value Objects
 * (`shared/value-objects/`) — reused here, not re-declared, per the "avoid
 * primitive/duplicate types where a Value Object already exists" principle.
 *
 * These types started as conceptual foundation only; population logic (building
 * real records from `EvidenceObject[]`) is added incrementally, one Capability
 * Pack at a time (see `financial-intelligence/README.md`). `Asset`/`Liability`
 * gained real construction logic in the Liquidity Capability Pack milestone
 * (`capabilities/liquidity/`); `Revenue`/`Expense` gained it in the
 * Profitability Capability Pack milestone (`capabilities/profitability/`);
 * `CashMovement` gained it in the Cash Flow Capability Pack milestone
 * (`capabilities/cash-flow/`); `WorkingCapitalComponent` gained it in the
 * Working Capital Capability Pack milestone (`capabilities/working-capital/`);
 * `Equity` gained it, and `Liability`'s `"non_current"` classification value
 * was constructed for real for the first time, in the Leverage Capability
 * Pack milestone (`capabilities/leverage/`). `AccountGroup`, `FinancialAccount`,
 * `LedgerEntry`, `Posting`, `Balance`, and `Variance` remain unpopulated
 * until their own capability packs are built.
 */

export interface AccountGroup {
  readonly id: string;
  readonly name: string;
  readonly statementSection: "assets" | "liabilities" | "equity" | "revenue" | "expense";
}

export interface FinancialAccount {
  readonly id: string;
  /** Traceable to an Ontology canonical term where one exists (e.g. "Revenue",
   * "Financial Account") — never an invented account name. */
  readonly canonicalTerm: string;
  readonly accountGroupId: string;
}

export interface LedgerEntry {
  readonly id: string;
  readonly accountId: string;
  readonly date: string;
  readonly amount: Money;
  /** Traces back to the EvidenceObject this entry was derived from — every
   * Financial Object Model instance must remain evidence-linked. */
  readonly evidenceObjectId: string;
}

export interface Posting {
  readonly id: string;
  readonly entries: readonly LedgerEntry[];
}

export interface Balance {
  readonly accountId: string;
  readonly period: Period;
  readonly amount: Money;
}

export interface Variance {
  readonly actual: Money;
  readonly reference: Money;
  readonly period: Period;
}

/**
 * `id`, `confidence`, and `evidenceObjectIds` mirror every other Financial
 * Object Model type's own capability-pack-driven additions (see `Asset`'s
 * doc comment below for the full pattern). Only `"receivables"`, `"payables"`,
 * and `"inventory"` are constructed by the Working Capital Capability Pack's
 * builder — `"short_term_debt"` remains a valid `kind` in the type but has
 * no construction logic yet (it fits Leverage's domain more naturally than
 * Working Capital's; see `docs/98_TECHNICAL_BACKLOG.md` WC-001). `period`
 * stays optional for the same reason it does elsewhere.
 */
export interface WorkingCapitalComponent {
  readonly id: string;
  readonly kind: "receivables" | "payables" | "inventory" | "short_term_debt";
  readonly amount: Money;
  readonly period?: Period;
  readonly confidence: Confidence;
  readonly evidenceObjectIds: readonly string[];
}

/**
 * `confidence` and the `evidenceObjectId` → `evidenceObjectIds` rename were
 * added/applied during the Cash Flow Capability Pack milestone, aligning
 * `CashMovement` with `Asset`/`Liability`/`Revenue`/`Expense`'s established
 * shape (`confidence`, `evidenceObjectIds` as an array even though today's
 * construction logic always populates it with exactly one id).
 * `amount` is always stored as a non-negative magnitude — `direction` alone
 * carries the sign, deliberately, to avoid double-negative bugs when summing
 * inflows/outflows (`capabilities/cash-flow/cash-movement-builder.ts`).
 * `date` stays optional for the same reason `period` does elsewhere: no
 * reliable date-boundary detection exists yet for a constructed CashMovement.
 */
export interface CashMovement {
  readonly id: string;
  readonly direction: "inflow" | "outflow";
  readonly amount: Money;
  readonly date?: string;
  readonly confidence: Confidence;
  readonly evidenceObjectIds: readonly string[];
}

/**
 * `id`, `classification`, `confidence`, and `evidenceObjectIds` were added
 * during the Liquidity Capability Pack milestone — the first milestone to
 * actually construct real `Asset`/`Liability` instances from `EvidenceObject[]`
 * (see `capabilities/liquidity/current-asset-liability-builder.ts`).
 * `classification` distinguishes current from non-current so
 * `total_current_assets`/`total_current_liabilities` can be computed without
 * summing every Asset/Liability in the statement — it is not yet a
 * registered Ontology term ("Current Asset"/"Current Liability" do not exist
 * in `knowledge/ontology-terms-data.ts`), so it is detected via a disclosed,
 * non-ontology-bound row-label heuristic, the same documented-exception
 * pattern already used for `cash_shortages`' "Cash" keyword heuristic (see
 * `evidence/financial-evidence-rules.ts`). `period` stays optional — unlike
 * `LedgerEntry`/`Balance`, no reliable period-boundary detection exists yet
 * for a constructed Asset/Liability. `Equity`/`Revenue`/`Expense`/
 * `WorkingCapitalComponent` below do not yet have this treatment — they gain
 * it when their own capability packs (Profitability, Cash Flow, ...) are
 * implemented, per "one complete business capability at a time."
 */
export interface Asset {
  readonly id: string;
  readonly accountGroupId: string;
  readonly classification: "current" | "non_current";
  readonly totalValue: Money;
  readonly period?: Period;
  readonly confidence: Confidence;
  /** Traces back to the EvidenceObject(s) this entry was derived from — every
   * Financial Object Model instance must remain evidence-linked. */
  readonly evidenceObjectIds: readonly string[];
}

/**
 * `classification: "non_current"` was declared from the start (Liquidity
 * milestone) but never actually constructed until the Leverage Capability
 * Pack milestone (`capabilities/leverage/non-current-liability-builder.ts`)
 * — Liquidity's own builder only ever produces `"current"`-classified
 * Liability entries (from a "Total Current Liabilities" row); Leverage's
 * builder is the first to detect a "Total Non-Current Liabilities"/"Total
 * Long-Term Liabilities" row and construct the `"non_current"` counterpart.
 */
export interface Liability {
  readonly id: string;
  readonly accountGroupId: string;
  readonly classification: "current" | "non_current";
  readonly totalValue: Money;
  readonly period?: Period;
  readonly confidence: Confidence;
  readonly evidenceObjectIds: readonly string[];
}

/**
 * `id`, `confidence`, and `evidenceObjectIds` mirror every other Financial
 * Object Model type's own capability-pack-driven additions — added during
 * the Leverage Capability Pack milestone, the first to construct real
 * `Equity` instances (`capabilities/leverage/equity-builder.ts`). `period`
 * loosened to optional for the same reason it is elsewhere.
 */
export interface Equity {
  readonly id: string;
  readonly accountGroupId: string;
  readonly totalValue: Money;
  readonly period?: Period;
  readonly confidence: Confidence;
  readonly evidenceObjectIds: readonly string[];
}

/**
 * `id`, `confidence`, and `evidenceObjectIds` mirror `Asset`/`Liability`'s
 * own Liquidity-milestone additions (see that doc comment above). `Expense.category`
 * narrowed from a free `string` to a closed union — `"cogs"` (Cost of Goods
 * Sold) and `"operating"` (Operating Expenses) are the only two categories the
 * Profitability Capability Pack's row-label heuristic currently distinguishes
 * (`capabilities/profitability/revenue-expense-builder.ts`); an Expense row
 * matching neither pattern (e.g. interest, tax, depreciation shown outside
 * either heading) is not constructed as an `Expense` object at all — a
 * disclosed gap, see `docs/98_TECHNICAL_BACKLOG.md` PC-001.
 *
 * `periodSequence` was added during the Growth Capability Pack milestone
 * (`capabilities/growth/`) — the same "add one distinguishing field, mirror
 * `Asset`/`Liability`'s `classification`" pattern, not a new mechanism.
 * Populated **only** by Growth's own builder (`period-revenue-builder.ts`),
 * which tags the last two rows of a Revenue-normalized column, in row order,
 * as `"prior"`/`"current"` — a disclosed, row-sequence proxy for genuine
 * period boundaries, since no reliable date/period-boundary detection exists
 * on this platform (see `docs/98_TECHNICAL_BACKLOG.md` PC-003, extended by
 * GR-001). `Revenue` objects built by every other pack (e.g. Profitability's
 * aggregate "Total Revenue" construction) leave this field `undefined`, the
 * same way `Liability` objects built before Leverage never populated
 * `classification: "non_current"`.
 */
export interface Revenue {
  readonly id: string;
  readonly totalValue: Money;
  readonly period?: Period;
  readonly periodSequence?: "prior" | "current";
  readonly confidence: Confidence;
  readonly evidenceObjectIds: readonly string[];
}

export interface Expense {
  readonly id: string;
  readonly category?: "cogs" | "operating";
  readonly totalValue: Money;
  readonly period?: Period;
  readonly confidence: Confidence;
  readonly evidenceObjectIds: readonly string[];
}
