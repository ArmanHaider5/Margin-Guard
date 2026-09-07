import { describe, it, expect } from "vitest";
import { FinancialEvidenceClassifier } from "../evidence/financial-evidence-classifier.js";
import { makeDocument, makeEvidence, makeTrendFixture, makeTable } from "./fixtures.js";

const classifier = new FinancialEvidenceClassifier();

describe("FinancialEvidenceClassifier — isolated unit tests", () => {
  it("detects revenue_growth from a Revenue-ontology-mapped column trend", () => {
    const { table, normalizedTerm, evidence } = makeTrendFixture("Revenue", [1000, 1200, 1500]);
    const document = makeDocument({ tables: [table], normalizedTerms: [normalizedTerm] });

    const result = classifier.classify(document, evidence);
    const revenueGrowth = result.find((e) => e.type === "revenue_growth");
    expect(revenueGrowth).toBeDefined();
    expect(revenueGrowth?.evidenceObjectIds.length).toBeGreaterThan(0);
  });

  it("detects cost_escalation from an Expense-ontology-mapped column trend", () => {
    const { table, normalizedTerm, evidence } = makeTrendFixture("Expense", [500, 650, 900]);
    const document = makeDocument({ tables: [table], normalizedTerms: [normalizedTerm] });

    const result = classifier.classify(document, evidence);
    expect(result.some((e) => e.type === "cost_escalation")).toBe(true);
  });

  it("detects debt_growth from a Liability-ontology-mapped column trend", () => {
    const { table, normalizedTerm, evidence } = makeTrendFixture("Liability", [10000, 12000, 15000]);
    const document = makeDocument({ tables: [table], normalizedTerms: [normalizedTerm] });

    const result = classifier.classify(document, evidence);
    expect(result.some((e) => e.type === "debt_growth")).toBe(true);
  });

  it("does NOT detect a trend from a single data point (requires >= 2)", () => {
    const { table, normalizedTerm, evidence } = makeTrendFixture("Revenue", [1000]);
    const document = makeDocument({ tables: [table], normalizedTerms: [normalizedTerm] });

    const result = classifier.classify(document, evidence);
    expect(result.some((e) => e.type === "revenue_growth")).toBe(false);
  });

  it("does NOT trend-classify a column with no ontology mapping (ontology-first: never guesses)", () => {
    // Exactly 2 distinct values: below detectReconciliationMismatch's minimum of
    // 3 (so that unrelated, non-ontology-gated structural detector cannot fire
    // and confound this test), isolating the assertion to trend detection alone.
    const { table, evidence } = makeTrendFixture("Some Unmapped Header", [1000, 1200]);
    const document = makeDocument({ tables: [table], normalizedTerms: [] }); // no normalizedTerms supplied

    const result = classifier.classify(document, evidence);
    expect(result.some((e) => ["revenue_growth", "cost_escalation", "debt_growth"].includes(e.type))).toBe(false);
  });

  it("detectReconciliationMismatch is intentionally NOT ontology-gated: a subtotal mismatch is meaningful regardless of what the column represents", () => {
    const { table, evidence } = makeTrendFixture("Some Unmapped Header", [1000, 1200, 9999]);
    const document = makeDocument({ tables: [table], normalizedTerms: [] });

    const result = classifier.classify(document, evidence);
    expect(result.some((e) => e.type === "missing_reconciliations")).toBe(true);
  });

  it("detects margin_erosion as a composite when Revenue and Expense trends coexist in the same table", () => {
    const revenue = makeTrendFixture("Revenue", [1000, 1200, 1500], "t1", 0);
    const expense = makeTrendFixture("Expense", [500, 650, 900], "t1", 1);
    const document = makeDocument({
      tables: [revenue.table],
      normalizedTerms: [revenue.normalizedTerm, expense.normalizedTerm],
    });

    const result = classifier.classify(document, [...revenue.evidence, ...expense.evidence]);
    const margin = result.find((e) => e.type === "margin_erosion");
    expect(margin).toBeDefined();
    expect(margin?.evidenceObjectIds.length).toBe(revenue.evidence.length + expense.evidence.length);
  });

  it("detects duplicate_payments for identical amounts within a short row span", () => {
    const table = makeTable({ id: "t1", headers: ["Amount"] });
    const evidence = [
      makeEvidence({ sourceLocation: { tableId: "t1", column: 0, row: 0 }, rawValue: "RM500.00", observedValue: 500 }),
      makeEvidence({ sourceLocation: { tableId: "t1", column: 0, row: 1 }, rawValue: "RM500.00", observedValue: 500 }),
    ];
    const document = makeDocument({ tables: [table] });

    const result = classifier.classify(document, evidence);
    expect(result.some((e) => e.type === "duplicate_payments")).toBe(true);
  });

  it("does NOT flag identical amounts far apart in the table as duplicates", () => {
    const table = makeTable({ id: "t1", headers: ["Amount"] });
    const evidence = [
      makeEvidence({ sourceLocation: { tableId: "t1", column: 0, row: 0 }, rawValue: "RM500.00", observedValue: 500 }),
      makeEvidence({ sourceLocation: { tableId: "t1", column: 0, row: 10 }, rawValue: "RM500.00", observedValue: 500 }),
    ];
    const document = makeDocument({ tables: [table] });

    const result = classifier.classify(document, evidence);
    expect(result.some((e) => e.type === "duplicate_payments")).toBe(false);
  });

  it("detects cash_shortages only when the header context mentions cash AND a negative value exists", () => {
    const table = makeTable({ id: "t1", headers: ["Cash Balance"] });
    const evidence = [makeEvidence({ sourceLocation: { tableId: "t1", column: 0, row: 0 }, rawValue: "-RM50.00", observedValue: -50 })];
    const document = makeDocument({ tables: [table] });

    const result = classifier.classify(document, evidence);
    expect(result.some((e) => e.type === "cash_shortages")).toBe(true);
  });

  it("detects missing_reconciliations when a column's final value does not match the sum above it", () => {
    const table = makeTable({ id: "t1", headers: ["Total"] });
    const evidence = [
      makeEvidence({ sourceLocation: { tableId: "t1", column: 0, row: 0 }, rawValue: "RM100.00", observedValue: 100 }),
      makeEvidence({ sourceLocation: { tableId: "t1", column: 0, row: 1 }, rawValue: "RM200.00", observedValue: 200 }),
      makeEvidence({ sourceLocation: { tableId: "t1", column: 0, row: 2 }, rawValue: "RM999.00", observedValue: 999 }), // should be 300
    ];
    const document = makeDocument({ tables: [table] });

    const result = classifier.classify(document, evidence);
    expect(result.some((e) => e.type === "missing_reconciliations")).toBe(true);
  });

  it("every produced FinancialEvidence traces back to non-empty, real EvidenceObject ids (mandatory Evidence Chain)", () => {
    const { table, normalizedTerm, evidence } = makeTrendFixture("Revenue", [1000, 1200, 1500]);
    const document = makeDocument({ tables: [table], normalizedTerms: [normalizedTerm] });

    const result = classifier.classify(document, evidence);
    for (const fe of result) {
      expect(fe.evidenceObjectIds.length).toBeGreaterThan(0);
      for (const id of fe.evidenceObjectIds) {
        expect(evidence.some((e) => e.id === id)).toBe(true);
      }
    }
  });

  it("edge case: no evidence at all produces no FinancialEvidence and does not throw", () => {
    const document = makeDocument();
    expect(() => classifier.classify(document, [])).not.toThrow();
    expect(classifier.classify(document, [])).toHaveLength(0);
  });

  it("is deterministic: identical input always produces identical output", () => {
    const { table, normalizedTerm, evidence } = makeTrendFixture("Revenue", [1000, 1200, 1500]);
    const document = makeDocument({ tables: [table], normalizedTerms: [normalizedTerm] });

    const first = classifier.classify(document, evidence);
    const second = classifier.classify(document, evidence);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
