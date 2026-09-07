import { describe, it, expect, vi } from "vitest";

// pipeline-trace.ts persists to the real server/data/mgd-traces.json with no
// delete/cleanup API (see report-store.ts's sibling, which does have one).
// Stubbed here so this suite can call the real runMGDPipeline end-to-end
// without polluting that file. makeStep/TRACE_STEPS are re-exported for
// real — they're pure helpers mgd-pipeline.ts also uses directly to build
// step objects, not just internal to the persistence calls being stubbed.
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

describe("runMGDPipeline — end-to-end evidence sufficiency (real engines, no mocked analysis)", () => {
  it("A/B — no documents, no transactions: report.metadata.evidence.level is NONE, health score is null, not 85", async () => {
    const result = await runMGDPipeline({ clientName: "Empty Co.", industry: "retail", transactions: [], documents: [] });

    expect(result.steps.evidence.level).toBe("NONE");
    expect(result.steps.healthScore).toBeNull();
    expect(result.steps.healthScoreSource).toBe("not_assessed");

    expect(result.report.metadata.operationalHealthScore).toBeUndefined();
    expect(result.report.metadata.evidence?.level).toBe("NONE");
    expect(result.report.visualMetrics.operationalHealthLabel).toBe("Not Assessed");
    expect(result.report.visualMetrics.operationalRiskLevel).toBe("Not Assessed");
    expect(result.report.eventDiagnostics).toBeUndefined();

    // The three previously-ungated narrative sections read as honest, not confident.
    expect(result.report.narrative.operationalHealth.content).toMatch(/could not be assessed/i);
    expect(result.report.narrative.strategicDirection.content).toMatch(/cannot be responsibly proposed/i);
    expect(result.report.narrative.finalConclusion.content).toMatch(/could not reach a conclusion/i);
  });

  it("C — documents supplied but contributed no transactions: evidence.documentStatus is ALL_UNPARSEABLE, not NONE_SUPPLIED", async () => {
    const result = await runMGDPipeline({
      clientName: "Unparseable Co.", industry: "retail",
      transactions: [],
      documents: [{ id: "doc-1", fileName: "empty.xlsx" }, { id: "doc-2", fileName: "also-empty.xlsx" }],
    });
    expect(result.steps.evidence.level).toBe("NONE");
    expect(result.steps.evidence.documentStatus).toBe("ALL_UNPARSEABLE");
    expect(result.steps.evidence.documentsSupplied).toBe(2);
  });

  it("K — Business Concerns and Consultant Observations do not change evidence level or health score, even with zero transactions", async () => {
    const result = await runMGDPipeline({
      clientName: "Concerned Co.", industry: "retail", transactions: [], documents: [],
      businessConcerns: ["Management is concerned about inventory losses."],
      consultantNotes: [{ title: "Observed gap", category: "Inventory", observation: "Stock counts did not match records." }],
    });
    // Still NONE — a stated concern is not documentary evidence.
    expect(result.steps.evidence.level).toBe("NONE");
    expect(result.report.metadata.operationalHealthScore).toBeUndefined();
    // The concern/observation still reach the report — as consultantInsights, not as findings.
    expect(result.report.consultantInsights).toBeDefined();
    expect(result.report.findings).toEqual([]);
    expect(result.report.consultantInsights?.operationalConcerns.some(c => /inventory losses/i.test(c))).toBe(true);
  });

  it("E — sufficient transactions produce a real, non-null health score and unconstrained narrative", async () => {
    // 10 recognisable dispatch-shaped rows — enough to clear the SUFFICIENT
    // floor and to give the findings engine something concrete to detect.
    const transactions = Array.from({ length: 10 }, (_, i) => ({
      documentId: "doc-1",
      transactionType: "dispatch_event",
      rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
      quantity: 10,
      entityName: "Event Alpha",
    }));
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });

    expect(result.steps.evidence.level).toBe("SUFFICIENT");
    expect(result.steps.evidence.documentStatus).toBe("ALL_PARSED");
    expect(result.steps.healthScoreSource).toBe("estimated");
    expect(typeof result.steps.healthScore).toBe("number");
    expect(result.report.metadata.operationalHealthScore).not.toBeUndefined();
    expect(result.report.visualMetrics.operationalHealthLabel).not.toBe("Not Assessed");
    // No caveat text leaks into a genuinely sufficient-evidence report.
    expect(result.report.narrative.operationalHealth.content).not.toMatch(/limited operational evidence/i);
  });
});
