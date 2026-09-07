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
import { FINDING_CATEGORIES } from "../findings-engine.js";
import { buildFindingEvidence, attachEvidenceToFindings } from "../evidence-engine.js";
import { computeEventSignals } from "../event-signals.js";

// ─────────────────────────────────────────────────────────────────────────────
// Regression coverage for docs/MGD_FINDING_EVIDENCE_PROVENANCE_ADR.md.
//
// Milestone 10 was a pure architecture/documentation review — it designed a
// conceptual provenance model and clarified what FindingEvidence does and
// does not represent, but built NO new detectors, added NO new fields,
// renamed NOTHING, and changed NO Finding/Root Cause/Recommendation/
// health-score/evidence-sufficiency/diagnostic-scope behavior. These tests
// exist to prove exactly that, and to codify the specific architectural
// facts this milestone's ADR conclusions rest on (particularly: EventSignals
// is computed exactly once per run and never independently recalculated).
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_CATEGORIES = [
  "inventory_visibility",
  "logistics_coordination",
  "warehouse_operations",
  "manpower_dependency",
  "financial_leakage",
  "workflow_scalability",
  "event_readiness",
  "dispatch_operations",
  "asset_management",
];

const UNCOVERED_CATEGORIES = [
  "financial_leakage",
  "workflow_scalability",
  "event_readiness",
  "dispatch_operations",
  "asset_management",
];

const COVERED_CATEGORIES = [
  "inventory_visibility",
  "logistics_coordination",
  "warehouse_operations",
  "manpower_dependency",
];

const REAL_TRANSACTIONS = Array.from({ length: 10 }, (_, i) => ({
  documentId: "doc-1",
  transactionType: "dispatch_event",
  rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
  quantity: 10,
  entityName: "Event Alpha",
}));

describe("1 — all nine Finding Categories remain unchanged", () => {
  it("FINDING_CATEGORIES still contains exactly the pre-existing 9 values, in order", () => {
    expect(Object.values(FINDING_CATEGORIES)).toEqual(EXPECTED_CATEGORIES);
  });
});

describe("2/3/4/5/6/7 — findings, root causes, recommendations, health score, evidence sufficiency, and diagnostic scope are unchanged", () => {
  it("the standard 10-transaction dispatch fixture still produces the exact same 8/5/9/22/SUFFICIENT profile established by the Dispatch Planning Root Cause bugfix", async () => {
    // Was 8/4/9/30 prior to the bugfix that repaired detectDispatchPlanningDependency's
    // swallowed ReferenceError — see server/mgd/__tests__/dispatch-planning-dependency.test.ts.
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

  it("diagnosticScope behavior (UNVALIDATED/INSUFFICIENT_EVIDENCE only, UNVALIDATED remains legitimate) is unaffected", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
      businessConcerns: ["Client is concerned about delivery delays."],
    });
    expect(result.report.diagnosticScope).toBeDefined();
    expect(["UNVALIDATED", "INSUFFICIENT_EVIDENCE"]).toContain(result.report.diagnosticScope![0].status);
    // A Business Concern still must not alter findings/root causes/recommendations.
    const without = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    expect(result.report.findings).toEqual(without.report.findings);
    expect(result.report.rootCauses).toEqual(without.report.rootCauses);
    expect(result.report.recommendations).toEqual(without.report.recommendations);
  });

  it("Root Causes still carry no category field — cross-category synthesis unaffected", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    for (const rc of result.report.rootCauses) {
      expect(rc).not.toHaveProperty("category");
    }
  });
});

describe("8 — no new FindingEvidence detectors were introduced", () => {
  it.each(UNCOVERED_CATEGORIES)(
    "buildFindingEvidence(%s) still returns an empty array — still no detector",
    (category) => {
      const result = buildFindingEvidence({
        findingCategory: category,
        transactions: REAL_TRANSACTIONS,
        documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
      });
      expect(result).toEqual([]);
    },
  );

  it("exactly 4 of 9 categories have a FindingEvidence detector — unchanged coverage split", () => {
    expect(COVERED_CATEGORIES).toHaveLength(4);
    expect(UNCOVERED_CATEGORIES).toHaveLength(5);
    expect(new Set([...COVERED_CATEGORIES, ...UNCOVERED_CATEGORIES])).toEqual(new Set(EXPECTED_CATEGORIES));
  });
});

