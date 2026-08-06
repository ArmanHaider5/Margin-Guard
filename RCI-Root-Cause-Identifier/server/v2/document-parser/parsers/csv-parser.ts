import type { ParserManifest } from "../../shared/index.js";
import type { UploadedFile, RawContent } from "../types.js";
import type { DocumentContentParser } from "./parser.js";

const MANIFEST: ParserManifest = {
  id: "csv",
  version: "1.0.0",
  supportedExtensions: ["csv"],
  supportedMimeTypes: ["text/csv"],
  capabilities: ["delimited_rows"],
  supportsVersion: ["RFC 4180 CSV", "Generic delimited text export"],
  priority: 100,
  owner: "document-parser",
  description: "Parses comma-separated value files into raw rows, handling quoted fields.",
};

/** Minimal, dependency-free RFC4180-ish line parser: handles quoted fields (with
 * embedded commas and escaped `""`) without pulling in a CSV library for a format
 * this simple. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export class CsvParser implements DocumentContentParser {
  readonly manifest = MANIFEST;

  canParse(uploadedFile: UploadedFile): boolean {
    return uploadedFile.content.length > 0;
  }

  async extract(uploadedFile: UploadedFile): Promise<RawContent> {
    const text = uploadedFile.content.toString("utf-8");
    const lines = text.split(/\r\n|\r|\n/).filter((line) => line.length > 0);
    const rows = lines.map((line) => parseCsvLine(line));
    return { kind: "delimited", rows };
  }
}
