import { Confidence, deriveCompositeId } from "../../shared/index.js";
import type { DetectedTable, DocumentSection } from "../../shared/index.js";
import type { RawContent, WithDiagnostics } from "../types.js";

function isBlankRow(row: readonly unknown[]): boolean {
  return row.every((cell) => cell === undefined || cell === null || String(cell).trim() === "");
}

function safeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Best-effort: associates a table starting at `startRow` with whichever detected
 * section's row range contains it. Independent of SectionDetector's own internal
 * logic — TableDetector re-derives its own table boundaries and only *consults*
 * `sections` for labeling, so it remains independently testable with no sections
 * at all (sectionId is simply omitted). */
function findEnclosingSectionId(startRow: number, sections: readonly DocumentSection[]): string | undefined {
  const sorted = [...sections]
    .filter((s) => s.sourceLocation.row !== undefined)
    .sort((a, b) => (a.sourceLocation.row ?? 0) - (b.sourceLocation.row ?? 0));
  let match: DocumentSection | undefined;
  for (const section of sorted) {
    if ((section.sourceLocation.row ?? 0) <= startRow) match = section;
    else break;
  }
  return match?.id;
}

function detectSpreadsheetTables(
  sheetName: string,
  rows: readonly unknown[][],
  sections: readonly DocumentSection[],
): DetectedTable[] {
  const tables: DetectedTable[] = [];
  let blockStart: number | null = null;
  let blankRun = 0;

  const flush = (endRow: number) => {
    if (blockStart === null) return;
    const blockRows = rows.slice(blockStart, endRow + 1).filter((row) => !isBlankRow(row));
    if (blockRows.length >= 1) {
      const headers = blockRows[0].map(safeCell);
      const dataRows = blockRows.slice(1).map((row) => row.map(safeCell));
      const id = deriveCompositeId(["table", sheetName, blockStart, endRow]).slice(0, 16);
      tables.push({
        id,
        sectionId: findEnclosingSectionId(blockStart, sections),
        headers,
        rows: dataRows,
        confidence: Confidence.create(dataRows.length > 0 ? 0.85 : 0.5),
      });
    }
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

  return tables;
}

function detectHtmlTables(html: string): DetectedTable[] {
  const tableMatches = Array.from(html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi));
  return tableMatches.map((tableMatch, tableIndex) => {
    const rowMatches = Array.from(tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
    const grid = rowMatches.map((rowMatch) =>
      Array.from(rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)).map((cell) =>
        cell[1].replace(/<[^>]+>/g, "").trim(),
      ),
    );
    const [headers = [], ...dataRows] = grid;
    const id = deriveCompositeId(["table", "html", tableIndex]).slice(0, 16);
    return {
      id,
      headers,
      rows: dataRows,
      confidence: Confidence.create(dataRows.length > 0 ? 0.75 : 0.4),
    };
  });
}

/** Detects whitespace-aligned pseudo-tables in PDF-extracted text — lines with
 * consistent multi-space-separated column counts across several consecutive lines,
 * the classic accounting-export artifact. A genuine but modest heuristic; a real
 * layout-aware table detector is future work, not this sprint's scope. */
function detectPdfPseudoTables(text: string): DetectedTable[] {
  const lines = text.split("\n");
  const tables: DetectedTable[] = [];
  let candidateStart: number | null = null;
  let candidateColumnCount = 0;

  const splitColumns = (line: string): string[] => line.split(/ {2,}/).map((c) => c.trim()).filter((c) => c.length > 0);

  const flush = (endLine: number) => {
    if (candidateStart === null || endLine - candidateStart < 1) {
      candidateStart = null;
      return;
    }
    const blockLines = lines.slice(candidateStart, endLine + 1).map(splitColumns);
    const [headers = [], ...dataRows] = blockLines;
    const id = deriveCompositeId(["table", "pdf", candidateStart, endLine]).slice(0, 16);
    tables.push({
      id,
      headers,
      rows: dataRows,
      confidence: Confidence.create(0.55),
    });
    candidateStart = null;
  };

  lines.forEach((line, index) => {
    const columns = splitColumns(line);
    if (columns.length >= 2) {
      if (candidateStart === null) {
        candidateStart = index;
        candidateColumnCount = columns.length;
      } else if (columns.length !== candidateColumnCount) {
        flush(index - 1);
        candidateStart = index;
        candidateColumnCount = columns.length;
      }
    } else if (candidateStart !== null) {
      flush(index - 1);
    }
  });
  flush(lines.length - 1);

  return tables;
}

export interface TableDetectorService {
  detect(raw: RawContent, sections: readonly DocumentSection[]): WithDiagnostics<readonly DetectedTable[]>;
}

/**
 * Detects table boundaries and structure within a document, independently of
 * SectionDetector's own logic (it re-derives table row-ranges itself and only
 * *consults* `sections` for best-effort labeling) — this keeps both services
 * independently testable in isolation.
 */
export class TableDetector implements TableDetectorService {
  detect(raw: RawContent, sections: readonly DocumentSection[]): WithDiagnostics<readonly DetectedTable[]> {
    let tables: DetectedTable[];

    switch (raw.kind) {
      case "spreadsheet":
        tables = raw.sheets.flatMap((sheet) => detectSpreadsheetTables(sheet.name, sheet.rows, sections));
        break;
      case "delimited": {
        if (raw.rows.length === 0) {
          tables = [];
        } else {
          const [headers = [], ...dataRows] = raw.rows.map((row) => row.map(safeCell));
          const id = deriveCompositeId(["table", "csv"]).slice(0, 16);
          tables = [{ id, headers, rows: dataRows, confidence: Confidence.create(0.85) }];
        }
        break;
      }
      case "html":
        tables = detectHtmlTables(raw.html);
        break;
      case "pdf-text":
        tables = detectPdfPseudoTables(raw.text);
        break;
      default:
        tables = [];
    }

    return { value: tables, diagnostics: [] };
  }
}
