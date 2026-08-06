import type { ProcessingTrace, ParserDiagnostic, StructuredDocument } from "../../shared/index.js";
import type { DocumentModel } from "../types.js";

/** Bumped only on breaking changes to StructuredDocument's shape — independent of
 * any individual service's own version. */
export const STRUCTURED_DOCUMENT_SCHEMA_VERSION = "1.0.0";

export interface StructuredDocumentBuilderService {
  build(
    model: DocumentModel,
    documentId: string,
    trace: ProcessingTrace,
    diagnostics: readonly ParserDiagnostic[],
  ): StructuredDocument;
}

/**
 * Wraps a DocumentModel plus a stamped documentId/schemaVersion/trace/diagnostics
 * into the public StructuredDocument contract — the Document Parser's only output
 * (ADR-009). Pure assembly; DocumentModel itself is never referenced by, or visible
 * to, anything outside `document-parser/`.
 */
export class StructuredDocumentBuilder implements StructuredDocumentBuilderService {
  build(
    model: DocumentModel,
    documentId: string,
    trace: ProcessingTrace,
    diagnostics: readonly ParserDiagnostic[],
  ): StructuredDocument {
    return {
      schemaVersion: STRUCTURED_DOCUMENT_SCHEMA_VERSION,
      documentId,
      sourceFileName: model.sourceFileName,
      classification: model.classification,
      layout: model.layout,
      sections: model.sections,
      tables: model.tables,
      entities: model.entities,
      normalizedTerms: model.normalizedTerms,
      rawText: model.rawText,
      qualityAssessment: model.qualityAssessment,
      confidence: model.confidence,
      trace,
      diagnostics,
    };
  }
}
