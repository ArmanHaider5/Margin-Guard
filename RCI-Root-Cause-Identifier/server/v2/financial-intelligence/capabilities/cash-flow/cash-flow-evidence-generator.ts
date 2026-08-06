import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import { EvidenceChainResolver, type EvidenceLinkedFinancialObject } from "../../internal/capability-support/evidence-chain-resolver.js";

const evidenceChainResolver = new EvidenceChainResolver();

/**
 * Generates `FinancialEvidence` from the Cash Flow Capability Pack's
 * `FinancialObservation`s — the third real implementation of the target
 * pipeline's Observation → Evidence step.
 *
 * Maps every cash_flow Observation to `negative_cash_flow` — one of the
 * `FinancialEvidenceType` categories with no detection logic anywhere before
 * this milestone (unlike `working_capital_pressure`/`margin_erosion`, which
 * each already had an unrelated `FinancialEvidenceClassifier` rule).
 * `FinancialEvidenceClassifier` remains untouched throughout. Evidence-chain
 * resolution itself now delegates to the shared `EvidenceChainResolver`
 * (`internal/capability-support/`) — extracted after this was the third
 * near-identical implementation of the same walk (see that module's doc
 * comment, and `docs/98_TECHNICAL_BACKLOG.md` PC-004/CF-003).
 *
 * **Defect fix, applied alongside the refactor above (permitted under
 * Cash Flow's "frozen except defect fixes" status):** the last parameter
 * widened from `readonly CashMovement[]` to the resolver's generic
 * `readonly EvidenceLinkedFinancialObject[]`, and the orchestrator now
 * passes `[...cashMovements, ...liabilities]` instead of `cashMovements`
 * alone. Both of Cash Flow's Ratios (`operating_cash_flow_ratio`,
 * `cash_coverage_ratio`) reference `total_current_liabilities` — a
 * **Liquidity** metric backed by `Liability` objects, not `CashMovement`
 * ones. Passing only `cashMovements` meant the resolver could never find a
 * match for the liability-side `relevantFinancialObjectIds`, so evidence
 * silently omitted the liability EvidenceObjects an Observation was partly
 * derived from — never an empty chain (cash-side ids were still present),
 * but an incomplete one, which the mandatory Evidence Chain principle does
 * not permit. See `docs/98_TECHNICAL_BACKLOG.md` CF-004.
 */
export function generateCashFlowEvidence(
  documentId: string,
  observations: readonly FinancialObservation[],
  ratios: readonly FinancialRatio[],
  metrics: readonly FinancialMetric[],
  financialObjects: readonly EvidenceLinkedFinancialObject[],
): readonly FinancialEvidence[] {
  const cashFlowObservations = observations.filter((o) => o.category === "cash_flow");
  if (cashFlowObservations.length === 0) return [];

  const evidenceObjectIds = evidenceChainResolver.resolveMany(cashFlowObservations, ratios, metrics, financialObjects);
  if (evidenceObjectIds.length === 0) return [];

  const averageConfidence =
    cashFlowObservations.reduce((sum, o) => sum + o.confidence.value, 0) / cashFlowObservations.length;

  return [
    {
      id: deriveCompositeId([
        "financial-evidence",
        "negative_cash_flow",
        documentId,
        ...cashFlowObservations.map((o) => o.id),
      ]).slice(0, 16),
      type: "negative_cash_flow",
      evidenceObjectIds,
      documentId,
      confidence: Confidence.create(averageConfidence),
      basis: `${cashFlowObservations.length} cash flow Observation(s) indicating negative cash flow: ${cashFlowObservations.map((o) => o.statement).join(" ")}`,
    },
  ];
}
