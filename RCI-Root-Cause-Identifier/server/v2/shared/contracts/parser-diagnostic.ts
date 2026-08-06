import type { SourceLocation } from "./source-location.js";

/**
 * The three categories a diagnostic represents: a `warning` (something worth
 * flagging but processing continued normally), an `error` (a stage could not do
 * what it was asked, though the pipeline itself did not necessarily halt), or a
 * `recovery` (an automatic recovery action was taken — recorded so the reader knows
 * the output was adjusted, and how).
 */
export type ParserDiagnosticSeverity = "warning" | "error" | "recovery";

/** The category of component that raised a diagnostic — distinct from `stage`
 * (the specific service's name, e.g. "FileTypeDetector"): `origin` groups many
 * possible stage names under one of six architectural roles, so a consumer can
 * filter/aggregate diagnostics by kind of component without needing to know every
 * concrete stage name in advance. */
export type ParserDiagnosticOrigin = "Parser" | "Classifier" | "Normalizer" | "Ontology" | "Validator" | "Builder";

/**
 * An explainability object attached to a StructuredDocument — NOT a log line and
 * NOT a ProcessingTrace entry. A trace records *that* a stage ran and how long it
 * took; a diagnostic records a *substantive* issue a reader of the document's
 * content needs to know about to trust or understand the output (e.g. "expected a
 * Revenue section, found none," "table boundary was ambiguous, resolved by
 * heuristic," "OCR confidence was low for this region"). Every field except
 * `sourceLocation` is mandatory — a diagnostic with no recommendation or no stated
 * confidence impact is not considered complete under this platform's explainability
 * standard.
 */
export interface ParserDiagnostic {
  readonly id: string;
  readonly stage: string;
  readonly origin: ParserDiagnosticOrigin;
  readonly severity: ParserDiagnosticSeverity;
  readonly message: string;
  readonly recommendation: string;
  readonly recoverable: boolean;
  /** Signed adjustment applied to the relevant confidence dimension because of this
   * diagnostic (e.g. -0.15). Not itself a Confidence value — a delta, which may be
   * negative, zero (informational only), or in rare cases positive (a recovery that
   * increased trust, e.g. successful cross-document corroboration). */
  readonly confidenceImpact: number;
  readonly sourceLocation?: SourceLocation;
}
