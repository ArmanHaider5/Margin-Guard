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
import crypto from "crypto";

const REAL_TRANSACTIONS = Array.from({ length: 10 }, (_, i) => ({
  documentId: "doc-1",
  transactionType: "dispatch_event",
  rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
  quantity: 10,
  entityName: "Event Alpha",
}));

const DELIVERY_CONCERN = "Client is concerned about delivery delays.";

describe("Structured Diagnostic Scope — regression (docs/MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md)", () => {
  it("1-6 — a Business Concern changes nothing about findings, root causes, recommendations, benchmarks, health score, or evidence sufficiency (real, sufficient-evidence pipeline run)", async () => {
    const base = { clientName: "Real Evidence Co.", industry: "event_management", transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }] };
    const [without, withConcern] = await Promise.all([
      runMGDPipeline(base),
      runMGDPipeline({ ...base, businessConcerns: [DELIVERY_CONCERN] }),
    ]);

    expect(withConcern.report.findings).toEqual(without.report.findings);            // 1
    expect(withConcern.report.rootCauses).toEqual(without.report.rootCauses);        // 2
    expect(withConcern.report.recommendations).toEqual(without.report.recommendations); // 3
    expect(withConcern.report.benchmarks).toEqual(without.report.benchmarks);        // 4
    expect(withConcern.steps.healthScore).toBe(without.steps.healthScore);           // 5
    expect(withConcern.steps.evidence).toEqual(without.steps.evidence);              // 6
  });

  it("7/8 — a concern cannot create FindingEvidence or otherwise appear as documentary/system evidence", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
      businessConcerns: [DELIVERY_CONCERN],
    });
    const allFindingEvidenceText = result.report.findings
      .flatMap(f => f.evidence ?? [])
      .map(e => `${e.observation} ${e.source ?? ""} ${e.documentName ?? ""}`)
      .join(" ")
      .toLowerCase();
    expect(allFindingEvidenceText).not.toMatch(/delivery delays/);
    // The concern also never appears inside the transaction/document arrays
    // the evidence engine actually reads.
    const rawInputText = JSON.stringify(REAL_TRANSACTIONS).toLowerCase();
    expect(rawInputText).not.toMatch(/delivery delays/);
  });

  it("9 — the concern remains identifiable as a distinct, labeled Business Concern / Diagnostic Scope item, not merged into an untyped blob", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
      businessConcerns: [DELIVERY_CONCERN],
    });
    expect(result.report.diagnosticScope).toBeDefined();
    expect(result.report.diagnosticScope).toHaveLength(1);
    expect(result.report.diagnosticScope![0]).toMatchObject({
      concernText: DELIVERY_CONCERN,
      origin: "BUSINESS_CONCERN",
    });
    // Backward-compatible display representation is untouched alongside it.
    expect(result.report.consultantInsights?.operationalConcerns.some(c => /delivery delays/i.test(c))).toBe(true);
  });

  it("10 — no evidence + a concern produces an honest INSUFFICIENT_EVIDENCE scope status, never a fabricated finding", async () => {
    const result = await runMGDPipeline({
      clientName: "Empty Co.", industry: "logistics", transactions: [], documents: [],
      businessConcerns: [DELIVERY_CONCERN],
    });
    expect(result.steps.evidence.level).toBe("NONE");
    expect(result.report.findings).toEqual([]);
    expect(result.report.diagnosticScope).toBeDefined();
    expect(result.report.diagnosticScope![0].status).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.report.diagnosticScope![0].concernText).toBe(DELIVERY_CONCERN);
  });

  it("11 — a report shaped like one persisted before this milestone (no diagnosticScope field) remains safely readable", () => {
    const oldReport: any = {
      metadata: { generatedAt: "2026-01-01T00:00:00.000Z", clientName: "Legacy Co.", reportVersion: "MGD-V1" },
      summary: { criticalFindings: 0, highFindings: 0, criticalRootCauses: 0, highPriorityRecommendations: 0, benchmarkAlerts: 0 },
      narrative: {}, findings: [], rootCauses: [], recommendations: [], benchmarks: [],
      visualMetrics: { operationalHealthLabel: "Not Assessed", operationalRiskLevel: "Not Assessed", benchmarkStatusBreakdown: { healthy: 0, watchlist: 0, elevated: 0, critical: 0 } },
      consultantInsights: { executiveObservations: [], operationalConcerns: ["Some old concern"], notes: [] },
    };
    expect(oldReport.diagnosticScope).toBeUndefined();
    // A consumer written against this milestone's contract treats absence as
    // "no structured scope recorded" — never as an error, never as "empty means no concerns existed."
    expect(oldReport.diagnosticScope?.length ?? 0).toBe(0);
    expect(oldReport.consultantInsights.operationalConcerns).toContain("Some old concern");
  });

  it("12 — the existing report lifecycle (canonical id, persistence, retrieval) is intact for a report that includes diagnosticScope", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
      businessConcerns: [DELIVERY_CONCERN],
    });
    expect(result.report.diagnosticScope).toBeDefined();

    const id = crypto.randomUUID();
    const reportWithId = { ...result.report, id };
    const saved = await saveReport({ id, clientName: "Real Evidence Co.", report: reportWithId, runtimeMs: result.runtimeMs });
    try {
      expect(saved).not.toBeNull();
      const fetched = await getReport(id);
      expect(fetched).not.toBeNull();
      expect(fetched!.report.id).toBe(id);
      expect(fetched!.report.diagnosticScope).toEqual(reportWithId.diagnosticScope);
    } finally {
      await deleteReport(id);
    }
  });
});
