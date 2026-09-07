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

import { FINDING_CATEGORIES } from "../finding-categories.js";
import { FINDING_CATEGORIES as REEXPORTED_FROM_FINDINGS_ENGINE } from "../findings-engine.js";
import { REC_CATEGORIES } from "../recommendation-engine.js";
import { runMGDPipeline } from "../mgd-pipeline.js";

const ROOT = path.resolve(__dirname, "..", "..", "..");
function read(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), "utf-8");
}

// The exact 9 categories this milestone's governance work must neither add
// to, remove from, nor rename — verified against the values already in
// production before this milestone (see docs/MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md).
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

const REAL_TRANSACTIONS = Array.from({ length: 10 }, (_, i) => ({
  documentId: "doc-1",
  transactionType: "dispatch_event",
  rawText: `Dispatch Complete?: ${i % 3 === 0 ? "No" : "Yes"}`,
  quantity: 10,
  entityName: "Event Alpha",
}));

describe("1/2/3/4 — the authoritative category list is exactly the pre-existing 9 categories, no more, no less, unrenamed", () => {
  it("FINDING_CATEGORIES contains exactly the expected 9 values, in the original order", () => {
    expect(Object.values(FINDING_CATEGORIES)).toEqual(EXPECTED_CATEGORIES);
  });

  it("findings-engine.ts re-exports the exact same authoritative object (not a divergent copy)", () => {
    expect(REEXPORTED_FROM_FINDINGS_ENGINE).toBe(FINDING_CATEGORIES);
  });

  it("Finding Categories and Recommendation Categories remain distinct vocabularies — this milestone did not merge them (frozen boundary #8)", () => {
    const findingCats = new Set(Object.values(FINDING_CATEGORIES));
    const recCats = new Set(Object.values(REC_CATEGORIES));
    const intersection = [...findingCats].filter(c => recCats.has(c as any));
    expect(intersection).toEqual(["warehouse_operations"]);
  });
});

describe("5 — existing finding detectors still produce the same categories against the same real input", () => {
  it("a realistic 10-transaction event-management dataset produces the exact same finding/root-cause/recommendation/health-score profile as every prior milestone's run of this fixture", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    // These figures were 8/4/9/30 from this milestone's original writing
    // through the "MGD Bugfix Milestone — Dispatch Planning Root Cause
    // Defect", which repaired a silently-swallowed ReferenceError in
    // detectDispatchPlanningDependency (root-cause-engine.ts). That fix
    // legitimately restores a 5th root cause ("Dispatch Planning
    // Dependency") that this exact fixture's findings always satisfied the
    // trigger conditions for — it simply never fired because the detector
    // threw before returning. Restoring it changes the health score
    // (which factors root-cause severity) from 30 to 22. Findings (8) and
    // recommendation count (9) are unaffected — see
    // server/mgd/__tests__/dispatch-planning-dependency.test.ts for the
    // dedicated regression coverage of that fix.
    expect(result.report.findings).toHaveLength(8);
    expect(result.report.rootCauses).toHaveLength(5);
    expect(result.report.recommendations).toHaveLength(9);
    expect(result.steps.healthScore).toBe(22);
    expect(result.steps.evidence.level).toBe("SUFFICIENT");

    const foundCategories = new Set(result.report.findings.map(f => f.category));
    for (const c of foundCategories) {
      expect(EXPECTED_CATEGORIES).toContain(c);
    }
  });
});

describe("6/7 — Root Cause and Recommendation behavior is unchanged", () => {
  it("root causes still carry no category field of their own (cross-category synthesis, unchanged by this milestone)", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    for (const rc of result.report.rootCauses) {
      expect(rc).not.toHaveProperty("category");
    }
  });

  it("recommendation categories are still drawn from REC_CATEGORIES, unaffected by the Finding Category refactor", async () => {
    const result = await runMGDPipeline({
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    });
    const recCatValues = new Set(Object.values(REC_CATEGORIES));
    for (const rec of result.report.recommendations) {
      expect(recCatValues).toContain(rec.category);
    }
  });
});

describe("8 — Diagnostic Scope behavior is unchanged", () => {
  it("a Business Concern still produces UNVALIDATED/INSUFFICIENT_EVIDENCE only, and still does not affect findings/root causes/recommendations/health score/evidence sufficiency", async () => {
    const base = {
      clientName: "Real Evidence Co.", industry: "event_management",
      transactions: REAL_TRANSACTIONS, documents: [{ id: "doc-1", fileName: "dispatches.xlsx" }],
    };
    const [without, withConcern] = await Promise.all([
      runMGDPipeline(base),
      runMGDPipeline({ ...base, businessConcerns: ["Client is concerned about delivery delays."] }),
    ]);
    expect(withConcern.report.findings).toEqual(without.report.findings);
    expect(withConcern.report.rootCauses).toEqual(without.report.rootCauses);
    expect(withConcern.report.recommendations).toEqual(without.report.recommendations);
    expect(withConcern.steps.healthScore).toBe(without.steps.healthScore);
    expect(withConcern.steps.evidence).toEqual(without.steps.evidence);
    expect(withConcern.report.diagnosticScope![0].status).toBe("UNVALIDATED");
  });
});

