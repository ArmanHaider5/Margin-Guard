import { describe, it, expect, vi } from "vitest";

// See mgd-pipeline-evidence.test.ts for why pipeline-trace is stubbed in the
// pipeline-integration tests below.
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
import { generateRootCausesWithExecutions } from "../root-cause-engine.js";
import { estimateOperationalHealth, runMGDPipeline } from "../mgd-pipeline.js";
import { computeEvidenceSufficiency } from "../evidence-sufficiency.js";
import { buildDiagnosticScope } from "../diagnostic-scope.js";

// ─────────────────────────────────────────────────────────────────────────────
// Regression/architecture-fact coverage for
// docs/MGD_DETECTOR_FAILURE_SEMANTICS_ADR.md ("MGD Milestone 12 — Diagnostic
// Completeness & Detector Failure Semantics").
//
// This milestone concluded NO new production contract is required: the
// DetectorExecutionRecord ledger introduced in Milestone 11 is already the
// correct, minimal representation of "analytical execution completeness,"
// and a category/domain-level completeness rollup is not safely
// constructible from the current Finding Category → detector mapping
// (documented as many-to-many and non-uniform in the milestone report).
// These tests exist to make the specific architectural facts that
// conclusion rests on into executable, protected assertions — not to
// introduce or test any new field/behavior.
// ─────────────────────────────────────────────────────────────────────────────

const REAL_TRANSACTIONS = Array.from({ length: 10 }, (_, i) => ({
  documentId: "doc-1",
  transactionType: "dispatch_event",
  rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
  quantity: 10,
  entityName: "Event Alpha",
}));

function throwingTestDetector(): never {
  throw new ReferenceError("simulated detector defect");
}

describe("Case A — evidence exists, detector succeeds with zero: SUCCESS/0, no downstream effect", () => {
  it("a null-returning test detector is recorded SUCCESS/0 and contributes nothing to findings", () => {
    const { findings, executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      [{ name: "testNullDetector", run: () => null }],
    );
    expect(executions).toEqual([{ detectorName: "testNullDetector", stage: "Findings Generation", status: "SUCCESS", outputCount: 0 }]);
    expect(findings).toEqual([]);
  });
});

describe("Case B — evidence exists, detector throws: FAILED is NOT interpretable as \"no finding\" at the trace level, but IS currently indistinguishable from SUCCESS/0 at the analytical-output level", () => {
  it("a throwing test detector is recorded FAILED (never SUCCESS), distinct from a null-returning detector", () => {
    const { executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      [{ name: "testThrowingDetector", run: () => throwingTestDetector() }],
    );
    expect(executions[0].status).toBe("FAILED");
    expect(executions[0].status).not.toBe("SUCCESS");
  });

  it("architectural fact: the FINAL findings array is byte-identical whether a test detector returns null (SUCCESS/0) or throws (FAILED) — the analytical output layer cannot tell these apart, only the separate trace ledger can", () => {
    const nullRun = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      [{ name: "testDetector", run: () => null }],
    );
    const throwRun = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      [{ name: "testDetector", run: () => throwingTestDetector() }],
    );
    expect(throwRun.findings).toEqual(nullRun.findings);
    // Health score is computed purely from the findings/rootCauses arrays —
    // if those arrays are identical, the score is identical, regardless of
    // whether the omission was a clean SUCCESS/0 or a swallowed FAILED.
    const healthNull  = estimateOperationalHealth(nullRun.findings, [], []);
    const healthThrow = estimateOperationalHealth(throwRun.findings, [], []);
    expect(healthThrow).toBe(healthNull);
    // Confirmed distinct only in the trace ledger:
    expect(nullRun.executions[0].status).toBe("SUCCESS");
    expect(throwRun.executions[0].status).toBe("FAILED");
  });
});

describe("Case C — two detectors touching the same category, one succeeds with zero and one fails: the category is partially, not fully, assessed", () => {
  it("both executions are recorded independently; the domain is not silently marked fully assessed nor silently marked wholly unassessed", () => {
    const { executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      [
        { name: "testInventoryCheckA", run: () => null },
        { name: "testInventoryCheckB", run: () => throwingTestDetector() },
      ],
    );
    expect(executions).toHaveLength(2);
    expect(executions.find(e => e.detectorName === "testInventoryCheckA")?.status).toBe("SUCCESS");
    expect(executions.find(e => e.detectorName === "testInventoryCheckB")?.status).toBe("FAILED");
    // Nothing in the current architecture rolls these two records up into a
    // single "category status" — each detector's outcome stands on its own,
    // consistent with this milestone's conclusion that per-detector (not
    // per-category) is the only granularity the codebase actually supports.
  });
});

