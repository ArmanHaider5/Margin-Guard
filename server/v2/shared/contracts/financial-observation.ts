import type { Confidence, Period } from "../value-objects/index.js";
import type { FinancialRatioCategory } from "./financial-ratio.js";

/**
 * Reuses `FinancialRatioCategory`'s eleven domain categories rather than
 * introducing a second, parallel taxonomy — an Observation describes the same
 * business domain its underlying Metric(s)/Ratio(s) belong to (e.g. a
 * liquidity Ratio produces a liquidity Observation). `operational` remains the
 * same deliberate boundary gap documented in `financial-ratio.ts`.
 */
export type FinancialObservationCategory = FinancialRatioCategory;

/**
 * An objective, non-diagnostic statement of business fact derived from one or
 * more Financial Metrics and/or Financial Ratios — e.g. "Current ratio is
 * below the preferred operating range." The Financial Intelligence pipeline's
 * fifth stage:
 *
 *   EvidenceObjects → Financial Objects (internal) → Financial Metrics →
 *   Financial Ratios → **Financial Observations** → Financial Evidence →
 *   Financial Signals.
 *
 * An Observation states *what* was observed. It does not conclude, does not
 * diagnose, and does not assign cause — that is Financial Evidence's and, in
 * particular, `brain/`'s job (ADR-006), never this module's. Observations are
 * the mandatory input to Financial Evidence from a future sprint onward (see
 * `financial-intelligence/README.md`).
 *
 * Public for the same reason `FinancialMetric`/`FinancialRatio` are (see
 * `financial-metric.ts`'s doc comment) — this is exactly the kind of reusable,
 * evidence-adjacent output intended for future cross-module consumption.
 *
 * At least one of `metricIds`/`ratioIds` must be non-empty — an Observation
 * that traces to neither a Metric nor a Ratio has no basis and must not be
 * constructed. This is a runtime invariant (documented here, enforced by a
 * future `ObservationCalculator` implementation), not something the type
 * system alone can express.
 */
export interface FinancialObservation {
  readonly id: string;
  /** References a FinancialObservationDefinition id
   * (`financial-intelligence/observations/`, internal). */
  readonly definitionId: string;
  readonly category: FinancialObservationCategory;
  /** The objective statement itself, e.g. "Gross margin declined compared
   * with previous periods." Plain business language, never a conclusion. */
  readonly statement: string;
  readonly period?: Period;
  readonly documentId: string;
  readonly metricIds: readonly string[];
  readonly ratioIds: readonly string[];
  readonly confidence: Confidence;
  readonly basis: string;
}
