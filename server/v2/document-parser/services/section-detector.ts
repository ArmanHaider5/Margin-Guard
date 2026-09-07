import { Confidence, deriveCompositeId } from "../../shared/index.js";
import type { DocumentSection } from "../../shared/index.js";
import type { RawContent, WithDiagnostics } from "../types.js";

const HEADING_LINE = /^([A-Z][A-Za-z0-9 &/-]{2,60}|[A-Z0-9 &/-]{3,60})$/;

function isBlankRow(row: readonly unknown[]): boolean {
  return row.every((cell) => cell === undefined || cell === null || String(cell).trim() === "");
}

/** Splits a sheet's rows into blank-row-separated blocks — a clean-room, general
 * structural detector (not entity/quantity-specific) generalizing the block-boundary
 * concept to any repeating spreadsheet region, regardless of what it represents. */
function detectSpreadsheetBlocks(
  sheetName: string,
  rows: readonly unknown[][],
): DocumentSection[] {
  const sections: DocumentSection[] = [];
  let blockStart: number | null = null;
  let blankRun = 0;

  const flush = (endRow: number) => {
    if (blockStart === null) return;
    const id = deriveCompositeId(["section", sheetName, blockStart, endRow]).slice(0, 16);
    sections.push({
      id,
      label: `${sheetName} block ${sections.length + 1}`,
      kind: "block",
      sourceLocation: { sectionId: id, row: blockStart },
      confidence: Confidence.create(0.8),
    });
    blockStart = null;
  };

  rows.forEach((row, index) => {
    if (isBlankRow(row)) {
      blankRun += 1;
      if (blankRun >= 2) flush(index - blankRun);
    } else {
      if (blockStart === null) blockStart = index;
      blankRun = 0;
    }
  });
  flush(rows.length - 1);

  return sections;
}

function detectHtmlSections(html: string): DocumentSection[] {
  const headingMatches = Array.from(html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi));
  if (headingMatches.length === 0) {
    const id = deriveCompositeId(["section", "narrative", "body"]).slice(0, 16);
    return [{ id, kind: "body", sourceLocation: { sectionId: id }, confidence: Confidence.create(0.6) }];
  }
  return headingMatches.map((match, index) => {
    const label = match[1].replace(/<[^>]+>/g, "").trim();
    const id = deriveCompositeId(["section", "heading", index, label]).slice(0, 16);
    return {
      id,
      label,
      kind: "body" as const,
      sourceLocation: { sectionId: id, charOffset: match.index },
      confidence: Confidence.create(0.75),
    };
  });
}

function detectPdfTextSections(text: string): DocumentSection[] {
  const lines = text.split("\n");
  const sections: DocumentSection[] = [];
  let currentLabel: string | undefined;
  let sectionStartLine = 0;

  const flush = (endLine: number) => {
    const id = deriveCompositeId(["section", "pdf", sectionStartLine, endLine, currentLabel]).slice(0, 16);
    sections.push({
      id,
      label: currentLabel,
      kind: currentLabel ? "body" : "body",
      sourceLocation: { sectionId: id },
      confidence: Confidence.create(currentLabel ? 0.6 : 0.5),
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length <= 60 && HEADING_LINE.test(trimmed)) {
      if (index > sectionStartLine) flush(index - 1);
      currentLabel = trimmed;
      sectionStartLine = index;
    }
  });
  flush(lines.length - 1);

  return sections.length > 0 ? sections : [];
}

export interface SectionDetectorService {
  detect(raw: RawContent): WithDiagnostics<readonly DocumentSection[]>;
}

/**
 * Identifies logical, named regions within a document — a repeating spreadsheet
 * block, a narrative document's headed section — using the same DocumentSection
 * shape regardless of source format.
 */
export class SectionDetector implements SectionDetectorService {
  detect(raw: RawContent): WithDiagnostics<readonly DocumentSection[]> {
    let sections: DocumentSection[];

    switch (raw.kind) {
      case "spreadsheet":
        sections = raw.sheets.flatMap((sheet) => detectSpreadsheetBlocks(sheet.name, sheet.rows));
        break;
      case "delimited": {
        const id = deriveCompositeId(["section", "delimited", "body"]).slice(0, 16);
        sections =
          raw.rows.length > 0
            ? [{ id, kind: "body", sourceLocation: { sectionId: id }, confidence: Confidence.create(0.7) }]
            : [];
        break;
      }
      case "html":
        sections = detectHtmlSections(raw.html);
        break;
      case "pdf-text":
        sections = detectPdfTextSections(raw.text);
        break;
      default:
        sections = [];
    }

    return { value: sections, diagnostics: [] };
  }
}
