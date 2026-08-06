import type { Confidence } from "../value-objects/index.js";

/**
 * The four confidence dimensions every StructuredDocument carries:
 *
 * - `extraction`  — trust in the byte-to-content extraction itself (file type
 *   detection, raw content extraction), weighted with DocumentQuality's
 *   `extractionCompleteness`/`contentLegibility`.
 * - `recognition` — trust in structural/business recognition (classification,
 *   layout, section, table detection), weighted with DocumentQuality's
 *   `structuralRegularity`.
 * - `evidence`    — trust in the individual extracted facts (entities, normalized
 *   terms), weighted inversely by DocumentQuality's `unclassifiedContentRatio`.
 * - `overall`     — a documented, reproducible aggregation of the three above.
 *
 * `byStage` retains the raw, per-pipeline-stage confidence values for fine-grained
 * trace/debugging — the three named dimensions above are themselves aggregations
 * over a subset of `byStage`'s entries, not independently computed from scratch.
 */
export interface DocumentConfidence {
  readonly extraction: Confidence;
  readonly recognition: Confidence;
  readonly evidence: Confidence;
  readonly overall: Confidence;
  readonly byStage: Readonly<Record<string, Confidence>>;
}
