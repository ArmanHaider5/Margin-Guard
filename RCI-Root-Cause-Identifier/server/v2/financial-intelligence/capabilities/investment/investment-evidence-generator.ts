import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import { EvidenceChainResolver, type EvidenceLinkedFinancialObject } from "../../internal/capability-support/evidence-chain-resolver.js";

const evidenceChainResolver = new EvidenceChainResolver();

/**
 * Generates `FinancialEvidence` from the Investment Capability Pack's
 * `FinancialObservation`s — the eighth pack to implement the Observation →
 * Evidence step, built on the shared `EvidenceChainResolver` from the start.
 *
 * Maps every investment Observation to `margin_erosion` — the closest
 * available `FinancialEvidenceType` for a negative Return on Equity
 * condition: ROE ties Profitability's own Gross Profit to Total Equity, so a
 * negative return is fundamentally a profitability-of-capital concern, the
 * same family `margin_erosion` already covers. This is the **fourth**
 * occurrence of the "disclosed imperfect evidence-type mapping" judgment
 * call, after CF-002, LV-001, and EFF-001 (`docs/98_TECHNICAL_BACKLOG.md`
 * INV-001) — Growth's mapping to `revenue_growth` (a clean fit, not a
 * compromise) does not count toward this lineage. Per the earlier "document
 * before abstract on third occurrence" instruction, no abstraction is
 * introduced here either: there is no shared *code* to factor out across
 * these four call sites, only a recurring *kind* of judgment call, which
 * stays documented per call site.
 *
 * `margin_compression`'s rule already triggers on `margin_erosion` alone
 * (registered since Sprint 2 Foundation) — no signal-rule change was needed
 * or made this milestone.
 */
export function generateInvestmentEvidence(
  documentId: string,
  observations: readonly FinancialObservation[],
  ratios: readonly FinancialRatio[],
  metrics: readonly FinancialMetric[],
  financialObjects: readonly EvidenceLinkedFinancialObject[],
): readonly FinancialEvidence[] {
  const investmentObservations = observations.filter((o) => o.category === "investment");
  if (investmentObservations.length === 0) return [];

  const evidenceObjectIds = evidenceChainResolver.resolveMany(investmentObservations, ratios, metrics, financialObjects);
  if (evidenceObjectIds.length === 0) return [];

  const averageConfidence =
    investmentObservations.reduce((sum, o) => sum + o.confidence.value, 0) / investmentObservations.length;

  return [
    {
      id: deriveCompositeId([
        "financial-evidence",
        "margin_erosion",
        documentId,
        ...investmentObservations.map((o) => o.id),
      ]).slice(0, 16),
      type: "margin_erosion",
      evidenceObjectIds,
      documentId,
      confidence: Confidence.create(averageConfidence),
      basis: `${investmentObservations.length} investment Observation(s) indicating return-on-equity concerns: ${investmentObservations.map((o) => o.statement).join(" ")}`,
    },
  ];
}
