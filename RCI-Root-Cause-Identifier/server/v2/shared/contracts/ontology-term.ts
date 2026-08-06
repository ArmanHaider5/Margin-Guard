/**
 * A single canonical business term traceable to the approved Scope Optix Business
 * Ontology (or a document it governs, such as the Financial Object Model). Consumed
 * by `server/v2/knowledge/`'s Ontology Registry — per ADR-002, terminology
 * normalization anywhere in the platform may only ever emit a canonical term backed
 * by one of these, never an invented one.
 */
export interface OntologyTerm {
  readonly canonicalTerm: string;
  readonly sourceReference: string;
  readonly category: string;
  readonly synonyms: readonly string[];
}
