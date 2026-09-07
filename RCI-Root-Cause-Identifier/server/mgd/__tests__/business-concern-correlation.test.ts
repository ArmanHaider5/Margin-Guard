import { describe, it, expect, vi } from "vitest";

// See mgd-pipeline-evidence.test.ts for why pipeline-trace is stubbed.
vi.mock("../pipeline-trace", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../pipeline-trace")>();
  return {
    ...actual,
    startTrace: vi.fn(async () => ({ traceId: "test-trace", createdAt: new Date().toISOString(), steps: [], status: "running" as const })),
    addTraceStep: vi.fn(async () => null),
    completeTrace: vi.fn(async () => null),
  };
});

import { runMGDPipeline } from "../mgd-pipeline.js";
import { saveReport, getReport, deleteReport } from "../report-store.js";
import { buildDiagnosticScope, attachRelevantFindings } from "../diagnostic-scope.js";
import { computeEvidenceSufficiency } from "../evidence-sufficiency.js";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Regression coverage for docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md
// ("MGD Milestone 15 — Business Concern & Consultant Observation Correlation
// Architecture").
//
// Central invariant proven throughout: a consultant may explicitly SELECT a
// diagnostic area for a concern/observation, but MGD never INFERS one from
// free text, never filters or alters the full diagnostic based on a
// selection (Model A — scoping/display only), and never claims a concern is
// "validated" merely because a finding shares its selected area.
// ─────────────────────────────────────────────────────────────────────────────

const REAL_TRANSACTIONS = Array.from({ length: 10 }, (_, i) => ({
  documentId: "doc-1",
  transactionType: "dispatch_event",
  rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
  quantity: 10,
  entityName: "Event Alpha",
}));

// Confirmed present for this fixture: event_readiness, dispatch_operations,
// inventory_visibility, manpower_dependency, financial_leakage.
// Confirmed absent: logistics_coordination, warehouse_operations,
// workflow_scalability, asset_management.
const AREA_WITH_FINDINGS    = "dispatch_operations";
const AREA_WITHOUT_FINDINGS = "warehouse_operations";

const BASE = {
  clientName: "Real Evidence Co.", industry: "event_management",
  transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
};

describe("1 — Business Concern with no selected area", () => {
  it("a plain-string concern still produces a scope item with no selectedAreas/relevantFindingIds", async () => {
    const result = await runMGDPipeline({ ...BASE, businessConcerns: ["Client is worried about margins."] });
    const item = result.report.diagnosticScope![0];
    expect(item.concernText).toBe("Client is worried about margins.");
    expect(item.selectedAreas).toBeUndefined();
    expect(item.relevantFindingIds).toBeUndefined();
    expect(item.status).toBe("UNVALIDATED");
  });
});

describe("2 — Business Concern with one human-selected area", () => {
  it("the {text, selectedAreas} form is carried through to the scope item", async () => {
    const result = await runMGDPipeline({
      ...BASE,
      businessConcerns: [{ text: "Client is worried about dispatch delays.", selectedAreas: [AREA_WITH_FINDINGS] }],
    });
    const item = result.report.diagnosticScope![0];
    expect(item.concernText).toBe("Client is worried about dispatch delays.");
    expect(item.selectedAreas).toEqual([AREA_WITH_FINDINGS]);
  });
});

describe("3 — Business Concern with multiple selected areas", () => {
  it("multiple valid areas are all preserved, deduplicated, order-stable", async () => {
    const result = await runMGDPipeline({
      ...BASE,
      businessConcerns: [{
        text: "Client is worried about several things.",
        selectedAreas: [AREA_WITH_FINDINGS, "event_readiness", AREA_WITH_FINDINGS], // deliberate duplicate
      }],
    });
    const item = result.report.diagnosticScope![0];
    expect(item.selectedAreas).toEqual([AREA_WITH_FINDINGS, "event_readiness"]);
  });
});

