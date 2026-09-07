import { describe, it, expect } from "vitest";
import { FileTypeDetector } from "../../services/file-type-detector.js";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");
const detector = new FileTypeDetector();

function pdfBytes(): Buffer {
  return Buffer.from("%PDF-1.4\n%rest of file");
}

function zipXlsxBytes(): Buffer {
  return Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("xl/workbook.xml rest of zip")]);
}

function zipDocxBytes(): Buffer {
  return Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("word/document.xml rest of zip")]);
}

describe("FileTypeDetector", () => {
  it("high confidence when extension and magic bytes agree", () => {
    const { value } = detector.detect("report.pdf", pdfBytes(), FIXED_DATE);
    expect(value.fileType).toBe("pdf");
    expect(value.detectionConfidence.value).toBeGreaterThan(0.9);
  });

  it("disambiguates xlsx vs docx from the same zip container signature", () => {
    expect(detector.detect("x.xlsx", zipXlsxBytes(), FIXED_DATE).value.fileType).toBe("xlsx");
    expect(detector.detect("x.docx", zipDocxBytes(), FIXED_DATE).value.fileType).toBe("docx");
  });

  it("lower confidence and a warning diagnostic when extension and content disagree", () => {
    // A .csv extension on what is actually a PDF's magic bytes.
    const { value, diagnostics } = detector.detect("mislabeled.csv", pdfBytes(), FIXED_DATE);
    expect(value.fileType).toBe("pdf"); // magic bytes are trusted over extension
    expect(value.detectionConfidence.value).toBeLessThan(0.9);
    expect(diagnostics.some((d) => d.severity === "warning" && d.origin === "Parser")).toBe(true);
  });

  it("falls back to extension-only detection with medium confidence when no magic bytes match (csv)", () => {
    const { value } = detector.detect("plain.csv", Buffer.from("a,b,c\n1,2,3\n"), FIXED_DATE);
    expect(value.fileType).toBe("csv");
    expect(value.detectionConfidence.value).toBeGreaterThan(0.5);
    expect(value.detectionConfidence.value).toBeLessThan(0.9);
  });

  it("edge case: unrecognized extension and unrecognized bytes yields 'unknown' with an error diagnostic", () => {
    const { value, diagnostics } = detector.detect("mystery.xyz", Buffer.from("random content"), FIXED_DATE);
    expect(value.fileType).toBe("unknown");
    expect(diagnostics.some((d) => d.severity === "error")).toBe(true);
  });

  it("edge case: empty buffer does not throw", () => {
    expect(() => detector.detect("empty.xlsx", Buffer.alloc(0), FIXED_DATE)).not.toThrow();
  });

  it("computes deterministic content hash and sets fileSizeBytes", () => {
    const bytes = pdfBytes();
    const { value } = detector.detect("a.pdf", bytes, FIXED_DATE);
    expect(value.fileSizeBytes).toBe(bytes.length);
    expect(value.contentHash).toHaveLength(64); // sha256 hex
    // Same bytes -> same hash, always.
    expect(detector.detect("b.pdf", bytes, FIXED_DATE).value.contentHash).toBe(value.contentHash);
  });
});
