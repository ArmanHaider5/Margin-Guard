# Document Parser Framework — Migration Notes

Status: **Sprint 1 — FROZEN.** No new parser features are added to this module going forward; it is complete for its scoped purpose. Bug fixes remain in scope; new capabilities do not. Every claim in this document has been verified against the actual codebase and test suite as of the freeze — see "Verification" at the end.

## What this replaces

This module is the concrete realization of the "Document Parser" engine named in [`docs/MGD_V2_BLUEPRINT.md`](../../../docs/MGD_V2_BLUEPRINT.md) §4, and is intended to eventually replace V1's document parsing (`server/documents/document-parser.ts`, `server/cil/*`) per the migration strategy in [`docs/V2_ROADMAP.md`](../../../docs/V2_ROADMAP.md) §10.1. It is named **Document Parser Framework**, not "Document Intelligence," to keep its actual behaviour (structural recognition and extraction, zero interpretation) honestly distinguished from the broader, interpretation-bearing "Document Intelligence" capability named in [`docs/02_MGD_FUNCTIONAL_SPECIFICATION.md`](../../../docs/02_MGD_FUNCTIONAL_SPECIFICATION.md) §3.1 — this module is that capability's foundation, not its entirety.

## Why it is isolated from V1

Per [`docs/MGD_V2_BLUEPRINT.md`](../../../docs/MGD_V2_BLUEPRINT.md) §10 and ADR-001: V1 is frozen production baseline, and V2 is built as a new, isolated code path alongside it, never modified in place. No file under `server/v2/` imports from any V1 path; no V1 file imports from `server/v2/`. Verified by grep as part of every milestone in this sprint (most recently at the point this document was last updated), not merely asserted once.

## What was built (Sprint 1 summary)

The full pipeline — File Type Detection → Raw Content Extraction → Document Classification → Layout Analysis → (RecognizedDocument) → Section Detection → Table Detection → Entity Extraction → Terminology Normalization (Ontology Registry only) → Document Quality Evaluation → Confidence Evaluation → DocumentModel (internal) → StructuredDocument (public) → EvidenceObject Conversion — implemented as thirteen independent, single-responsibility services (`services/`), four `ParserManifest`-declaring plugin parsers for xlsx/csv/docx/pdf (`parsers/`), a deterministic document-type rule registry (`rules/`), and a `ParserRegistry` plugin-discovery mechanism. Public entry point: `parseDocument(fileName, content, options?)`, exported from `index.ts`.

Key architectural decisions, recorded formally in [`docs/99_ARCHITECTURE_DECISIONS.md`](../../../docs/99_ARCHITECTURE_DECISIONS.md):

- **ADR-009**: `StructuredDocument` is the public output; `DocumentModel` is a permanently internal implementation detail, never exported.
- **ADR-010**: given identical bytes, parser version, and Ontology version, output MUST be byte-for-byte identical — verified directly by a repeatability test suite, not merely asserted.

## The V1 compatibility adapter — what it actually does

`server/v2/adapters/document-parser/from-v1-extracted-document-data.ts` exports `fromV1ExtractedDocumentData()`, which converts **V1's `ExtractedDocumentData` (input) into a V2 `StructuredDocument` + `EvidenceObject[]` (output)** — per ADR-008 (amended during Sprint 1 close-out after this adapter was actually built and its needed direction became clear). This lets a future V2 module (e.g. `financial-intelligence/`) analyze documents V1 already parsed and stored in `client_documents.extracted_data`, without needing the original file bytes, which a V2-only caller (such as a backfill job operating purely against the database) frequently will not have.

It imports exactly one thing from V1 — the `ExtractedDocumentData` type — via `import type`, which TypeScript erases completely at compile time; there is no runtime V1 dependency anywhere in this file. It is **not called by any V1 file**, and does not need to be, since its consumers are V2 modules, not V1 routes.

