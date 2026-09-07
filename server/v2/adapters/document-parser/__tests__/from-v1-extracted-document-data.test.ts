import { describe, it, expect } from "vitest";
import { fromV1ExtractedDocumentData } from "../from-v1-extracted-document-data.js";
import type { ExtractedDocumentData } from "../../../../../shared/schema.js";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");
const CONTEXT = { documentId: "doc-123", sourceFileName: "legacy.xlsx", convertedAt: FIXED_DATE };

describe("V1 compatibility adapter — fromV1ExtractedDocumentData", () => {
  it("translates V1 tables[] into V2 DetectedTable[]", () => {
    const v1: ExtractedDocumentData = {
      tables: [{ name: "Sheet1", headers: ["Item", "Qty"], rows: [["Widget", "10"]] }],
    };
    const { document } = fromV1ExtractedDocumentData(v1, CONTEXT);
    expect(document.tables).toHaveLength(1);
    expect(document.tables[0].headers).toEqual(["Item", "Qty"]);
    expect(document.tables[0].rows).toEqual([["Widget", "10"]]);
  });

  it("falls back to sheets[] only when tables[] is absent (never processes both, avoiding double-counting)", () => {
    const v1: ExtractedDocumentData = {
      sheets: [{ name: "Sheet1", rows: [["Item", "Qty"], ["Widget", 10]] }],
    };
    const { document } = fromV1ExtractedDocumentData(v1, CONTEXT);
    expect(document.tables).toHaveLength(1);
    expect(document.tables[0].headers).toEqual(["Item", "Qty"]);
    expect(document.tables[0].rows).toEqual([["Widget", "10"]]);
  });

  it("prefers tables[] over sheets[] when both are present, producing exactly one table (not two)", () => {
    const v1: ExtractedDocumentData = {
      tables: [{ name: "Sheet1", headers: ["A"], rows: [["1"]] }],
      sheets: [{ name: "Sheet1", rows: [["A"], [1]] }],
    };
    const { document } = fromV1ExtractedDocumentData(v1, CONTEXT);
    expect(document.tables).toHaveLength(1);
  });

  it("translates dates[] and amounts[] into ExtractedEntity[] and EvidenceObject[]", () => {
    const v1: ExtractedDocumentData = {
      dates: ["2026-01-15"],
      amounts: [{ value: 1000, context: "RM1,000.00 total" }],
    };
    const { document, evidence } = fromV1ExtractedDocumentData(v1, CONTEXT);

    expect(document.entities.some((e) => e.type === "date" && e.rawValue === "2026-01-15")).toBe(true);
    expect(document.entities.some((e) => e.type === "amount" && e.observedValue === 1000)).toBe(true);

    expect(evidence).toHaveLength(2);
    const amountEvidence = evidence.find((e) => e.factType === "amount");
    expect(amountEvidence?.documentId).toBe("doc-123");
    expect(amountEvidence?.normalizedValue).toBe("1000 MYR"); // currency detected from context
  });

  it("preserves keyFindings by appending them to rawText, never constructing a Finding-shaped object", () => {
    const v1: ExtractedDocumentData = {
      rawText: "Original text.",
      keyFindings: ["Revenue declined in Q1", "Staff turnover increased"],
    };
    const { document } = fromV1ExtractedDocumentData(v1, CONTEXT);
    expect(document.rawText).toContain("Original text.");
    expect(document.rawText).toContain("Revenue declined in Q1");
    expect(document.rawText).toContain("Staff turnover increased");
    // The type system itself proves no Finding-shaped field exists on StructuredDocument.
  });

  it("translates issues[] into both diagnostics and DocumentQuality.issues", () => {
    const v1: ExtractedDocumentData = { issues: ["Low text density detected"] };
    const { document } = fromV1ExtractedDocumentData(v1, CONTEXT);

    expect(document.diagnostics.some((d) => d.message === "Low text density detected")).toBe(true);
    expect(document.qualityAssessment.issues.some((i) => i.description === "Low text density detected")).toBe(true);
  });

  it("always emits a mandatory self-identifying diagnostic marking the document as adapter-derived", () => {
    const { document } = fromV1ExtractedDocumentData({}, CONTEXT);
    expect(
      document.diagnostics.some((d) => d.stage === "V1CompatibilityAdapter" && d.message.includes("compatibility adapter")),
    ).toBe(true);
    expect(document.trace.pipelineVersion).toBe("v1-compat-adapter-1.0.0");
  });

  it("every confidence and quality field is a fixed, valid, documented placeholder — never NaN or out of range", () => {
    const { document } = fromV1ExtractedDocumentData({}, CONTEXT);
    const allConfidences = [
      document.confidence.extraction,
      document.confidence.recognition,
      document.confidence.evidence,
      document.confidence.overall,
      document.qualityAssessment.extractionCompleteness,
      document.qualityAssessment.structuralRegularity,
      document.qualityAssessment.contentLegibility,
      document.qualityAssessment.businessCompleteness,
    ];
    for (const c of allConfidences) {
      expect(c.value).toBeGreaterThanOrEqual(0);
      expect(c.value).toBeLessThanOrEqual(1);
      expect(Number.isNaN(c.value)).toBe(false);
    }
  });

  it("edge case: completely empty V1 data does not throw and produces a valid, minimal StructuredDocument", () => {
    expect(() => fromV1ExtractedDocumentData({}, CONTEXT)).not.toThrow();
    const { document, evidence } = fromV1ExtractedDocumentData({}, CONTEXT);
    expect(document.tables).toHaveLength(0);
    expect(evidence).toHaveLength(0);
  });

  it("is deterministic: identical V1 input and a fixed convertedAt produce byte-for-byte identical output", () => {
    const v1: ExtractedDocumentData = { rawText: "same text", dates: ["2026-01-01"] };
    const result1 = fromV1ExtractedDocumentData(v1, CONTEXT);
    const result2 = fromV1ExtractedDocumentData(v1, CONTEXT);
    expect(JSON.stringify(result1.document)).toBe(JSON.stringify(result2.document));
    expect(JSON.stringify(result1.evidence)).toBe(JSON.stringify(result2.evidence));
  });

  it("uses the caller-supplied documentId and sourceFileName exactly (V1 data carries neither)", () => {
    const { document } = fromV1ExtractedDocumentData({}, { documentId: "custom-id-9", sourceFileName: "custom.pdf" });
    expect(document.documentId).toBe("custom-id-9");
    expect(document.sourceFileName).toBe("custom.pdf");
  });
});
