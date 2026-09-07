import type { Confidence, Period } from "../value-objects/index.js";

/** The unit a FinancialMetric's `value` should be interpreted as. Distinct from
 * `FinancialRatio`, which is always a dimensionless or percentage comparison
 * between two Metrics — a Metric is a single measured quantity. */
export type FinancialMetricUnit = "currency" | "count" | "percentage" | "days";

/**
 * A specific, computed quantity for one document/period — e.g. "Total Revenue:
 * 50000, Q1 2026." The Financial Intelligence pipeline's third stage:
 * EvidenceObjects → Financial Objects (internal) → **Financial Metrics** →
 * Financial Ratios → Financial Evidence → Financial Signals.
 *
 * Public (in `shared/contracts/`, not internal to `financial-intelligence/`)
 * because — unlike the Financial Object Model (Financial Account, Ledger Entry,
 * etc., which remain internal per the same reasoning as `document-parser/`'s
 * `DocumentModel`, ADR-009) — Financial Metrics and Ratios are exactly the kind of
 * reusable financial intelligence `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md` §11.2
 * and `MGD_V2_BLUEPRINT.md` §9.2 describe as intended for future cross-module
 * consumption (e.g. a future YieldIQ integration).
 *
 * `financialObjectIds` references internal Financial Object Model instance ids —
 * an opaque string reference is fine for cross-module traceability even though the
 * referenced type itself is never exposed (the same pattern `EvidenceObject.sourceLocation.tableId`
 * already uses to reference a `document-parser/`-internal table id).
 */
export interface FinancialMetric {
  readonly id: string;
  /** References a FinancialMetricDefinition id (`financial-intelligence/metrics/`,
   * internal — the definition itself is knowledge, not a public contract). */
  readonly definitionId: string;
  readonly value: number;
  readonly unit: FinancialMetricUnit;
  readonly period?: Period;
  readonly documentId: string;
  readonly financialObjectIds: readonly string[];
  readonly confidence: Confidence;
  readonly basis: string;
}
