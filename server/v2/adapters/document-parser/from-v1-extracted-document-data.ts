import type { ExtractedDocumentData } from "../../../../shared/schema.js";
import {
  Confidence,
  Percentage,
  deriveCompositeId,
} from "../../shared/index.js";
import type {
  StructuredDocument,
  EvidenceObject,
  DetectedTable,
  ExtractedEntity,
  ParserDiagnostic,
} from "../../shared/index.js";

/**
 * V1 → V2 compatibility adapter. Per ADR-008: `server/v2/adapters/` is the ONLY
 * permitted boundary between V1 and V2. This file imports exactly one thing from
 * V1 — the `ExtractedDocumentData` TYPE — via `import type`, which TypeScript
 * erases entirely at compile time. There is no runtime import, no function call,
 * and no value ever crosses from V1 into this file; it only needs to know the
 * shape of the data a caller hands it. Nothing under `server/v2/` other than this
 * adapter references any V1 type, and no V1 file imports from here.
 *
 * Purpose: let V2 modules (e.g. `financial-intelligence/`) analyze documents that
 * were already parsed and stored by V1's own pipeline (`server/documents/document-parser.ts`,
 * `client_documents.extracted_data`), without re-running extraction on the
 * original file bytes — those bytes are frequently unavailable to a V2-only
 * caller (e.g. a backfill job operating purely against the database). This is
 * NOT the same as running V1 data through the real Document Parser pipeline —
 * every output of this adapter is explicitly, permanently marked as
 * adapter-derived (see `ADAPTER_PIPELINE_VERSION` and the mandatory diagnostic
 * below), and every confidence/quality value is a fixed, documented placeholder,
 * never a computed assessment.
 */

export const ADAPTER_SCHEMA_VERSION = "1.0.0";
export const ADAPTER_PIPELINE_VERSION = "v1-compat-adapter-1.0.0";

/** Fixed, documented placeholder confidence for every field V1 never assessed —
 * deliberately moderate-low, never claiming certainty the source data doesn't
 * support. */
const LEGACY_IMPORT_CONFIDENCE = 0.4;
const LEGACY_ENTITY_CONFIDENCE = 0.4;
const LEGACY_TABLE_CONFIDENCE = 0.5;

const CURRENCY_SYMBOLS: ReadonlyArray<{ pattern: RegExp; code: string }> = [
  { pattern: /RM/i, code: "MYR" },
  { pattern: /\$/, code: "USD" },
  { pattern: /€/, code: "EUR" },
  { pattern: /£/, code: "GBP" },
];

function deriveCurrencyNormalizedValue(observedValue: number, context: string): string | undefined {
  const currency = CURRENCY_SYMBOLS.find(({ pattern }) => pattern.test(context));
  return currency ? `${observedValue} ${currency.code}` : undefined;
}

export interface FromV1Context {
  readonly documentId: string;
  readonly sourceFileName: string;
  /** Injectable, for reproducible tests — never `Date.now()` called directly. */
  readonly convertedAt?: Date;
}

export interface FromV1Result {
  readonly document: StructuredDocument;
  readonly evidence: readonly EvidenceObject[];
}

function buildTables(v1Data: ExtractedDocumentData): DetectedTable[] {
  const tables: DetectedTable[] = [];

  if (v1Data.tables && v1Data.tables.length > 0) {
    v1Data.tables.forEach((table, index) => {
      tables.push({
        id: deriveCompositeId(["v1-table", index, table.name]).slice(0, 16),
        headers: table.headers,
        rows: table.rows,
        confidence: Confidence.create(LEGACY_TABLE_CONFIDENCE),
      });
    });
    return tables;
  }

  // Only fall back to `sheets` when `tables` is absent — V1's own parser
  // populates both from the same underlying data for xlsx sources, so processing
  // both would double-count the same table.
  if (v1Data.sheets && v1Data.sheets.length > 0) {
    v1Data.sheets.forEach((sheet, index) => {
      if (sheet.rows.length === 0) return;
      const [headerRow, ...dataRows] = sheet.rows;
      tables.push({
        id: deriveCompositeId(["v1-sheet", index, sheet.name]).slice(0, 16),
        headers: headerRow.map((cell) => (cell === null || cell === undefined ? "" : String(cell))),
        rows: dataRows.map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell)))),
        confidence: Confidence.create(LEGACY_TABLE_CONFIDENCE),
      });
    });
  }

  return tables;
}

function buildEntities(v1Data: ExtractedDocumentData): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  (v1Data.dates ?? []).forEach((dateValue, index) => {
    entities.push({
      id: deriveCompositeId(["v1-entity", "date", index, dateValue]).slice(0, 16),
      type: "date",
      sourceLocation: { charOffset: index },
      rawValue: dateValue,
      observedValue: dateValue,
      confidence: Confidence.create(LEGACY_ENTITY_CONFIDENCE),
    });
  });

  (v1Data.amounts ?? []).forEach((amount, index) => {
    entities.push({
      id: deriveCompositeId(["v1-entity", "amount", index, amount.value, amount.context]).slice(0, 16),
      type: "amount",
      sourceLocation: { charOffset: index },
      rawValue: amount.context,
      observedValue: amount.value,
      confidence: Confidence.create(LEGACY_ENTITY_CONFIDENCE),
    });
  });

  return entities;
}

