/**
 * `document-parser/`'s single public entry point (see `server/v2/README.md`,
 * ADR-005, ADR-009).
 *
 * Public API surface, deliberately narrow: `parseDocument()` and the
 * `StructuredDocument`/`EvidenceObject` types it produces. The thirteen individual
 * services (`FileTypeDetector`, `RawContentExtractor`, ...) each expose their own
 * TypeScript interface — satisfying "every component exposes a public interface"
 * at the component level — but are NOT re-exported here, because several of them
 * operate on `document-parser/`'s internal types (`UploadedFile`, `RawContent`,
 * `DocumentModel`), and re-exporting them would leak exactly the format-specific,
 * parser-internal detail ADR-009 exists to keep behind this module's boundary.
 * `document-parser/`'s own test suite reaches into `services/*.ts` directly by file
 * path, which is normal for a module's own internal tests — the "public API only
 * via index.ts" rule governs OTHER modules and external consumers, not this one's
 * own test code.
 */
import type { StructuredDocument, EvidenceObject, ProcessingStageTrace } from "../shared/index.js";
import type { UploadedFile, RawContent } from "./types.js";

import { FileTypeDetector } from "./services/file-type-detector.js";
import { RawContentExtractor } from "./services/raw-content-extractor.js";
import { DocumentClassifier } from "./services/document-classifier.js";
import { LayoutAnalyzer } from "./services/layout-analyzer.js";
import { SectionDetector } from "./services/section-detector.js";
import { TableDetector } from "./services/table-detector.js";
import { EntityExtractor } from "./services/entity-extractor.js";
import { TerminologyNormalizer, type LabeledSource } from "./services/terminology-normalizer.js";
import { DocumentQualityEvaluator } from "./services/document-quality-evaluator.js";
import { ConfidenceEvaluator } from "./services/confidence-evaluator.js";
import { DocumentModelBuilder } from "./services/document-model-builder.js";
import { StructuredDocumentBuilder } from "./services/structured-document-builder.js";
import { EvidenceObjectBuilder } from "./services/evidence-object-builder.js";

import { ParserRegistry } from "./parsers/parser-registry.js";
import { XlsxParser } from "./parsers/xlsx-parser.js";
import { CsvParser } from "./parsers/csv-parser.js";
import { DocxParser } from "./parsers/docx-parser.js";
import { PdfParser } from "./parsers/pdf-parser.js";

import { createDefaultOntologyRegistry, type OntologyRegistry } from "../knowledge/index.js";
import { createDefaultDocumentTypeRuleRegistry, type DocumentTypeRuleRegistry } from "./rules/document-type-rules.js";

export type { StructuredDocument, EvidenceObject };

const PIPELINE_VERSION = "1.0.0";

export function buildDefaultParserRegistry(): ParserRegistry {
  const registry = new ParserRegistry();
  registry.register(new XlsxParser());
  registry.register(new CsvParser());
  registry.register(new DocxParser());
  registry.register(new PdfParser());
  return registry;
}

export interface ParseDocumentOptions {
  readonly clock?: () => Date;
  readonly parserRegistry?: ParserRegistry;
  readonly ontologyRegistry?: OntologyRegistry;
  readonly documentTypeRules?: DocumentTypeRuleRegistry;
}

export interface ParseDocumentResult {
  readonly document: StructuredDocument;
  readonly evidence: readonly EvidenceObject[];
}

function rawTextOf(raw: RawContent): string | undefined {
  switch (raw.kind) {
    case "html":
    case "pdf-text":
      return raw.text;
    case "unknown":
      return raw.text;
    default:
      return undefined;
  }
}

function fallbackTextOf(raw: RawContent): string | undefined {
  switch (raw.kind) {
    case "html":
    case "pdf-text":
    case "unknown":
      return raw.text;
    default:
      return undefined;
  }
}

/**
 * The Document Parser pipeline, composed from the thirteen independent services:
 *
 * File Type Detection → Raw Content Extraction → Document Classification →
 * Layout Analysis → (RecognizedDocument) → Section Detection → Table Detection →
 * Entity Extraction → Terminology Normalization → Document Quality Evaluation →
 * Confidence Evaluation → DocumentModel (internal) → StructuredDocument →
 * EvidenceObject Conversion.
 *
 * Stops there. No Signals, no Findings, no Root Causes, no Recommendations, no
 * Reports, no business intelligence of any kind (ADR-004, ADR-006).
 */
