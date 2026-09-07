/**
 * The permanent plugin-discovery mechanism for parser implementations. Every parser
 * (an xlsx parser, a PDF parser, and — in a future sprint — an OCR/image parser)
 * declares one of these instead of being hardcoded into a switch statement; the
 * framework discovers and selects parsers by matching a file against registered
 * manifests, never by a fixed enum the framework's own code must be edited to extend.
 *
 * `priority` resolves ties when more than one registered parser could handle the
 * same file (e.g. a future specialized parser competing with a general one for the
 * same extension) — higher priority wins; equal priority resolves by
 * first-registered-wins, the same deterministic tie-break used by every other
 * registry in this platform.
 */
export interface ParserManifest {
  readonly id: string;
  readonly version: string;
  readonly supportedExtensions: readonly string[];
  readonly supportedMimeTypes: readonly string[];
  readonly capabilities: readonly string[];
  /** Which source-system versions/generations this parser is known to support —
   * e.g. `["Excel 97-2003", "Excel 2007+"]`, or, for a future ERP-export parser,
   * `["SAP ECC6", "SAP S/4HANA"]`. Distinct from the parser's own `version` field
   * (the parser's own code version) — this describes what it can read, not what it
   * is. */
  readonly supportsVersion: readonly string[];
  readonly priority: number;
  readonly owner: string;
  readonly description: string;
}
