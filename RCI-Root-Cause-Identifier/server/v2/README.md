# MGD V2 — Platform Architecture

Status: active development. This directory is the permanent home of MGD Version 2. It exists entirely alongside MGD V1 (`server/core/`, `server/cil/`, `server/documents/`, `server/mgd/`, `server/modules/`, `server/industries/`, `shared/schema.ts`, and every existing route) — nothing under `server/v2/` may import from, or be imported by, any V1 path, with the single narrow exception of `adapters/`, described below.

This structure is defined by, and must remain traceable to, the approved architecture series in `docs/`:

- [`docs/00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md`](../../docs/00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) — the business language every object name in this codebase must trace back to.
- [`docs/02_MGD_FUNCTIONAL_SPECIFICATION.md`](../../docs/02_MGD_FUNCTIONAL_SPECIFICATION.md) — what MGD V2 must do.
- [`docs/03_MGD_DATA_MODEL.md`](../../docs/03_MGD_DATA_MODEL.md) — the business objects and their relationships.
- [`docs/04_MGD_KNOWLEDGE_LIBRARY.md`](../../docs/04_MGD_KNOWLEDGE_LIBRARY.md) — the consulting knowledge architecture.
- [`docs/05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`](../../docs/05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) — how MGD understands financial information.
- [`docs/MGD_V2_BLUEPRINT.md`](../../docs/MGD_V2_BLUEPRINT.md) — the target engine architecture.
- [`docs/V2_ROADMAP.md`](../../docs/V2_ROADMAP.md) — the migration sequencing from V1 to V2.
- [`docs/99_ARCHITECTURE_DECISIONS.md`](../../docs/99_ARCHITECTURE_DECISIONS.md) — the specific, load-bearing implementation decisions (ADRs) made while building this structure, including every rule on this page. In particular, **ADR-009: `StructuredDocument` is the public output of the Document Parser; `DocumentModel` remains an internal implementation detail** — every reference to "DocumentModel" below that predates ADR-009 should be read as `StructuredDocument`; `DocumentModel` never crosses a module boundary.
- [`docs/98_TECHNICAL_BACKLOG.md`](../../docs/98_TECHNICAL_BACKLOG.md) — accepted, non-blocking follow-up work explicitly deferred from a frozen module, tracked so it is never silently implied by omission.

These documents are frozen and are architectural authority. If code under `server/v2/` conflicts with one of them, the code is wrong and must change — the documents do not change to accommodate the code.

## Folder structure

```
server/v2/
    README.md                    — this file
    document-parser/             — SPRINT 1 (active): byte-level extraction and structural recognition
        index.ts                     — public entry point (ADR-005); exposes StructuredDocument/EvidenceObject only
        pipeline/, stages/, rules/, evidence/, __tests__/   — private internals, including DocumentModel (ADR-009)
    financial-intelligence/      — future sprint: canonical financial statement understanding
        index.ts                     — public entry point (not yet implemented)
    operational-intelligence/    — future sprint: canonical operational data understanding
        index.ts                     — public entry point (not yet implemented)
    correlation/                 — future sprint: cross-domain evidence correlation
        index.ts                     — public entry point (not yet implemented)
    brain/                       — future sprint: Root Cause / Recommendation / Opportunity / Confidence / Report reasoning
        index.ts                     — public entry point (not yet implemented)
    knowledge/                   — active: the Knowledge Library (Ontology term registry today; full Knowledge Library later)
        index.ts                     — public entry point
    shared/                       — active: cross-module foundational types and utilities
        index.ts                     — public entry point, re-exports the five subfolders below
        contracts/                   — cross-module interfaces only, no implementation
        errors/                      — the shared error hierarchy
        events/                      — event contract shapes (types only — no bus/queue yet)
        value-objects/               — Money, Percentage, Quantity, Confidence, Currency, Period, DateRange, Identifier
        utils/                        — domain-agnostic helper functions
    adapters/                    — active: V1/external compatibility adapters, namespaced per module, never called by any V1 file
        document-parser/
    tests/                        — active: whole-module and cross-module test suites
        document-parser/
```

Every folder listed above is permanent platform structure, per the approved Blueprint's engine list (§4) and layered architecture (§3), even where a folder is currently a stub pending its own sprint. A stub `index.ts` here is a placeholder for a named, already-designed engine — not a folder waiting to be invented later.

## Public Module API

**Modules communicate only through their public `index.ts` entry point. Internal files are private implementation details and must never be imported directly.**