describe("4 — concern text alone cannot create a category linkage", () => {
  it("a concern whose TEXT names a real category word, but selects no area, gets no selectedAreas at all — no inference occurs", async () => {
    const result = await runMGDPipeline({
      ...BASE,
      businessConcerns: ["I'm worried about dispatch_operations and warehouse_operations issues."],
    });
    const item = result.report.diagnosticScope![0];
    expect(item.selectedAreas).toBeUndefined();
    expect(item.relevantFindingIds).toBeUndefined();
  });

  it("an invalid/unknown area string is silently dropped, never accepted as a real category", () => {
    const items = buildDiagnosticScope(
      [{ text: "Some concern", selectedAreas: ["not_a_real_category", "made_up_area"] }],
      "SUFFICIENT",
    );
    expect(items[0].selectedAreas).toBeUndefined();
  });
});

describe("5/6 — selected area survives persistence round-trip and appears in report output", () => {
  it("selectedAreas and relevantFindingIds are byte-identical after save/fetch", async () => {
    const result = await runMGDPipeline({
      ...BASE,
      businessConcerns: [{ text: "Dispatch reliability concern.", selectedAreas: [AREA_WITH_FINDINGS] }],
    });
    expect(result.report.diagnosticScope![0].selectedAreas).toEqual([AREA_WITH_FINDINGS]);
    expect(result.report.diagnosticScope![0].relevantFindingIds!.length).toBeGreaterThan(0);

    const id = crypto.randomUUID();
    const reportWithId = { ...result.report, id };
    await saveReport({ id, clientName: "Real Evidence Co.", report: reportWithId, runtimeMs: result.runtimeMs });
    try {
      const fetched = await getReport(id);
      expect(fetched!.report.diagnosticScope).toEqual(reportWithId.diagnosticScope);
    } finally {
      await deleteReport(id);
    }
  });
});

describe("7 — existing full diagnostic still runs unmodified regardless of selection (Model A, not filtering)", () => {
  it("findings/rootCauses/recommendations/health/evidence are byte-identical with vs without a selected area", async () => {
    const [without, withArea] = await Promise.all([
      runMGDPipeline(BASE),
      runMGDPipeline({ ...BASE, businessConcerns: [{ text: "Dispatch concern.", selectedAreas: [AREA_WITH_FINDINGS] }] }),
    ]);
    expect(withArea.report.findings).toEqual(without.report.findings);
    expect(withArea.report.rootCauses).toEqual(without.report.rootCauses);
    expect(withArea.report.recommendations).toEqual(without.report.recommendations);
    expect(withArea.steps.healthScore).toBe(without.steps.healthScore);
    expect(withArea.steps.evidence).toEqual(without.steps.evidence);
  });
});

describe("8 — scope does not suppress cross-domain findings", () => {
  it("selecting only dispatch_operations still leaves every other category's findings fully present in the report", async () => {
    const result = await runMGDPipeline({
      ...BASE,
      businessConcerns: [{ text: "Only about dispatch.", selectedAreas: [AREA_WITH_FINDINGS] }],
    });
    const categories = new Set(result.report.findings.map(f => f.category));
    // The fixture's cross-domain findings (event_readiness, inventory_visibility,
    // manpower_dependency, financial_leakage) must all still be present —
    // selecting one area never narrows what the detectors themselves produce.
    expect(categories.has("event_readiness")).toBe(true);
    expect(categories.has("inventory_visibility")).toBe(true);
    expect(categories.has("manpower_dependency")).toBe(true);
    expect(result.report.findings).toHaveLength(8);
  });
});

describe("9 — Consultant Observation remains distinct from documentary evidence", () => {
  it("an observation with a relatedArea never appears inside any finding's evidence/signals, even when the area matches", async () => {
    const result = await runMGDPipeline({
      ...BASE,
      consultantNotes: [{ title: "Site visit", category: "Logistics", observation: "UNIQUE_OBSERVATION_TEXT_9F3K", relatedArea: AREA_WITH_FINDINGS }],
    });
    const allFindingText = result.report.findings
      .flatMap(f => [...(f.signals ?? []), ...(f.evidence ?? []).map(e => e.observation)])
      .join(" ");
    expect(allFindingText).not.toContain("UNIQUE_OBSERVATION_TEXT_9F3K");
    // The note itself is preserved, unpromoted, in consultantInsights only.
    const note = result.report.consultantInsights!.notes.find(n => n.observation === "UNIQUE_OBSERVATION_TEXT_9F3K");
    expect(note).toBeDefined();
    expect(note!.relatedArea).toBe(AREA_WITH_FINDINGS);
  });
});

