import type { Confidence } from "../value-objects/index.js";
import type { SourceLocation } from "./source-location.js";

/** What kind of structural region a detected DocumentSection represents. */
export type DocumentSectionKind = "header" | "body" | "block" | "footer" | "notes" | "unknown";

/**
 * A logical, named region within a document — a repeating spreadsheet block, a
 * narrative document's headed section, a form's labeled field group. Format-agnostic:
 * the same shape describes a section whether it was detected in a spreadsheet or a
 * Word document.
 */
export interface DocumentSection {
  readonly id: string;
  readonly label?: string;
  readonly kind: DocumentSectionKind;
  readonly sourceLocation: SourceLocation;
  readonly confidence: Confidence;
}
