/**
 * Root of the V2 error hierarchy for this sprint. Framework class only — it carries
 * structured metadata (a stable `code`, an optional `details` bag, and the native
 * `cause` chain) so every error raised anywhere under `server/v2/` is uniform and
 * inspectable, but it encodes no business rules of its own.
 *
 * Future modules (financial-intelligence, operational-intelligence, ...) may either
 * extend this same root or introduce their own, following this identical shape —
 * this class does not assume it is the only root error type the platform will ever have.
 */
export class DocumentParserError extends Error {
  /** Stable, machine-readable error code — set by each subclass, never by callers. */
  readonly code: string;

  /** Structured, non-sensitive context useful for logs/traces. Never used for control flow. */
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options?: { code?: string; cause?: unknown; details?: Record<string, unknown> },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "DocumentParserError";
    this.code = options?.code ?? "DOCUMENT_PARSER_ERROR";
    this.details = options?.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
