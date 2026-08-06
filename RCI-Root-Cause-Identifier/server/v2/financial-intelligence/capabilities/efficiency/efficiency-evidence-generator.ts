import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import { EvidenceChainResolver, type EvidenceLinkedFinancialObject } from "../../internal/capability-support/evidence-chain-resolver.js";

const evidenceChainResolver = new EvidenceChainResolver();

/**
 * Generates `FinancialEvidence` from the Efficiency Capability Pack's
 * `FinancialObservation`s — the sixth pack to implement the Observation →
 * Evidence step, built on the shared `EvidenceChainResolver` from the start,
 * same as every pack since Working Capital.
 *
 * Maps every efficiency Observation to `revenue_growth` — the best-available
 * `FinancialEvidenceType` for "zero asset turnover" among the registered
 * fifteen. This is an imperfect mapping, disclosed here: `revenue_growth` is
 * Revenue-domain, and "zero turnover" is not literally a growth statement,
 * but no Efficiency-specific or asset-utilization type exists in the
 * registry. This is the THIRD occurrence of this "disclosed imperfect
 * evidence-type mapping" judgment call, after CF-002 (Cash Coverage Ratio
 * formula choice) and LV-001 (`debt_growth` for negative equity) — flagged
 * here, and in `docs/98_TECHNICAL_BACKLOG.md` as EFF-001, per this
 * milestone's "document before abstract on third occurrence" instruction (no
 * abstraction is introduced; this remains a plain disclosed judgment call in
 * each of the three call sites).
 *
 * Unlike every prior "second source of the same type" case, mapping to
 * `revenue_growth` here has a real downstream effect: `revenue_instability`'s
 * signal rule was extended (this milestone) to also trigger on
 * `revenue_growth` alone — see `financial-signal-rules.ts`'s doc comment and
 * `docs/98_TECHNICAL_BACKLOG.md` EFF-002 for the full reasoning.
 */
export function generateEfficiencyEvidence(
  documentId: string,
  observations: readonly FinancialObservation[],
  ratios: readonly FinancialRatio[],
  metrics: readonly FinancialMetric[],
  financialObjects: readonly EvidenceLinkedFinancialObject[],
): readonly FinancialEvidence[] {
  const efficiencyObservations = observations.filter((o) => o.category === "efficiency");
  if (efficiencyObservations.length === 0) return [];

  const evidenceObjectIds = evidenceChainResolver.resolveMany(efficiencyObservations, ratios, metrics, financialObjects);
  if (evidenceObjectIds.length === 0) return [];

  const averageConfidence =
    efficiencyObservations.reduce((sum, o) => sum + o.confidence.value, 0) / efficiencyObservations.length;

  return [
    {
      id: deriveCompositeId([
        "financial-evidence",
        "revenue_growth",
        documentId,
        ...efficiencyObservations.map((o) => o.id),
      ]).slice(0, 16),
      type: "revenue_growth",
      evidenceObjectIds,
      documentId,
      confidence: Confidence.create(averageConfidence),
      basis: `${efficiencyObservations.length} efficiency Observation(s) indicating asset-utilization concerns: ${efficiencyObservations.map((o) => o.statement).join(" ")}`,
    },
  ];
}
