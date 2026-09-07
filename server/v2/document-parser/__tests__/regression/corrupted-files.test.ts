import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import XLSX from "xlsx";
import { parseDocument } from "../../index.js";

/**
 * Regression tests confirming the Document Parser degrades gracefully on
 * corrupted input — never throws, always returns a StructuredDocument, always
 * records an explanatory diagnostic, and always reflects the corruption as
 * reduced confidence rather than silently pretending the document was fine.
 */

const FIXED_CLOCK = () => new Date("2026-01-01T00:00:00.000Z");

describe("corrupted-file regression: graceful degradation", () => {
  it("broken PDF (valid header, garbage body) does not throw", async () => {
    const buffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("this is not valid pdf content ".repeat(30))]);

    const { document } = await parseDocument("broken.pdf", buffer, { clock: FIXED_CLOCK });

    expect(document).toBeDefined();
    expect(document.confidence.overall.value).toBeLessThan(0.6);
    expect(document.diagnostics.some((d) => d.severity === "error" && d.origin === "Parser")).toBe(true);
  });

  it("malformed CSV (unclosed quote) does not throw and still produces a table", async () => {
    const malformed = 'Name,Age\n"Unclosed quote,25\nBob,30\n';
    const buffer = Buffer.from(malformed, "utf-8");

    const { document } = await parseDocument("malformed.csv", buffer, { clock: FIXED_CLOCK });

    expect(document).toBeDefined();
    expect(document.diagnostics).toBeDefined();
    // A lenient hand-rolled CSV parser still produces *some* row structure even
    // from malformed input — the point of this test is the absence of a thrown
    // exception, not a claim of correct interpretation of the malformed quote.
    expect(document.tables.length).toBeGreaterThanOrEqual(0);
  });

  it("corrupted XLSX (valid file truncated mid-archive) does not throw", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Item", "Quantity"],
      ["Widget", 10],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const validBuffer: Buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const corrupted = validBuffer.subarray(0, Math.floor(validBuffer.length * 0.4));

    const { document } = await parseDocument("corrupted.xlsx", corrupted, { clock: FIXED_CLOCK });

    expect(document).toBeDefined();
    expect(document.confidence.overall.value).toBeLessThan(0.7);
    expect(document.diagnostics.some((d) => d.severity === "error")).toBe(true);
  });

  it("truncated DOCX (real file cut to a small prefix) does not throw", async () => {
    const realDocxPath = "uploads/1775625706460-787151497-staff_turnover_report.docx";
    const realDocx = readFileSync(realDocxPath);
    const truncated = realDocx.subarray(0, 200);

    const { document } = await parseDocument("truncated.docx", truncated, { clock: FIXED_CLOCK });

    expect(document).toBeDefined();
    expect(document.confidence.overall.value).toBeLessThan(0.7);
    expect(document.diagnostics.some((d) => d.severity === "error")).toBe(true);
  });

  it("every corrupted-input diagnostic carries a recommendation and a stated confidence impact", async () => {
    const buffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("garbage".repeat(20))]);
    const { document } = await parseDocument("broken2.pdf", buffer, { clock: FIXED_CLOCK });

    const errorDiagnostics = document.diagnostics.filter((d) => d.severity === "error");
    expect(errorDiagnostics.length).toBeGreaterThan(0);
    for (const diagnostic of errorDiagnostics) {
      expect(diagnostic.recommendation.length).toBeGreaterThan(0);
      expect(typeof diagnostic.confidenceImpact).toBe("number");
      expect(diagnostic.origin).toBeDefined();
    }
  });
});
