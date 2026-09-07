/**
 * `financial-intelligence/`'s single public entry point (see `server/v2/README.md`,
 * ADR-005, ADR-009's pattern applied to this module).
 *
 * Public API surface, deliberately narrow — mirroring `document-parser/index.ts`:
 * `analyzeFinancialSignals()` plus the `FinancialMetric`/`FinancialRatio`/
 * `FinancialObservation`/`FinancialEvidence`/`FinancialSignal` types the
 * pipeline produces.
 * `FinancialEvidenceClassifier`, `FinancialSignalGenerator`,
 * `FinancialMetricRegistry`, `FinancialRatioRegistry`,
 * `FinancialObservationRegistry`, `MetricCalculator`, `RatioCalculator`,
 * `ObservationCalculator`, `FinancialCalculationPipeline`,
 * `DefaultFinancialCalculationPipeline` (`pipeline/`), and every type in
 * `models/financial-object-model.ts` are internal — the Financial Object
 * Model in particular is this module's own analogue to `document-parser/`'s
 * internal `DocumentModel`, and is never exported here.
 *
 * Consumes ONLY `StructuredDocument` and `EvidenceObject` — `document-parser/`'s
 * public output — never any parser-internal type.
 *
 * TARGET pipeline (per the architecture this module is being built toward):
 *
 *   StructuredDocument → EvidenceObject[] → Financial Objects (internal) →
 *   Financial Metrics → Financial Ratios → Financial Observations →
 *   Financial Evidence → Financial Signals.
 *
 * CURRENT implementation status, stated honestly: `FinancialMetric`,
 * `FinancialRatio`, and `FinancialObservation` are complete as models,
 * registries, and calculation *interfaces*. `pipeline/` additionally provides
 * a real, deterministic **execution architecture** — `MetricCalculationStage`
 * → `RatioCalculationStage` → `ObservationCalculationStage`, run in that
 * fixed order by `DefaultFinancialCalculationPipeline` — but this
 * orchestration has nothing to orchestrate yet: no `MetricCalculator`/
 * `RatioCalculator`/`ObservationCalculator` implementation exists (no
 * formulas, no comparison logic), so a `DefaultFinancialCalculationPipeline`
 * constructed today always runs with zero registered calculators and
 * legitimately returns empty results. No Financial Metric, Financial Ratio,
 * or Financial Observation is ever actually computed today.
 * `analyzeFinancialSignals()` below therefore still derives `FinancialEvidence`
 * directly from `EvidenceObject[]`, exactly as it did before these
 * milestones — it has NOT been rewired through the new Metric/Ratio/
 * Observation layer, and the calculation pipeline is not called from
 * anywhere. A future sprint will make Financial Observations the mandatory
 * input to Financial Evidence, per the target pipeline above; until then,
 * `FinancialEvidenceClassifier`'s direct-from-evidence detection remains the
 * only real path.
 */
import type {
  StructuredDocument,
  EvidenceObject,
  FinancialEvidence,
  FinancialSignal,
} from "../shared/index.js";
import { FinancialEvidenceClassifier } from "./evidence/financial-evidence-classifier.js";
import { FinancialSignalGenerator } from "./signals/financial-signal-generator.js";

export type {
  FinancialEvidence,
  FinancialEvidenceType,
  FinancialSignal,
  FinancialSignalType,
  FinancialMetric,
  FinancialMetricUnit,
  FinancialRatio,
  FinancialRatioCategory,
  FinancialObservation,
  FinancialObservationCategory,
} from "../shared/index.js";

export interface AnalyzeFinancialSignalsResult {
  readonly financialEvidence: readonly FinancialEvidence[];
  readonly financialSignals: readonly FinancialSignal[];
}

/**
 * The Financial Intelligence module's WORKING pipeline as of this milestone
 * (see the module doc comment above for how this differs from the target
 * architecture):
 *
 * StructuredDocument + EvidenceObject[] → FinancialEvidence[] → FinancialSignal[].
 *
 * Stops there — no Findings, no Root Causes, no Recommendations, no Reports, no
 * Correlation. Those belong to `brain/` and `correlation/` in future sprints,
 * consuming this module's output the same way this module consumes
 * `document-parser/`'s.
 */
export function analyzeFinancialSignals(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): AnalyzeFinancialSignalsResult {
  const classifier = new FinancialEvidenceClassifier();
  const generator = new FinancialSignalGenerator();

  const financialEvidence = classifier.classify(document, evidence);
  const financialSignals = generator.generate(document.documentId, financialEvidence);

  return { financialEvidence, financialSignals };
}
