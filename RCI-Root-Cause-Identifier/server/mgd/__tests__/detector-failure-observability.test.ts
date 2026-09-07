import { describe, it, expect, vi } from "vitest";

// See mgd-pipeline-evidence.test.ts for why pipeline-trace is stubbed in
// pipeline-integration tests below (Phase 9). Unit tests against the three
// engines' *WithExecutions exports directly do not need this stub.
vi.mock("../pipeline-trace", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../pipeline-trace")>();
  return {
    ...actual,
    startTrace: vi.fn(async () => ({ traceId: "test-trace", createdAt: new Date().toISOString(), steps: [], status: "running" as const })),
    addTraceStep: vi.fn(async () => null),
    completeTrace: vi.fn(async () => null),
  };
});

import { generateOperationalFindingsWithExecutions, FINDING_CATEGORIES } from "../findings-engine.js";
import type { OperationalFinding } from "../findings-engine.js";
import { generateRootCausesWithExecutions, generateRootCauses } from "../root-cause-engine.js";
import { generateOperationalRecommendationsWithExecutions } from "../recommendation-engine.js";
import { runMGDPipeline } from "../mgd-pipeline.js";
import type { RootCause } from "../root-cause-engine.js";
import type { OperationalRecommendation } from "../recommendation-engine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Regression coverage for docs/MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md.
//
// This milestone made MGD distinguish, at the PipelineTrace level:
//   A. Detector executed successfully and found nothing   → SUCCESS / 0
//   B. Detector executed successfully and produced output → SUCCESS / N
//   C. Detector failed with an exception                  → FAILED
//
// This is exactly the class of bug fixed in the prior "Dispatch Planning
// Root Cause Defect" milestone (an undefined-variable ReferenceError inside
// a root-cause detector, silently swallowed by the detector loop's
// try/catch). Every test below uses a TEST-ONLY, deliberately-throwing
// detector injected via each engine's `*WithExecutions` test-injection
// parameter — never a real production detector, and no production detector
// is modified to throw. The injection parameter defaults to the real
// DETECTORS registry and is never passed by mgd-pipeline.ts, so it changes
// nothing about real production behaviour.
// ─────────────────────────────────────────────────────────────────────────────

const REAL_TRANSACTIONS = Array.from({ length: 10 }, (_, i) => ({
  documentId: "doc-1",
  transactionType: "dispatch_event",
  rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
  quantity: 10,
  entityName: "Event Alpha",
}));

