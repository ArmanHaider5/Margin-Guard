import type {
  StructuredDocument,
  EvidenceObject,
  FinancialEvidence,
  FinancialMetric,
  FinancialObservation,
  FinancialRatio,
  FinancialSignal,
} from "../../shared/index.js";
import type { CapabilityPackRegistry } from "./capability-pack-registry.js";
import type { FinancialAnalysisResult } from "./financial-analysis-result.js";

/**
 * Deduplicates by `id` — every id in this module is content-derived
 * (`deriveCompositeId`, never random), so two records sharing an id are, by
 * construction, the same record, not a coincidence. This is the concrete
 * mechanism behind "Duplicate Evidence/Signal handling": when two Capability
 * Packs cross-reuse the same underlying calculation (e.g. Cash Flow, Working
 * Capital, and Leverage all independently call Liquidity's
 * `TotalCurrentLiabilitiesCalculator` internally), each pack's own result
 * contains an *identical* `total_current_liabilities` `FinancialMetric` —
 * same id, same every field — and aggregating all packs' results naively
 * would show that one Metric three times. Applied uniformly to all five
 * result arrays (not only Evidence/Signal, where the same reasoning holds:
 * `working_capital_pressure` evidence independently produced by both
 * Liquidity's and Working Capital's packs has genuinely different content —
 * different triggering Observations, different ids — so it is **not**
 * deduplicated; only bit-for-bit identical records collapse).
 *
 * Deliberately does **not** attempt semantic consolidation — merging two
 * *different* `liquidity_stress` Signals (same type, different evidence,
 * different ids, both genuinely produced) into one combined, re-corroborated
 * record would be a real feature with its own judgment calls (how to
 * recompute confidence, how to represent multi-pack provenance) explicitly
 * out of this milestone's "Implement only" scope — see
 * `docs/98_TECHNICAL_BACKLOG.md` FIO-002. Keeping both as separate, honestly
 * distinct signals is the conservative, unambiguous choice.
 */
function dedupeById<T extends { readonly id: string }>(items: readonly T[]): readonly T[] {
  const seenIds = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    result.push(item);
  }
  return result;
}

/**
 * The Financial Intelligence Orchestrator — runs every registered
 * Capability Pack against one document's `StructuredDocument`/`EvidenceObject[]`
 * and aggregates their output into one `FinancialAnalysisResult`.
 *
 * Deterministic: packs run in the registry's fixed registration order
 * (never a `Set`/`Map`-keyed or otherwise unordered iteration), each pack's
 * own `run()` is already independently deterministic (every Capability Pack
 * milestone verified this), and the aggregation/dedup step introduces no
 * randomness or timestamp. Given identical `(document, evidence)` input and
 * an identical registry, `analyze()` always returns byte-for-byte identical
 * output.
 *
 * Every registered pack always runs — there is no "skip if not applicable"
 * logic here; each pack's own `canCalculate()` gating (inside its
 * calculators) already handles the case where a pack has nothing to compute
 * for a given document, simply returning empty arrays for that pack.
 *
 * Introduces no Finding, Root Cause, Recommendation, or Report — `signals`
 * remains the terminal field, exactly as every underlying Capability Pack's
 * own result already stops there.
 */
export class FinancialIntelligenceOrchestrator {
  constructor(private readonly registry: CapabilityPackRegistry) {}

  analyze(document: StructuredDocument, evidence: readonly EvidenceObject[]): FinancialAnalysisResult {
    const packsExecuted: string[] = [];
    const metrics: FinancialMetric[] = [];
    const ratios: FinancialRatio[] = [];
    const observations: FinancialObservation[] = [];
    const evidenceRecords: FinancialEvidence[] = [];
    const signals: FinancialSignal[] = [];

    for (const pack of this.registry.all()) {
      const result = pack.run(document, evidence);
      packsExecuted.push(pack.id);
      metrics.push(...result.metrics);
      ratios.push(...result.ratios);
      observations.push(...result.observations);
      evidenceRecords.push(...result.evidence);
      signals.push(...result.signals);
    }

    return {
      documentId: document.documentId,
      packsExecuted,
      metrics: dedupeById(metrics),
      ratios: dedupeById(ratios),
      observations: dedupeById(observations),
      evidence: dedupeById(evidenceRecords),
      signals: dedupeById(signals),
    };
  }
}
