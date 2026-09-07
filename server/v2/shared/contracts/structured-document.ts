import type { DocumentClassification } from "./document-classification.js";
import type { DocumentLayout } from "./document-layout.js";
import type { DocumentSection } from "./document-section.js";
import type { DetectedTable } from "./detected-table.js";
import type { ExtractedEntity } from "./extracted-entity.js";
import type { NormalizedTermMapping } from "./normalized-term-mapping.js";
import type { DocumentQuality } from "./document-quality.js";
import type { DocumentConfidence } from "./document-confidence.js";
import type { ProcessingTrace } from "./processing-trace.js";
import type { ParserDiagnostic } from "./parser-diagnostic.js";

/**
 * The single canonical, versioned output of the Document Parser
 * (`docs/MGD_V2_BLUEPRINT.md` §4's "Document Parser" engine) — per ADR-009, this is
 * the ONLY shape any other module may consume. It never references `DocumentModel`
 * (document-parser's internal working representation) or any format-specific type;
 * every field here is meaningful regardless of whether the source was Excel, PDF,
 * Word, CSV, OCR, an API, SAP, or a database.
 */
export interface StructuredDocument {
  readonly schemaVersion: string;
  readonly documentId: string;
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
  readonly trace: ProcessingTrace;
  /** Explainability objects collected from every stage — never logs, never trace
   * entries. See `parser-diagnostic.ts`. */
  readonly diagnostics: readonly ParserDiagnostic[];
}
