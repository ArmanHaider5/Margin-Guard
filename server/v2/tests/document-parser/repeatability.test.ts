import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseDocument } from "../../document-parser/index.js";

/**
 * Whole-module repeatability test, per ADR-010 (Deterministic Document
 * Processing): given identical bytes, an identical parser version, and an
 * identical Ontology version, the parser MUST produce byte-for-byte identical
 * StructuredDocument and EvidenceObject output. This is verified directly here —
 * not merely inferred from the absence of `Math.random()` in the source.
 */

const FIXED_CLOCK = () => new Date("2026-01-01T00:00:00.000Z");

describe("repeatability: identical bytes -> identical output", () => {
  it("csv: two runs on identical bytes with a fixed clock produce byte-for-byte identical output", async () => {
    const csv = "A,B\n1,2\nRM100.00,2026-01-01\n";
    const buffer = Buffer.from(csv, "utf-8");

    const run1 = await parseDocument("det.csv", buffer, { clock: FIXED_CLOCK });
    const run2 = await parseDocument("det.csv", buffer, { clock: FIXED_CLOCK });

    expect(run1.document.documentId).toBe(run2.document.documentId);
    expect(JSON.stringify(run1.document)).toBe(JSON.stringify(run2.document));
    expect(JSON.stringify(run1.evidence)).toBe(JSON.stringify(run2.evidence));
  });

  it("xlsx (real file): three consecutive runs all produce identical output", async () => {
    const buffer = readFileSync("uploads/1775625706459-791250478-dispatch_log.xlsx");

    const runs = await Promise.all([
      parseDocument("dispatch_log.xlsx", buffer, { clock: FIXED_CLOCK }),
      parseDocument("dispatch_log.xlsx", buffer, { clock: FIXED_CLOCK }),
      parseDocument("dispatch_log.xlsx", buffer, { clock: FIXED_CLOCK }),
    ]);

    const serialized = runs.map((r) => JSON.stringify(r.document));
    expect(serialized[0]).toBe(serialized[1]);
    expect(serialized[1]).toBe(serialized[2]);
  });

  it("documentId is content-derived, not random: different bytes always produce a different id, same bytes always produce the same id", async () => {
    const a1 = await parseDocument("a.csv", Buffer.from("x,y\n1,2\n"), { clock: FIXED_CLOCK });
    const a2 = await parseDocument("a.csv", Buffer.from("x,y\n1,2\n"), { clock: FIXED_CLOCK });
    const b = await parseDocument("a.csv", Buffer.from("x,y\n3,4\n"), { clock: FIXED_CLOCK });

    expect(a1.document.documentId).toBe(a2.document.documentId);
    expect(a1.document.documentId).not.toBe(b.document.documentId);
  });

  it("rule-registry tie-breaks are deterministic across runs (first-registered-wins)", async () => {
    // A document with no clearly-winning classification rule exercises the
    // tie-break path in DocumentClassifier — confirm it resolves identically
    // every time rather than depending on object/array iteration order.
    const ambiguous = Buffer.from("Col1,Col2\nfoo,bar\n");
    const runs = await Promise.all(
      Array.from({ length: 5 }, () => parseDocument("ambiguous.csv", ambiguous, { clock: FIXED_CLOCK })),
    );
    const documentTypes = runs.map((r) => r.document.classification.documentType);
    expect(new Set(documentTypes).size).toBe(1);
  });
});
