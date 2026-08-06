import { Confidence } from "../../shared/index.js";
import type { DocumentLayout, LayoutType } from "../../shared/index.js";
import type { RawContent, WithDiagnostics } from "../types.js";

const FORM_LABEL_LINE = /^[A-Za-z][A-Za-z0-9 /_-]{1,40}:\s*\S/;

function countBlankRowGaps(rows: readonly unknown[][]): number {
  let gaps = 0;
  let previousWasBlank = false;
  for (const row of rows) {
    const isBlank = row.every((cell) => cell === undefined || cell === null || String(cell).trim() === "");
    if (isBlank && !previousWasBlank) gaps += 1;
    previousWasBlank = isBlank;
  }
  return gaps;
}

function analyzeSpreadsheetLayout(sheets: readonly { name: string; rows: readonly unknown[][] }[]): {
  layoutType: LayoutType;
  confidence: number;
} {
  const nonEmptySheets = sheets.filter((sheet) => sheet.rows.length > 0);
  if (nonEmptySheets.length === 0) return { layoutType: "unknown", confidence: 0.2 };

  const totalBlankGaps = nonEmptySheets.reduce((sum, sheet) => sum + countBlankRowGaps(sheet.rows), 0);
  if (nonEmptySheets.length > 1 || totalBlankGaps > 1) {
    return { layoutType: "multi_block", confidence: 0.75 };
  }
  return { layoutType: "single_table", confidence: 0.85 };
}

function analyzeHtmlLayout(html: string, text: string): { layoutType: LayoutType; confidence: number } {
  const hasTable = /<table[\s>]/i.test(html);
  const nonTableText = html.replace(/<table[\s\S]*?<\/table>/gi, "");
  const hasSubstantialProse = nonTableText.replace(/<[^>]+>/g, "").trim().length > 200;

  if (hasTable && hasSubstantialProse) return { layoutType: "mixed", confidence: 0.7 };
  if (hasTable) return { layoutType: "single_table", confidence: 0.7 };

  const labelLines = text.split(/\n|\.\s/).filter((line) => FORM_LABEL_LINE.test(line.trim()));
  if (labelLines.length >= 3) return { layoutType: "form_like", confidence: 0.65 };

  return { layoutType: "narrative", confidence: 0.75 };
}

function analyzePdfTextLayout(text: string): { layoutType: LayoutType; confidence: number } {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const labelLines = lines.filter((line) => FORM_LABEL_LINE.test(line.trim()));
  if (lines.length > 0 && labelLines.length / lines.length > 0.3) {
    return { layoutType: "form_like", confidence: 0.6 };
  }
  // A pseudo-table signal: several consecutive lines each containing 2+ runs of
  // multiple spaces (the classic whitespace-aligned-columns export artifact).
  const pseudoTableLines = lines.filter((line) => (line.match(/ {2,}/g) ?? []).length >= 2);
  if (lines.length > 0 && pseudoTableLines.length / lines.length > 0.4) {
    return { layoutType: "mixed", confidence: 0.55 };
  }
  return { layoutType: "narrative", confidence: 0.6 };
}

export interface LayoutAnalyzerService {
  analyze(raw: RawContent): WithDiagnostics<DocumentLayout>;
}

/**
 * Determines the document's overall structural shape from its RawContent,
 * independent of source format — the same five outcomes apply whether the source
 * was a spreadsheet, an HTML-converted Word document, or PDF text.
 */
export class LayoutAnalyzer implements LayoutAnalyzerService {
  analyze(raw: RawContent): WithDiagnostics<DocumentLayout> {
    let result: { layoutType: LayoutType; confidence: number };

    switch (raw.kind) {
      case "spreadsheet":
        result = analyzeSpreadsheetLayout(raw.sheets);
        break;
      case "delimited":
        result = { layoutType: raw.rows.length > 0 ? "single_table" : "unknown", confidence: raw.rows.length > 0 ? 0.85 : 0.2 };
        break;
      case "html":
        result = analyzeHtmlLayout(raw.html, raw.text);
        break;
      case "pdf-text":
        result = analyzePdfTextLayout(raw.text);
        break;
      default:
        result = { layoutType: "unknown", confidence: 0.1 };
    }

    return {
      value: { layoutType: result.layoutType, confidence: Confidence.create(result.confidence) },
      diagnostics: [],
    };
  }
}
