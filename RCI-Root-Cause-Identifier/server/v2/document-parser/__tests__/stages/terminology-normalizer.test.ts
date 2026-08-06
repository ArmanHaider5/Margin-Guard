import { describe, it, expect } from "vitest";
import { TerminologyNormalizer } from "../../services/terminology-normalizer.js";
import { createDefaultOntologyRegistry } from "../../../knowledge/index.js";

const normalizer = new TerminologyNormalizer();
const ontology = createDefaultOntologyRegistry();

describe("TerminologyNormalizer — resolves exclusively through the Ontology Registry", () => {
  it("exact match against a canonical term produces a high-confidence mapping with an ontologyReference", () => {
    const { value } = normalizer.normalize([{ label: "Revenue" }], ontology);
    expect(value).toHaveLength(1);
    expect(value[0].canonicalTerm).toBe("Revenue");
    expect(value[0].ontologyReference).toContain("05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md");
    expect(value[0].confidence.value).toBeGreaterThan(0.8);
  });

  it("exact match against a registered synonym works case-insensitively", () => {
    const { value } = normalizer.normalize([{ label: "rev" }], ontology);
    expect(value[0]?.canonicalTerm).toBe("Revenue");
  });

  it("a loosened (punctuation-stripped) match is still Ontology-bound, but at reduced confidence with a diagnostic", () => {
    const { value, diagnostics } = normalizer.normalize([{ label: "Rev." }], ontology);
    expect(value[0]?.canonicalTerm).toBe("Revenue");
    expect(value[0]?.confidence.value).toBeLessThan(0.8);
    expect(diagnostics.some((d) => d.severity === "recovery" && d.origin === "Ontology")).toBe(true);
  });

  it("no heuristic guessing beyond the Ontology Registry: an unmapped label produces no mapping and no diagnostic", () => {
    const { value, diagnostics } = normalizer.normalize([{ label: "Totally Unmapped Column XYZ" }], ontology);
    expect(value).toHaveLength(0);
    expect(diagnostics).toHaveLength(0); // silence is the correct, honest default — see class doc comment
  });

  it("edge case: empty/whitespace-only labels are skipped without error", () => {
    const { value } = normalizer.normalize([{ label: "" }, { label: "   " }], ontology);
    expect(value).toHaveLength(0);
  });

  it("never invents a canonical term absent from the registry", () => {
    const emptyRegistry = createDefaultOntologyRegistry();
    const allCanonicalTerms = new Set(emptyRegistry.allTerms().map((t) => t.canonicalTerm));
    const { value } = normalizer.normalize(
      [{ label: "Revenue" }, { label: "Expense" }, { label: "Nonsense Field" }],
      ontology,
    );
    for (const mapping of value) {
      expect(allCanonicalTerms.has(mapping.canonicalTerm)).toBe(true);
    }
  });
});
