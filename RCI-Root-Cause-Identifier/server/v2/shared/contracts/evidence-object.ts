import type { Confidence } from "../value-objects/index.js";
import type { SourceLocation } from "./source-location.js";

/**
 * A candidate, source-traceable fact derived from a StructuredDocument — the
 * platform's canonical Evidence shape (`03_MGD_DATA_MODEL.md` §2.4), NOT validated
 * by Evidence Rules, NOT classified into a Signal, NOT a Finding (per ADR-004 and
 * ADR-006). This is the Document Parser's final output, one step short of
 * interpretation, by design.
 *
 * Carries the same three-level value refinement as ExtractedEntity
 * (`rawValue` → `observedValue` → `normalizedValue`), with `normalizedValue` added
 * at this stage specifically because full normalization (e.g. attaching a currency
 * unit) depends on ontology matching, which happens after entity extraction.
 */
export interface EvidenceObject {
  readonly id: string;
  readonly documentId: string;
  readonly sourceLocation: SourceLocation;
  readonly factType: string;
  readonly rawValue: string;
  readonly observedValue?: string | number | boolean;
  readonly normalizedValue?: string | number;
  readonly ontologyReference?: string;
  readonly confidence: Confidence;
  readonly extractedAt: string;
}
