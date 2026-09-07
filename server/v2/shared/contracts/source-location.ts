/**
 * Points at exactly where, within a source document, a piece of extracted content
 * came from. Every Evidence-adjacent object in the platform carries one of these,
 * per the Data Model's explainability requirement (`03_MGD_DATA_MODEL.md` §2.4) that
 * every fact must resolve to a specific document location, not merely "the document."
 *
 * All fields are optional because not every source type carries every dimension
 * (a narrative PDF page has no `column`; a spreadsheet cell has no `charOffset`) —
 * a `SourceLocation` with every field `undefined` is invalid in practice (something
 * must anchor the location), but which fields are populated depends on what kind of
 * content is being located.
 */
export interface SourceLocation {
  readonly sectionId?: string;
  readonly tableId?: string;
  readonly row?: number;
  readonly column?: number;
  readonly charOffset?: number;
}
