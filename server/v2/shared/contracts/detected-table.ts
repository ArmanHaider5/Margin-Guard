import type { Confidence } from "../value-objects/index.js";

/**
 * A table detected within a document, decomposed into headers and rows regardless
 * of whether the source was a spreadsheet, a PDF's whitespace-aligned pseudo-table,
 * or an HTML `<table>` extracted from a Word document.
 */
export interface DetectedTable {
  readonly id: string;
  readonly sectionId?: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly confidence: Confidence;
}
