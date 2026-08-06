import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import { EvidenceChainResolver, type EvidenceLinkedFinancialObject } from "../../internal/capability-support/evidence-chain-resolver.js";

const evidenceChainResolver = new EvidenceChainResolver();

/**
 * Generates `FinancialEvidence` from the Leverage Capability Pack's
 * `FinancialObservation`s — the fifth pack to implement the target
 * pipeline's Observation → Evidence step, built on the shared
 * `EvidenceChainResolver` (`internal/capability-support/`) from the start.
 *
 * Maps every leverage Observation to `debt_growth` — already used by
 * `FinancialEvidenceClassifier` for its own, unrelated trend detection
 * (Liability column values increasing across rows); this is a second,
 * parallel source of the same type, the established "multiple sources, one
 * type" pattern (`margin_erosion`, `working_capital_pressure`). `debt_growth`
 * is the closest available `FinancialEvidenceType` for a leverage-domain
 * condition — "negative equity" is not literally growth, but it is
 * unambiguously debt-related, and no more precise type exists in the
 * registered fifteen; disclosed as an imperfect-but-reasonable mapping, the
 * same kind of judgment call Cash Flow's Cash Coverage Ratio formula choice
 * required (see `docs/98_TECHNICAL_BACKLOG.md` LV-001).
 *
 * No signal-rule change was needed: `over_reliance_on_debt`'s rule already
 * triggers on `debt_growth` alone (registered in the original Sprint 2
 * Foundation milestone), so this pack's evidence reaches it through the
 * existing, unmodified `FinancialSignalRuleRegistry`.
 */
export function generateLeverageEvidence(
  documentId: string,
  observations: readonly FinancialObservation[],
  ratios: readonly FinancialRatio[],
  metrics: readonly FinancialMetric[],
  financialObjects: readonly EvidenceLinkedFinancialObject[],
): readonly FinancialEvidence[] {
  const leverageObservations = observations.filter((o) => o.category === "leverage");
  if (leverageObservations.length === 0) return [];

  const evidenceObjectIds = evidenceChainResolver.resolveMany(leverageObservations, ratios, metrics, financialObjects);
  if (evidenceObjectIds.length === 0) return [];

  const averageConfidence =
    leverageObservations.reduce((sum, o) => sum + o.confidence.value, 0) / leverageObservations.length;

  return [
    {
      id: deriveCompositeId([
        "financial-evidence",
        "debt_growth",
        documentId,
        ...leverageObservations.map((o) => o.id),
      ]).slice(0, 16),
      type: "debt_growth",
      evidenceObjectIds,
      documentId,
      confidence: Confidence.create(averageConfidence),
      basis: `${leverageObservations.length} leverage Observation(s) indicating debt burden concerns: ${leverageObservations.map((o) => o.statement).join(" ")}`,
    },
  ];
}
