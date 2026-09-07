import { deriveCompositeId } from "../../shared/index.js";
import type { EvidenceObject, ExtractedEntity, NormalizedTermMapping, StructuredDocument } from "../../shared/index.js";

const CURRENCY_SYMBOLS: ReadonlyArray<{ pattern: RegExp; code: string }> = [
  { pattern: /RM/i, code: "MYR" },
  { pattern: /\$/, code: "USD" },
  { pattern: /€/, code: "EUR" },
  { pattern: /£/, code: "GBP" },
];

/** Best-effort currency enrichment: "RM1,000.00" → observedValue 1000 →
 * normalizedValue "1000 MYR". Intentionally modest — full currency/unit
 * normalization is Financial Intelligence's job (`05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`);
 * this is the Document Parser's illustration of the permanent rawValue →
 * observedValue → normalizedValue distinction, not a complete implementation of it. */
function deriveNormalizedValue(entity: ExtractedEntity): string | number | undefined {
  if (entity.type !== "amount" || typeof entity.observedValue !== "number") return undefined;
  const currency = CURRENCY_SYMBOLS.find(({ pattern }) => pattern.test(entity.rawValue));
  return currency ? `${entity.observedValue} ${currency.code}` : undefined;
}

/** Best-effort: an entity found in table cell (tableId, column) is associated with
 * whichever NormalizedTermMapping was derived from that same table's header at that
 * column — i.e. the ontology concept the entity's *column* represents. */
function findOntologyReference(
  entity: ExtractedEntity,
  normalizedTerms: readonly NormalizedTermMapping[],
): string | undefined {
  if (entity.sourceLocation.tableId === undefined || entity.sourceLocation.column === undefined) return undefined;
  const match = normalizedTerms.find(
    (term) =>
      term.sourceLocation?.tableId === entity.sourceLocation.tableId &&
      term.sourceLocation?.column === entity.sourceLocation.column,
  );
  return match?.ontologyReference;
}

export interface EvidenceObjectBuilderService {
  build(document: StructuredDocument, extractedAt: Date): readonly EvidenceObject[];
}

/**
 * Converts a StructuredDocument's entities into candidate, source-traceable
 * EvidenceObjects (`03_MGD_DATA_MODEL.md` §2.4) — NOT validated by Evidence Rules,
 * NOT classified into a Signal, NOT a Finding (ADR-004, ADR-006). This is the
 * Document Parser's final output, one step short of interpretation.
 */
export class EvidenceObjectBuilder implements EvidenceObjectBuilderService {
  build(document: StructuredDocument, extractedAt: Date): readonly EvidenceObject[] {
    return document.entities.map((entity) => {
      const id = deriveCompositeId([
        "evidence",
        document.documentId,
        entity.id,
      ]).slice(0, 16);

      return {
        id,
        documentId: document.documentId,
        sourceLocation: entity.sourceLocation,
        factType: entity.type,
        rawValue: entity.rawValue,
        observedValue: entity.observedValue,
        normalizedValue: deriveNormalizedValue(entity),
        ontologyReference: findOntologyReference(entity, document.normalizedTerms),
        confidence: entity.confidence,
        extractedAt: extractedAt.toISOString(),
      };
    });
  }
}