Every `StructuredDocument` this adapter produces is self-identifying as adapter-derived: it carries a distinct `trace.pipelineVersion` (`"v1-compat-adapter-1.0.0"`, never the real pipeline's `"1.0.0"`) and a mandatory diagnostic stating explicitly that its confidence and quality fields are fixed, documented placeholders — not computed assessments — so it can never be mistaken for output that went through the real Document Parser pipeline.

**This is a different adapter from what an earlier draft of this document described.** An earlier version assumed a V2→V1 adapter (translating new pipeline output into V1's legacy shape, for a future route cutover) — that direction was never built, because it wasn't what Sprint 2's actual need turned out to be. If a V2→V1 route-cutover adapter is needed in a future sprint, it will be a new, separately-scoped file with its own documentation, not a retrofit of this one.

## Known, deliberate scope boundaries

- **Text-native inputs only.** No OCR/scanned-image support. `RawContentExtractor`'s parser dispatch is a registry (`FileType → parser`), so adding an OCR-backed image parser later is a new registration, not a redesign — the `image` `FileType` is already recognized by `FileTypeDetector`, just has no registered extractor yet.
- **In-code rule tables, by stated exception.** `rules/document-type-rules.ts`'s classification rules and `knowledge/ontology-terms-data.ts`'s Ontology term registry are hand-authored, versioned data files, not yet backed by the full governed Knowledge Library (`docs/04_MGD_KNOWLEDGE_LIBRARY.md`). Per ADR-003's stated promotion path: same shape, migrates into the real Knowledge Library without a redesign once that exists.
- **`TerminologyNormalizer` resolves concepts exclusively through the Ontology Registry** — no standalone synonym table, no AI. A "loosened" string-comparison fallback is still matched against the same registry and always carries a reduced confidence plus a `recovery`-severity diagnostic (origin: `Ontology`).
- **`EvidenceObjectBuilder`'s currency normalization is intentionally modest** — a small embedded symbol table (RM/$/€/£) illustrating the permanent `rawValue → observedValue → normalizedValue` distinction, not a complete implementation of currency/unit normalization. Full financial normalization is Financial Intelligence's responsibility ([`docs/05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`](../../../docs/05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md)).

## Testing status (verified, not aspirational)

A real `vitest` suite exists and passes in full — see "Verification" below for the exact command and result. It covers:

- **Unit tests**: shared Value Objects (`shared/__tests__/value-objects.test.ts`); `FileTypeDetector`, `EntityExtractor`, `TerminologyNormalizer`, `ConfidenceEvaluator` (`document-parser/__tests__/stages/`) — including failure and edge cases (unrecognized file types, empty buffers, blank cells, unmapped Ontology labels, empty confidence-input arrays) inline within each file's test cases, not as separate files.
- **Regression tests**: full-pipeline runs against real `.xlsx`/`.docx`/`.pdf` files already present in `uploads/` (read-only) plus a synthetic `.csv`, asserting classification/table/evidence output shape and the `rawValue → observedValue → normalizedValue` chain (`document-parser/__tests__/regression/full-pipeline.test.ts`).
- **Corrupted-file tests**: broken PDF, malformed CSV, corrupted XLSX, truncated DOCX — all confirmed to degrade gracefully rather than throw (`document-parser/__tests__/regression/corrupted-files.test.ts`).
- **Repeatability tests**: byte-for-byte identical output across repeated runs on identical bytes (a real file and a synthetic one), content-derived (never random) document ids, and deterministic rule-registry tie-breaks (`server/v2/tests/document-parser/repeatability.test.ts`).
- **Compatibility adapter tests**: table/entity translation, `keyFindings` preservation without constructing a Finding-shaped object, the mandatory self-identifying diagnostic, placeholder-confidence validity, and determinism (`server/v2/adapters/document-parser/__tests__/from-v1-extracted-document-data.test.ts`).

**Not yet built, and explicitly not claimed as done** — formally tracked as accepted backlog in [`docs/98_TECHNICAL_BACKLOG.md`](../../../docs/98_TECHNICAL_BACKLOG.md), not left as an implied gap: dedicated unit test files for seven of the thirteen services (DP-001), a performance-smoke test (DP-002), OCR/scanned-document support (DP-003, requires a future ADR per the Sprint 1 freeze), and an Ontology Registry compiler/validator (DP-004). None of these gaps affect the correctness claims made elsewhere in this document — they are coverage-breadth or capability-scope gaps, not known defects.

## Freeze status

**Sprint 1 is frozen, effective immediately.** No further Document Parser Framework functionality may be added unless required by a future, explicitly-authored Architecture Decision Record. Bug fixes against existing behaviour remain permitted; new capability (including DP-003) does not, until an ADR authorizes it.

## For the next sprint (Financial Intelligence)

`financial-intelligence/` consumes `StructuredDocument` and `EvidenceObject` — this module's public output — exclusively. It has no visibility into, and no dependency on, `DocumentModel`, `RawContent`, `UploadedFile`, or any parser-internal type, per ADR-009 and the module dependency table in [`server/v2/README.md`](../../README.md).

## Verification

As of this freeze: `npm run check` reports zero errors under `server/v2/` (V1's own 153 pre-existing, untouched errors are unaffected in count — see the Sprint 1 milestone reports for why that number is not 155, a side effect of adding the `pdf-parse` dependency to a shared `package.json`, not a code change to any V1 file). `npx vitest run` reports **9 test files, 68 tests, all passing, zero failures**. Both commands were run immediately before this document was finalized, not at an earlier point in the sprint.
