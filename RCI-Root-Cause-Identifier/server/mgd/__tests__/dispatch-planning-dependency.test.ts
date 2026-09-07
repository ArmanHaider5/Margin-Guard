import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import path from "path";

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

import {
  detectDispatchPlanningDependency,
  generateRootCauses,
  detectReactiveOperations,
  detectScalabilityMismatch,
} from "../root-cause-engine.js";
import { FINDING_CATEGORIES } from "../findings-engine.js";
import type { OperationalFinding } from "../findings-engine.js";
import { runMGDPipeline } from "../mgd-pipeline.js";

const ROOT = path.resolve(__dirname, "..", "..", "..");
function read(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), "utf-8");
}

// ─────────────────────────────────────────────────────────────────────────────
// Regression coverage for the "MGD Bugfix Milestone — Dispatch Planning Root
// Cause Defect": detectDispatchPlanningDependency (root-cause-engine.ts)
// referenced an undefined variable (`strongDispatch`) inside a diagnostic
// console.log, which threw a ReferenceError that generateRootCauses()'s
// per-detector try/catch silently swallowed on every invocation — meaning
// this root cause could never actually fire, regardless of whether its
// trigger conditions were met. The fix replaces the undefined reference
// with the already-in-scope `logFinds.length` (matching the sibling
// detectDispatchPlanningImmaturity's own logging convention) and changes
// nothing about the function's trigger conditions, thresholds, severity
// calculation, wording, or category relationships.
// ─────────────────────────────────────────────────────────────────────────────

function makeFinding(overrides: Partial<OperationalFinding>): OperationalFinding {
  return {
    id: "f-default",
    title: "Dispatch Reliability Risk",
    severity: "HIGH",
    category: FINDING_CATEGORIES.DISPATCH_OPERATIONS,
    findingPriority: 100 as any,
    summary: "test finding",
    signals: ["test signal"],
    confidence: 70,
    ...overrides,
  };
}

describe("1 — the previously failing detector path executes without ReferenceError", () => {
  it("detectDispatchPlanningDependency does not throw when its trigger conditions are met", () => {
    const findings = [makeFinding({ id: "f1" })];
    expect(() => detectDispatchPlanningDependency(findings)).not.toThrow();
  });

  it("generateRootCauses no longer logs a swallowed detector error for this detector", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const findings = [makeFinding({ id: "f1" })];
    generateRootCauses({ findings, industry: "event_management" });
    const swallowedThisDetector = errorSpy.mock.calls.some(
      call => String(call[0]).includes("Detector error") && String(call[1] ?? "").includes("strongDispatch"),
    );
    expect(swallowedThisDetector).toBe(false);
    errorSpy.mockRestore();
  });
});

describe("2 — the detector produces its intended Root Cause when its existing trigger conditions are satisfied", () => {
  it("a single 'Dispatch Reliability Risk' finding (the documented hasDispatchRisk trigger) now produces 'Dispatch Planning Dependency'", () => {
    const findings = [makeFinding({ id: "f1", title: "Dispatch Reliability Risk", severity: "HIGH", confidence: 70 })];
    const rc = detectDispatchPlanningDependency(findings);
    expect(rc).not.toBeNull();
    expect(rc!.title).toBe("Dispatch Planning Dependency");
  });

  it("2+ dispatch/logistics-titled findings (the documented dispatchCount >= 2 trigger) also produce it, without requiring 'Dispatch Reliability Risk' by name", () => {
    const findings = [
      makeFinding({ id: "f1", title: "Dispatch Delay Pattern", category: FINDING_CATEGORIES.DISPATCH_OPERATIONS, severity: "MEDIUM", confidence: 55 }),
      makeFinding({ id: "f2", title: "Logistics Coordination Strain", category: FINDING_CATEGORIES.LOGISTICS_COORDINATION, severity: "MEDIUM", confidence: 55 }),
    ];
    const rc = detectDispatchPlanningDependency(findings);
    expect(rc).not.toBeNull();
    expect(rc!.title).toBe("Dispatch Planning Dependency");
  });

  it("still correctly returns null when neither trigger condition is met (methodology unchanged)", () => {
    const findings = [makeFinding({ id: "f1", title: "Some Other Finding", category: FINDING_CATEGORIES.INVENTORY_VISIBILITY, severity: "LOW", confidence: 40 })];
    expect(detectDispatchPlanningDependency(findings)).toBeNull();
  });
});