export async function parseDocument(
  fileName: string,
  content: Buffer,
  options: ParseDocumentOptions = {},
): Promise<ParseDocumentResult> {
  const clock = options.clock ?? (() => new Date());
  const parserRegistry = options.parserRegistry ?? buildDefaultParserRegistry();
  const ontologyRegistry = options.ontologyRegistry ?? createDefaultOntologyRegistry();
  const documentTypeRules = options.documentTypeRules ?? createDefaultDocumentTypeRuleRegistry();

  const startedAt = clock();
  const stageTraces: ProcessingStageTrace[] = [];
  const allDiagnostics = [];

  const record = (stage: string, version: string, stepStartedAt: Date) => {
    stageTraces.push({
      stage,
      version,
      startedAt: stepStartedAt.toISOString(),
      durationMs: clock().getTime() - stepStartedAt.getTime(),
    });
  };

  // 1. File Type Detection
  let stepStart = clock();
  const fileTypeDetector = new FileTypeDetector();
  const fileTypeResult = fileTypeDetector.detect(fileName, content, stepStart);
  const uploadedFile: UploadedFile = fileTypeResult.value;
  allDiagnostics.push(...fileTypeResult.diagnostics);
  record("FileTypeDetector", "1.0.0", stepStart);

  // 2. Raw Content Extraction
  stepStart = clock();
  const rawContentExtractor = new RawContentExtractor(parserRegistry);
  const rawResult = await rawContentExtractor.extract(uploadedFile);
  const raw: RawContent = rawResult.value;
  allDiagnostics.push(...rawResult.diagnostics);
  record("RawContentExtractor", "1.0.0", stepStart);

  // 3. Document Classification
  stepStart = clock();
  const documentClassifier = new DocumentClassifier(documentTypeRules);
  const classificationResult = documentClassifier.classify(raw);
  allDiagnostics.push(...classificationResult.diagnostics);
  record("DocumentClassifier", "1.0.0", stepStart);

  // 4. Layout Analysis
  stepStart = clock();
  const layoutAnalyzer = new LayoutAnalyzer();
  const layoutResult = layoutAnalyzer.analyze(raw);
  allDiagnostics.push(...layoutResult.diagnostics);
  record("LayoutAnalyzer", "1.0.0", stepStart);

  // --- RecognizedDocument checkpoint (internal; not held onto beyond this point —
  // uploadedFile, raw, classification, and layout are used directly below) ---

  // 5. Section Detection
  stepStart = clock();
  const sectionDetector = new SectionDetector();
  const sectionsResult = sectionDetector.detect(raw);
  allDiagnostics.push(...sectionsResult.diagnostics);
  record("SectionDetector", "1.0.0", stepStart);

  // 6. Table Detection
  stepStart = clock();
  const tableDetector = new TableDetector();
  const tablesResult = tableDetector.detect(raw, sectionsResult.value);
  allDiagnostics.push(...tablesResult.diagnostics);
  record("TableDetector", "1.0.0", stepStart);

  // 7. Entity Extraction
  stepStart = clock();
  const entityExtractor = new EntityExtractor();
  const entitiesResult = entityExtractor.extract(tablesResult.value, fallbackTextOf(raw));
  allDiagnostics.push(...entitiesResult.diagnostics);
  record("EntityExtractor", "1.0.0", stepStart);

  // 8. Terminology Normalization (Ontology Registry only)
  stepStart = clock();
  const terminologyNormalizer = new TerminologyNormalizer();
  const labels: LabeledSource[] = [
    ...tablesResult.value.flatMap((table) =>
      table.headers.map((header, columnIndex) => ({
        label: header,
        sourceLocation: { tableId: table.id, column: columnIndex },
      })),
    ),
    ...sectionsResult.value
      .filter((section) => section.label)
      .map((section) => ({ label: section.label as string, sourceLocation: section.sourceLocation })),
  ];
  const normalizedTermsResult = terminologyNormalizer.normalize(labels, ontologyRegistry);
  allDiagnostics.push(...normalizedTermsResult.diagnostics);
  record("TerminologyNormalizer", "1.0.0", stepStart);

  // 9. Document Quality Evaluation
  stepStart = clock();
  const documentQualityEvaluator = new DocumentQualityEvaluator();
  const qualityResult = documentQualityEvaluator.evaluate(
    raw,
    classificationResult.value.documentType,
    sectionsResult.value,
    tablesResult.value,
    normalizedTermsResult.value,
  );
  allDiagnostics.push(...qualityResult.diagnostics);
  record("DocumentQualityEvaluator", "1.0.0", stepStart);

  // 10. Confidence Evaluation
  stepStart = clock();
  const confidenceEvaluator = new ConfidenceEvaluator();
  const confidenceResult = confidenceEvaluator.evaluate({
    fileTypeConfidence: uploadedFile.detectionConfidence,
    extractionSucceeded: raw.kind !== "unknown",
    classificationConfidence: classificationResult.value.confidence,
    layoutConfidence: layoutResult.value.confidence,
    sectionConfidences: sectionsResult.value.map((s) => s.confidence),
    tableConfidences: tablesResult.value.map((t) => t.confidence),
    entityConfidences: entitiesResult.value.map((e) => e.confidence),
    normalizedTermConfidences: normalizedTermsResult.value.map((m) => m.confidence),
    quality: qualityResult.value,
  });
  allDiagnostics.push(...confidenceResult.diagnostics);
  record("ConfidenceEvaluator", "1.0.0", stepStart);

  // 11. DocumentModel (internal)
  stepStart = clock();
  const documentModelBuilder = new DocumentModelBuilder();
  const model = documentModelBuilder.build({
    sourceFileName: fileName,
    classification: classificationResult.value,
    layout: layoutResult.value,
    sections: sectionsResult.value,
    tables: tablesResult.value,
    entities: entitiesResult.value,
    normalizedTerms: normalizedTermsResult.value,
    rawText: rawTextOf(raw),
    qualityAssessment: qualityResult.value,
    confidence: confidenceResult.value,
  });
  record("DocumentModelBuilder", "1.0.0", stepStart);

  // 12. StructuredDocument (public output)
  stepStart = clock();
  const completedAt = clock();
  const structuredDocumentBuilder = new StructuredDocumentBuilder();
  const document = structuredDocumentBuilder.build(
    model,
    uploadedFile.contentHash,
    {
      pipelineVersion: PIPELINE_VERSION,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      stages: stageTraces,
    },
    allDiagnostics,
  );
  record("StructuredDocumentBuilder", "1.0.0", stepStart);

  // 13. EvidenceObject Conversion — STOP. No Signals, Findings, Root Causes,
  // Recommendations, Reports, or business intelligence beyond this point.
  const evidenceObjectBuilder = new EvidenceObjectBuilder();
  const evidence = evidenceObjectBuilder.build(document, clock());

  return { document, evidence };
}
