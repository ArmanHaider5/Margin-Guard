import { ExtractionError } from "../../shared/index.js";
import type { UploadedFile, RawContent, WithDiagnostics } from "../types.js";
import { ParserRegistry } from "../parsers/parser-registry.js";
import { createDiagnostic } from "../diagnostics.js";

const STAGE = "RawContentExtractor";

export interface RawContentExtractorService {
  extract(uploadedFile: UploadedFile): Promise<WithDiagnostics<RawContent>>;
}

/**
 * Dispatches to whichever `DocumentContentParser` the `ParserRegistry` resolves for
 * this file's extension (per the platform's ParserManifest plugin mechanism — never
 * a hardcoded switch statement). Extraction failures are not silently absorbed:
 * a parser that throws produces a low-confidence, empty `RawContent` plus an
 * `error`-severity diagnostic, so the rest of the pipeline can still run (never
 * crashes the caller) while being explicit that this document's evidence is
 * unreliable.
 */
export class RawContentExtractor implements RawContentExtractorService {
  constructor(private readonly parserRegistry: ParserRegistry) {}

  async extract(uploadedFile: UploadedFile): Promise<WithDiagnostics<RawContent>> {
    const extension = uploadedFile.fileName.slice(uploadedFile.fileName.lastIndexOf(".") + 1).toLowerCase();
    const parser = this.parserRegistry.resolve(uploadedFile, extension);

    if (!parser) {
      return {
        value: { kind: "unknown" },
        diagnostics: [
          createDiagnostic({
            stage: STAGE,
            origin: "Parser",
            severity: "error",
            message: `No registered parser can handle "${uploadedFile.fileName}" (type: ${uploadedFile.fileType})`,
            recommendation: "This file type is not yet supported by the Document Parser Framework.",
            recoverable: false,
            confidenceImpact: -1,
          }),
        ],
      };
    }

    try {
      const raw = await parser.extract(uploadedFile);
      return { value: raw, diagnostics: [] };
    } catch (error) {
      const message =
        error instanceof ExtractionError ? error.message : `Unexpected extraction failure: ${String(error)}`;
      return {
        value: { kind: "unknown" },
        diagnostics: [
          createDiagnostic({
            stage: STAGE,
            origin: "Parser",
            severity: "error",
            message,
            recommendation: "Confirm the file is not corrupted and matches its declared format.",
            recoverable: false,
            confidenceImpact: -1,
          }),
        ],
      };
    }
  }
}
