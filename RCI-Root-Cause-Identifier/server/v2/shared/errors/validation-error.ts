import { DocumentParserError } from "./document-parser-error.js";

/**
 * Raised when a value fails a structural or type-level validation rule — e.g. a
 * Value Object constructed from out-of-range or malformed input. Not for business-rule
 * violations (those belong to a future module's own domain errors), only structural
 * integrity of the data itself.
 */
export class ValidationError extends DocumentParserError {
  constructor(
    message: string,
    options?: { cause?: unknown; details?: Record<string, unknown> },
  ) {
    super(message, { ...options, code: "VALIDATION_ERROR" });
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
