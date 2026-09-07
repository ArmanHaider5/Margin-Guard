import type { Confidence } from "../value-objects/index.js";
import type { SourceLocation } from "./source-location.js";

/**
 * The result of matching a recognized label (e.g. a column header) against the
 * Scope Optix Business Ontology term registry (`server/v2/knowledge/`). Per
 * `00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md` and ADR-002, a mapping is only ever emitted
 * when a genuine match exists — `ontologyReference` is mandatory here (not optional)
 * precisely because this type only exists to represent a successful, traceable match;
 * unmatched labels are simply not represented by any `NormalizedTermMapping` at all.
 */
export interface NormalizedTermMapping {
  readonly originalTerm: string;
  readonly canonicalTerm: string;
  readonly ontologyReference: string;
  readonly sourceLocation?: SourceLocation;
  readonly confidence: Confidence;
}
