import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import { EvidenceChainResolver, type EvidenceLinkedFinancialObject } from "../../internal/capability-support/evidence-chain-resolver.js";

const evidenceChainResolver = new EvidenceChainResolver();

/**
 * Generates `FinancialEvidence` from the Working Capital Capability Pack's
 * `FinancialObservation`s — the fourth pack to implement the target
 * pipeline's Observation → Evidence step, and the first to build directly on
 * the shared `EvidenceChainResolver` (`internal/capability-support/`) rather
 * than a private, pack-local copy of the same resolution logic.
 *
 * Maps every working_capital Observation to `working_capital_pressure` —
 * already used by the Liquidity Capability Pack's own generator (from
 * `current_ratio_below_range`). This is a **third** independent source of
 * the same evidence type (after `FinancialEvidenceClassifier`, which never
 * produces it, and Liquidity's generator, which does) — Liquidity's own
 * code is untouched; this is a new, separate generator that happens to
 * target the same `FinancialEvidenceType`, the same pattern already
 * established for `margin_erosion` (Profitability + `FinancialEvidenceClassifier`).
 * No signal-rule change was needed: `liquidity_stress`'s rule already
 * triggers on `working_capital_pressure` (added during the Liquidity
 * milestone), so this pack's evidence reaches it through the existing,
 * unmodified `FinancialSignalRuleRegistry`.
 *
 * `financialObjects` must include **every** Financial Object type this
 * pack's Ratios/Metrics can trace back to — not only its own
 * `WorkingCapitalComponent`s but also Liquidity's `Asset`/`Liability`
 * (reused by `working_capital_ratio`) — per the lesson recorded for Cash
 * Flow's evidence-chain defect fix (`docs/98_TECHNICAL_BACKLOG.md` CF-004).
 */
export function generateWorkingCapitalEvidence(
  documentId: string,
  observations: readonly FinancialObservation[],
  ratios: readonly FinancialRatio[],
  metrics: readonly FinancialMetric[],
  financialObjects: readonly EvidenceLinkedFinancialObject[],
): readonly FinancialEvidence[] {
  const workingCapitalObservations = observations.filter((o) => o.category === "working_capital");
  if (workingCapitalObservations.length === 0) return [];

  const evidenceObjectIds = evidenceChainResolver.resolveMany(workingCapitalObservations, ratios, metrics, financialObjects);
  if (evidenceObjectIds.length === 0) return [];

  const averageConfidence =
    workingCapitalObservations.reduce((sum, o) => sum + o.confidence.value, 0) / workingCapitalObservations.length;

  return [
    {
      id: deriveCompositeId([
        "financial-evidence",
        "working_capital_pressure",
        documentId,
        ...workingCapitalObservations.map((o) => o.id),
      ]).slice(0, 16),
      type: "working_capital_pressure",
      evidenceObjectIds,
      documentId,
      confidence: Confidence.create(averageConfidence),
      basis: `${workingCapitalObservations.length} working capital Observation(s) indicating pressure: ${workingCapitalObservations.map((o) => o.statement).join(" ")}`,
    },
  ];
}
