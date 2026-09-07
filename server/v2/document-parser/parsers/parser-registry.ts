import { ConfigurationError, ExtractionError, CapabilityRegistry } from "../../shared/index.js";
import type { ParserManifest } from "../../shared/index.js";
import type { UploadedFile } from "../types.js";
import type { DocumentContentParser } from "./parser.js";

/**
 * The permanent plugin-discovery mechanism (per the platform's ParserManifest
 * decision): parsers are registered with their manifest and discovered by matching
 * a file's extension/mime type against registered manifests — never by a hardcoded
 * switch statement the framework itself must be edited to extend.
 *
 * Also feeds the shared, general-purpose `CapabilityRegistry` (`shared/utils/`) as a
 * side effect of registration, so cross-module capability queries ("does this format
 * support X") work without needing a full `DocumentContentParser` instance.
 */
export class ParserRegistry {
  private readonly parsers: DocumentContentParser[] = [];

  constructor(private readonly capabilityRegistry: CapabilityRegistry = new CapabilityRegistry()) {}

  register(parser: DocumentContentParser): void {
    if (this.parsers.some((p) => p.manifest.id === parser.manifest.id)) {
      throw new ConfigurationError(`Parser "${parser.manifest.id}" is already registered`, {
        details: { id: parser.manifest.id },
      });
    }
    this.parsers.push(parser);
    for (const extension of parser.manifest.supportedExtensions) {
      this.capabilityRegistry.register({
        fileType: extension,
        capabilities: parser.manifest.capabilities,
      });
    }
  }

  /**
   * Resolves the best parser for an UploadedFile: candidates are every registered
   * parser whose manifest declares the file's extension, sorted by descending
   * `priority` (ties broken by registration order — first-registered-wins), then
   * the first candidate whose `canParse()` returns true is selected. Deterministic:
   * the same UploadedFile and the same registered parser set always resolve to the
   * same parser.
   */
  resolve(uploadedFile: UploadedFile, extension: string): DocumentContentParser | undefined {
    const normalizedExtension = extension.toLowerCase();
    const candidates = this.parsers
      .map((parser, registrationIndex) => ({ parser, registrationIndex }))
      .filter(({ parser }) => parser.manifest.supportedExtensions.includes(normalizedExtension))
      .sort((a, b) => {
        if (b.parser.manifest.priority !== a.parser.manifest.priority) {
          return b.parser.manifest.priority - a.parser.manifest.priority;
        }
        return a.registrationIndex - b.registrationIndex;
      });

    for (const { parser } of candidates) {
      if (parser.canParse(uploadedFile)) {
        return parser;
      }
    }
    return undefined;
  }

  resolveStrict(uploadedFile: UploadedFile, extension: string): DocumentContentParser {
    const parser = this.resolve(uploadedFile, extension);
    if (!parser) {
      throw new ExtractionError(`No registered parser can handle extension "${extension}"`, {
        details: { extension, fileName: uploadedFile.fileName },
      });
    }
    return parser;
  }

  manifests(): readonly ParserManifest[] {
    return this.parsers.map((p) => p.manifest);
  }

  get capabilities(): CapabilityRegistry {
    return this.capabilityRegistry;
  }
}
