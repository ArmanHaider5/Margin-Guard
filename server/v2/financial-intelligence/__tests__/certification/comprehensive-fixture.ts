import { makeDocument, makeTable, makeEvidence, makeNormalizedTerm } from "../fixtures.js";
import type { StructuredDocument, EvidenceObject } from "../../../shared/index.js";

/**
 * The Financial Intelligence Certification milestone's single comprehensive
 * fixture — a six-table document (Assets, Liabilities, Equity, Revenue,
 * Expense, Cash Movement) deliberately shaped so that **all eight**
 * Capability Packs produce real, non-empty Financial Objects and Metrics,
 * and a deliberately mixed set of healthy and unhealthy Ratios so that
 * several (not all) Observations/Evidence/Signals genuinely fire —
 * proving both the positive path (no false positives from a healthy Ratio)
 * and the negative path (real Observations firing from a genuinely
 * unhealthy one) at once, at full-system scale, not one pack at a time.
 *
 * Every builder's own row-label requirements (subtotal detection,
 * non-current exclusion, WorkingCapitalComponent keyword matching, etc.)
 * are respected exactly as each pack's own dedicated test fixture already
 * proves in isolation — this fixture is not testing any one pack's
 * correctness again, only that all eight, run together through the real
 * default registry, cooperate without interference or corruption.
 *
 * Expected real outcomes (verified by `certification.test.ts`, not merely
 * asserted here):
 *   current_ratio = 80000/60000 = 1.333 (< 1.5)      -> current_ratio_below_range
 *   working_capital_ratio = (80000-60000)/60000 = 0.333 (healthy)
 *   asset_turnover = 50000/130000 = 0.3846 (healthy, non-zero)
 *   debt_to_equity = 105000/80000 = 1.3125 (healthy, positive)
 *   gross_margin = -20000/50000 = -0.4               -> gross_margin_negative
 *   net_margin = operating_margin = -25000/50000 = -0.5 -> net/operating_margin_negative
 *   revenue_growth_rate = (18000-22000)/22000 = -0.1818 -> revenue_growth_negative
 *   return_on_equity = -20000/80000 = -0.25          -> return_on_equity_negative
 *   operating_cash_flow_ratio = 10000/60000 = 0.1667 (healthy)
 *   cash_coverage_ratio = 25000/60000 = 0.4167 (< 1.0) -> cash_coverage_ratio_low
 */
