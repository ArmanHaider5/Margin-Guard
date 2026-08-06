import type { Confidence } from "../shared/index.js";
import type {
  DocumentClassification,
  DocumentLayout,
  DocumentSection,
  DetectedTable,
  ExtractedEntity,
  NormalizedTermMapping,
  DocumentQuality,
  DocumentConfidence,
  ParserDiagnostic,
} from "../shared/index.js";

/**
 * Every public service method returns its result wrapped this way, so diagnostics
 * (warnings/errors/recovery actions — never logs, never trace entries) are
 * collected consistently across all 13 services and aggregated by
 * StructuredDocumentBuilder into `StructuredDocument.diagnostics`.
 */
export interface WithDiagnostics<T> {
  readonly value: T;
  readonly diagnostics: readonly ParserDiagnostic[];
}

/**
 * INTERNAL TYPES ONLY. Nothing in this file is exported from `document-parser/index.ts`
 * or referenced anywhere outside `document-parser/`. Per ADR-009, the module's public
 * output contract is `StructuredDocument` (`../shared/contracts/structured-document.ts`)
 * — everything below exists purely to get there.
 */

/** The format detected for an uploaded file. Deliberately never exposed outside this
 * module — a downstream consumer caring about this value would violate the entire
 * purpose of `DocumentModel`/`StructuredDocument` (format independence). */
export type FileType = "xlsx" | "csv" | "docx" | "pdf" | "image" | "unknown";

/**
 * The first lifecycle checkpoint: raw bytes plus a detected file type and content
 * hash. Nothing about the content has been interpreted yet.
 */
export interface UploadedFile {
  readonly fileName: string;
  readonly fileType: FileType;
  readonly content: Buffer;
  readonly fileSizeBytes: number;
  readonly contentHash: string;
  readonly receivedAt: string;
  readonly detectionConfidence: Confidence;
}

/**
 * Format-specific raw content, as extracted by whichever extractor
 * `raw-content-extractor.ts`'s registry dispatched to (a future milestone). This is
 * the one type in the module most tied to source format — exactly why it must never
 * leak past `DocumentModel`/`StructuredDocument`.
 */
export type RawContent =
  | { readonly kind: "spreadsheet"; readonly sheets: ReadonlyArray<{ readonly name: string; readonly rows: readonly unknown[][] }> }
  | { readonly kind: "html"; readonly html: string; readonly text: string }
  | { readonly kind: "pdf-text"; readonly text: string; readonly pages: readonly string[] }
  | { readonly kind: "delimited"; readonly rows: readonly (readonly string[])[] }
  | { readonly kind: "unknown"; readonly text?: string };

/**
 * The second lifecycle checkpoint: `UploadedFile` plus extracted raw content and
 * business document-type/layout classification — "we know what this is and roughly
 * how it's structured," but not yet decomposed into sections/tables/entities.
 */
export interface RecognizedDocument {
  readonly uploadedFile: UploadedFile;
  readonly raw: RawContent;
  readonly classification: DocumentClassification;
  readonly layout: DocumentLayout;
}

/**
 * The universal, format-agnostic internal representation assembled once section,
 * table, entity, terminology, quality, and confidence processing have all completed.
 * Per ADR-009, `DocumentModel` is where the module's own internal code manipulates
 * "the document's understood content" without needing to think about output
 * versioning — it is NEVER exported from `document-parser/index.ts`, NEVER placed in
 * `shared/contracts/`, and NEVER consumed by any other module. `document-composer.ts`
 * (a future milestone) wraps this, plus a stamped `documentId`/`schemaVersion`/
 * `ProcessingTrace`, into the public `StructuredDocument`.
 */
export interface DocumentModel {
  readonly sourceFileName: string;
  readonly classification: DocumentClassification;
  readonly layout: DocumentLayout;
  readonly sections: readonly DocumentSection[];
  readonly tables: readonly DetectedTable[];
  readonly entities: readonly ExtractedEntity[];
  readonly normalizedTerms: readonly NormalizedTermMapping[];
  readonly rawText?: string;
  readonly qualityAssessment: DocumentQuality;
  readonly confidence: DocumentConfidence;
}
