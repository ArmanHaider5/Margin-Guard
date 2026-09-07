import { Confidence, Percentage } from "../../shared/index.js";
import type {
  DocumentQuality,
  QualityIssue,
  DetectedTable,
  DocumentSection,
  NormalizedTermMapping,
} from "../../shared/index.js";
import type { RawContent, WithDiagnostics } from "../types.js";

/** Ontology canonical terms a reasonably complete document of this type should
 * contain evidence of. An empty list means this sprint has no specific expectation
 * for the type (not the same as "complete") — see `evaluateBusinessCompleteness`. */
const EXPECTED_TERMS_BY_DOCUMENT_TYPE: Readonly<Record<string, readonly string[]>> = {
  balance_sheet: ["Asset", "Liability", "Equity"],
  profit_and_loss: ["Revenue", "Expense"],
  trial_balance: ["Financial Account", "Balance"],
};

const NOT_APPLICABLE_SCORE = 0.75;
const LEGIBLE_CHAR = /[\x20-\x7EÀ-ſ\n\r\t]/;

function evaluateExtractionCompleteness(raw: RawContent): { score: number; issue?: QualityIssue } {
  switch (raw.kind) {
    case "spreadsheet": {
      const totalRows = raw.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
      if (totalRows === 0) {
        return {
          score: 0.1,
          issue: { type: "empty_extraction", description: "No rows were extracted from any sheet", severity: "high" },
        };
      }
      return { score: 0.95 };
    }
    case "delimited":
      return raw.rows.length === 0
        ? { score: 0.1, issue: { type: "empty_extraction", description: "No rows were extracted", severity: "high" } }
        : { score: 0.95 };
    case "html":
      return raw.text.length === 0
        ? { score: 0.1, issue: { type: "empty_extraction", description: "No text content was extracted", severity: "high" } }
        : { score: 0.9 };
    case "pdf-text":
      return raw.text.length === 0
        ? { score: 0.1, issue: { type: "empty_extraction", description: "No text content was extracted from the PDF", severity: "high" } }
        : { score: 0.85 };
    default:
      return {
        score: 0,
        issue: { type: "extraction_failed", description: "Content extraction did not run or failed entirely", severity: "high" },
      };
  }
}

function evaluateStructuralRegularity(tables: readonly DetectedTable[]): { score: number; issue?: QualityIssue } {
  if (tables.length === 0) return { score: NOT_APPLICABLE_SCORE };
  const regularTables = tables.filter(
    (table) => table.headers.length > 0 && table.rows.every((row) => row.length === table.headers.length),
  );
  const ratio = regularTables.length / tables.length;
  if (ratio < 0.5) {
    return {
      score: ratio,
      issue: {
        type: "inconsistent_structure",
        description: `${tables.length - regularTables.length} of ${tables.length} detected tables have irregular row/column widths`,
        severity: "medium",
      },
    };
  }
  return { score: Math.max(ratio, 0.5) };
}

function evaluateContentLegibility(text: string | undefined): { score: number; issue?: QualityIssue } {
  if (!text || text.length === 0) return { score: NOT_APPLICABLE_SCORE };
  const sample = text.slice(0, 5000);
  const legibleCount = Array.from(sample).filter((char) => LEGIBLE_CHAR.test(char)).length;
  const ratio = legibleCount / sample.length;
  if (ratio < 0.8) {
    return {
      score: ratio,
      issue: {
        type: "garbled_content",
        description: "A significant proportion of extracted content is non-printable or non-standard characters",
        severity: "medium",
      },
    };
  }
  return { score: ratio };
}

function evaluateBusinessCompleteness(
  documentType: string,
  normalizedTerms: readonly NormalizedTermMapping[],
): { score: number; issues: QualityIssue[] } {
  const expectedTerms = EXPECTED_TERMS_BY_DOCUMENT_TYPE[documentType];
  if (!expectedTerms || expectedTerms.length === 0) {
    return { score: NOT_APPLICABLE_SCORE, issues: [] };
  }
  const foundTerms = new Set(normalizedTerms.map((m) => m.canonicalTerm));
  const missing = expectedTerms.filter((term) => !foundTerms.has(term));
  const score = (expectedTerms.length - missing.length) / expectedTerms.length;
  const issues = missing.map((term) => ({
    type: "missing_expected_section" as const,
    description: `Document was classified as "${documentType}" but no "${term}" content was recognized`,
    severity: "high" as const,
  }));
  return { score, issues };
}

function evaluateUnclassifiedContentRatio(raw: RawContent, sections: readonly DocumentSection[]): number {
  if (raw.kind === "spreadsheet") {
    const totalRows = raw.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
    if (totalRows === 0) return 1;
    // Sections are blank-row-separated blocks; unclassified rows are the blank
    // separator rows themselves plus any content outside detected blocks. A single
    // section spanning nearly the whole sheet implies near-zero unclassified ratio.
    return sections.length === 0 ? 1 : Math.max(0, Math.min(1, 1 - sections.length / Math.max(totalRows / 20, 1)));
  }
  if (sections.length === 0) return raw.kind === "unknown" ? 1 : 0.3;
  return 0.1;
}

export interface DocumentQualityEvaluatorService {
  evaluate(
    raw: RawContent,
    documentType: string,
    sections: readonly DocumentSection[],
    tables: readonly DetectedTable[],
    normalizedTerms: readonly NormalizedTermMapping[],
  ): WithDiagnostics<DocumentQuality>;
}

/**
 * Assesses the document's intrinsic quality — independent of, and computed prior
 * to, Confidence Scoring. `businessCompleteness` is the one dimension requiring
 * business-type awareness: a Profit & Loss document with no recognized Revenue
 * content scores low here even if extraction and structural recognition both
 * succeeded perfectly.
 */
export class DocumentQualityEvaluator implements DocumentQualityEvaluatorService {
  evaluate(
    raw: RawContent,
    documentType: string,
    sections: readonly DocumentSection[],
    tables: readonly DetectedTable[],
    normalizedTerms: readonly NormalizedTermMapping[],
  ): WithDiagnostics<DocumentQuality> {
    const extraction = evaluateExtractionCompleteness(raw);
    const structural = evaluateStructuralRegularity(tables);
    const text = raw.kind === "html" || raw.kind === "pdf-text" ? raw.text : raw.kind === "unknown" ? raw.text : undefined;
    const legibility = evaluateContentLegibility(text);
    const business = evaluateBusinessCompleteness(documentType, normalizedTerms);
    const unclassifiedRatio = evaluateUnclassifiedContentRatio(raw, sections);

    const issues: QualityIssue[] = [
      ...(extraction.issue ? [extraction.issue] : []),
      ...(structural.issue ? [structural.issue] : []),
      ...(legibility.issue ? [legibility.issue] : []),
      ...business.issues,
    ];

    const quality: DocumentQuality = {
      extractionCompleteness: Confidence.create(extraction.score),
      structuralRegularity: Confidence.create(structural.score),
      contentLegibility: Confidence.create(legibility.score),
      businessCompleteness: Confidence.create(business.score),
      unclassifiedContentRatio: Percentage.fromFraction(unclassifiedRatio),
      issues,
    };

    return { value: quality, diagnostics: [] };
  }
}
