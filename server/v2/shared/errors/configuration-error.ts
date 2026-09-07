import { DocumentParserError } from "./document-parser-error.js";

/**
 * Raised when the framework itself is misconfigured — a rule registry left empty,
 * a required registration missing at startup, an invalid pipeline wiring. Represents
 * a defect in how a module was assembled, never a problem with a specific document.
 */
export class ConfigurationError extends DocumentParserError {
  constructor(
    message: string,
    options?: { cause?: unknown; details?: Record<string, unknown> },
  ) {
    super(message, { ...options, code: "CONFIGURATION_ERROR" });
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
