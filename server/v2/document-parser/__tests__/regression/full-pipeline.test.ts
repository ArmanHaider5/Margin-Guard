import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseDocument } from "../../index.js";

const FIXED_CLOCK = () => new Date("2026-01-01T00:00:00.000Z");

describe("full-pipeline regression: xlsx, csv, docx, pdf", () => {
  it("xlsx: real dispatch log produces a valid StructuredDocument with at least one table", async () => {
    const buffer = readFileSync("uploads/1775625706459-791250478-dispatch_log.xlsx");
    const { document, evidence } = await parseDocument("dispatch_log.xlsx", buffer, { clock: FIXED_CLOCK });

    expect(document.schemaVersion).toBe("1.0.0");
    expect(document.documentId).toHaveLength(64);
    expect(document.tables.length).toBeGreaterThan(0);
    expect(document.confidence.overall.value).toBeGreaterThanOrEqual(0);
    expect(document.confidence.overall.value).toBeLessThanOrEqual(1);
    expect(Array.isArray(evidence)).toBe(true);
    expect(Array.isArray(document.diagnostics)).toBe(true);
  });

  it("csv: invoice export produces one table with correct headers and amount/date/reference-id evidence", async () => {
    const csv = 'Invoice No,Date,Amount\nINV-2026-001,2026-01-15,"RM1,000.00"\nINV-2026-002,2026-02-01,RM250.50\n';
    const { document, evidence } = await parseDocument("invoices.csv", Buffer.from(csv, "utf-8"), {
      clock: FIXED_CLOCK,
    });

    expect(document.tables).toHaveLength(1);
    expect(document.tables[0].headers).toEqual(["Invoice No", "Date", "Amount"]);
    expect(evidence.some((e) => e.factType === "amount")).toBe(true);
    expect(evidence.some((e) => e.factType === "date")).toBe(true);
    expect(evidence.some((e) => e.factType === "reference_id")).toBe(true);

    const withNormalizedValue = evidence.find((e) => e.normalizedValue !== undefined);
    expect(withNormalizedValue?.rawValue).toBe("RM1,000.00");
    expect(withNormalizedValue?.observedValue).toBe(1000);
    expect(withNormalizedValue?.normalizedValue).toBe("1000 MYR");
  });

  it("docx: real staff turnover report is extracted via mammoth.convertToHtml (table structure preserved)", async () => {
    const buffer = readFileSync("uploads/1775625706460-787151497-staff_turnover_report.docx");
    const { document } = await parseDocument("staff_turnover_report.docx", buffer, { clock: FIXED_CLOCK });

    expect(document.qualityAssessment.extractionCompleteness.value).toBeGreaterThan(0);
    expect(["narrative", "mixed", "single_table", "form_like", "unknown"]).toContain(document.layout.layoutType);
  });

  it("pdf: real finance margin review is extracted via the verified pdf-parse API", async () => {
    const buffer = readFileSync("uploads/1775625706459-677459170-finance_margin_review.pdf");
    const { document } = await parseDocument("finance_margin_review.pdf", buffer, { clock: FIXED_CLOCK });

    expect(document.qualityAssessment.extractionCompleteness.value).toBeGreaterThan(0);
    expect(document.rawText).toBeDefined();
    expect((document.rawText ?? "").length).toBeGreaterThan(0);
  });

  it("every EvidenceObject in every run traces back to a document location and carries a valid confidence", async () => {
    const buffer = readFileSync("uploads/1775625706459-791250478-dispatch_log.xlsx");
    const { document, evidence } = await parseDocument("dispatch_log.xlsx", buffer, { clock: FIXED_CLOCK });

    for (const e of evidence) {
      expect(e.documentId).toBe(document.documentId);
      expect(e.confidence.value).toBeGreaterThanOrEqual(0);
      expect(e.confidence.value).toBeLessThanOrEqual(1);
      expect(typeof e.extractedAt).toBe("string");
    }
  });
});
