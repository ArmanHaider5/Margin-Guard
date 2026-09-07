import { deriveCompositeId, Money } from "../../../shared/index.js";
import type { EvidenceObject, StructuredDocument } from "../../../shared/index.js";
import { groupByColumn } from "../../evidence/financial-evidence-rules.js";
import type { WorkingCapitalComponent } from "../../models/financial-object-model.js";

/**
 * The Working Capital Capability Pack's Financial Object construction —
 * builds `WorkingCapitalComponent` entries (`"receivables"`, `"payables"`,
 * `"inventory"`) from a document's `EvidenceObject[]`.
 *
 * Unlike `capabilities/cash-flow/cash-movement-builder.ts` (which could gate
 * on the registered "Cash Movement" Ontology term), no registered Ontology
 * term distinguishes "Accounts Receivable"/"Accounts Payable"/"Inventory" as
 * their own concepts — `knowledge/ontology-terms-data.ts`'s "Working Capital
 * Component" term's synonyms are just ["Working Capital Item"], a label real
 * financial statements essentially never use verbatim. So this builder scans
 * the *same* Asset/Liability-normalized columns Liquidity's builder already
 * scans (`current-asset-liability-builder.ts`), but pulls out *different*
 * rows via a disclosed, non-ontology-bound row-label heuristic — the same
 * documented-exception pattern used throughout (`cash_shortages`' "Cash"
 * keyword, Liquidity's "current" keyword). A "Total Current Assets" row
 * (Liquidity's target) never matches `/receivable|inventory/i`, and an
 * "Accounts Receivable" row never matches `/total.*current/i`, so the two
 * builders never process the same row twice.
 *
 * `"short_term_debt"`, the fourth `WorkingCapitalComponent.kind`, is not
 * constructed here — see `docs/98_TECHNICAL_BACKLOG.md` WC-001.
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

function isReceivablesLabel(label: string): boolean {
  return /\breceivables?\b/i.test(label);
}

function isInventoryLabel(label: string): boolean {
  return /\binventory\b|\bstock\b/i.test(label);
}

function isPayablesLabel(label: string): boolean {
  return /\bpayables?\b/i.test(label);
}

export function buildWorkingCapitalComponents(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): readonly WorkingCapitalComponent[] {
  const groups = groupByColumn(evidence, document.normalizedTerms);
  const components: WorkingCapitalComponent[] = [];

  for (const group of groups) {
    if (group.canonicalTerm !== "Asset" && group.canonicalTerm !== "Liability") continue;

    for (const entity of group.entities) {
      if (entity.factType !== "amount") continue;
      const label = rowLabel(document, group.tableId, entity.sourceLocation.row);
      if (!label) continue;
      const parsed = parseAmountAndCurrency(entity);
      if (!parsed) continue;

      let kind: WorkingCapitalComponent["kind"] | undefined;
      if (group.canonicalTerm === "Asset" && isReceivablesLabel(label)) kind = "receivables";
      else if (group.canonicalTerm === "Asset" && isInventoryLabel(label)) kind = "inventory";
      else if (group.canonicalTerm === "Liability" && isPayablesLabel(label)) kind = "payables";
      if (!kind) continue;

      components.push({
        id: deriveCompositeId(["financial-object", "working-capital-component", kind, document.documentId, entity.id]).slice(0, 16),
        kind,
        amount: Money.create(parsed.amount, parsed.currencyCode),
        confidence: entity.confidence,
        evidenceObjectIds: [entity.id],
      });
    }
  }

  return components;
}