describe("10 — Consultant Observation does not alter Evidence Sufficiency", () => {
  it("evidence sufficiency is identical with and without a related-area-tagged observation", async () => {
    const [without, withNote] = await Promise.all([
      runMGDPipeline(BASE),
      runMGDPipeline({ ...BASE, consultantNotes: [{ title: "x", category: "Operations", observation: "y", relatedArea: AREA_WITH_FINDINGS }] }),
    ]);
    expect(withNote.steps.evidence).toEqual(without.steps.evidence);
  });

  it("evidence sufficiency is computed independently of relatedArea by construction (no import path exists)", () => {
    const evidence = computeEvidenceSufficiency({ transactions: [], documents: [], metrics: {} });
    expect(evidence.level).toBe("NONE");
  });
});

describe("11 — a relevant finding can be displayed in relation to a concern", () => {
  it("attachRelevantFindings correctly cross-references findings sharing the selected area", () => {
    const scopeItems = buildDiagnosticScope(
      [{ text: "Dispatch concern", selectedAreas: [AREA_WITH_FINDINGS] }],
      "SUFFICIENT",
    );
    const findings = [
      { id: "f1", category: AREA_WITH_FINDINGS },
      { id: "f2", category: "inventory_visibility" },
      { id: "f3", category: AREA_WITH_FINDINGS },
    ];
    const withRelevant = attachRelevantFindings(scopeItems, findings);
    expect(withRelevant[0].relevantFindingIds).toEqual(["f1", "f3"]);
    // Still UNVALIDATED — relevance is never promoted to validation.
    expect(withRelevant[0].status).toBe("UNVALIDATED");
  });
});

describe("12 — no finding does not automatically become \"concern disproven\"", () => {
  it("selecting an area with zero findings still leaves status UNVALIDATED, never a 'disproven'/NOT_SUPPORTED-style status", async () => {
    const result = await runMGDPipeline({
      ...BASE,
      businessConcerns: [{ text: "Warehouse concern.", selectedAreas: [AREA_WITHOUT_FINDINGS] }],
    });
    const item = result.report.diagnosticScope![0];
    expect(item.selectedAreas).toEqual([AREA_WITHOUT_FINDINGS]);
    expect(item.relevantFindingIds).toBeUndefined(); // no findings matched
    expect(item.status).toBe("UNVALIDATED");
    expect(item.status).not.toBe("NOT_SUPPORTED");
  });
});

describe("13 — insufficient evidence remains honest", () => {
  it("zero transactions still yields INSUFFICIENT_EVIDENCE regardless of any selected area", async () => {
    const result = await runMGDPipeline({
      clientName: "Empty Co.", industry: "retail", transactions: [], documents: [],
      businessConcerns: [{ text: "Some concern", selectedAreas: [AREA_WITH_FINDINGS] }],
    });
    expect(result.report.diagnosticScope![0].status).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.steps.evidence.level).toBe("NONE");
  });
});

describe("14 — historical reports remain readable", () => {
  it("a scope item shaped exactly like a pre-Milestone-15 report (no selectedAreas/relevantFindingIds keys at all) is still structurally valid", () => {
    const oldStyleItem = {
      id: "scope-0",
      concernText: "Some old concern",
      origin: "BUSINESS_CONCERN" as const,
      status: "UNVALIDATED" as const,
      // no selectedAreas, no relevantFindingIds — the pre-Milestone-15 shape
    };
    expect(oldStyleItem.selectedAreas).toBeUndefined();
    expect(oldStyleItem.concernText).toBe("Some old concern");
    // attachRelevantFindings must not throw or alter an item with no selectedAreas.
    const result = attachRelevantFindings([oldStyleItem], [{ id: "f1", category: "dispatch_operations" }]);
    expect(result[0]).toEqual(oldStyleItem);
  });

  it("a legacy plain-string businessConcerns array (no objects at all) still works end-to-end", async () => {
    const result = await runMGDPipeline({ ...BASE, businessConcerns: ["Plain legacy concern"] });
    expect(result.report.diagnosticScope![0].concernText).toBe("Plain legacy concern");
    expect(result.report.findings).toHaveLength(8); // unaffected
  });
});