Every top-level module — `document-parser/`, `financial-intelligence/`, `operational-intelligence/`, `correlation/`, `brain/`, `knowledge/`, `shared/` — exposes exactly one public entry point: its `index.ts`. This applies recursively inside `shared/` as well: `shared/index.ts` is the one thing anything outside `shared/` may import; `shared/`'s own subfolders (`contracts/`, `errors/`, `events/`, `value-objects/`, `utils/`) each have their own `index.ts` barrel that `shared/index.ts` re-exports from, and those subfolder barrels are how `shared/`'s internal files talk to each other. No file anywhere under `server/v2/` imports a sibling module's non-`index.ts` file. See ADR-005 in [`docs/99_ARCHITECTURE_DECISIONS.md`](../../docs/99_ARCHITECTURE_DECISIONS.md).

## Module purpose, ownership, and dependencies

| Module | Purpose | Realizes | Sprint status | May depend on |
|---|---|---|---|---|
| `document-parser/` | Byte-level extraction and structural recognition of uploaded documents — file type, classification, layout, sections, tables, entities, terminology, quality, confidence — producing the canonical `StructuredDocument`/`EvidenceObject[]` public output. Internally assembles a universal `DocumentModel` first (ADR-009), but never exposes it. Zero interpretation of business meaning. | Blueprint §4 "Document Parser" engine | **Sprint 1 — FROZEN.** No new functionality without a future ADR authorizing it (bug fixes remain in scope). See `document-parser/MIGRATION.md` and [`docs/98_TECHNICAL_BACKLOG.md`](../../docs/98_TECHNICAL_BACKLOG.md) for accepted, non-blocking follow-up (DP-001–DP-004). | `shared/`, `knowledge/` |
| `financial-intelligence/` | Canonical financial statement understanding — the Financial Intelligence Framework's pipeline (`docs/05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`), consuming `document-parser/`'s `StructuredDocument`, never caring what format the source document originally was. | Blueprint §4 "Financial Parser" engine; FIF Chapters 2–8 | **Sprint 2 — active (foundation: Financial Object Model, Financial Evidence, Financial Signals — stops there; see `financial-intelligence/README.md`)** | `shared/`, `knowledge/`, `document-parser/` (via `StructuredDocument` only — never `DocumentModel`, per ADR-009) |
| `operational-intelligence/` | Canonical operational data understanding — KPIs, operational ratios, 4M-categorized signals — consuming `document-parser/`'s `StructuredDocument`. | Functional Spec §3.3; Blueprint's Signal Engine (operational scope) | Future sprint | `shared/`, `knowledge/`, `document-parser/` (via `StructuredDocument` only — never `DocumentModel`, per ADR-009) |
| `correlation/` | Cross-domain evidence correlation — where a Financial Finding and an Operational Finding jointly substantiate a Root Cause neither could support alone. | FIF Chapter 9 "Operational Correlation," generalized to any two Insight-producing domains, not financial+operational exclusively | Future sprint | `financial-intelligence/`, `operational-intelligence/`, `knowledge/`, `shared/` |
| `brain/` | Root Cause, Recommendation, Opportunity, Confidence, and Report reasoning — the deterministic engines that turn correlated Findings into a finished, evidence-linked diagnosis. **The only module permitted to construct an Insight-shaped object (ADR-006).** | Blueprint §4 Reasoning/Value/Narrative/Output layer engines | Future sprint | `correlation/`, `knowledge/`, `shared/` |
| `knowledge/` | The Knowledge Library — definition objects every other module consults but never owns a private copy of. Holds the Ontology-grounded term registry today; grows into the full Knowledge Library (`04_MGD_KNOWLEDGE_LIBRARY.md`) as later sprints build it out. | Blueprint §5 Knowledge System; `04_MGD_KNOWLEDGE_LIBRARY.md` | **Active — Ontology term registry (Sprint 1)** | `shared/` only — knowledge must never depend on any consuming module, in either direction |
| `shared/` | Cross-module foundational types and utilities with no business-domain content of their own: `contracts/` (interfaces only), `errors/` (the shared error hierarchy), `events/` (event contract shapes), `value-objects/` (Money, Percentage, Quantity, Confidence, Currency, Period, DateRange, Identifier), `utils/` (helper functions). | Cross-cutting infrastructure implied by every approved document's shared vocabulary | **Active (Sprint 1)** | Nothing under `server/v2/` — `shared/` is the dependency floor |
| `adapters/` | V1/external compatibility adapters, namespaced per module (`adapters/document-parser/`, and so on as later sprints need them). The Sprint 1 adapter converts V1's stored shape (`ExtractedDocumentData`) into V2's canonical output (`StructuredDocument`/`EvidenceObject[]`), for V2 modules that need to analyze V1-parsed documents without the original file bytes. A future V2→V1 adapter (for an actual route cutover) would be a separate, explicitly-scoped file. | ADR-008 (amended) | **Active — built and tested (Sprint 1); not called by any V1 file** | The module it adapts, plus (via `import type` only, erased at compile time) the V1 type it reads |
| `tests/` | Whole-module and cross-module test suites — repeatability, V1-shape compatibility, and performance-smoke tests that exercise a complete module rather than one stage. Stage-level unit/failure/edge-case tests live co-located inside each module's own `__tests__/`. | Sprint 1 requirement: "The complete parser shall also have Repeatability Tests, Compatibility Tests, Performance Smoke Tests" | **Active (Sprint 1)** | The module(s) under test |

