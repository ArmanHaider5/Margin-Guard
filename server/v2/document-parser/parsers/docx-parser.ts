import mammoth from "mammoth";
import { ExtractionError } from "../../shared/index.js";
import type { ParserManifest } from "../../shared/index.js";
import type { UploadedFile, RawContent } from "../types.js";
import type { DocumentContentParser } from "./parser.js";

const MANIFEST: ParserManifest = {
  id: "docx",
  version: "1.0.0",
  supportedExtensions: ["docx"],
  supportedMimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  capabilities: ["headings", "paragraphs", "tables"],
  supportsVersion: ["Word 2007+ (.docx)"],
  priority: 100,
  owner: "document-parser",
  description: "Extracts structure-preserving HTML from Word documents via mammoth.",
};

/** Strips HTML tags for a plain-text companion view — deliberately naive (no HTML
 * entity decoding beyond the handful used by mammoth's output) since this exists
 * only as a fallback text source, not the structural source of truth (the `html`
 * field is). */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Uses `mammoth.convertToHtml`, NOT `extractRawText` — `extractRawText` discards
 * table structure entirely, which would silently starve TableDetector for every
 * `.docx` input (a defect flagged during this sprint's planning; this parser is
 * built correctly from the start).
 */
export class DocxParser implements DocumentContentParser {
  readonly manifest = MANIFEST;

  canParse(uploadedFile: UploadedFile): boolean {
    return uploadedFile.content.length > 0;
  }

  async extract(uploadedFile: UploadedFile): Promise<RawContent> {
    try {
      const result = await mammoth.convertToHtml({ buffer: uploadedFile.content });
      const html = result.value;
      return { kind: "html", html, text: stripHtml(html) };
    } catch (error) {
      throw new ExtractionError(`Failed to convert Word document "${uploadedFile.fileName}"`, {
        cause: error,
        details: { fileName: uploadedFile.fileName },
      });
    }
  }
}
