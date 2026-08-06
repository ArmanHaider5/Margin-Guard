import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import { EvidenceChainResolver, type EvidenceLinkedFinancialObject } from "../../internal/capability-support/evidence-chain-resolver.js";

const evidenceChainResolver = new EvidenceChainResolver();

/**
 * Generates `FinancialEvidence` from the Growth Capability Pack's
 * `FinancialObservation`s — the seventh pack to implement the Observation →
 * Evidence step, built on the shared `EvidenceChainResolver` from the start.
 *
 * Maps every growth Observation to `revenue_growth` — the **third**
 * independent source of that type, after the frozen `FinancialEvidenceClassifier`'s
 * own trend detector and Efficiency's generator (`docs/98_TECHNICAL_BACKLOG.md`
 * EFF-001). Unlike EFF-001's mapping, this one is a **clean** fit, not a
 * disclosed compromise: per `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md` Chapter
 * 5's own convention, `revenue_growth` evidence is about "Revenue across ≥2
 * comparable Periods" in general — direction (increase or decrease) is
 * recorded in `basis`, not encoded in the type itself, exactly as
 * `evidence/financial-evidence-rules.ts`'s own `detectTrend` already
 * documents ("Direction is recorded in basis, not encoded in the
 * FinancialEvidenceType itself"). A negative growth rate is still evidence
 * "of" the revenue-across-periods category — the same category a positive
 * growth rate would also produce.
 *
 * No Knowledge Rule (signal rule) change was needed or made this milestone:
 * `revenue_instability`'s rule already triggers on `revenue_growth` alone
 * (extended to version `1.1.0` during the Efficiency Capability Pack
 * milestone, `docs/98_TECHNICAL_BACKLOG.md` EFF-002), so this pack's evidence
 * reaches it through the existing, unmodified `FinancialSignalRuleRegistry`.
 */
export function generateGrowthEvidence(
  documentId: string,
  observations: readonly FinancialObservation[],
  ratios: readonly FinancialRatio[],
  metrics: readonly FinancialMetric[],
  financialObjects: readonly EvidenceLinkedFinancialObject[],
): readonly FinancialEvidence[] {
  const growthObservations = observations.filter((o) => o.category === "growth");
  if (growthObservations.length === 0) return [];

  const evidenceObjectIds = evidenceChainResolver.resolveMany(growthObservations, ratios, metrics, financialObjects);
  if (evidenceObjectIds.length === 0) return [];

  const averageConfidence =
    growthObservations.reduce((sum, o) => sum + o.confidence.value, 0) / growthObservations.length;

  return [
    {
      id: deriveCompositeId([
        "financial-evidence",
        "revenue_growth",
        documentId,
        ...growthObservations.map((o) => o.id),
      ]).slice(0, 16),
      type: "revenue_growth",
      evidenceObjectIds,
      documentId,
      confidence: Confidence.create(averageConfidence),
      basis: `${growthObservations.length} growth Observation(s) indicating revenue trend concerns: ${growthObservations.map((o) => o.statement).join(" ")}`,
    },
  ];
}