describe("9 — Evidence Sufficiency is unchanged", () => {
  it("zero transactions still yields evidence level NONE and a null health score", async () => {
    const result = await runMGDPipeline({ clientName: "Empty Co.", industry: "retail", transactions: [], documents: [] });
    expect(result.steps.evidence.level).toBe("NONE");
    expect(result.steps.healthScore).toBeNull();
  });
});

describe("10 — duplicate declarations of the Finding Category vocabulary no longer exist", () => {
  // Per-file: which category strings must NOT appear as freehand literals
  // anymore. recommendation-engine.ts is deliberately excluded from
  // "warehouse_operations" — that file's REC_CATEGORIES.WAREHOUSE_OPERATIONS
  // legitimately declares the *Recommendation* category vocabulary's own
  // value, which happens to be string-identical to the Finding Category of
  // the same name (the one real overlap between the two vocabularies — see
  // docs/MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md). Frozen boundary #8
  // forbids merging the two vocabularies, so that line must NOT be touched
  // even though it shares a literal value with FINDING_CATEGORIES.
  const consumerFiles: [string, string[]][] = [
    ["server/mgd/root-cause-engine.ts", EXPECTED_CATEGORIES],
    ["server/mgd/recommendation-engine.ts", EXPECTED_CATEGORIES.filter(c => c !== "warehouse_operations")],
    ["server/mgd/executive-narrative-engine.ts", EXPECTED_CATEGORIES],
    ["server/mgd/evidence-engine.ts", EXPECTED_CATEGORIES.slice(0, 4)], // only 4 have detectors
  ];

  it.each(consumerFiles)("%s no longer freehand-declares Finding Category string literals — it imports FINDING_CATEGORIES instead", (file, categoriesToCheck) => {
    const content = read(file);
    expect(content).toMatch(/import\s*\{\s*FINDING_CATEGORIES\s*\}\s*from\s*"\.\/finding-categories"/);
    // None of these category strings should appear as a quoted literal
    // anywhere in the file anymore — every reference must now go through
    // FINDING_CATEGORIES.
    for (const cat of categoriesToCheck) {
      expect(content).not.toMatch(new RegExp(`["']${cat}["']`));
    }
  });

  it("recommendation-engine.ts's one real overlap (REC_CATEGORIES.WAREHOUSE_OPERATIONS) is still its own, untouched Recommendation Category declaration — not merged with FINDING_CATEGORIES", () => {
    const content = read("server/mgd/recommendation-engine.ts");
    expect(content).toMatch(/WAREHOUSE_OPERATIONS:\s*"warehouse_operations"/);
  });

  it("benchmark-engine.ts no longer freehand-declares the Finding Category values it uses, but still freely declares its own distinct benchmark-only categories (inventory_control, operational_health) — those are correctly NOT part of the Finding Category vocabulary and must remain untouched", () => {
    const content = read("server/mgd/benchmark-engine.ts");
    expect(content).toMatch(/import\s*\{\s*FINDING_CATEGORIES\s*\}\s*from\s*"\.\/finding-categories"/);
    expect(content).toMatch(/FINDING_CATEGORIES\.FINANCIAL_LEAKAGE/);
    expect(content).toMatch(/FINDING_CATEGORIES\.LOGISTICS_COORDINATION/);
    expect(content).toMatch(/FINDING_CATEGORIES\.WORKFLOW_SCALABILITY/);
    expect(content).toMatch(/FINDING_CATEGORIES\.MANPOWER_DEPENDENCY/);
    // These are genuinely different, benchmark-specific labels — not Finding
    // Categories — and must be left exactly as freehand literals.
    expect(content).toMatch(/"inventory_control"/);
    expect(content).toMatch(/"operational_health"/);
  });

  it("event-management-pack.ts no longer freehand-declares the Finding Category values it uses, but still freely declares its own bespoke IndustryRule labels (operations, strategic_growth, operational_maturity) — those are NOT Finding Categories and must remain untouched", () => {
    const content = read("server/mgd/industry-packs/event-management-pack.ts");
    expect(content).toMatch(/import\s*\{\s*FINDING_CATEGORIES\s*\}\s*from\s*"\.\.\/finding-categories"/);
    for (const cat of EXPECTED_CATEGORIES) {
      expect(content).not.toMatch(new RegExp(`["']${cat}["']`));
    }
    // Bespoke, non-Finding-Category labels — correctly untouched.
    expect(content).toMatch(/"operations"/);
    expect(content).toMatch(/"strategic_growth"/);
    expect(content).toMatch(/"operational_maturity"/);
  });

  it("finding-categories.ts is a true leaf module — it imports nothing, so it can never participate in a circular import", () => {
    const content = read("server/mgd/finding-categories.ts");
    expect(content).not.toMatch(/^import /m);
  });
});