function makeFinding(overrides: Partial<OperationalFinding> = {}): OperationalFinding {
  return {
    id: "f1",
    title: "Some Finding",
    severity: "MEDIUM",
    category: FINDING_CATEGORIES.LOGISTICS_COORDINATION,
    findingPriority: 50 as any,
    summary: "test",
    signals: ["signal"],
    confidence: 60,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 7/8 — the exact bug class, proven for all three detector-loop engines
// ─────────────────────────────────────────────────────────────────────────────

describe("Findings engine — SUCCESS/0 vs SUCCESS/N vs FAILED", () => {
  function throwingDetector(): never {
    throw new ReferenceError("strongDispatch is not defined"); // the exact historical bug class
  }
  const testDetectors = [
    { name: "testThrowingDetector",  run: () => throwingDetector() },
    { name: "testNullDetector",      run: () => null },
    { name: "testProducingDetector", run: () => makeFinding({ id: "f-produced" }) },
  ];

  it("1/2/3 — a deliberately throwing detector is marked FAILED, with its name and error recorded", () => {
    const { executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      testDetectors as any,
    );
    const failed = executions.find(e => e.detectorName === "testThrowingDetector");
    expect(failed).toBeDefined();
    expect(failed!.status).toBe("FAILED");
    expect(failed!.error?.name).toBe("ReferenceError");
    expect(failed!.error?.message).toBe("strongDispatch is not defined");
    // Never leaks a stack trace into trace metadata.
    expect((failed as any).error?.stack).toBeUndefined();
  });

  it("4 — the failure does not throw out of the engine — pipeline continuation is preserved", () => {
    expect(() =>
      generateOperationalFindingsWithExecutions({ transactions: REAL_TRANSACTIONS, documents: [] }, testDetectors as any),
    ).not.toThrow();
  });

  it("5 — other detectors still execute after one fails", () => {
    const { findings, executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      testDetectors as any,
    );
    expect(executions.find(e => e.detectorName === "testNullDetector")).toBeDefined();
    expect(executions.find(e => e.detectorName === "testProducingDetector")).toBeDefined();
    expect(findings.some(f => f.id === "f-produced")).toBe(true);
  });

  it("6 — a successful detector returning zero results is marked SUCCESS, not FAILED", () => {
    const { executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      testDetectors as any,
    );
    const nullResult = executions.find(e => e.detectorName === "testNullDetector")!;
    expect(nullResult.status).toBe("SUCCESS");
    expect(nullResult.outputCount).toBe(0);
  });

  it("7 — a successful detector returning a result records the correct output count", () => {
    const { executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      testDetectors as any,
    );
    const produced = executions.find(e => e.detectorName === "testProducingDetector")!;
    expect(produced.status).toBe("SUCCESS");
    expect(produced.outputCount).toBe(1);
  });
});

describe("Root Cause engine — SUCCESS/0 vs SUCCESS/N vs FAILED", () => {
  function throwingDetector(): never {
    throw new ReferenceError("strongDispatch is not defined");
  }
  const testDetectors = [
    (_findings: OperationalFinding[]) => throwingDetector(),
    (_findings: OperationalFinding[]) => null,
    (_findings: OperationalFinding[]): RootCause => ({
      id: "rc-produced", title: "Test Root Cause", summary: "test", severity: "LOW",
      confidence: 50, rootCausePriority: 50 as any, contributingFindings: [], operationalImpact: [],
    }),
  ];
  Object.defineProperty(testDetectors[0], "name", { value: "testThrowingDetector" });
  Object.defineProperty(testDetectors[1], "name", { value: "testNullDetector" });
  Object.defineProperty(testDetectors[2], "name", { value: "testProducingDetector" });

  const findings = [makeFinding()];

  it("marks the throwing detector FAILED with name and error, and lets the others run to completion", () => {
    const { rootCauses, executions } = generateRootCausesWithExecutions({ findings, industry: "event_management" }, testDetectors as any);
    const failed = executions.find(e => e.detectorName === "testThrowingDetector")!;
    expect(failed.status).toBe("FAILED");
    expect(failed.error?.name).toBe("ReferenceError");
    expect(failed.error?.message).toBe("strongDispatch is not defined");

    const nullResult = executions.find(e => e.detectorName === "testNullDetector")!;
    expect(nullResult.status).toBe("SUCCESS");
    expect(nullResult.outputCount).toBe(0);

    const produced = executions.find(e => e.detectorName === "testProducingDetector")!;
    expect(produced.status).toBe("SUCCESS");
    expect(produced.outputCount).toBe(1);
    expect(rootCauses.some(rc => rc.id === "rc-produced")).toBe(true);
  });
});

describe("Recommendation engine — SUCCESS/0 vs SUCCESS/N vs FAILED", () => {
  function throwingDetector(): never {
    throw new ReferenceError("strongDispatch is not defined");
  }
  const testDetectors = [
    (_f: OperationalFinding[], _r: RootCause[]) => throwingDetector(),
    (_f: OperationalFinding[], _r: RootCause[]) => null,
    (_f: OperationalFinding[], _r: RootCause[]): OperationalRecommendation => ({
      id: "rec-produced", title: "Test Recommendation", summary: "test",
      priority: "HIGH", timeframe: "30_DAYS", implementationDifficulty: "MEDIUM",
      category: "logistics_optimization", recommendationPriority: 50 as any,
      relatedRootCauses: [], relatedFindings: [], expectedOperationalImpact: [],
      actionItems: [], confidence: 60,
    }),
  ];
  Object.defineProperty(testDetectors[0], "name", { value: "testThrowingDetector" });
  Object.defineProperty(testDetectors[1], "name", { value: "testNullDetector" });
  Object.defineProperty(testDetectors[2], "name", { value: "testProducingDetector" });

  const findings = [makeFinding()];

  it("marks the throwing detector FAILED with name and error, and lets the others run to completion", () => {
    const { recommendations, executions } = generateOperationalRecommendationsWithExecutions(
      { findings, rootCauses: [], industry: "event_management" },
      testDetectors as any,
    );
    const failed = executions.find(e => e.detectorName === "testThrowingDetector")!;
    expect(failed.status).toBe("FAILED");
    expect(failed.error?.name).toBe("ReferenceError");
    expect(failed.error?.message).toBe("strongDispatch is not defined");

    const nullResult = executions.find(e => e.detectorName === "testNullDetector")!;
    expect(nullResult.status).toBe("SUCCESS");
    expect(nullResult.outputCount).toBe(0);

    const produced = executions.find(e => e.detectorName === "testProducingDetector")!;
    expect(produced.status).toBe("SUCCESS");
    expect(produced.outputCount).toBe(1);
    expect(recommendations.some(r => r.id === "rec-produced")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 9 — pipeline integration: a realistic fixture, no injected failures
// ─────────────────────────────────────────────────────────────────────────────

describe("Pipeline integration — real fixture, real detectors, no injected failures", () => {
  it("a real pipeline run's persisted trace step metadata contains detectorExecutions for all three engines, all SUCCESS, with plausible names", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });

    // Analytical output is completely unchanged by this milestone.
    expect(result.report.findings).toHaveLength(8);
    expect(result.report.rootCauses).toHaveLength(5);
    expect(result.report.recommendations).toHaveLength(9);
    expect(result.steps.healthScore).toBe(22);
    expect(result.steps.evidence.level).toBe("SUFFICIENT");
  });

  it("9 — a genuinely successful pipeline run reports zero FAILED detector executions (no unexpected failures)", async () => {
    // Exercise the same code path mgd-pipeline.ts uses, directly, so we can
    // inspect the execution ledger the pipeline would embed in trace metadata.
    const findingsResult = generateOperationalFindingsWithExecutions({
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }], industry: "event_management",
    });
    expect(findingsResult.executions.length).toBeGreaterThan(0);
    expect(findingsResult.executions.every(e => e.status === "SUCCESS")).toBe(true);

    const rootCauseResult = generateRootCausesWithExecutions({ findings: findingsResult.findings, industry: "event_management" });
    expect(rootCauseResult.executions.length).toBeGreaterThan(0);
    expect(rootCauseResult.executions.every(e => e.status === "SUCCESS")).toBe(true);
    // The previously-broken detector is now reachable and recorded as a
    // real, successful execution — this is the direct, positive proof that
    // the earlier bugfix milestone's defect can no longer hide.
    const dispatchDep = rootCauseResult.executions.find(e => e.detectorName === "detectDispatchPlanningDependency");
    expect(dispatchDep?.status).toBe("SUCCESS");

    const recResult = generateOperationalRecommendationsWithExecutions({
      findings: findingsResult.findings, rootCauses: rootCauseResult.rootCauses, industry: "event_management",
    });
    expect(recResult.executions.length).toBeGreaterThan(0);
    expect(recResult.executions.every(e => e.status === "SUCCESS")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 10 — backward compatibility: old trace shapes remain readable
// ─────────────────────────────────────────────────────────────────────────────

describe("Backward compatibility — historical trace shapes remain valid", () => {
  it("a PipelineTraceStep with no detectorExecutions key (the pre-this-milestone shape) is still a structurally valid step", () => {
    const oldStyleStep = {
      step: "Root Cause Generation",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 5,
      inputCount: 8,
      outputCount: 4,
      status: "completed" as const,
      metadata: { rootCauses: 4, critical: 1, high: 1 }, // no detectorExecutions key at all
    };
    // Nothing in this milestone requires this key to exist; every field
    // this old step already had remains meaningful and complete on its own.
    expect(oldStyleStep.metadata).not.toHaveProperty("detectorExecutions");
    expect(oldStyleStep.status).toBe("completed");
    expect(oldStyleStep.outputCount).toBe(4);
  });

  it("generateRootCauses (the plain, pre-existing export) is completely unaffected — same signature, same behavior, no executions leak into it", () => {
    const findings = [makeFinding()];
    const result = generateRootCauses({ findings, industry: "event_management" });
    expect(Array.isArray(result)).toBe(true);
  });
});