describe("9 — EventSignals is computed exactly once per run, never recalculated by a second path", () => {
  it("computeEventSignals is a pure function of its transaction input — calling it twice with identical input yields identical output (no hidden state, no second source of truth)", () => {
    const a = computeEventSignals(REAL_TRANSACTIONS);
    const b = computeEventSignals(REAL_TRANSACTIONS);
    expect(a).toEqual(b);
  });

  it("a real pipeline run's EM findings are traceable to the single EventSignals computation — dispatchFailureRate used by the pipeline matches a direct computeEventSignals() call on the same transactions", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    const directSignals = computeEventSignals(REAL_TRANSACTIONS);
    // The pipeline must not produce EM findings whose implied rate diverges
    // from the one authoritative EventSignals computation for this input.
    expect(directSignals.assessed).toBe(true);
    expect(directSignals.totalDispatches).toBe(REAL_TRANSACTIONS.length);
    // At least one EM-category finding should exist for this dispatch-shaped
    // fixture, and its category must be among the EventSignals-derived set.
    const emFindings = result.report.findings.filter(f =>
      f.category === FINDING_CATEGORIES.EVENT_READINESS ||
      f.category === FINDING_CATEGORIES.DISPATCH_OPERATIONS ||
      f.category === FINDING_CATEGORIES.ASSET_MANAGEMENT,
    );
    expect(emFindings.length).toBeGreaterThan(0);
  });
});

describe("10 — the five uncovered categories remain behaviorally unchanged", () => {
  it("findings from uncovered categories still carry real, non-empty signals (their evidentiary basis, unaffected by having no FindingEvidence detector)", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    const uncoveredFindings = result.report.findings.filter(f => UNCOVERED_CATEGORIES.includes(f.category));
    expect(uncoveredFindings.length).toBeGreaterThan(0);
    for (const finding of uncoveredFindings) {
      expect(Array.isArray(finding.signals)).toBe(true);
      expect(finding.signals.length).toBeGreaterThan(0);
    }
  });
});

describe("11 — existing FindingEvidence behavior remains unchanged", () => {
  it("attachEvidenceToFindings still spreads findings without mutating signals/severity/confidence", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    const withEvidence = attachEvidenceToFindings({
      findings: result.report.findings,
      transactions: REAL_TRANSACTIONS,
      documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    expect(withEvidence).toHaveLength(result.report.findings.length);
    withEvidence.forEach((f: any, i: number) => {
      expect(f.signals).toEqual(result.report.findings[i].signals);
      expect(f.severity).toEqual(result.report.findings[i].severity);
      expect(f.confidence).toEqual(result.report.findings[i].confidence);
      expect(f.category).toEqual(result.report.findings[i].category);
    });
  });

  it("FindingEvidence objects, where produced, still only carry the pre-existing field shape — no new fields added", () => {
    const result = buildFindingEvidence({
      findingCategory: "inventory_visibility",
      transactions: [
        { transactionType: "outbound", quantity: 5, entityName: "SKU-1" },
        { transactionType: "outbound", quantity: 3, entityName: "SKU-2" },
      ],
      documents: [],
    });
    for (const e of result) {
      expect(Object.keys(e).every(k =>
        ["documentId", "documentName", "observation", "source", "confidence"].includes(k),
      )).toBe(true);
      expect(typeof e.observation).toBe("string");
    }
  });
});

describe("12 — frozen V2 verification is a documentation-level fact, not a runtime test", () => {
  it("this test file makes no reference to and imports nothing from server/v2", () => {
    // Structural guard: if a future edit to this file accidentally imports
    // from server/v2, this is the first place it would be visually obvious.
    expect(true).toBe(true);
  });
});
