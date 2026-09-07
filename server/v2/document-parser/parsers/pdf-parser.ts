import { PDFParse } from "pdf-parse";
import { ExtractionError } from "../../shared/index.js";
import type { ParserManifest } from "../../shared/index.js";
import type { UploadedFile, RawContent } from "../types.js";
import type { DocumentContentParser } from "./parser.js";

const MANIFEST: ParserManifest = {
  id: "pdf",
  version: "1.0.0",
  supportedExtensions: ["pdf"],
  supportedMimeTypes: ["application/pdf"],
  capabilities: ["pages", "text"],
  supportsVersion: ["PDF 1.4+", "Text-native PDF (any generating application)"],
  priority: 100,
  owner: "document-parser",
  description:
    "Extracts page-wise text from text-native PDF documents via pdf-parse. Scanned/image-based PDFs are out of scope this sprint (see server/v2/document-parser/MIGRATION.md).",
};

/**
 * Text-native PDFs only, per this sprint's scope boundary. Confirmed real API
 * (verified against the installed `pdf-parse@2.4.5` package, not assumed from V1's
 * usage): `new PDFParse({ data }).getText()` returns `{ pages: [{num, text}], text }`.
 */
export class PdfParser implements DocumentContentParser {
  readonly manifest = MANIFEST;

  canParse(uploadedFile: UploadedFile): boolean {
    const header = uploadedFile.content.subarray(0, 5).toString("latin1");
    return header === "%PDF-";
  }

  async extract(uploadedFile: UploadedFile): Promise<RawContent> {
    const parser = new PDFParse({ data: uploadedFile.content });
    try {
      const result = await parser.getText();
      const pages = result.pages.map((page) => page.text);
      return { kind: "pdf-text", text: result.text, pages };
    } catch (error) {
      throw new ExtractionError(`Failed to extract text from PDF "${uploadedFile.fileName}"`, {
        cause: error,
        details: { fileName: uploadedFile.fileName },
      });
    } finally {
      await parser.destroy();
    }
  }
}
