import { ConfigurationError } from "../errors/index.js";
import type { ParserCapabilityDeclaration } from "../contracts/index.js";

/**
 * Tracks what each registered file type's extractor actually supports, so the
 * platform never hardcodes an assumption ("PDFs always support tables") inline in
 * business logic — a caller asks the registry instead. Deterministic: registration
 * order does not affect query results, and duplicate registration for the same file
 * type is rejected rather than silently overwritten.
 */
export class CapabilityRegistry {
  private readonly declarations = new Map<string, ParserCapabilityDeclaration>();

  register(declaration: ParserCapabilityDeclaration): void {
    if (this.declarations.has(declaration.fileType)) {
      throw new ConfigurationError(
        `Capabilities for file type "${declaration.fileType}" are already registered`,
        { details: { fileType: declaration.fileType } },
      );
    }
    this.declarations.set(declaration.fileType, declaration);
  }

  supports(fileType: string, capability: string): boolean {
    return this.declarations.get(fileType)?.capabilities.includes(capability) ?? false;
  }

  capabilitiesFor(fileType: string): readonly string[] {
    return this.declarations.get(fileType)?.capabilities ?? [];
  }

  registeredFileTypes(): readonly string[] {
    return Array.from(this.declarations.keys());
  }
}
