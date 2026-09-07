import { describe, it, expect, vi } from "vitest";

// See mgd-pipeline-evidence.test.ts for why pipeline-trace is stubbed in the
// pipeline-integration test below.
vi.mock("../pipeline-trace", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../pipeline-trace")>();
  return {
    ...actual,
    startTrace: vi.fn(async () => ({ traceId: "test-trace", createdAt: new Date().toISOString(), steps: [], status: "running" as const })),
    addTraceStep: vi.fn(async () => null),
    completeTrace: vi.fn(async () => null),
  };
});

import {
  generateExecutiveNarrative,
  generateKeyFindingsNarrative,
  generateOperationalHealthNarrative,
} from "../executive-narrative-engine.js";
import { generateOperationalFindingsWithExecutions, FINDING_CATEGORIES } from "../findings-engine.js";
import type { OperationalFinding } from "../findings-engine.js";
import { runMGDPipeline } from "../mgd-pipeline.js";

// ─────────────────────────────────────────────────────────────────────────────
// Regression coverage for docs/MGD_DETECTOR_FAILURE_DISCLOSURE_ADR.md
// ("MGD Milestone 13 — Report Truthfulness: Detector Failure Disclosure").
//
// The critical assertion throughout: a FAILED detector must never cause the
// narrative to use "nothing found"/"no issues identified"/a clean health
// classification worded as though the failed detector successfully assessed
// its domain. Successful findings/root causes/recommendations from OTHER
// detectors must remain fully present and unsuppressed. No internal error
// detail (detector name, exception type, message) may leak into user-facing
// narrative text.
// ─────────────────────────────────────────────────────────────────────────────

const REAL_TRANSACTIONS = Array.from({ length: 10 }, (_, i) => ({
  documentId: "doc-1",
  transactionType: "dispatch_event",
  rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
  quantity: 10,
  entityName: "Event Alpha",
}));

function throwingTestDetector(): never {
  throw new ReferenceError("simulated detector defect — must never leak into narrative text");
}

describe("1 — no evidence: existing insufficient-evidence language is completely unchanged", () => {
  it("evidenceLevel NONE still produces the pre-existing fallback text, with or without hasIncompleteAnalysis", () => {
    const withoutFailure = generateExecutiveNarrative({ findings: [], rootCauses: [], recommendations: [], evidenceLevel: "NONE" });
    const withFailure    = generateExecutiveNarrative({ findings: [], rootCauses: [], recommendations: [], evidenceLevel: "NONE", hasIncompleteAnalysis: true });
    // Evidence absence takes precedence — detector failure cannot occur
    // when there is no evidence to run detectors against (Milestone 12,
    // Case F), so the two must be identical.
    expect(withFailure.operationalHealth.content).toBe(withoutFailure.operationalHealth.content);
    expect(withFailure.operationalHealth.content).toContain("no transactional evidence was available");
  });
});

describe("2 — evidence + SUCCESS/0: legitimate zero-finding language is completely unchanged", () => {
  it("no detector failure produces exactly the pre-existing 'insufficient operational data' fallback — untouched wording", () => {
    const section = generateKeyFindingsNarrative([], false);
    expect(section.content).toBe(
      "Insufficient operational data was available to generate specific findings at this time. A structured data collection process is recommended before proceeding with targeted corrective action.",
    );
  });

  it("a real successful run (health baseline, zero issues) is unaffected by this milestone", () => {
    const report = generateExecutiveNarrative({
      findings: [], rootCauses: [], recommendations: [], evidenceLevel: "SUFFICIENT", operationalHealthScore: 85,
    });
    expect(report.operationalHealth.content).toContain("Operational Health Classification: Operationally Stable.");
    expect(report.operationalHealth.content).not.toContain(
      "One or more analytical checks in this review could not be completed",
    );
  });
});

describe("3 — evidence + FAILED: the report never phrases a failed detector's absence as 'nothing found'", () => {
  it("Key Findings uses the honest incomplete-analysis fallback, NOT the 'insufficient operational data' wording, when findings are empty due to failure", () => {
    const section = generateKeyFindingsNarrative([], true);
    expect(section.content).not.toContain("Insufficient operational data was available");
    expect(section.content).toContain("could not be completed due to a processing issue");
    expect(section.content).toContain("does not confirm the absence of findings");
  });

  it("Operational Health still computes its classification from the (baseline) score, but is prefixed with an honest disclosure — never presented as an unqualified clean result", () => {
    const section = generateOperationalHealthNarrative([], [], 85, "SUFFICIENT", true);
    expect(section.content).toContain("One or more analytical checks in this review could not be completed");
    expect(section.content).toContain("Operational Health Classification: Operationally Stable.");
    // The disclosure precedes the classification, so a reader cannot read
    // only the classification in isolation without also seeing the caveat.
    expect(section.content.indexOf("could not be completed")).toBeLessThan(
      section.content.indexOf("Operational Health Classification"),
    );
  });

  it("PipelineTrace still records the actual FAILED execution — the disclosure is a report-language change only, not a trace change", () => {
    const { executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      [{ name: "testThrowingDetector", run: () => throwingTestDetector() }],
    );
    expect(executions).toEqual([
      { detectorName: "testThrowingDetector", stage: "Findings Generation", status: "FAILED", error: { name: "ReferenceError", message: "simulated detector defect — must never leak into narrative text" } },
    ]);
  });
});

