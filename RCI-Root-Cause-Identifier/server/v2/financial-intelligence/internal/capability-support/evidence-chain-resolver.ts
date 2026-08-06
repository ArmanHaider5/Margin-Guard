import type { FinancialMetric, FinancialObservation, FinancialRatio } from "../../../shared/index.js";

/**
 * The minimal shape `EvidenceChainResolver` needs from a constructed
 * Financial Object Model instance — `Asset`, `Liability`, `Revenue`,
 * `Expense`, and `CashMovement` all already satisfy this structurally (each
 * carries `id`/`evidenceObjectIds`, per their own Capability Pack milestone's
 * additions), so no per-pack adapter is needed to use this resolver.
 */
export interface EvidenceLinkedFinancialObject {
  readonly id: string;
  readonly evidenceObjectIds: readonly string[];
}

/**
 * Extracted during the "shared internals" refactoring milestone, between the
 * Cash Flow and Working Capital Capability Packs, from three near-identical
 * `resolveEvidenceObjectIds()` functions that had accumulated in
 * `capabilities/liquidity/liquidity-evidence-generator.ts`,
 * `capabilities/profitability/profitability-evidence-generator.ts`, and
 * `capabilities/cash-flow/cash-flow-evidence-generator.ts` (see
 * `docs/98_TECHNICAL_BACKLOG.md` PC-004/CF-003 for the history of that
 * decision — deliberately *not* extracted after the first or second
 * occurrence, only once a third confirmed the shape was genuinely stable).
 *
 * Walks the full chain a Capability Pack's target pipeline establishes:
 * Observation → Ratio.metricIds → Metric.financialObjectIds →
 * FinancialObject.evidenceObjectIds. Required because `FinancialEvidence`'s
 * frozen contract (`shared/contracts/financial-evidence.ts`) documents
 * `evidenceObjectIds` as referencing real `EvidenceObject` ids specifically —
 * an Observation id is not a substitute, so this resolver does the real work
 * of tracing back through every intermediate layer rather than reinterpreting
 * the field.
 *
 * Internal to `financial-intelligence/` — not exported from `index.ts`, per
 * the same reasoning as every other calculation-layer internal (registries,
 * calculator interfaces, `pipeline/`). Behaviourally identical to the three
 * functions it replaces; this extraction changes no Capability Pack's output.
 */
export class EvidenceChainResolver {
  /** Resolves one Observation back to the EvidenceObject ids it ultimately rests on. */
  resolve(
    observation: FinancialObservation,
    ratios: readonly FinancialRatio[],
    metrics: readonly FinancialMetric[],
    financialObjects: readonly EvidenceLinkedFinancialObject[],
  ): readonly string[] {
    const relevantRatios = ratios.filter((r) => observation.ratioIds.includes(r.id));
    const relevantMetricIds = new Set<string>(observation.metricIds);
    for (const ratio of relevantRatios) {
      for (const metricId of ratio.metricIds) relevantMetricIds.add(metricId);
    }

    const relevantMetrics = metrics.filter((m) => relevantMetricIds.has(m.id));
    const relevantFinancialObjectIds = new Set<string>();
    for (const metric of relevantMetrics) {
      for (const objectId of metric.financialObjectIds) relevantFinancialObjectIds.add(objectId);
    }

    const evidenceObjectIds = new Set<string>();
    for (const object of financialObjects) {
      if (!relevantFinancialObjectIds.has(object.id)) continue;
      for (const evidenceObjectId of object.evidenceObjectIds) evidenceObjectIds.add(evidenceObjectId);
    }

    return Array.from(evidenceObjectIds);
  }

  /** Resolves a set of Observations at once, unioning each one's resolved
   * EvidenceObject ids — the exact pattern every Capability Pack's evidence
   * generator uses to build one aggregated FinancialEvidence record. */
  resolveMany(
    observations: readonly FinancialObservation[],
    ratios: readonly FinancialRatio[],
    metrics: readonly FinancialMetric[],
    financialObjects: readonly EvidenceLinkedFinancialObject[],
  ): readonly string[] {
    const evidenceObjectIds = new Set<string>();
    for (const observation of observations) {
      for (const id of this.resolve(observation, ratios, metrics, financialObjects)) {
        evidenceObjectIds.add(id);
      }
    }
    return Array.from(evidenceObjectIds);
  }
}
