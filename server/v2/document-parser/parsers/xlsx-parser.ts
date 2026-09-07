import XLSX from "xlsx";
import { ExtractionError } from "../../shared/index.js";
import type { ParserManifest } from "../../shared/index.js";
import type { UploadedFile, RawContent } from "../types.js";
import type { DocumentContentParser } from "./parser.js";

const MANIFEST: ParserManifest = {
  id: "xlsx",
  version: "1.0.0",
  supportedExtensions: ["xlsx", "xls"],
  supportedMimeTypes: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ],
  capabilities: ["tables", "sheets", "merged_cells", "formulas", "hidden_sheets"],
  supportsVersion: ["Excel 97-2003 (.xls)", "Excel 2007+ (.xlsx)", "Excel 365"],
  priority: 100,
  owner: "document-parser",
  description: "Extracts sheet-level raw rows from Excel workbooks (.xlsx, .xls) via the xlsx library.",
};

/**
 * Reads every sheet in a workbook into raw, untouched 2-D arrays (`header: 1`
 * mode) — no interpretation of headers, tables, or entities happens here; that is
 * every downstream service's job. `merged_cells`/`formulas`/`hidden_sheets` are
 * declared capabilities of the underlying library, not features this parser
 * currently exposes distinctly — declared honestly in the manifest as what the
 * *format* supports, not a promise every capability is separately surfaced yet.
 */
export class XlsxParser implements DocumentContentParser {
  readonly manifest = MANIFEST;

  canParse(uploadedFile: UploadedFile): boolean {
    return uploadedFile.content.length > 0;
  }

  async extract(uploadedFile: UploadedFile): Promise<RawContent> {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(uploadedFile.content, { type: "buffer" });
    } catch (error) {
      throw new ExtractionError(`Failed to read workbook "${uploadedFile.fileName}"`, {
        cause: error,
        details: { fileName: uploadedFile.fileName },
      });
    }

    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      return { name, rows };
    });

    return { kind: "spreadsheet", sheets };
  }
}
