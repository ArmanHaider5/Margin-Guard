import { Confidence } from "../../shared/index.js";
import type { DocumentConfidence, DocumentQuality } from "../../shared/index.js";
import type { WithDiagnostics } from "../types.js";

function average(values: readonly Confidence[], fallback = 0.5): number {
  if (values.length === 0) return fallback;
  return values.reduce((sum, v) => sum + v.value, 0) / values.length;
}

function weighted(pairs: ReadonlyArray<[number, number]>): number {
  const totalWeight = pairs.reduce((sum, [, weight]) => sum + weight, 0);
  const totalScore = pairs.reduce((sum, [score, weight]) => sum + score * weight, 0);
  return totalWeight === 0 ? 0 : totalScore / totalWeight;
}

export interface ConfidenceEvaluatorInputs {
  readonly fileTypeConfidence: Confidence;
  readonly extractionSucceeded: boolean;
  readonly classificationConfidence: Confidence;
  readonly layoutConfidence: Confidence;
  readonly sectionConfidences: readonly Confidence[];
  readonly tableConfidences: readonly Confidence[];
  readonly entityConfidences: readonly Confidence[];
  readonly normalizedTermConfidences: readonly Confidence[];
  readonly quality: DocumentQuality;
}

export interface ConfidenceEvaluatorService {
  evaluate(inputs: ConfidenceEvaluatorInputs): WithDiagnostics<DocumentConfidence>;
}

/**
 * Aggregates every upstream service's own confidence into the four documented
 * dimensions. Each stage computes its own raw confidence independently
 * (co-located with that stage) — this evaluator's only job is aggregation, per a
 * fixed, reproducible weighting scheme:
 *
 * - extraction  = 0.3·fileType + 0.3·extractionSucceeded + 0.2·quality.extractionCompleteness + 0.2·quality.contentLegibility
 * - recognition = 0.35·classification + 0.15·layout + 0.15·avg(sections) + 0.15·avg(tables) + 0.2·quality.structuralRegularity
 * - evidence    = 0.5·avg(entities) + 0.2·avg(normalizedTerms) + 0.3·(1 − unclassifiedContentRatio)
 * - overall     = 0.3·extraction + 0.4·recognition + 0.3·evidence
 *
 * Given identical inputs, this always produces identical output — the platform's
 * Determinism requirement applied to confidence scoring specifically.
 */
export class ConfidenceEvaluator implements ConfidenceEvaluatorService {
  evaluate(inputs: ConfidenceEvaluatorInputs): WithDiagnostics<DocumentConfidence> {
    const extractionScore = weighted([
      [inputs.fileTypeConfidence.value, 0.3],
      [inputs.extractionSucceeded ? 1 : 0, 0.3],
      [inputs.quality.extractionCompleteness.value, 0.2],
      [inputs.quality.contentLegibility.value, 0.2],
    ]);

    const recognitionScore = weighted([
      [inputs.classificationConfidence.value, 0.35],
      [inputs.layoutConfidence.value, 0.15],
      [average(inputs.sectionConfidences), 0.15],
      [average(inputs.tableConfidences), 0.15],
      [inputs.quality.structuralRegularity.value, 0.2],
    ]);

    const evidenceScore = weighted([
      [average(inputs.entityConfidences, 0.3), 0.5],
      [average(inputs.normalizedTermConfidences, 0.3), 0.2],
      [1 - inputs.quality.unclassifiedContentRatio.fraction, 0.3],
    ]);

    const overallScore = weighted([
      [extractionScore, 0.3],
      [recognitionScore, 0.4],
      [evidenceScore, 0.3],
    ]);

    const extraction = Confidence.create(clamp(extractionScore));
    const recognition = Confidence.create(clamp(recognitionScore));
    const evidence = Confidence.create(clamp(evidenceScore));
    const overall = Confidence.create(clamp(overallScore));

    return {
      value: {
        extraction,
        recognition,
        evidence,
        overall,
        byStage: {
          FileTypeDetector: inputs.fileTypeConfidence,
          DocumentClassifier: inputs.classificationConfidence,
          LayoutAnalyzer: inputs.layoutConfidence,
        },
      },
      diagnostics: [],
    };
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
