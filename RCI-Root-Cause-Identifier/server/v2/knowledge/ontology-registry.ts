import { ConfigurationError, OntologyError } from "../shared/index.js";
import type { OntologyTerm } from "../shared/index.js";
import { BUILT_IN_ONTOLOGY_TERMS } from "./ontology-terms-data.js";

/**
 * Holds the platform's Ontology-grounded term vocabulary and matches recognized
 * labels (e.g. spreadsheet column headers) against it. Per ADR-002, this is the
 * ONLY mechanism `document-parser/`'s terminology normalization may use — there is
 * no standalone/arbitrary synonym list anywhere else in the codebase.
 *
 * Matching is deterministic: exact `canonicalTerm` match wins first, then exact
 * synonym match, both case-insensitive; ties (a label matching two different terms'
 * synonym lists) resolve to whichever term was registered first — the same
 * first-registered-wins rule used elsewhere in the platform's rule registries.
 */
export class OntologyRegistry {
  private readonly termsByCanonical = new Map<string, OntologyTerm>();
  private readonly lookupIndex = new Map<string, OntologyTerm>();

  register(term: OntologyTerm): void {
    if (this.termsByCanonical.has(term.canonicalTerm)) {
      throw new ConfigurationError(
        `Ontology term "${term.canonicalTerm}" is already registered`,
        { details: { canonicalTerm: term.canonicalTerm } },
      );
    }
    this.termsByCanonical.set(term.canonicalTerm, term);

    const keys = [term.canonicalTerm, ...term.synonyms].map((key) => key.toLowerCase());
    for (const key of keys) {
      if (!this.lookupIndex.has(key)) {
        this.lookupIndex.set(key, term);
      }
      // If `key` is already indexed, the first-registered term keeps it —
      // deterministic first-registered-wins tie-break, never overwritten silently.
    }
  }

  /** Returns the matching OntologyTerm for a label, or `undefined` if no term is
   * traceable to an approved document for this label — never invents a match. */
  match(label: string): OntologyTerm | undefined {
    if (typeof label !== "string" || label.trim().length === 0) {
      return undefined;
    }
    return this.lookupIndex.get(label.trim().toLowerCase());
  }

  /** Strict variant of `match()` for callers that require a match to proceed —
   * raises OntologyError rather than returning undefined. */
  matchStrict(label: string): OntologyTerm {
    const term = this.match(label);
    if (!term) {
      throw new OntologyError(`No Ontology term is traceable for label "${label}"`, {
        details: { label },
      });
    }
    return term;
  }

  allTerms(): readonly OntologyTerm[] {
    return Array.from(this.termsByCanonical.values());
  }
}

/** Builds an OntologyRegistry pre-seeded with the platform's v1 built-in term set. */
export function createDefaultOntologyRegistry(): OntologyRegistry {
  const registry = new OntologyRegistry();
  for (const term of BUILT_IN_ONTOLOGY_TERMS) {
    registry.register(term);
  }
  return registry;
}
