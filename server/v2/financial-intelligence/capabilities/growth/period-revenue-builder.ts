import { deriveCompositeId, Money } from "../../../shared/index.js";
import type { EvidenceObject, StructuredDocument } from "../../../shared/index.js";
import { groupByColumn } from "../../evidence/financial-evidence-rules.js";
import type { Revenue } from "../../models/financial-object-model.js";

/**
 * The Growth Capability Pack's Financial Object construction — builds exactly
 * two `Revenue` entries tagged `periodSequence: "prior"` / `"current"` from
 * the **last two rows, in row order**, of a Revenue-normalized column. This
 * is a genuinely different selection from Profitability's
 * `buildRevenueAndExpenses` (which keeps only an explicit "Total Revenue"
 * subtotal row, one aggregate per document) — not a duplicate of it, the
 * same "same column, different rows" precedent Working Capital's builder
 * established relative to Liquidity's.
 *
 * Row-sequence as a period proxy is not new: the frozen
 * `FinancialEvidenceClassifier`'s own `revenue_growth` trend detector
 * (`evidence/financial-evidence-rules.ts`'s `detectTrend`) already treats
 * "successive rows in one normalized column, sorted by row" as a document's
 * implicit time axis — this builder reuses that exact, already-accepted
 * assumption at the Financial Object layer instead of inventing a new one.
 * No real `Period` (date-boundary) value is ever constructed here — `period`
 * is left `undefined` on both objects, since no reliable date/period
 * detection exists on this platform (see `docs/98_TECHNICAL_BACKLOG.md`
 * PC-003, extended by GR-001 for this specific row-sequence-proxy use).
 *
 * A row matching the "Total Revenue"/"Total Sales" subtotal pattern is
 * excluded from the sequence — mixing an aggregate subtotal into a
 * period-by-period sequence would silently corrupt the growth comparison
 * (comparing one real period against the sum of several). The regex mirrors
 * `capabilities/profitability/revenue-expense-builder.ts`'s own
 * `isTotalRevenueLabel` exactly; duplicated here (not imported) to avoid
 * modifying frozen Profitability code for a single boolean predicate.
 */

const DEFAULT_CURRENCY_CODE = "MYR";

function isTotalRevenueLabel(label: string): boolean {
  return /\btotal\b/i.test(label) && /\brevenue\b|\bsales\b/i.test(label);
}

function parseAmountAndCurrency(entity: EvidenceObject): { amount: number; currencyCode: string } | undefined {
  if (typeof entity.normalizedValue === "string") {
    const match = /^(-?\d+(?:\.\d+)?)\s+([A-Z]{3})$/.exec(entity.normalizedValue);
    if (match) return { amount: Number(match[1]), currencyCode: match[2] };
  }
  if (typeof entity.observedValue === "number") {
    return { amount: entity.observedValue, currencyCode: DEFAULT_CURRENCY_CODE };
  }
  return undefined;
}

function rowLabel(document: StructuredDocument, tableId: string, row: number | undefined): string | undefined {
  if (row === undefined) return undefined;
  const table = document.tables.find((t) => t.id === tableId);
  const cell = table?.rows[row]?.[0];
  return cell && cell.trim().length > 0 ? cell : undefined;
}

export function buildPeriodRevenueSequence(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): readonly Revenue[] {
  const groups = groupByColumn(evidence, document.normalizedTerms);
  const periodRevenue: Revenue[] = [];

  for (const group of groups) {
    if (group.canonicalTerm !== "Revenue") continue;

    const candidates = group.entities
      .filter((e) => e.factType === "amount")
      .filter((e) => {
        const label = rowLabel(document, group.tableId, e.sourceLocation.row);
        return !label || !isTotalRevenueLabel(label);
      })
      .sort((a, b) => (a.sourceLocation.row ?? 0) - (b.sourceLocation.row ?? 0));

    if (candidates.length < 2) continue;

    const [priorEntity, currentEntity] = candidates.slice(-2);
    const priorParsed = parseAmountAndCurrency(priorEntity);
    const currentParsed = parseAmountAndCurrency(currentEntity);
    if (!priorParsed || !currentParsed) continue;

    periodRevenue.push({
      id: deriveCompositeId(["financial-object", "revenue", "prior", document.documentId, priorEntity.id]).slice(0, 16),
      totalValue: Money.create(priorParsed.amount, priorParsed.currencyCode),
      periodSequence: "prior",
      confidence: priorEntity.confidence,
      evidenceObjectIds: [priorEntity.id],
    });
    periodRevenue.push({
      id: deriveCompositeId(["financial-object", "revenue", "current", document.documentId, currentEntity.id]).slice(0, 16),
      totalValue: Money.create(currentParsed.amount, currentParsed.currencyCode),
      periodSequence: "current",
      confidence: currentEntity.confidence,
      evidenceObjectIds: [currentEntity.id],
    });
  }

  return periodRevenue;
}
