import { DocumentParserError } from "./document-parser-error.js";

/**
 * Raised when a terminology normalization or business-concept lookup against the
 * Scope Optix Business Ontology registry (`server/v2/knowledge/`) fails in a way that
 * must halt processing — e.g. a caller requests a strict match and none is traceable
 * to an approved architecture document. Never raised merely because a term has no
 * match; per `04_MGD_KNOWLEDGE_LIBRARY.md`, an unmapped term is left unnormalized,
 * not an error — this class is for genuine registry-integrity failures.
 */
export class OntologyError extends DocumentParserError {
  constructor(
    message: string,
    options?: { cause?: unknown; details?: Record<string, unknown> },
  ) {
    super(message, { ...options, code: "ONTOLOGY_ERROR" });
    this.name = "OntologyError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