describe("Case D — one detector fails, an independent detector produces a valid finding: the valid finding remains valid; failure stays scoped to its own detector", () => {
  it("the successful detector's finding is present and untouched; the failed detector's absence is visible only in executions", () => {
    // FINANCIAL_LEAKAGE has no FindingEvidence detector (evidence-engine.ts
    // covers only 4 of 9 categories — see MGD_FINDING_ONTOLOGY_EVIDENCE_CONTRACT_ADR.md),
    // so attachEvidenceToFindings (which runs unconditionally, on every
    // finding) enriches this one with an empty `evidence: []` rather than
    // any real citation, keeping the equality check below deterministic.
    const validFinding: OperationalFinding = {
      id: "f-valid", title: "Valid Finding", severity: "HIGH",
      category: FINDING_CATEGORIES.FINANCIAL_LEAKAGE, findingPriority: 50 as any,
      summary: "test", signals: ["real signal"], confidence: 70, evidence: [],
    };
    const { findings, executions } = generateOperationalFindingsWithExecutions(
      { transactions: REAL_TRANSACTIONS, documents: [] },
      [
        { name: "testFailingDetector",    run: () => throwingTestDetector() },
        { name: "testSucceedingDetector", run: () => validFinding },
      ],
    );
    expect(findings).toEqual([validFinding]);
    expect(executions.find(e => e.detectorName === "testFailingDetector")?.status).toBe("FAILED");
    expect(executions.find(e => e.detectorName === "testSucceedingDetector")?.status).toBe("SUCCESS");
  });

  it("the same isolation holds for Root Cause detectors — no root-cause detector reads another's output, so one failing never blocks another", () => {
    const rc = {
      id: "rc-valid", title: "Valid Root Cause", summary: "test", severity: "LOW" as const,
      confidence: 50, rootCausePriority: 50 as any, contributingFindings: [], operationalImpact: [],
    };
    const throwing = (_f: OperationalFinding[]) => throwingTestDetector();
    const succeeding = (_f: OperationalFinding[]) => rc;
    Object.defineProperty(throwing, "name", { value: "testFailingRC" });
    Object.defineProperty(succeeding, "name", { value: "testSucceedingRC" });

    // A non-empty findings array is required to pass root-cause-engine's own
    // "no input" early return (which — symmetrically with the Findings
    // engine's Case F guard — short-circuits before any detector, including
    // a would-be-failing one, is ever attempted). The content is irrelevant
    // here since both test detectors below ignore their input.
    const anyFinding: OperationalFinding = {
      id: "f1", title: "Any Finding", severity: "MEDIUM",
      category: FINDING_CATEGORIES.LOGISTICS_COORDINATION, findingPriority: 50 as any,
      summary: "test", signals: ["signal"], confidence: 60,
    };
    const { rootCauses, executions } = generateRootCausesWithExecutions(
      { findings: [anyFinding], industry: "event_management" },
      [throwing, succeeding] as any,
    );
    expect(rootCauses).toEqual([rc]);
    expect(executions.find(e => e.detectorName === "testFailingRC")?.status).toBe("FAILED");
    expect(executions.find(e => e.detectorName === "testSucceedingRC")?.status).toBe("SUCCESS");
  });
});

describe("Case E — no evidence exists, no detector is even attempted: architecturally distinct from, and not conflated with, a detector that ran and found zero", () => {
  it("zero transactions short-circuits before the detector loop — executions is empty, not a set of SUCCESS/0 records", () => {
    const { findings, executions } = generateOperationalFindingsWithExecutions({ transactions: [], documents: [] });
    expect(findings).toEqual([]);
    expect(executions).toEqual([]); // no detector was attempted at all — distinct from "ran, found nothing"
  });

  it("Evidence Sufficiency is computed independently of, and strictly before, any detector execution — a detector failure cannot retroactively change it (CTO position: a detector failure is not automatically an evidence failure)", () => {
    const evidence = computeEvidenceSufficiency({ transactions: [], documents: [], metrics: {} });
    expect(evidence.level).toBe("NONE");
    // Evidence Sufficiency has zero knowledge of findings/root-causes/executions
    // by construction (evidence-sufficiency.ts has no import of any of the
    // three detector-loop engines) — this is architectural, not incidental.
  });
});

describe("Case F — 'no evidence + detector fails' does not arise through the real pipeline: the empty-transactions guard prevents any detector (successful or failing) from running at all", () => {
  it("is not a reachable state — documented here rather than force-tested, since generateOperationalFindingsWithExecutions never reaches the detector loop with zero transactions regardless of which detectors are registered", () => {
    // Passing a deliberately-throwing detector alongside zero transactions
    // still yields an empty executions array — the throwing detector is
    // never even invoked, proving the guard, not the detector's behavior,
    // determines this outcome.
    const { executions } = generateOperationalFindingsWithExecutions(
      { transactions: [], documents: [] },
      [{ name: "testThrowingDetector", run: () => throwingTestDetector() }],
    );
    expect(executions).toEqual([]);
  });
});

describe("Architectural invariant — Diagnostic Scope remains structurally independent of detector execution", () => {
  it("buildDiagnosticScope takes only businessConcerns and the (upstream) evidence level — no findings/rootCauses/executions parameter exists to pass", () => {
    const scope = buildDiagnosticScope(["Client is concerned about delivery delays."], "SUFFICIENT" as any);
    expect(scope[0].status).toBe("UNVALIDATED");
    // A Business Concern remains a Business Concern regardless of any
    // detector's success or failure — there is no code path by which a
    // detector failure could promote it to evidence or change its status.
  });
});

describe("Pipeline integration — real fixture, no injected failures, invariants hold end-to-end", () => {
  it("a real pipeline run's analytical output is unaffected by this investigation milestone (no production behavior changed)", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    expect(result.report.findings).toHaveLength(8);
    expect(result.report.rootCauses).toHaveLength(5);
    expect(result.report.recommendations).toHaveLength(9);
    expect(result.steps.healthScore).toBe(22);
    expect(result.steps.evidence.level).toBe("SUFFICIENT");
  });
});
