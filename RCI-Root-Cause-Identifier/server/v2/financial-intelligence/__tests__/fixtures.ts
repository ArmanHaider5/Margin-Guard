import { Confidence, Percentage } from "../../shared/index.js";
import type {
  StructuredDocument,
  EvidenceObject,
  DetectedTable,
  NormalizedTermMapping,
} from "../../shared/index.js";

/**
 * Minimal, hand-built StructuredDocument/EvidenceObject fixtures for
 * `financial-intelligence/`'s unit tests — deliberately NOT routed through the
 * real Document Parser pipeline, so these tests remain isolated from (and stable
 * across) changes to `document-parser/`'s own internals. Integration-level
 * coverage against the real pipeline lives in
 * `financial-intelligence/__tests__/real-pipeline-integration.test.ts`.
 */

export function makeDocument(overrides: Partial<StructuredDocument> = {}): StructuredDocument {
  return {
    schemaVersion: "1.0.0",
    documentId: "test-doc",
    sourceFileName: "test.xlsx",
    classification: { documentType: "profit_and_loss", confidence: Confidence.create(0.8), candidates: [] },
    layout: { layoutType: "single_table", confidence: Confidence.create(0.8) },
    sections: [],
    tables: [],
    entities: [],
    normalizedTerms: [],
    qualityAssessment: {
      extractionCompleteness: Confidence.create(0.9),
      structuralRegularity: Confidence.create(0.9),
      contentLegibility: Confidence.create(0.9),
      businessCompleteness: Confidence.create(0.8),
      unclassifiedContentRatio: Percentage.fromFraction(0.1),
      issues: [],
    },
    confidence: {
      extraction: Confidence.create(0.8),
      recognition: Confidence.create(0.8),
      evidence: Confidence.create(0.8),
      overall: Confidence.create(0.8),
      byStage: {},
    },
    trace: {
      pipelineVersion: "test-fixture",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:00.000Z",
      stages: [],
    },
    diagnostics: [],
    ...overrides,
  };
}

export function makeEvidence(overrides: Partial<EvidenceObject> = {}): EvidenceObject {
  return {
    id: `e-${Math.random().toString(36).slice(2)}`,
    documentId: "test-doc",
    sourceLocation: {},
    factType: "amount",
    rawValue: "100",
    observedValue: 100,
    confidence: Confidence.create(0.8),
    extractedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeTable(overrides: Partial<DetectedTable> = {}): DetectedTable {
  return {
    id: "t1",
    headers: ["Revenue"],
    rows: [],
    confidence: Confidence.create(0.8),
    ...overrides,
  };
}

export function makeNormalizedTerm(overrides: Partial<NormalizedTermMapping> = {}): NormalizedTermMapping {
  return {
    originalTerm: "Revenue",
    canonicalTerm: "Revenue",
    ontologyReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2",
    sourceLocation: { tableId: "t1", column: 0 },
    confidence: Confidence.create(0.9),
    ...overrides,
  };
}

/** Builds a single-column "trend" fixture: a table + normalized header term +
 * `count` amount EvidenceObjects at increasing rows, all in one column. */
export function makeTrendFixture(
  canonicalTerm: string,
  values: number[],
  tableId = "t1",
  column = 0,
): { table: DetectedTable; normalizedTerm: NormalizedTermMapping; evidence: EvidenceObject[] } {
  const table = makeTable({ id: tableId, headers: [canonicalTerm] });
  const normalizedTerm = makeNormalizedTerm({
    originalTerm: canonicalTerm,
    canonicalTerm,
    sourceLocation: { tableId, column },
  });
  const evidence = values.map((value, row) =>
    makeEvidence({
      id: `e-${tableId}-${column}-${row}`,
      sourceLocation: { tableId, column, row },
      rawValue: `RM${value}.00`,
      observedValue: value,
    }),
  );
  return { table, normalizedTerm, evidence };
}
