import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio } from "../../../shared/index.js";
import type { FinancialObjectSet } from "../../metrics/metric-calculator.js";
import { EvidenceChainResolver } from "../../internal/capability-support/evidence-chain-resolver.js";

const evidenceChainResolver = new EvidenceChainResolver();

/**
 * Generates `FinancialEvidence` from the Liquidity Capability Pack's
 * `FinancialObservation`s — the first real implementation of the target
 * pipeline's Observation → Evidence step (previously only documented as
 * future work; see `financial-intelligence/README.md`'s "Pipeline" section).
 *
 * Maps every liquidity Observation to the `working_capital_pressure`
 * `FinancialEvidenceType` — per `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`
 * Chapter 5, `working_capital_pressure`'s required fields are literally
 * "Current Asset/Liability Balances", which is exactly what `current_ratio`
 * (and therefore `current_ratio_below_range`) is computed from. This was one
 * of the five FinancialEvidenceType categories with no detection logic
 * (`evidence/financial-evidence-rules.ts` deferred it) — it is filled in
 * here, via the Observation-based path only. `FinancialEvidenceClassifier`
 * (still deriving evidence directly from `EvidenceObject[]`, per the frozen
 * execution architecture) is untouched and still never produces this type.
 *
 * Deliberately separate from `FinancialEvidenceClassifier` — this milestone
 * does not modify that class's signature or behaviour, consistent with the
 * "no further structural work on the pipeline" freeze. Evidence-chain
 * resolution itself now delegates to the shared `EvidenceChainResolver`
 * (`internal/capability-support/`) — a behaviour-preserving refactor, not a
 * new capability; see that module's doc comment for the extraction history.
 */
export function generateLiquidityEvidence(
  documentId: string,
  observations: readonly FinancialObservation[],
  ratios: readonly FinancialRatio[],
  metrics: readonly FinancialMetric[],
  financialObjects: FinancialObjectSet,
): readonly FinancialEvidence[] {
  const liquidityObservations = observations.filter((o) => o.category === "liquidity");
  if (liquidityObservations.length === 0) return [];

  const evidenceObjectIds = evidenceChainResolver.resolveMany(liquidityObservations, ratios, metrics, [
    ...financialObjects.assets,
    ...financialObjects.liabilities,
  ]);
  if (evidenceObjectIds.length === 0) return [];

  const averageConfidence =
    liquidityObservations.reduce((sum, o) => sum + o.confidence.value, 0) / liquidityObservations.length;

  return [
    {
      id: deriveCompositeId([
        "financial-evidence",
        "working_capital_pressure",
        documentId,
        ...liquidityObservations.map((o) => o.id),
      ]).slice(0, 16),
      type: "working_capital_pressure",
      evidenceObjectIds,
      documentId,
      confidence: Confidence.create(averageConfidence),
      basis: `${liquidityObservations.length} liquidity Observation(s) indicating current-period Current Asset/Liability Balances are under pressure: ${liquidityObservations.map((o) => o.statement).join(" ")}`,
    },
  ];
}