describe("4 — evidence + successful finding + failed sibling: the valid finding remains, disclosure is added, nothing is suppressed", () => {
  it("a real finding survives alongside a failed sibling detector, with the caveat present but the finding text untouched", () => {
    const validFinding: OperationalFinding = {
      id: "f-valid", title: "Valid Finding", severity: "HIGH",
      category: FINDING_CATEGORIES.FINANCIAL_LEAKAGE, findingPriority: 50 as any,
      summary: "A genuinely real, successfully-detected issue.", signals: ["real signal"], confidence: 70,
    };
    const { findings, executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      [
        { name: "testFailingDetector",    run: () => throwingTestDetector() },
        { name: "testSucceedingDetector", run: () => validFinding },
      ],
    );
    const hasIncompleteAnalysis = executions.some(e => e.status === "FAILED");
    expect(hasIncompleteAnalysis).toBe(true);

    const section = generateKeyFindingsNarrative(findings, hasIncompleteAnalysis);
    expect(section.content).toContain("Valid Finding");
    expect(section.content).toContain("A genuinely real, successfully-detected issue.");
    expect(section.content).toContain("One or more analytical checks in this review could not be completed");
  });
});

describe("5 — multiple detectors, some successful, some failed: successful outputs preserved, narrowest defensible disclosure applied, no false 'entire diagnostic failed' framing", () => {
  it("the report never claims total failure — successful sections render their real content plus a single, non-alarmist caveat", () => {
    const validFinding: OperationalFinding = {
      id: "f-valid", title: "Valid Finding", severity: "MEDIUM",
      category: FINDING_CATEGORIES.WORKFLOW_SCALABILITY, findingPriority: 50 as any,
      summary: "test", signals: ["signal"], confidence: 60,
    };
    const report = generateExecutiveNarrative({
      findings: [validFinding], rootCauses: [], recommendations: [],
      evidenceLevel: "SUFFICIENT", operationalHealthScore: 70, hasIncompleteAnalysis: true,
    });
    // No section claims the diagnostic itself failed or is invalid.
    for (const section of Object.values(report)) {
      if (typeof section !== "object" || !("content" in section)) continue;
      expect((section as any).content).not.toMatch(/diagnostic (has )?failed/i);
      expect((section as any).content).not.toMatch(/report is invalid/i);
    }
    expect(report.keyFindings.content).toContain("Valid Finding");
    expect(report.metadata.hasIncompleteAnalysis).toBe(true);
  });
});

describe("No internal error detail leaks into user-facing narrative text", () => {
  it("neither the detector name, the exception type, nor its message ever appears in any narrative section's content", () => {
    const report = generateExecutiveNarrative({
      findings: [], rootCauses: [], recommendations: [], evidenceLevel: "SUFFICIENT", hasIncompleteAnalysis: true,
    });
    const allContent = Object.values(report)
      .filter((s): s is { content: string } => typeof s === "object" && s !== null && "content" in s)
      .map(s => s.content)
      .join(" ");
    expect(allContent).not.toContain("ReferenceError");
    expect(allContent).not.toContain("simulated detector defect");
    expect(allContent).not.toContain("testThrowingDetector");
    expect(allContent).not.toContain("strongDispatch");
    expect(allContent).not.toMatch(/at \w+ \(/); // no stack-trace-shaped text
  });
});

describe("Pipeline integration — real fixture, no injected failures: nothing changed for the normal case", () => {
  it("a real, fully-successful pipeline run's narrative is unaffected by this milestone", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    expect(result.report.findings).toHaveLength(8);
    expect(result.report.rootCauses).toHaveLength(5);
    expect(result.report.recommendations).toHaveLength(9);
    expect(result.steps.healthScore).toBe(22);
    expect(result.report.narrative?.executiveOverview.content).not.toContain(
      "One or more analytical checks in this review could not be completed",
    );
  });
});
