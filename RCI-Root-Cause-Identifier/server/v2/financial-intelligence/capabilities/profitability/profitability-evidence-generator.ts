import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import { EvidenceChainResolver } from "../../internal/capability-support/evidence-chain-resolver.js";

const evidenceChainResolver = new EvidenceChainResolver();

/**
 * Generates `FinancialEvidence` from the Profitability Capability Pack's
 * `FinancialObservation`s — the second real implementation of the target
 * pipeline's Observation → Evidence step (the first was Liquidity's
 * `working_capital_pressure`).
 *
 * Maps every profitability Observation to the existing `margin_erosion`
 * `FinancialEvidenceType` — already used by `FinancialEvidenceClassifier`
 * for its own (unrelated, row-trend-based) margin_erosion detection; this is
 * a second, parallel source of the same evidence type, exactly the pattern
 * Liquidity established for `working_capital_pressure`. `FinancialEvidenceClassifier`
 * itself is untouched. No signal-rule change was needed this milestone —
 * `margin_compression`'s rule already triggers on `margin_erosion` alone
 * (registered in the original Sprint 2 Foundation milestone), so this
 * pack's evidence reaches `margin_compression` through the existing,
 * unmodified `FinancialSignalRuleRegistry`. Evidence-chain resolution itself
 * now delegates to the shared `EvidenceChainResolver`
 * (`internal/capability-support/`) — a behaviour-preserving refactor.
 */
export function generateProfitabilityEvidence(
  documentId: string,
  observations: readonly FinancialObservation[],
  ratios: readonly FinancialRatio[],
  metrics: readonly FinancialMetric[],
  financialObjects: FinancialObjectSet,
): readonly FinancialEvidence[] {
  const profitabilityObservations = observations.filter((o) => o.category === "profitability");
  if (profitabilityObservations.length === 0) return [];

  const evidenceObjectIds = evidenceChainResolver.resolveMany(profitabilityObservations, ratios, metrics, [
    ...financialObjects.revenue,
    ...financialObjects.expense,
  ]);
  if (evidenceObjectIds.length === 0) return [];

  const averageConfidence =
    profitabilityObservations.reduce((sum, o) => sum + o.confidence.value, 0) / profitabilityObservations.length;

  return [
    {
      id: deriveCompositeId([
        "financial-evidence",
        "margin_erosion",
        documentId,
        ...profitabilityObservations.map((o) => o.id),
      ]).slice(0, 16),
      type: "margin_erosion",
      evidenceObjectIds,
      documentId,
      confidence: Confidence.create(averageConfidence),
      basis: `${profitabilityObservations.length} profitability Observation(s) indicating margin deterioration: ${profitabilityObservations.map((o) => o.statement).join(" ")}`,
    },
  ];
}
