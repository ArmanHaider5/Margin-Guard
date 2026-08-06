import { deriveCompositeId, Confidence } from "../../shared/index.js";
import type { EvidenceObject, FinancialEvidence, StructuredDocument } from "../../shared/index.js";
import { groupByColumn, financialEvidenceDetectors, type ColumnGroup } from "./financial-evidence-rules.js";

export interface FinancialEvidenceClassifierService {
  classify(document: StructuredDocument, evidence: readonly EvidenceObject[]): readonly FinancialEvidence[];
}

/**
 * Classifies a document's EvidenceObjects into FinancialEvidence, using only
 * StructuredDocument and EvidenceObject as input (per this sprint's scope — no
 * document-parser internals are visible here). Ten of the fifteen
 * FinancialEvidenceType categories have real, deterministic detection logic in
 * this foundation sprint: `revenue_growth`, `cost_escalation`, `debt_growth`,
 * `margin_erosion`, `duplicate_payments`, `cash_shortages`,
 * `missing_reconciliations`, `revenue_concentration`, `customer_dependency`,
 * `supplier_dependency`. The remaining five (`negative_cash_flow`,
 * `inventory_accumulation`, `receivable_ageing`, `payable_ageing`,
 * `working_capital_pressure`) are complete in the type system
 * (`shared/contracts/financial-evidence.ts`) but have no rule wired in yet — see
 * `financial-intelligence/README.md` for why each was deferred rather than
 * implemented shallowly.
 */
export class FinancialEvidenceClassifier implements FinancialEvidenceClassifierService {
  classify(document: StructuredDocument, evidence: readonly EvidenceObject[]): readonly FinancialEvidence[] {
    const groups = groupByColumn(evidence, document.normalizedTerms);
    const results: FinancialEvidence[] = [];

    const headerOf = (group: ColumnGroup): string | undefined =>
      document.tables.find((t) => t.id === group.tableId)?.headers[group.column];

    const revenueTrends: FinancialEvidence[] = [];
    const expenseTrends: FinancialEvidence[] = [];

    for (const group of groups) {
      const revenueTrend = financialEvidenceDetectors.detectTrend(document.documentId, group, "Revenue", "revenue_growth");
      if (revenueTrend) {
        results.push(revenueTrend);
        revenueTrends.push(revenueTrend);
      }

      const expenseTrend = financialEvidenceDetectors.detectTrend(document.documentId, group, "Expense", "cost_escalation");
      if (expenseTrend) {
        results.push(expenseTrend);
        expenseTrends.push(expenseTrend);
      }

      const liabilityTrend = financialEvidenceDetectors.detectTrend(document.documentId, group, "Liability", "debt_growth");
      if (liabilityTrend) results.push(liabilityTrend);

      results.push(...financialEvidenceDetectors.detectDuplicatePayments(document.documentId, group));

      const cashShortage = financialEvidenceDetectors.detectCashShortages(document.documentId, group, headerOf(group));
      if (cashShortage) results.push(cashShortage);

      const reconciliation = financialEvidenceDetectors.detectReconciliationMismatch(document.documentId, group, headerOf(group));
      if (reconciliation) results.push(reconciliation);
    }

    // margin_erosion: a Revenue trend and an Expense trend both present for the
    // same table is treated as composite evidence that the relationship between
    // the two — the margin — is worth surfacing, regardless of each trend's
    // individual direction (the direction detail lives in each constituent's own
    // `basis` text).
    for (const revenueTrend of revenueTrends) {
      const revenueTableId = revenueTrend.evidenceObjectIds[0]
        ? evidence.find((e) => e.id === revenueTrend.evidenceObjectIds[0])?.sourceLocation.tableId
        : undefined;
      const matchingExpenseTrend = expenseTrends.find((expenseTrend) => {
        const expenseTableId = evidence.find((e) => e.id === expenseTrend.evidenceObjectIds[0])?.sourceLocation.tableId;
        return expenseTableId !== undefined && expenseTableId === revenueTableId;
      });
      if (matchingExpenseTrend) {
        results.push({
          id: deriveCompositeId(["financial-evidence", "margin_erosion", document.documentId, revenueTrend.id, matchingExpenseTrend.id]).slice(0, 16),
          type: "margin_erosion",
          evidenceObjectIds: [...revenueTrend.evidenceObjectIds, ...matchingExpenseTrend.evidenceObjectIds],
          documentId: document.documentId,
          confidence: Confidence.create(0.5),
          basis: "Both Revenue and Expense trends were observed in the same table, indicating the relationship between them (margin) warrants review.",
        });
      }
    }

    // revenue_concentration / customer_dependency / supplier_dependency: pair each
    // table's amount column against its organization-name column, if one exists.
    for (const table of document.tables) {
      const tableGroups = groups.filter((g) => g.tableId === table.id);
      const nameGroup = tableGroups.find((g) => g.entities.some((e) => e.factType === "organization_name"));
      for (const amountGroup of tableGroups) {
        if (!amountGroup.entities.some((e) => e.factType === "amount")) continue;
        const header = headerOf(amountGroup) ?? "";
        const contextIsSales = amountGroup.canonicalTerm === "Revenue" || /customer|client|buyer/i.test(header);
        results.push(...financialEvidenceDetectors.detectConcentration(document.documentId, amountGroup, nameGroup, contextIsSales));
      }
    }

    return results;
  }
}
