import type {
  DocumentClassification,
  DocumentLayout,
  DocumentSection,
  DetectedTable,
  ExtractedEntity,
  NormalizedTermMapping,
  DocumentQuality,
  DocumentConfidence,
} from "../../shared/index.js";
import type { DocumentModel } from "../types.js";

export interface DocumentModelBuilderInputs {
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

export interface DocumentModelBuilderService {
  build(inputs: DocumentModelBuilderInputs): DocumentModel;
}

/**
 * Assembles the universal, format-agnostic internal DocumentModel from every
 * upstream service's output. Pure assembly, no computation of its own — per
 * ADR-009, this is the module's internal working representation, never exposed;
 * `StructuredDocumentBuilder` is what wraps this into the public contract.
 */
export class DocumentModelBuilder implements DocumentModelBuilderService {
  build(inputs: DocumentModelBuilderInputs): DocumentModel {
    return {
      sourceFileName: inputs.sourceFileName,
      classification: inputs.classification,
      layout: inputs.layout,
      sections: inputs.sections,
      tables: inputs.tables,
      entities: inputs.entities,
      normalizedTerms: inputs.normalizedTerms,
      rawText: inputs.rawText,
      qualityAssessment: inputs.qualityAssessment,
      confidence: inputs.confidence,
    };
  }
}
