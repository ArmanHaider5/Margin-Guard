import { deriveCompositeId, Money } from "../../../shared/index.js";
import type { EvidenceObject, StructuredDocument } from "../../../shared/index.js";
import { groupByColumn } from "../../evidence/financial-evidence-rules.js";
import type { CashMovement } from "../../models/financial-object-model.js";

/**
 * The Cash Flow Capability Pack's Financial Object construction — builds
 * `CashMovement` entries from a document's `EvidenceObject[]`. Groups by
 * (tableId, column) and keeps only columns normalized to the Ontology term
 * `"Cash Movement"` (`knowledge/ontology-terms-data.ts`, synonyms "Cash Flow
 * Item"/"Cash Transaction") — unlike Liquidity/Profitability's builders,
 * this one needs no non-ontology-bound classification heuristic to tell
 * inflow from outflow: **the sign of the observed amount does that**
 * (positive = inflow, negative = outflow), a deterministic rule requiring no
 * disclosed keyword guess.
 *
 * This pack does not distinguish Operating from Investing/Financing cash
 * flow sections — every constructed CashMovement is treated as
 * operating-scoped, matching the "Operating Cash Flow" framing in this
 * milestone's Financial Objects list. A real Cash Flow Statement's
 * three-section structure would need section-aware table parsing this pack
 * does not yet have — see `docs/98_TECHNICAL_BACKLOG.md` CF-001.
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
 * Excludes a row that is itself a derived subtotal (e.g. "Net Cash from
 * Operating Activities," "Total Operating Cash Flow") — summing it alongside
 * the individual inflow/outflow line items it aggregates would double-count,
 * the same reasoning as every other builder's subtotal exclusion.
 */
function isNetCashSubtotalLabel(label: string): boolean {
  return (/\bnet\b/i.test(label) || /\btotal\b/i.test(label)) && /\bcash\b/i.test(label);
}

export function buildCashMovements(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): readonly CashMovement[] {
  const groups = groupByColumn(evidence, document.normalizedTerms);
  const cashMovements: CashMovement[] = [];

  for (const group of groups) {
    if (group.canonicalTerm !== "Cash Movement") continue;

    for (const entity of group.entities) {
      if (entity.factType !== "amount") continue;
      const label = rowLabel(document, group.tableId, entity.sourceLocation.row);
      if (!label || isNetCashSubtotalLabel(label)) continue;
      const parsed = parseAmountAndCurrency(entity);
      if (!parsed || parsed.amount === 0) continue;

      cashMovements.push({
        id: deriveCompositeId(["financial-object", "cash-movement", document.documentId, entity.id]).slice(0, 16),
        direction: parsed.amount > 0 ? "inflow" : "outflow",
        amount: Money.create(Math.abs(parsed.amount), parsed.currencyCode),
        confidence: entity.confidence,
        evidenceObjectIds: [entity.id],
      });
    }
  }

  return cashMovements;
}
