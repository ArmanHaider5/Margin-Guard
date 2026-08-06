/**
 * Public entry point for the shared error hierarchy. Nothing outside `shared/` may
 * import from a sibling file directly (e.g. `shared/errors/ontology-error.ts`) —
 * only from this barrel, per the platform's one-public-entry-point rule
 * (see `server/v2/README.md`).
 */
export { DocumentParserError } from "./document-parser-error.js";
export { ValidationError } from "./validation-error.js";
export { ExtractionError } from "./extraction-error.js";
export { OntologyError } from "./ontology-error.js";
export { CapabilityError } from "./capability-error.js";
export { ConfigurationError } from "./configuration-error.js";
