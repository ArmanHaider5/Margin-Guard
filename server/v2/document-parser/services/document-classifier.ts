import { Confidence } from "../../shared/index.js";
import type { DocumentClassification, DocumentTypeCandidate } from "../../shared/index.js";
import type { RawContent, WithDiagnostics } from "../types.js";
import { DocumentTypeRuleRegistry, createDefaultDocumentTypeRuleRegistry } from "../rules/document-type-rules.js";
import { createDiagnostic } from "../diagnostics.js";

const STAGE = "DocumentClassifier";
const MIN_SCORE_FOR_CLASSIFICATION = 6;
const MAX_TEXT_SAMPLE_CHARS = 20000;

function safeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Extracts candidate header cells and a bounded text sample from any RawContent
 * kind, uniformly — the same classification logic runs regardless of source format. */
function toHeadersAndText(raw: RawContent): { headers: string[]; text: string } {
  switch (raw.kind) {
    case "spreadsheet": {
      const firstNonEmptySheet = raw.sheets.find((sheet) => sheet.rows.length > 0);
      const headers = (firstNonEmptySheet?.rows[0] ?? []).map(safeCell);
      const text = raw.sheets
        .flatMap((sheet) => sheet.rows.slice(0, 100).map((row) => row.map(safeCell).join(" ")))
        .join(" ")
        .slice(0, MAX_TEXT_SAMPLE_CHARS);
      return { headers, text };
    }
    case "delimited": {
      const headers = (raw.rows[0] ?? []).map(safeCell);
      const text = raw.rows
        .slice(0, 100)
        .map((row) => row.join(" "))
        .join(" ")
        .slice(0, MAX_TEXT_SAMPLE_CHARS);
      return { headers, text };
    }
    case "html": {
      const headerMatches = Array.from(raw.html.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)).slice(0, 20);
      const headers = headerMatches.map((m) => m[1].replace(/<[^>]+>/g, "").trim());
      return { headers, text: raw.text.slice(0, MAX_TEXT_SAMPLE_CHARS) };
    }
    case "pdf-text":
      return { headers: [], text: raw.text.slice(0, MAX_TEXT_SAMPLE_CHARS) };
    case "unknown":
      return { headers: [], text: raw.text?.slice(0, MAX_TEXT_SAMPLE_CHARS) ?? "" };
    default:
      return { headers: [], text: "" };
  }
}

export interface DocumentClassifierService {
  classify(raw: RawContent): WithDiagnostics<DocumentClassification>;
}

/**
 * Scores RawContent against every registered DocumentTypeRule and returns the
 * highest-scoring candidate as the classification, with every candidate's score
 * retained for transparency. Deterministic tie-break: the rule registered first
 * wins an exact score tie (rules are evaluated in registration order; a strictly
 * greater score is required to displace the current leader).
 */
export class DocumentClassifier implements DocumentClassifierService {
  constructor(private readonly rules: DocumentTypeRuleRegistry = createDefaultDocumentTypeRuleRegistry()) {}

  classify(raw: RawContent): WithDiagnostics<DocumentClassification> {
    const { headers, text } = toHeadersAndText(raw);
    const candidates: DocumentTypeCandidate[] = [];

    let winner: DocumentTypeCandidate | undefined;

    for (const rule of this.rules.all()) {
      const headerMatches = rule.headerPatterns.filter((pattern) =>
        headers.some((header) => pattern.test(header)),
      ).length;
      const keywordMatches = rule.keywordPatterns.filter((pattern) => pattern.test(text)).length;
      const score = headerMatches * rule.headerWeight + keywordMatches * rule.keywordWeight;

      candidates.push({ documentType: rule.documentType, score });
      if (score > 0 && (!winner || score > winner.score)) {
        winner = { documentType: rule.documentType, score };
      }
    }

    const diagnostics = [];
    let documentType: string;
    let confidence: Confidence;

    if (winner && winner.score >= MIN_SCORE_FOR_CLASSIFICATION) {
      documentType = winner.documentType;
      const normalizedScore = Math.min(winner.score / (winner.score + 10), 0.95);
      confidence = Confidence.create(Math.max(normalizedScore, 0.5));
    } else {
      documentType = raw.kind === "spreadsheet" || raw.kind === "delimited" ? "generic_spreadsheet" : "generic_document";
      confidence = Confidence.create(0.3);
      diagnostics.push(
        createDiagnostic({
          stage: STAGE,
          origin: "Classifier",
          severity: "warning",
          message: `No document-type rule scored above the classification threshold (best score: ${winner?.score ?? 0})`,
          recommendation: `Classified as "${documentType}" as a format-based fallback; review manually if a specific type was expected.`,
          recoverable: true,
          confidenceImpact: -0.1,
        }),
      );
    }

    return {
      value: { documentType, confidence, candidates },
      diagnostics,
    };
  }
}
