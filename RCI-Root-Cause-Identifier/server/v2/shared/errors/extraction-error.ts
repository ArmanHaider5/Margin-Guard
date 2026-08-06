import { DocumentParserError } from "./document-parser-error.js";

/**
 * Raised when raw content cannot be extracted from an uploaded file — a corrupted
 * archive, an unreadable stream, a parsing library failure. Represents a failure to
 * obtain bytes/structure, not a failure to interpret them (see OntologyError for that).
 */
export class ExtractionError extends DocumentParserError {
  constructor(
    message: string,
    options?: { cause?: unknown; details?: Record<string, unknown> },
  ) {
    super(message, { ...options, code: "EXTRACTION_ERROR" });
    this.name = "ExtractionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
