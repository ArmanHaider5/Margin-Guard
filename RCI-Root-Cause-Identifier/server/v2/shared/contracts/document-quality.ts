import type { Confidence, Percentage } from "../value-objects/index.js";
import type { SourceLocation } from "./source-location.js";

export type QualityIssueSeverity = "low" | "medium" | "high";

/** A specific, named problem observed during processing — never silently absorbed
 * into a lower score with no explanation. */
export interface QualityIssue {
  readonly type: string;
  readonly description: string;
  readonly severity: QualityIssueSeverity;
  readonly location?: SourceLocation;
}

/**
 * An assessment of the document's intrinsic quality — independent of, and computed
 * prior to, Confidence Scoring (see `document-parser/stages/document-quality.ts`,
 * a future milestone). Distinct from Confidence because Quality measures properties
 * of the input/extraction itself, not the platform's trust in a specific conclusion.
 *
 * `businessCompleteness` is the one dimension that requires business-type awareness:
 * a Profit & Loss document with no recognizable Revenue section has low business
 * completeness even if extraction and structural recognition both succeeded
 * perfectly — this is what distinguishes it from the other four, purely mechanical
 * dimensions.
 */
export interface DocumentQuality {
  readonly extractionCompleteness: Confidence;
  readonly structuralRegularity: Confidence;
  readonly contentLegibility: Confidence;
  readonly businessCompleteness: Confidence;
  readonly unclassifiedContentRatio: Percentage;
  readonly issues: readonly QualityIssue[];
}
