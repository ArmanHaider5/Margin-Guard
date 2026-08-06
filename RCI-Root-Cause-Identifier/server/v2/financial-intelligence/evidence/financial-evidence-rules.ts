import { deriveCompositeId, Confidence } from "../../shared/index.js";
import type { EvidenceObject, FinancialEvidence, FinancialEvidenceType, NormalizedTermMapping } from "../../shared/index.js";

/** One column's worth of evidence within one table, plus whatever Ontology term
 * (if any) that column's header was normalized to. */
export interface ColumnGroup {
  readonly tableId: string;
  readonly column: number;
  readonly canonicalTerm?: string;
  readonly entities: readonly EvidenceObject[];
}

/** Groups a document's EvidenceObjects by (tableId, column) and attaches each
 * group's canonical Ontology term where the column header was normalized to one —
 * the foundation every rule below operates on. */
export function groupByColumn(
  evidence: readonly EvidenceObject[],
  normalizedTerms: readonly NormalizedTermMapping[],
): readonly ColumnGroup[] {
  const groups = new Map<string, EvidenceObject[]>();
  for (const item of evidence) {
    if (item.sourceLocation.tableId === undefined || item.sourceLocation.column === undefined) continue;
    const key = `${item.sourceLocation.tableId}::${item.sourceLocation.column}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return Array.from(groups.entries()).map(([key, entities]) => {
    const [tableId, columnStr] = key.split("::");
    const column = Number(columnStr);
    const termMatch = normalizedTerms.find((t) => t.sourceLocation?.tableId === tableId && t.sourceLocation?.column === column);
    return { tableId, column, canonicalTerm: termMatch?.canonicalTerm, entities };
  });
}

function amountsInRowOrder(group: ColumnGroup): number[] {
  return group.entities
    .filter((e) => e.factType === "amount" && typeof e.observedValue === "number")
    .sort((a, b) => (a.sourceLocation.row ?? 0) - (b.sourceLocation.row ?? 0))
    .map((e) => e.observedValue as number);
}

function makeEvidence(
  documentId: string,
  type: FinancialEvidenceType,
  entities: readonly EvidenceObject[],
  confidence: number,
  basis: string,
): FinancialEvidence {
  return {
    id: deriveCompositeId(["financial-evidence", type, documentId, ...entities.map((e) => e.id)]).slice(0, 16),
    type,
    evidenceObjectIds: entities.map((e) => e.id),
    documentId,
    confidence: Confidence.create(confidence),
    basis,
  };
}

/**
 * Trend-based rule: a monotonic (increasing or decreasing) sequence of ≥2 amounts
 * within one column whose header was normalized to `ontologyTerm`. Direction is
 * recorded in `basis`, not encoded in the FinancialEvidenceType itself (per FIF's
 * type naming, evidence "of" a trend, not "of increase" specifically).
 */
function detectTrend(
  documentId: string,
  group: ColumnGroup,
  ontologyTerm: string,
  type: FinancialEvidenceType,
): FinancialEvidence | undefined {
  if (group.canonicalTerm !== ontologyTerm) return undefined;
  const amounts = amountsInRowOrder(group);
  if (amounts.length < 2) return undefined;

  const increasing = amounts.every((v, i) => i === 0 || v >= amounts[i - 1]);
  const decreasing = amounts.every((v, i) => i === 0 || v <= amounts[i - 1]);
  if (!increasing && !decreasing) return undefined;

  const amountEntities = group.entities.filter((e) => e.factType === "amount");
  const direction = increasing ? "increasing" : "decreasing";
  return makeEvidence(
    documentId,
    type,
    amountEntities,
    0.6,
    `${ontologyTerm} shows a ${direction} trend across ${amounts.length} observed values (${amounts.join(" -> ")}) in the same table column.`,
  );
}

/**
 * Two entries in the same column sharing an identical amount within a couple of
 * rows of each other — the classic duplicate-payment pattern. Deliberately not
 * gated on `canonicalTerm` — duplicate payments can appear in any amount column,
 * not only ones normalized to a specific Ontology concept.
 */
function detectDuplicatePayments(documentId: string, group: ColumnGroup): FinancialEvidence[] {
  const amounts = group.entities.filter((e) => e.factType === "amount" && typeof e.observedValue === "number");
  const found: FinancialEvidence[] = [];
  for (let i = 0; i < amounts.length; i += 1) {
    for (let j = i + 1; j < amounts.length; j += 1) {
      if (amounts[i].observedValue === amounts[j].observedValue) {
        const rowGap = Math.abs((amounts[i].sourceLocation.row ?? 0) - (amounts[j].sourceLocation.row ?? 0));
        if (rowGap <= 2) {
          found.push(
            makeEvidence(
              documentId,
              "duplicate_payments",
              [amounts[i], amounts[j]],
              0.55,
              `Two amounts of identical value (${amounts[i].rawValue}) appear within ${rowGap} row(s) of each other in the same table.`,
            ),
          );
        }
      }
    }
  }
  return found;
}

/** A low or negative amount in a column whose header context suggests cash — a
 * modest, keyword-assisted heuristic (not Ontology-bound, since "Cash" is not yet
 * a registered Ontology term), explicitly noted as such. */
function detectCashShortages(documentId: string, group: ColumnGroup, headerText: string | undefined): FinancialEvidence | undefined {
  if (!headerText || !/cash/i.test(headerText)) return undefined;
  const negatives = group.entities.filter((e) => e.factType === "amount" && typeof e.observedValue === "number" && (e.observedValue as number) < 0);
  if (negatives.length === 0) return undefined;
  return makeEvidence(
    documentId,
    "cash_shortages",
    negatives,
    0.5,
    `Column header "${headerText}" suggests a cash-related field; ${negatives.length} negative value(s) observed.`,
  );
}

/** A single entity's share of the column's total amount exceeds a documented
 * concentration threshold — the same detector produces revenue_concentration /
 * customer_dependency or supplier_dependency depending on nearby context. */
function detectConcentration(
  documentId: string,
  amountGroup: ColumnGroup,
  nameGroup: ColumnGroup | undefined,
  contextIsSales: boolean,
): FinancialEvidence[] {
  if (!nameGroup) return [];
  const amounts = amountGroup.entities.filter((e) => e.factType === "amount" && typeof e.observedValue === "number");
  const total = amounts.reduce((sum, e) => sum + (e.observedValue as number), 0);
  if (total <= 0) return [];

  const CONCENTRATION_THRESHOLD = 0.25;
  const results: FinancialEvidence[] = [];
  for (const amountEntity of amounts) {
    const share = (amountEntity.observedValue as number) / total;
    if (share >= CONCENTRATION_THRESHOLD) {
      const nameEntity = nameGroup.entities.find((n) => n.sourceLocation.row === amountEntity.sourceLocation.row);
      const type: FinancialEvidenceType = contextIsSales ? "revenue_concentration" : "supplier_dependency";
      results.push(
        makeEvidence(
          documentId,
          type,
          nameEntity ? [amountEntity, nameEntity] : [amountEntity],
          0.5,
          `${nameEntity?.rawValue ?? "A single entity"} accounts for ${(share * 100).toFixed(0)}% of the column total.`,
        ),
      );
      if (contextIsSales) {
        results.push(
          makeEvidence(
            documentId,
            "customer_dependency",
            nameEntity ? [amountEntity, nameEntity] : [amountEntity],
            0.5,
            `${nameEntity?.rawValue ?? "A single customer"} represents ${(share * 100).toFixed(0)}% of observed revenue in this table.`,
          ),
        );
      }
    }
  }
  return results;
}

/** Ageing-bucket header detection (e.g. "0-30", "31-60", "Current", "Overdue") —
 * a real, regex-detectable structural pattern distinguishing an ageing schedule
 * table from a generic amount table. */
export function isAgeingBucketHeader(header: string): boolean {
  return /\b\d{1,3}\s*-\s*\d{1,3}\b|\bcurrent\b|\boverdue\b|\bover\s*\d+\b/i.test(header);
}

/** Same-table subtotal check: a row labeled Total/Subtotal whose value does not
 * match the sum of the amount rows above it. */
function detectReconciliationMismatch(
  documentId: string,
  group: ColumnGroup,
  headerText: string | undefined,
): FinancialEvidence | undefined {
  const amounts = group.entities
    .filter((e) => e.factType === "amount" && typeof e.observedValue === "number")
    .sort((a, b) => (a.sourceLocation.row ?? 0) - (b.sourceLocation.row ?? 0));
  if (amounts.length < 3) return undefined;

  const last = amounts[amounts.length - 1];
  const rest = amounts.slice(0, -1);
  const sumOfRest = rest.reduce((sum, e) => sum + (e.observedValue as number), 0);
  const lastValue = last.observedValue as number;
  const withinTolerance = Math.abs(sumOfRest - lastValue) < Math.max(0.01, Math.abs(lastValue) * 0.001);

  if (withinTolerance) return undefined;
  return makeEvidence(
    documentId,
    "missing_reconciliations",
    [last, ...rest],
    0.45,
    `The final value in this column (${last.rawValue}) does not match the sum of the preceding ${rest.length} value(s) (expected ~${sumOfRest.toFixed(2)}); ${headerText ? `column header: "${headerText}"` : "no header available"}.`,
  );
}

export const financialEvidenceDetectors = {
  detectTrend,
  detectDuplicatePayments,
  detectCashShortages,
  detectConcentration,
  detectReconciliationMismatch,
};
