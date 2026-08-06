import type { Confidence } from "../value-objects/index.js";
import type { SourceLocation } from "./source-location.js";

/** The recognized category of an extracted entity. Deliberately generic — not
 * chart-of-accounts or industry-specific; that interpretation belongs to future
 * Financial/Operational Intelligence modules, per `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`'s
 * scope boundary with this sprint. */
export type EntityType =
  | "amount"
  | "date"
  | "percentage"
  | "reference_id"
  | "organization_name"
  | "person_name"
  | "quantity"
  | "other";

/**
 * A single recognized fact within a document, at three levels of refinement:
 * `rawValue` is exactly what appeared in the source ("RM1,000.00"); `observedValue`
 * is the parsed, typed value with no further interpretation (1000); a later stage
 * (terminology/ontology normalization) may add unit/currency context on top of this
 * when it is converted to an `EvidenceObject`'s `normalizedValue` ("1000 MYR"). This
 * three-level distinction is permanent platform design, not specific to this sprint.
 */
export interface ExtractedEntity {
  readonly id: string;
  readonly type: EntityType;
  readonly sourceLocation: SourceLocation;
  readonly rawValue: string;
  readonly observedValue?: string | number | boolean;
  readonly confidence: Confidence;
}
