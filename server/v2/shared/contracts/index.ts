/**
 * Public entry point for cross-module contracts (interfaces only — no implementation,
 * no classes, no logic; see `server/v2/README.md`'s "Shared Contracts" rule).
 *
 * A type belongs here precisely when more than one top-level module needs to consume
 * it without depending on the module that produces it. `StructuredDocument` and
 * `EvidenceObject` are the two most important entries — the Document Parser's entire
 * public output surface (ADR-009) — along with every type reachable from them.
 * `DocumentModel` (document-parser's internal working representation) is
 * deliberately NOT here; see ADR-009.
 */
export type { SourceLocation } from "./source-location.js";
export type { DocumentClassification, DocumentTypeCandidate } from "./document-classification.js";
export type { DocumentLayout, LayoutType } from "./document-layout.js";
export type { DocumentSection, DocumentSectionKind } from "./document-section.js";
export type { DetectedTable } from "./detected-table.js";
export type { ExtractedEntity, EntityType } from "./extracted-entity.js";
export type { NormalizedTermMapping } from "./normalized-term-mapping.js";
export type { DocumentQuality, QualityIssue, QualityIssueSeverity } from "./document-quality.js";
export type { DocumentConfidence } from "./document-confidence.js";
export type { ProcessingTrace, ProcessingStageTrace } from "./processing-trace.js";
export type { StructuredDocument } from "./structured-document.js";
export type { EvidenceObject } from "./evidence-object.js";
export type { ParserCapabilityDeclaration } from "./capability.js";
export type { OntologyTerm } from "./ontology-term.js";
export type { ParserManifest } from "./parser-manifest.js";
export type { ParserDiagnostic, ParserDiagnosticSeverity, ParserDiagnosticOrigin } from "./parser-diagnostic.js";
export type { FinancialEvidence, FinancialEvidenceType } from "./financial-evidence.js";
export type { FinancialSignal, FinancialSignalType } from "./financial-signal.js";
export type { FinancialMetric, FinancialMetricUnit } from "./financial-metric.js";
export type { FinancialRatio, FinancialRatioCategory } from "./financial-ratio.js";
export type { FinancialObservation, FinancialObservationCategory } from "./financial-observation.js";
