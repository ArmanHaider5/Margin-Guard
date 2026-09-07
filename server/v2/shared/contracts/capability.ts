/**
 * A declaration of what a given file type's extractor actually supports — e.g.
 * xlsx declaring ["tables", "sheets", "merged_cells", "formulas", "hidden_sheets"],
 * PDF declaring ["pages", "tables", "text"], a future image extractor declaring
 * ["ocr", "layout", "rotation"]. Consulted by `shared/utils/capability-registry.ts`
 * so the platform never hardcodes an assumption like "PDFs always support tables"
 * inline in business logic.
 */
export interface ParserCapabilityDeclaration {
  readonly fileType: string;
  readonly capabilities: readonly string[];
}
