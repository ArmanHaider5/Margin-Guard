import { deriveCompositeId, Money } from "../../../shared/index.js";
import type { EvidenceObject, StructuredDocument } from "../../../shared/index.js";
import { groupByColumn } from "../../evidence/financial-evidence-rules.js";
import type { Asset } from "../../models/financial-object-model.js";

/**
 * The Efficiency Capability Pack's Financial Object construction — builds
 * `Asset` entries classified `"non_current"`. Mirrors Leverage's
 * `leverage-object-builder.ts`'s non-current Liability construction exactly,
 * applied to Assets instead — the **second** independent occurrence of this
 * shape (scan the same Ontology-normalized column Liquidity's builder
 * already scans; require an explicit "Total Non-Current ..."/"Total Long-Term
 * ..." label; never collide with Liquidity's "Total Current ..." match).
 * Documented as a second occurrence, not yet abstracted into a shared
 * helper — per this milestone's explicit instruction, that decision is
 * deferred until (and unless) a third independent occurrence appears; see
 * `docs/98_TECHNICAL_BACKLOG.md` EFF-003.
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

function isTotalNonCurrentAssetsLabel(label: string): boolean {
  return /\btotal\b/i.test(label) && /\b(non.?current|long.?term)\b/i.test(label) && /\bassets?\b/i.test(label);
}

export function buildNonCurrentAssets(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): readonly Asset[] {
  const groups = groupByColumn(evidence, document.normalizedTerms);
  const nonCurrentAssets: Asset[] = [];

  for (const group of groups) {
    if (group.canonicalTerm !== "Asset") continue;

    for (const entity of group.entities) {
      if (entity.factType !== "amount") continue;
      const label = rowLabel(document, group.tableId, entity.sourceLocation.row);
      if (!label || !isTotalNonCurrentAssetsLabel(label)) continue;
      const parsed = parseAmountAndCurrency(entity);
      if (!parsed) continue;

      nonCurrentAssets.push({
        id: deriveCompositeId(["financial-object", "asset", "non-current", document.documentId, entity.id]).slice(0, 16),
        accountGroupId: "non-current-assets",
        classification: "non_current",
        totalValue: Money.create(parsed.amount, parsed.currencyCode),
        confidence: entity.confidence,
        evidenceObjectIds: [entity.id],
      });
    }
  }

  return nonCurrentAssets;
}