describe("3 — the Root Cause's existing content/category/severity/confidence formula remains correct and unchanged", () => {
  it("confidence and severity match the pre-existing accumulateConfidence formula exactly (no methodology change)", () => {
    // One HIGH finding at 70%: raw = 15 * 0.70 = 10.5; diversityBonus = 0
    // (contributing.length - 1 = 0); confidence = round(10.5*3.5 + 0) = 37.
    // This is the same formula already exercised (and asserted via console
    // output) by the sibling detectDispatchPlanningImmaturity/EventReadiness
    // detectors — it is not new or modified by this bugfix.
    const findings = [makeFinding({ id: "f1", title: "Dispatch Reliability Risk", severity: "HIGH", confidence: 70 })];
    const rc = detectDispatchPlanningDependency(findings)!;
    expect(rc.confidence).toBe(37);
    expect(rc.severity).toBe("LOW"); // 37 < 40 per severityFrom() thresholds, unchanged
    expect(rc.contributingFindings).toEqual(["f1"]);
  });

  it("summary, operationalImpact, and recommendations text are exactly the pre-existing wording — nothing rewritten", () => {
    const findings = [makeFinding({ id: "f1" })];
    const rc = detectDispatchPlanningDependency(findings)!;
    expect(rc.summary).toContain("depends on key individuals making real-time dispatch decisions");
    expect(rc.operationalImpact).toContain("Dispatch quality is tied to the availability and judgment of specific staff members.");
    expect(rc.recommendations).toContain("Create a standard dispatch manifest: item list, load sequence, route, departure time, contact.");
  });

  it("has no category field, consistent with every other Root Cause (cross-category synthesis, unaffected)", () => {
    const findings = [makeFinding({ id: "f1" })];
    const rc = detectDispatchPlanningDependency(findings)!;
    expect(rc).not.toHaveProperty("category");
  });
});

describe("4 — the undefined variable can never recur", () => {
  it("root-cause-engine.ts source no longer references the undefined identifier `strongDispatch`", () => {
    const content = read("server/mgd/root-cause-engine.ts");
    expect(content).not.toMatch(/strongDispatch/);
  });

  it("the fixed log line references only variables actually declared in detectDispatchPlanningDependency's scope (dispFinds, logFinds)", () => {
    const content = read("server/mgd/root-cause-engine.ts");
    const start = content.indexOf("export function detectDispatchPlanningDependency");
    const end   = content.indexOf("// ────", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const fnBody = content.slice(start, end);
    expect(fnBody).toMatch(/const dispFinds = byCategory/);
    expect(fnBody).toMatch(/const logFinds\s*=\s*byCategory/);
    expect(fnBody).toMatch(/log=\$\{logFinds\.length\}/);
  });
});

describe("5 — existing Root Cause behavior for unrelated detectors remains unchanged", () => {
  it("detectReactiveOperations and detectScalabilityMismatch are untouched by this fix — same trigger logic, same output shape", () => {
    // Reactive Operations requires logistics + inventory + manpower findings together.
    const reactiveFindings = [
      makeFinding({ id: "r1", title: "Logistics Coordination Strain", category: FINDING_CATEGORIES.LOGISTICS_COORDINATION, severity: "MEDIUM", confidence: 60 }),
      makeFinding({ id: "r2", title: "Delayed Inventory Reconciliation", category: FINDING_CATEGORIES.INVENTORY_VISIBILITY, severity: "MEDIUM", confidence: 60 }),
      makeFinding({ id: "r3", title: "Manual Dependency Risk", category: FINDING_CATEGORIES.MANPOWER_DEPENDENCY, severity: "MEDIUM", confidence: 60 }),
    ];
    const rc = detectReactiveOperations(reactiveFindings);
    expect(rc).not.toBeNull();
    expect(rc!.title).toBe("Reactive Operational Coordination Model");

    // Scalability Mismatch requires workflow_scalability + manpower_dependency.
    const scalabilityFindings = [
      makeFinding({ id: "s1", title: "Workflow Scalability Risk", category: FINDING_CATEGORIES.WORKFLOW_SCALABILITY, severity: "MEDIUM", confidence: 60 }),
      makeFinding({ id: "s2", title: "Manual Dependency Risk", category: FINDING_CATEGORIES.MANPOWER_DEPENDENCY, severity: "MEDIUM", confidence: 60 }),
    ];
    const rc2 = detectScalabilityMismatch(scalabilityFindings);
    expect(rc2).not.toBeNull();
    expect(rc2!.title).toBe("Operational Scalability Mismatch");
  });

  it("the standard 10-transaction dispatch fixture's full root-cause set is exactly the pre-existing 4 plus the newly-restored 5th, nothing else changed", async () => {
    const REAL_TRANSACTIONS = Array.from({ length: 10 }, (_, i) => ({
      documentId: "doc-1",
      transactionType: "dispatch_event",
      rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
      quantity: 10,
      entityName: "Event Alpha",
    }));
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    const titles = result.report.rootCauses.map(rc => rc.title).sort();
    expect(titles).toEqual([
      "Dispatch Planning Dependency",
      "Dispatch Planning Immaturity",
      "Event Readiness Control Failure",
      "Inventory Governance Deficiency",
      "Inventory Visibility Weakness",
    ].sort());
  });
});
