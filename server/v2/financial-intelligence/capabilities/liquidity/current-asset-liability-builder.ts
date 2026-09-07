import { deriveCompositeId, Money } from "../../../shared/index.js";
import type { EvidenceObject, StructuredDocument } from "../../../shared/index.js";
import { groupByColumn } from "../../evidence/financial-evidence-rules.js";
import type { Asset, Liability } from "../../models/financial-object-model.js";

/**
 * The first real Financial Object construction logic in `financial-intelligence/` —
 * builds `Asset`/`Liability` instances classified `"current"` from a document's
 * `EvidenceObject[]`, scoped narrowly to what the Liquidity Capability Pack needs
 * (`total_current_assets`/`total_current_liabilities`). Every other Financial
 * Object Model type remains unpopulated until its own capability pack is built.
 *
 * Reuses `groupByColumn` from `evidence/financial-evidence-rules.ts` — the same
 * (tableId, column) grouping + Ontology-normalized-header lookup already used by
 * `FinancialEvidenceClassifier`, not a second, parallel mechanism.
 */

/**
 * Two disclosed, non-ontology-bound heuristics, mirroring the same documented
 * exception already established for `cash_shortages`' "Cash" keyword match
 * (`evidence/financial-evidence-rules.ts`) — "Current Asset"/"Current
 * Liability" are not yet registered Ontology terms
 * (`knowledge/ontology-terms-data.ts`), so classification is detected from the
 * row's label text (the table's first cell in that row) rather than from a
 * canonical term match. Deliberately requires an explicit "Total Current
 * Assets"/"Total Current Liabilities"-shaped subtotal row — individual
 * current-asset/liability line items are not summed without one, since doing
 * so risks double-counting a line item alongside its own subtotal. This is a
 * stated limitation (see `docs/98_TECHNICAL_BACKLOG.md`), not silent guessing.
 *
 * **Defect fix (Leverage Capability Pack milestone, permitted under "frozen
 * except defect fixes"):** `/\bcurrent\b/i` alone also matched inside
 * "Non-Current" (the hyphen in "Non-Current" is a non-word character, so a
 * `\b` word boundary exists immediately before "Current" there too) — a row
 * labeled "Total Non-Current Liabilities" was silently misclassified as
 * `"current"`, double-counting it once the Leverage pack started
 * constructing a genuine `"non_current"` counterpart from the same row (see
 * `docs/98_TECHNICAL_BACKLOG.md` LC-003). Never caught earlier because no
 * fixture before Leverage's ever included both a "Total Current ..." and a
 * "Total Non-Current ..." row in the same table. Fixed by explicitly
 * excluding "non-current"/"non current"/"noncurrent" labels.
 */
function isCurrentAssetsSubtotalLabel(label: string): boolean {
  if (/\bnon.?current\b/i.test(label)) return false;
  return /\btotal\b/i.test(label) && /\bcurrent\b/i.test(label) && /\bassets?\b/i.test(label);
}

function isCurrentLiabilitiesSubtotalLabel(label: string): boolean {
  if (/\bnon.?current\b/i.test(label)) return false;
  return /\btotal\b/i.test(label) && /\bcurrent\b/i.test(label) && /\bliabilit(y|ies)\b/i.test(label);
}

/** No real currency detection/config exists yet anywhere in the platform.
 * Mirrors `document-parser/services/evidence-object-builder.ts`'s own
 * RM→MYR default mapping — a disclosed limitation, not an invented value,
 * used only when an EvidenceObject's `normalizedValue` did not already carry
 * a detected currency code. */
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

export interface CurrentAssetsAndLiabilities {
  readonly assets: readonly Asset[];
  readonly liabilities: readonly Liability[];
}

export function buildCurrentAssetsAndLiabilities(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): CurrentAssetsAndLiabilities {
  const groups = groupByColumn(evidence, document.normalizedTerms);
  const assets: Asset[] = [];
  const liabilities: Liability[] = [];

  for (const group of groups) {
    if (group.canonicalTerm !== "Asset" && group.canonicalTerm !== "Liability") continue;

    for (const entity of group.entities) {
      if (entity.factType !== "amount") continue;
      const label = rowLabel(document, group.tableId, entity.sourceLocation.row);
      if (!label) continue;
      const parsed = parseAmountAndCurrency(entity);
      if (!parsed) continue;

      if (group.canonicalTerm === "Asset" && isCurrentAssetsSubtotalLabel(label)) {
        assets.push({
          id: deriveCompositeId(["financial-object", "asset", document.documentId, entity.id]).slice(0, 16),
          accountGroupId: "current-assets",
          classification: "current",
          totalValue: Money.create(parsed.amount, parsed.currencyCode),
          confidence: entity.confidence,
          evidenceObjectIds: [entity.id],
        });
      } else if (group.canonicalTerm === "Liability" && isCurrentLiabilitiesSubtotalLabel(label)) {
        liabilities.push({
          id: deriveCompositeId(["financial-object", "liability", document.documentId, entity.id]).slice(0, 16),
          accountGroupId: "current-liabilities",
          classification: "current",
          totalValue: Money.create(parsed.amount, parsed.currencyCode),
          confidence: entity.confidence,
          evidenceObjectIds: [entity.id],
        });
      }
    }
  }

  return { assets, liabilities };
}
