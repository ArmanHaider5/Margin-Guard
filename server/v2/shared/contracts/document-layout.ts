import type { Confidence } from "../value-objects/index.js";

/**
 * The overall structural shape of a document, independent of its original file
 * format. `single_table` and `multi_block` describe spreadsheet-like structure;
 * `narrative` and `form_like` describe prose/document-like structure; `mixed`
 * covers documents genuinely combining both; `unknown` is a valid, honest outcome
 * when structure cannot be determined with adequate confidence.
 */
export type LayoutType =
  | "single_table"
  | "multi_block"
  | "narrative"
  | "form_like"
  | "mixed"
  | "unknown";

/** The outcome of layout detection — part of the public `StructuredDocument` contract. */
export interface DocumentLayout {
  readonly layoutType: LayoutType;
  readonly confidence: Confidence;
}
