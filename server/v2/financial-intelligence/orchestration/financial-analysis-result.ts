import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio, FinancialSignal } from "../../shared/index.js";

/**
 * The Financial Intelligence Orchestrator's unified output — every
 * `FinancialMetric`/`FinancialRatio`/`FinancialObservation`/`FinancialEvidence`/
 * `FinancialSignal` produced by every registered Capability Pack for one
 * document, aggregated and deduplicated (see
 * `financial-intelligence-orchestrator.ts` for the exact dedup rule).
 *
 * Internal to `financial-intelligence/` — never exported from `index.ts`.
 * This orchestrator milestone does not wire anything into
 * `analyzeFinancialSignals()` or make any part of this public; that remains
 * a future integration decision, once every planned Capability Pack exists.
 *
 * Stops at Signals — no Finding, Root Cause, Recommendation, or Report is
 * introduced here or by any Capability Pack this orchestrates.
 */
export interface FinancialAnalysisResult {
  readonly documentId: string;
  /** Which Capability Packs actually ran, in the fixed, deterministic order
   * they ran in — see `capability-pack-registry.ts`. Not which packs
   * produced non-empty output; every registered pack always runs. */
  readonly packsExecuted: readonly string[];
  readonly metrics: readonly FinancialMetric[];
  readonly ratios: readonly FinancialRatio[];
  readonly observations: readonly FinancialObservation[];
  readonly evidence: readonly FinancialEvidence[];
  readonly signals: readonly FinancialSignal[];
}
