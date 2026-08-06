import { deriveCompositeId, Money } from "../../../shared/index.js";
import type { EvidenceObject, StructuredDocument } from "../../../shared/index.js";
import { groupByColumn } from "../../evidence/financial-evidence-rules.js";
import type { Equity, Liability } from "../../models/financial-object-model.js";

/**
 * The Leverage Capability Pack's Financial Object construction — builds
 * `Equity` entries (the first real construction anywhere for this type) and
 * `Liability` entries classified `"non_current"` (declared since the
 * Liquidity milestone but never actually constructed — Liquidity's own
 * builder only ever produces `"current"`-classified entries).
 *
 * Equity is gated on the registered Ontology term `"Equity"`
 * (`knowledge/ontology-terms-data.ts`, synonyms "Owner's Equity"/"Shareholders
 * Equity") — unlike Working Capital's receivables/payables/inventory, no
 * disclosed non-ontology heuristic is needed here for the column-level gate.
 * A row still needs an explicit "Total Equity"/"Total Shareholders'
 * Equity"/"Total Owner's Equity" label (same double-counting-avoidance
 * reasoning as every "Total X" subtotal requirement elsewhere) — individual
 * equity components (share capital, retained earnings, ...) without an
 * explicit total are not summed, the same disclosed limitation as PC-001/LC-001.
 *
 * Non-current Liability rows require an explicit "Total Non-Current
 * Liabilities"/"Total Long-Term Liabilities" label, scanning the *same*
 * Liability-normalized columns Liquidity's builder already scans for "Total
 * Current Liabilities" — the two label patterns never match the same row.
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

function isTotalEquityLabel(label: string): boolean {
  return /\btotal\b/i.test(label) && /\bequity\b/i.test(label);
}

function isTotalNonCurrentLiabilitiesLabel(label: string): boolean {
  return /\btotal\b/i.test(label) && /\b(non.?current|long.?term)\b/i.test(label) && /\bliabilit(y|ies)\b/i.test(label);
}

export interface LeverageFinancialObjects {
  readonly equity: readonly Equity[];
  readonly nonCurrentLiabilities: readonly Liability[];
}

export function buildLeverageFinancialObjects(
  document: StructuredDocument,
  evidence: readonly EvidenceObject[],
): LeverageFinancialObjects {
  const groups = groupByColumn(evidence, document.normalizedTerms);
  const equity: Equity[] = [];
  const nonCurrentLiabilities: Liability[] = [];

  for (const group of groups) {
    if (group.canonicalTerm !== "Equity" && group.canonicalTerm !== "Liability") continue;

    for (const entity of group.entities) {
      if (entity.factType !== "amount") continue;
      const label = rowLabel(document, group.tableId, entity.sourceLocation.row);
      if (!label) continue;
      const parsed = parseAmountAndCurrency(entity);
      if (!parsed) continue;

      if (group.canonicalTerm === "Equity" && isTotalEquityLabel(label)) {
        equity.push({
          id: deriveCompositeId(["financial-object", "equity", document.documentId, entity.id]).slice(0, 16),
          accountGroupId: "total-equity",
          totalValue: Money.create(parsed.amount, parsed.currencyCode),
          confidence: entity.confidence,
          evidenceObjectIds: [entity.id],
        });
      } else if (group.canonicalTerm === "Liability" && isTotalNonCurrentLiabilitiesLabel(label)) {
        nonCurrentLiabilities.push({
          id: deriveCompositeId(["financial-object", "liability", "non-current", document.documentId, entity.id]).slice(0, 16),
          accountGroupId: "non-current-liabilities",
          classification: "non_current",
          totalValue: Money.create(parsed.amount, parsed.currencyCode),
          confidence: entity.confidence,
          evidenceObjectIds: [entity.id],
        });
      }
    }
  }

  return { equity, nonCurrentLiabilities };
}
