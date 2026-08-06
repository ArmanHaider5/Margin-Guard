import { deriveCompositeId, Money } from "../../../shared/index.js";
import type { EvidenceObject, StructuredDocument } from "../../../shared/index.js";
import { groupByColumn } from "../../evidence/financial-evidence-rules.js";
import type { Revenue, Expense } from "../../models/financial-object-model.js";

/**
 * The Profitability Capability Pack's Financial Object construction —
 * mirrors `capabilities/liquidity/current-asset-liability-builder.ts`'s
 * approach exactly: group `EvidenceObject[]` by (tableId, column), keep only
 * columns normalized to the relevant Ontology term, and use a disclosed,
 * non-ontology-bound row-label heuristic to pick out the specific rows that
 * matter — since neither "Cost of Goods Sold" nor "Operating Expenses" is a
 * registered Ontology term (`knowledge/ontology-terms-data.ts` has only the
 * generic "Expense").
 */

const DEFAULT_CURRENCY_CODE = "MYR";

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

/**
 * Revenue requires an explicit "Total Revenue"/"Total Sales" subtotal row —
 * same double-counting-avoidance reasoning as
 * `current-asset-liability-builder.ts`'s subtotal requirement (see that
 * file's comment, and `docs/98_TECHNICAL_BACKLOG.md` LC-001, which this
 * pack's equivalent gap — PC-001 — generalizes).
 */
function isTotalRevenueLabel(label: string): boolean {
  return /\btotal\b/i.test(label) && /\brevenue\b|\bsales\b/i.test(label);
}

/**
 * COGS does NOT require a "total" keyword — a single "Cost of Goods Sold" /
 * "Cost of Sales" line is, by convention, definitionally already the total;
 * there is no equivalent double-counting risk from multiple distinct COGS
 * line items the way there is for Current Assets or Operating Expenses. This
 * asymmetry with `isTotalOperatingExpensesLabel` below is intentional, not
 * an oversight — disclosed here and in `docs/98_TECHNICAL_BACKLOG.md` PC-001.
 */
function isCogsLabel(label: string): boolean {
  return /\bcost\s+of\s+(goods|sales)\b|\bcogs\b/i.test(label);
}

/** Requires "total", for the same reason `isTotalRevenueLabel` does — a P&L
 * commonly lists several operating-expense line items (rent, salaries,
 * marketing, ...) followed by one "Total Operating Expenses" subtotal;
 * summing every individual line item as well as the subtotal would
 * double-count. */
function isTotalOperatingExpensesLabel(label: string): boolean {
  return /\btotal\b/i.test(label) && /\boperating\s+expenses?\b/i.test(label);
}

export interface RevenueAndExpenses {
  readonly revenue: readonly Revenue[];
  readonly expenses: readonly Expense[];
}

export function buildRevenueAndExpenses(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): RevenueAndExpenses {
  const groups = groupByColumn(evidence, document.normalizedTerms);
  const revenue: Revenue[] = [];
  const expenses: Expense[] = [];

  for (const group of groups) {
    if (group.canonicalTerm !== "Revenue" && group.canonicalTerm !== "Expense") continue;

    for (const entity of group.entities) {
      if (entity.factType !== "amount") continue;
      const label = rowLabel(document, group.tableId, entity.sourceLocation.row);
      if (!label) continue;
      const parsed = parseAmountAndCurrency(entity);
      if (!parsed) continue;

      if (group.canonicalTerm === "Revenue" && isTotalRevenueLabel(label)) {
        revenue.push({
          id: deriveCompositeId(["financial-object", "revenue", document.documentId, entity.id]).slice(0, 16),
          totalValue: Money.create(parsed.amount, parsed.currencyCode),
          confidence: entity.confidence,
          evidenceObjectIds: [entity.id],
        });
      } else if (group.canonicalTerm === "Expense" && isCogsLabel(label)) {
        expenses.push({
          id: deriveCompositeId(["financial-object", "expense", "cogs", document.documentId, entity.id]).slice(0, 16),
          category: "cogs",
          totalValue: Money.create(parsed.amount, parsed.currencyCode),
          confidence: entity.confidence,
          evidenceObjectIds: [entity.id],
        });
      } else if (group.canonicalTerm === "Expense" && isTotalOperatingExpensesLabel(label)) {
        expenses.push({
          id: deriveCompositeId(["financial-object", "expense", "operating", document.documentId, entity.id]).slice(0, 16),
          category: "operating",
          totalValue: Money.create(parsed.amount, parsed.currencyCode),
          confidence: entity.confidence,
          evidenceObjectIds: [entity.id],
        });
      }
      // An Expense row matching neither pattern (e.g. interest, tax,
      // depreciation shown outside either heading) is intentionally not
      // constructed — see docs/98_TECHNICAL_BACKLOG.md PC-001.
    }
  }

  return { revenue, expenses };
}
