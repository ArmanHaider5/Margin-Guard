import type { ParserManifest } from "../../shared/index.js";
import type { UploadedFile, RawContent } from "../types.js";

/**
 * A single format-specific parser plugin. INTERNAL to `document-parser/` — the
 * `UploadedFile`/`RawContent` types it operates on are internal (ADR-009), so this
 * interface cannot be a `shared/contracts/` entry even though `ParserManifest`
 * itself is shared.
 *
 * `extract` returns a `Promise` uniformly, even though some parsers (xlsx, csv) are
 * internally synchronous — the underlying libraries for docx (`mammoth`) and PDF
 * (`pdf-parse`) are promise-based, and a single, honest async contract is simpler
 * and more correct than two parallel sync/async interfaces. A synchronous parser
 * simply resolves immediately; this has no bearing on determinism, which concerns
 * reproducibility of output for a given input, not execution timing.
 */
export interface DocumentContentParser {
  readonly manifest: ParserManifest;
  /** A cheap, defensive check beyond the manifest's declared extensions/mime types —
   * a parser may decline even a nominally-matching file (e.g. a corrupt archive). */
  canParse(uploadedFile: UploadedFile): boolean;
  extract(uploadedFile: UploadedFile): Promise<RawContent>;
}