## Rules for communication between modules

1. **Modules communicate only through their public `index.ts` entry point** (see above; ADR-005). This is the first rule because every other rule below is a consequence of it.
2. **Downstream modules consume canonical shapes, never source-specific internals.** `financial-intelligence/` and `operational-intelligence/` receive a `StructuredDocument` from `document-parser/`'s public API and must never branch on, or import types describing, whether the original source was Excel, PDF, Word, CSV, OCR, an API, SAP, or a database. `document-parser/` achieves this internally by first assembling a universal `DocumentModel`, but per **ADR-009**, `DocumentModel` itself never crosses the module boundary — `StructuredDocument` is the seam that keeps every downstream module ignorant of parsing implementation, and it is the only thing on the other side of that seam.
3. **`knowledge/` is a leaf dependency.** Every module may read from `knowledge/`'s public API. `knowledge/` may depend only on `shared/`, never on any module that consumes it. This is the same "engines consume, never own" discipline the Blueprint requires of Knowledge System entities (§5.3), applied to the V2 folder graph itself.
4. **`shared/` is the dependency floor.** Nothing in `shared/` imports from any other `server/v2/` module. Within `shared/`, its own subfolders may depend on each other (e.g. `value-objects/` imports `errors/`) — the dependency-floor rule means `shared/` as a whole never imports from outside itself, not that its internals are isolated from each other.
5. **No lateral dependencies between domain modules.** `financial-intelligence/` and `operational-intelligence/` never import from each other. Where their outputs need to be combined, that combination happens in `correlation/`, which is the only module permitted to depend on both (ADR-007).
6. **`brain/` is the only module that produces Insights** (Findings, Root Causes, Recommendations, Opportunities, Risks, per the Data Model's Insight abstraction). No other module in `server/v2/` may construct an Insight-shaped object (ADR-006) — this keeps the mandatory Evidence Chain (`03_MGD_DATA_MODEL.md` Chapter 5) enforceable at exactly one point in the codebase.
7. **`adapters/` depends inward, never outward, and reads V1 types only, never V1 code.** An adapter under `adapters/document-parser/` may import `document-parser/`'s public API to produce its types, and may reference a V1 type (e.g. `shared/schema.ts`'s `ExtractedDocumentData`) via `import type` only — a compile-time-only reference, erased entirely from the built output, never a runtime call into V1. Nothing outside `adapters/` imports from it, and nothing inside `adapters/` is imported by a V1 file (ADR-008).

## The V1/V2 isolation rule

**Absolute, with one narrow, inert exception.** No file under `server/v2/` imports from `server/core/`, `server/cil/`, `server/documents/`, `server/mgd/`, `server/modules/`, `server/industries/`, `shared/schema.ts`, or any existing route file. No V1 file imports from `server/v2/`. The single exception is `adapters/`, which may *read* a V1 type definition (e.g. `ExtractedDocumentData`'s shape) purely to know what shape to produce — this is a one-directional, type-level reference, never a runtime call, and never a V1 file reaching into V2. Until an explicit cutover is approved, V1 continues to run entirely unaware that `server/v2/` exists. (ADR-001)

## Migration philosophy

Per `docs/MGD_V2_BLUEPRINT.md` §10 and `docs/V2_ROADMAP.md`: this is a strangler-fig migration, not a rewrite-in-place. Every module here is built new, validated independently and against real historical data, and only ever cut over to production traffic behind an explicit, per-client feature flag — never by modifying a V1 engine to redirect internally. V1's three diagnostic engines and four knowledge libraries (`docs/TECH_DEBT.md` §1–§2) are retired only after the corresponding V2 module has fully absorbed their traffic with no regression, confirmed by the people who use the output, not merely by test coverage. Until that day, V1 remains the system of record and must not be destabilized by anything built here.

## Future sprint ownership

Each not-yet-implemented module above is scoped, named, and owned by the sprint that will build it — not an open question to be redesigned when that sprint begins. A future sprint building `financial-intelligence/` starts from `docs/05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md` and this README's dependency table; it does not re-derive where the module lives, what it may depend on, or what it may never do.
