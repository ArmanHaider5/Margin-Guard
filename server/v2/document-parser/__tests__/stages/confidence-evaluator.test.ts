import { describe, it, expect } from "vitest";
import { ConfidenceEvaluator } from "../../services/confidence-evaluator.js";
import { Confidence, Percentage } from "../../../shared/index.js";
import type { DocumentQuality } from "../../../shared/index.js";

const evaluator = new ConfidenceEvaluator();

function quality(overrides: Partial<DocumentQuality> = {}): DocumentQuality {
  return {
    extractionCompleteness: Confidence.create(0.9),
    structuralRegularity: Confidence.create(0.9),
    contentLegibility: Confidence.create(0.9),
    businessCompleteness: Confidence.create(0.75),
    unclassifiedContentRatio: Percentage.fromFraction(0.1),
    issues: [],
    ...overrides,
  };
}

describe("ConfidenceEvaluator — documented, reproducible aggregation", () => {
  it("matches the documented formula for a known set of inputs", () => {
    const { value } = evaluator.evaluate({
      fileTypeConfidence: Confidence.create(1),
      extractionSucceeded: true,
      classificationConfidence: Confidence.create(0.8),
      layoutConfidence: Confidence.create(0.8),
      sectionConfidences: [Confidence.create(0.8)],
      tableConfidences: [Confidence.create(0.8)],
      entityConfidences: [Confidence.create(0.8)],
      normalizedTermConfidences: [Confidence.create(0.8)],
      quality: quality(),
    });

    // extraction  = 0.3*1 + 0.3*1 + 0.2*0.9 + 0.2*0.9 = 0.96
    expect(value.extraction.value).toBeCloseTo(0.96, 5);
    // recognition = 0.35*0.8 + 0.15*0.8 + 0.15*0.8 + 0.15*0.8 + 0.2*0.9 = 0.82
    expect(value.recognition.value).toBeCloseTo(0.82, 5);
    // evidence    = 0.5*0.8 + 0.2*0.8 + 0.3*(1-0.1) = 0.4 + 0.16 + 0.27 = 0.83
    expect(value.evidence.value).toBeCloseTo(0.83, 5);
    // overall     = 0.3*extraction + 0.4*recognition + 0.3*evidence
    const expectedOverall = 0.3 * 0.96 + 0.4 * 0.82 + 0.3 * 0.83;
    expect(value.overall.value).toBeCloseTo(expectedOverall, 5);
  });

  it("is a pure function: identical inputs always produce identical output", () => {
    const inputs = {
      fileTypeConfidence: Confidence.create(0.7),
      extractionSucceeded: true,
      classificationConfidence: Confidence.create(0.6),
      layoutConfidence: Confidence.create(0.6),
      sectionConfidences: [],
      tableConfidences: [],
      entityConfidences: [],
      normalizedTermConfidences: [],
      quality: quality(),
    };
    const first = evaluator.evaluate(inputs).value;
    const second = evaluator.evaluate(inputs).value;
    expect(first.overall.value).toBe(second.overall.value);
    expect(first.extraction.value).toBe(second.extraction.value);
  });

  it("edge case: empty confidence arrays fall back to a documented neutral default, never NaN", () => {
    const { value } = evaluator.evaluate({
      fileTypeConfidence: Confidence.create(0.5),
      extractionSucceeded: false,
      classificationConfidence: Confidence.create(0.5),
      layoutConfidence: Confidence.create(0.5),
      sectionConfidences: [],
      tableConfidences: [],
      entityConfidences: [],
      normalizedTermConfidences: [],
      quality: quality(),
    });
    expect(Number.isNaN(value.overall.value)).toBe(false);
    expect(value.overall.value).toBeGreaterThanOrEqual(0);
    expect(value.overall.value).toBeLessThanOrEqual(1);
  });

  it("output is always clamped to [0, 1]", () => {
    const { value } = evaluator.evaluate({
      fileTypeConfidence: Confidence.create(1),
      extractionSucceeded: true,
      classificationConfidence: Confidence.create(1),
      layoutConfidence: Confidence.create(1),
      sectionConfidences: [Confidence.create(1)],
      tableConfidences: [Confidence.create(1)],
      entityConfidences: [Confidence.create(1)],
      normalizedTermConfidences: [Confidence.create(1)],
      quality: quality({
        extractionCompleteness: Confidence.create(1),
        structuralRegularity: Confidence.create(1),
        contentLegibility: Confidence.create(1),
        unclassifiedContentRatio: Percentage.fromFraction(0),
      }),
    });
    expect(value.overall.value).toBeLessThanOrEqual(1);
    expect(value.extraction.value).toBeLessThanOrEqual(1);
  });
});