export function makeComprehensiveFixture(): { document: StructuredDocument; evidence: EvidenceObject[] } {
  const assetsTable = makeTable({
    id: "assets",
    headers: ["Description", "Amount"],
    rows: [
      ["Accounts Receivable", "20000"],
      ["Inventory", "15000"],
      ["Total Current Assets", "80000"],
      ["Property Plant and Equipment", "60000"],
      ["Total Non-Current Assets", "50000"],
    ],
  });
  const liabilitiesTable = makeTable({
    id: "liabilities",
    headers: ["Description", "Amount"],
    rows: [
      ["Accounts Payable", "18000"],
      ["Total Current Liabilities", "60000"],
      ["Bank Loan (Long-Term)", "40000"],
      ["Total Non-Current Liabilities", "45000"],
    ],
  });
  const equityTable = makeTable({
    id: "equity",
    headers: ["Description", "Amount"],
    rows: [
      ["Share Capital", "30000"],
      ["Total Equity", "80000"],
    ],
  });
  const revenueTable = makeTable({
    id: "revenue",
    headers: ["Description", "Amount"],
    rows: [
      ["Jan 2026", "10000"],
      ["Feb 2026", "22000"],
      ["Mar 2026", "18000"],
      ["Total Revenue", "50000"],
    ],
  });
  const expenseTable = makeTable({
    id: "expense",
    headers: ["Description", "Amount"],
    rows: [
      ["Cost of Goods Sold", "70000"],
      ["Total Operating Expenses", "5000"],
    ],
  });
  const cashTable = makeTable({
    id: "cash",
    headers: ["Description", "Amount"],
    rows: [
      ["Customer Receipts", "25000"],
      ["Supplier Payments", "-15000"],
      ["Net Cash from Operating Activities", "10000"],
    ],
  });

  const evidence: EvidenceObject[] = [
    makeEvidence({ id: "ae-receivable", sourceLocation: { tableId: "assets", column: 1, row: 0 }, rawValue: "RM20,000.00", observedValue: 20000, normalizedValue: "20000 MYR" }),
    makeEvidence({ id: "ae-inventory", sourceLocation: { tableId: "assets", column: 1, row: 1 }, rawValue: "RM15,000.00", observedValue: 15000, normalizedValue: "15000 MYR" }),
    makeEvidence({ id: "ae-total-current-assets", sourceLocation: { tableId: "assets", column: 1, row: 2 }, rawValue: "RM80,000.00", observedValue: 80000, normalizedValue: "80000 MYR" }),
    makeEvidence({ id: "ae-ppe", sourceLocation: { tableId: "assets", column: 1, row: 3 }, rawValue: "RM60,000.00", observedValue: 60000, normalizedValue: "60000 MYR" }),
    makeEvidence({ id: "ae-total-non-current-assets", sourceLocation: { tableId: "assets", column: 1, row: 4 }, rawValue: "RM50,000.00", observedValue: 50000, normalizedValue: "50000 MYR" }),

    makeEvidence({ id: "le-payable", sourceLocation: { tableId: "liabilities", column: 1, row: 0 }, rawValue: "RM18,000.00", observedValue: 18000, normalizedValue: "18000 MYR" }),
    makeEvidence({ id: "le-total-current-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 1 }, rawValue: "RM60,000.00", observedValue: 60000, normalizedValue: "60000 MYR" }),
    makeEvidence({ id: "le-bank-loan", sourceLocation: { tableId: "liabilities", column: 1, row: 2 }, rawValue: "RM40,000.00", observedValue: 40000, normalizedValue: "40000 MYR" }),
    makeEvidence({ id: "le-total-non-current-liabilities", sourceLocation: { tableId: "liabilities", column: 1, row: 3 }, rawValue: "RM45,000.00", observedValue: 45000, normalizedValue: "45000 MYR" }),

    makeEvidence({ id: "ee-share-capital", sourceLocation: { tableId: "equity", column: 1, row: 0 }, rawValue: "RM30,000.00", observedValue: 30000, normalizedValue: "30000 MYR" }),
    makeEvidence({ id: "ee-total-equity", sourceLocation: { tableId: "equity", column: 1, row: 1 }, rawValue: "RM80,000.00", observedValue: 80000, normalizedValue: "80000 MYR" }),

    makeEvidence({ id: "re-jan", sourceLocation: { tableId: "revenue", column: 1, row: 0 }, rawValue: "RM10,000.00", observedValue: 10000, normalizedValue: "10000 MYR" }),
    makeEvidence({ id: "re-feb", sourceLocation: { tableId: "revenue", column: 1, row: 1 }, rawValue: "RM22,000.00", observedValue: 22000, normalizedValue: "22000 MYR" }),
    makeEvidence({ id: "re-mar", sourceLocation: { tableId: "revenue", column: 1, row: 2 }, rawValue: "RM18,000.00", observedValue: 18000, normalizedValue: "18000 MYR" }),
    makeEvidence({ id: "re-total-revenue", sourceLocation: { tableId: "revenue", column: 1, row: 3 }, rawValue: "RM50,000.00", observedValue: 50000, normalizedValue: "50000 MYR" }),

    makeEvidence({ id: "xe-cogs", sourceLocation: { tableId: "expense", column: 1, row: 0 }, rawValue: "RM70,000.00", observedValue: 70000, normalizedValue: "70000 MYR" }),
    makeEvidence({ id: "xe-opex", sourceLocation: { tableId: "expense", column: 1, row: 1 }, rawValue: "RM5,000.00", observedValue: 5000, normalizedValue: "5000 MYR" }),

    makeEvidence({ id: "ce-receipts", sourceLocation: { tableId: "cash", column: 1, row: 0 }, rawValue: "RM25,000.00", observedValue: 25000, normalizedValue: "25000 MYR" }),
    makeEvidence({ id: "ce-payments", sourceLocation: { tableId: "cash", column: 1, row: 1 }, rawValue: "-RM15,000.00", observedValue: -15000, normalizedValue: "-15000 MYR" }),
    makeEvidence({ id: "ce-net-cash", sourceLocation: { tableId: "cash", column: 1, row: 2 }, rawValue: "RM10,000.00", observedValue: 10000, normalizedValue: "10000 MYR" }),
  ];

  const document = makeDocument({
    tables: [assetsTable, liabilitiesTable, equityTable, revenueTable, expenseTable, cashTable],
    normalizedTerms: [
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Asset", sourceLocation: { tableId: "assets", column: 1 } }),
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Liability", sourceLocation: { tableId: "liabilities", column: 1 } }),
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Equity", sourceLocation: { tableId: "equity", column: 1 } }),
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Revenue", sourceLocation: { tableId: "revenue", column: 1 } }),
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Expense", sourceLocation: { tableId: "expense", column: 1 } }),
      makeNormalizedTerm({ originalTerm: "Amount", canonicalTerm: "Cash Movement", sourceLocation: { tableId: "cash", column: 1 } }),
    ],
  });

  return { document, evidence };
}
