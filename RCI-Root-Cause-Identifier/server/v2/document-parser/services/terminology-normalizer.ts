import { Confidence } from "../../shared/index.js";
import type { NormalizedTermMapping, SourceLocation } from "../../shared/index.js";
import type { OntologyRegistry } from "../../knowledge/index.js";
import type { WithDiagnostics } from "../types.js";
import { createDiagnostic } from "../diagnostics.js";

const STAGE = "TerminologyNormalizer";

function loosen(label: string): string {
  return label.replace(/[^a-zA-Z0-9\s]/g, "").trim();
}

function singularize(label: string): string {
  return label.endsWith("s") && label.length > 3 ? label.slice(0, -1) : label;
}

export interface LabeledSource {
  readonly label: string;
  readonly sourceLocation?: SourceLocation;
}

export interface TerminologyNormalizerService {
  normalize(
    labels: readonly LabeledSource[],
    ontologyRegistry: OntologyRegistry,
  ): WithDiagnostics<readonly NormalizedTermMapping[]>;
}

/**
 * Resolves recognized labels (table headers, section labels) EXCLUSIVELY through
 * the OntologyRegistry — per ADR-002, there is no standalone synonym table anywhere
 * in this file, and no AI call. An exact match (case-insensitive, against a term's
 * canonical name or a registered synonym) is high confidence. A "loosened" string
 * comparison (punctuation stripped, simple singularization) is attempted only as a
 * fallback, is STILL matched against the same OntologyRegistry — never a separate
 * vocabulary — and always carries a reduced confidence plus an explicit diagnostic,
 * satisfying "no heuristic guessing without confidence reduction." A label with no
 * match at all — the normal, expected case for most domain-specific headers not yet
 * in the Ontology — produces no mapping and no diagnostic; that is the safe default,
 * not a failure.
 */
export class TerminologyNormalizer implements TerminologyNormalizerService {
  normalize(
    labels: readonly LabeledSource[],
    ontologyRegistry: OntologyRegistry,
  ): WithDiagnostics<readonly NormalizedTermMapping[]> {
    const mappings: NormalizedTermMapping[] = [];
    const diagnostics = [];

    for (const { label, sourceLocation } of labels) {
      if (!label || label.trim().length === 0) continue;

      const exact = ontologyRegistry.match(label);
      if (exact) {
        mappings.push({
          originalTerm: label,
          canonicalTerm: exact.canonicalTerm,
          ontologyReference: exact.sourceReference,
          sourceLocation,
          confidence: Confidence.create(0.9),
        });
        continue;
      }

      const loosened = loosen(label);
      const loosenedMatch = ontologyRegistry.match(loosened) ?? ontologyRegistry.match(singularize(loosened));
      if (loosenedMatch) {
        mappings.push({
          originalTerm: label,
          canonicalTerm: loosenedMatch.canonicalTerm,
          ontologyReference: loosenedMatch.sourceReference,
          sourceLocation,
          confidence: Confidence.create(0.55),
        });
        diagnostics.push(
          createDiagnostic({
            stage: STAGE,
            origin: "Ontology",
            severity: "recovery",
            message: `Label "${label}" matched Ontology term "${loosenedMatch.canonicalTerm}" only after loosening punctuation/pluralization`,
            recommendation: "Verify this mapping is correct; consider adding this exact label as a registered synonym.",
            recoverable: true,
            confidenceImpact: -0.35,
            sourceLocation,
          }),
        );
      }
      // No match at all: intentionally silent — see class doc comment.
    }

    return { value: mappings, diagnostics };
  }
}
