import { describe, it, expect, vi } from "vitest";

// See server/mgd/__tests__/mgd-pipeline-evidence.test.ts for why pipeline-trace
// is stubbed — avoids polluting the real server/data/mgd-traces.json.
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

// ─────────────────────────────────────────────────────────────────────────────
// Regression coverage for docs/MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md.
// This milestone made no production behavior changes — these tests exist to
// prove that fact, and to guard it against a future accidental regression.
// ─────────────────────────────────────────────────────────────────────────────

const REAL_TRANSACTIONS = Array.from({ length: 10 }, (_, i) => ({
  documentId: "doc-1",
  transactionType: "dispatch_event",
  rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
  quantity: 10,
  entityName: "Event Alpha",
}));

const BUSINESS_CONCERNS = ["Management is concerned about inventory shrinkage."];
const CONSULTANT_NOTES = [
  { title: "Manual reconciliation", category: "Inventory", observation: "Warehouse reconciliation is performed manually." },
];

async function runWithout() {
  return runMGDPipeline({
    clientName: "Real Evidence Co.", industry: "event_management",
    transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
  });
}
async function runWith() {
  return runMGDPipeline({
    clientName: "Real Evidence Co.", industry: "event_management",
    transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    businessConcerns: BUSINESS_CONCERNS, consultantNotes: CONSULTANT_NOTES,
  });
}

describe("Business Concerns and Consultant Observations remain context-only (real, sufficient-evidence pipeline run)", () => {
  it("1/4 — findings are byte-identical with and without concerns/notes present", async () => {
    const [without, withCtx] = await Promise.all([runWithout(), runWith()]);
    expect(withCtx.report.findings).toEqual(without.report.findings);
  });

  it("2/5 — root causes are byte-identical with and without concerns/notes present", async () => {
    const [without, withCtx] = await Promise.all([runWithout(), runWith()]);
    expect(withCtx.report.rootCauses).toEqual(without.report.rootCauses);
  });

  it("3/6 — health score (a real, non-null, non-trivial measured value) is unaffected by concerns/notes", async () => {
    const [without, withCtx] = await Promise.all([runWithout(), runWith()]);
    expect(without.steps.healthScore).not.toBeNull();
    expect(withCtx.steps.healthScore).toBe(without.steps.healthScore);
    expect(withCtx.steps.healthScoreSource).toBe(without.steps.healthScoreSource);
  });

  it("recommendations and benchmarks are also unaffected", async () => {
    const [without, withCtx] = await Promise.all([runWithout(), runWith()]);
    expect(withCtx.report.recommendations).toEqual(without.report.recommendations);
    expect(withCtx.report.benchmarks).toEqual(without.report.benchmarks);
  });

  it("7 — evidence sufficiency (level and full detail) is identical whether or not concerns/notes are present", async () => {
    const [without, withCtx] = await Promise.all([runWithout(), runWith()]);
    expect(without.steps.evidence.level).toBe("SUFFICIENT");
    expect(withCtx.steps.evidence).toEqual(without.steps.evidence);
  });

  it("8 — no FindingEvidence entry is fabricated from consultant/concern text", async () => {
    const result = await runWith();
    const allEvidenceText = result.report.findings
      .flatMap(f => f.evidence ?? [])
      .map(e => `${e.observation} ${e.source ?? ""} ${e.documentName ?? ""}`)
      .join(" ")
      .toLowerCase();
    expect(allEvidenceText).not.toMatch(/shrinkage/);
    expect(allEvidenceText).not.toMatch(/reconciliation is performed manually/);
    // Every piece of finding-level evidence still traces back only to the
    // real supplied document, never to a consultant/concern string.
    for (const finding of result.report.findings) {
      for (const ev of finding.evidence ?? []) {
        if (ev.documentName) expect(ev.documentName).toBe("dispatches.xlsx");
      }
    }
  });

  it("the concern and note DO reach consultantInsights (context), never findings/rootCauses (conclusions)", async () => {
    const result = await runWith();
    expect(result.report.consultantInsights).toBeDefined();
    const allConsultantText = JSON.stringify(result.report.consultantInsights).toLowerCase();
    expect(allConsultantText).toMatch(/shrinkage/);
    expect(allConsultantText).toMatch(/reconciliation is performed manually/);
    // Confirms the two sources are NOT tagged by origin today (see ADR §13.1)
    // — this asserts today's real, undifferentiated shape, not a desired one.
    expect(result.report.consultantInsights?.operationalConcerns.every(c => typeof c === "string")).toBe(true);
  });

  it("9 — evidence-driven diagnostic behavior (findings/root causes/recommendations exist and are non-empty) is unchanged by this milestone", async () => {
    const result = await runWithout();
    expect(result.report.findings.length).toBeGreaterThan(0);
    expect(result.report.rootCauses.length).toBeGreaterThan(0);
    expect(result.report.recommendations.length).toBeGreaterThan(0);
  });
});

describe("Business Concerns and Consultant Observations remain context-only (zero-evidence case)", () => {
  it("evidence level, health score, and findings are unaffected by concerns/notes even with zero transactions", async () => {
    const without = await runMGDPipeline({ clientName: "Empty Co.", industry: "retail", transactions: [], documents: [] });
    const withCtx = await runMGDPipeline({
      clientName: "Empty Co.", industry: "retail", transactions: [], documents: [],
      businessConcerns: BUSINESS_CONCERNS, consultantNotes: CONSULTANT_NOTES,
    });
    expect(withCtx.steps.evidence.level).toBe(without.steps.evidence.level);
    expect(withCtx.steps.evidence.level).toBe("NONE");
    expect(withCtx.steps.healthScore).toBeNull();
    expect(withCtx.report.findings).toEqual(without.report.findings);
    expect(withCtx.report.consultantInsights).toBeDefined();
    expect(without.report.consultantInsights).toBeUndefined();
  });
});
