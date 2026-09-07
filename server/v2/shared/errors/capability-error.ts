import { DocumentParserError } from "./document-parser-error.js";

/**
 * Raised when a requested operation exceeds what the relevant `CapabilityRegistry`
 * entry declares supported — e.g. asking the PDF extractor for OCR before an OCR
 * extractor is ever registered. Exists so unsupported operations fail with a precise,
 * typed reason instead of an ambiguous downstream crash.
 */
export class CapabilityError extends DocumentParserError {
  constructor(
    message: string,
    options?: { cause?: unknown; details?: Record<string, unknown> },
  ) {
    super(message, { ...options, code: "CAPABILITY_ERROR" });
    this.name = "CapabilityError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