function buildDiagnostics(v1Data: ExtractedDocumentData, convertedAt: Date): ParserDiagnostic[] {
  const diagnostics: ParserDiagnostic[] = [];

  // Always present — every StructuredDocument produced by this adapter must be
  // self-identifying as adapter-derived, never indistinguishable from a document
  // that actually went through the real Document Parser pipeline.
  diagnostics.push({
    id: deriveCompositeId(["v1-adapter-notice", convertedAt.toISOString()]).slice(0, 16),
    stage: "V1CompatibilityAdapter",
    origin: "Builder",
    severity: "warning",
    message:
      "This StructuredDocument was produced by the V1 compatibility adapter from legacy ExtractedDocumentData, not by the Document Parser pipeline.",
    recommendation:
      "Treat confidence and quality fields as fixed placeholders, not computed assessments. Re-run the real pipeline against the original file for a fully assessed StructuredDocument.",
    recoverable: true,
    confidenceImpact: 0,
  });

  (v1Data.issues ?? []).forEach((issue, index) => {
    diagnostics.push({
      id: deriveCompositeId(["v1-issue", index, issue]).slice(0, 16),
      stage: "V1CompatibilityAdapter",
      origin: "Parser",
      severity: "warning",
      message: issue,
      recommendation: "This issue was reported by V1's original extraction and carried through unchanged by the adapter.",
      recoverable: true,
      confidenceImpact: -0.1,
    });
  });

  return diagnostics;
}

/**
 * Converts V1's `ExtractedDocumentData` into a V2 `StructuredDocument` +
 * `EvidenceObject[]`. Pure function — no I/O, no V1 runtime dependency, fully
 * deterministic for a given input and `convertedAt`.
 */
export function fromV1ExtractedDocumentData(
  v1Data: ExtractedDocumentData,
  context: FromV1Context,
): FromV1Result {
  const convertedAt = context.convertedAt ?? new Date();
  const tables = buildTables(v1Data);
  const entities = buildEntities(v1Data);
  const diagnostics = buildDiagnostics(v1Data, convertedAt);

  // V1's `keyFindings` were unstructured free-text highlights with no equivalent
  // V2 concept at the Document Parser layer (they are not Evidence, and per
  // ADR-004/ADR-006 this adapter must never construct a Finding-shaped object) —
  // preserved, not discarded, by appending them to rawText under a clear label
  // rather than silently losing the information.
  const keyFindingsBlock =
    v1Data.keyFindings && v1Data.keyFindings.length > 0
      ? `\n\n[V1 key findings, unstructured, carried over verbatim]\n${v1Data.keyFindings.join("\n")}`
      : "";
  const rawText = v1Data.rawText !== undefined ? `${v1Data.rawText}${keyFindingsBlock}` : undefined;

  const placeholderConfidence = Confidence.create(LEGACY_IMPORT_CONFIDENCE);

  const document: StructuredDocument = {
    schemaVersion: ADAPTER_SCHEMA_VERSION,
    documentId: context.documentId,
    sourceFileName: context.sourceFileName,
    classification: {
      documentType: "unclassified_v1_import",
      confidence: Confidence.create(0),
      candidates: [],
    },
    layout: {
      layoutType: "unknown",
      confidence: Confidence.create(0),
    },
    sections: [],
    tables,
    entities,
    normalizedTerms: [],
    rawText,
    qualityAssessment: {
      extractionCompleteness: placeholderConfidence,
      structuralRegularity: placeholderConfidence,
      contentLegibility: placeholderConfidence,
      businessCompleteness: placeholderConfidence,
      unclassifiedContentRatio: Percentage.fromFraction(1),
      issues: (v1Data.issues ?? []).map((issue) => ({
        type: "v1_legacy_issue",
        description: issue,
        severity: "medium" as const,
      })),
    },
    confidence: {
      extraction: placeholderConfidence,
      recognition: Confidence.create(0),
      evidence: placeholderConfidence,
      overall: placeholderConfidence,
      byStage: { V1CompatibilityAdapter: placeholderConfidence },
    },
    trace: {
      pipelineVersion: ADAPTER_PIPELINE_VERSION,
      startedAt: convertedAt.toISOString(),
      completedAt: convertedAt.toISOString(),
      stages: [
        {
          stage: "V1CompatibilityAdapter",
          version: "1.0.0",
          startedAt: convertedAt.toISOString(),
          durationMs: 0,
        },
      ],
    },
    diagnostics,
  };

  const evidence: EvidenceObject[] = entities.map((entity) => ({
    id: deriveCompositeId(["v1-evidence", context.documentId, entity.id]).slice(0, 16),
    documentId: context.documentId,
    sourceLocation: entity.sourceLocation,
    factType: entity.type,
    rawValue: entity.rawValue,
    observedValue: entity.observedValue,
    normalizedValue:
      entity.type === "amount" && typeof entity.observedValue === "number"
        ? deriveCurrencyNormalizedValue(entity.observedValue, entity.rawValue)
        : undefined,
    ontologyReference: undefined,
    confidence: entity.confidence,
    extractedAt: convertedAt.toISOString(),
  }));

  return { document, evidence };
}
