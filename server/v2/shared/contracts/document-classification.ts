import type { Confidence } from "../value-objects/index.js";

/** A single candidate classification and its score, prior to a winner being chosen. */
export interface DocumentTypeCandidate {
  readonly documentType: string;
  readonly score: number;
}

/**
 * The outcome of business document-type classification (e.g. "balance_sheet",
 * "invoice", "generic_spreadsheet") — a format-agnostic result. This is part of the
 * public `StructuredDocument` contract: consumers need to know WHAT a document was
 * classified as, without needing to know HOW that classification was computed (the
 * rule registry and matching logic stay internal to `document-parser/`, per ADR-009's
 * same reasoning applied to classification specifically).
 */
export interface DocumentClassification {
  readonly documentType: string;
  readonly confidence: Confidence;
  readonly candidates: readonly DocumentTypeCandidate[];
}
