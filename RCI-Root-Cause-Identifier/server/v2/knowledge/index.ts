/**
 * `knowledge/`'s single public entry point (see `server/v2/README.md`).
 *
 * Holds the Ontology-grounded term registry that `document-parser/`'s terminology
 * normalization stage consults (a future milestone), per ADR-002. Will grow into the
 * full Knowledge Library (`docs/04_MGD_KNOWLEDGE_LIBRARY.md`) as later sprints build
 * it out. `knowledge/` is a leaf dependency: it may import only from `shared/`,
 * never from any module that consumes it.
 */
export { OntologyRegistry, createDefaultOntologyRegistry } from "./ontology-registry.js";
export { BUILT_IN_ONTOLOGY_TERMS, ONTOLOGY_CORE_TERMS, FINANCIAL_OBJECT_MODEL_TERMS } from "./ontology-terms-data.js";
export type { OntologyTerm } from "../shared/index.js";
