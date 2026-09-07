import { describe, it, expect, afterEach } from "vitest";
import crypto from "crypto";
import { saveReport, getReport, listReports, deleteReport } from "../report-store.js";
import type { MGDReport } from "../report-composer.js";

// ─────────────────────────────────────────────────────────────────────────────
// report-store.ts is JSON-file-backed (server/data/mgd-reports.json — a real
// file used by the running app, not a test fixture) with no path override for
// tests. Every record this file creates is removed again in `afterEach` via
// `deleteReport`, so the real file is left exactly as it was found. A
// distinctive `clientId` marker makes accidental collisions with real data
// easy to notice.
// ─────────────────────────────────────────────────────────────────────────────

const TEST_MARKER = "__vitest-report-store-test__";

function makeFixtureReport(overrides: Partial<MGDReport> = {}): MGDReport {
  return {
    metadata: {
      generatedAt:   new Date().toISOString(),
      clientName:    "Test Fixture Co.",
      industry:      "manufacturing",
      reportVersion: "test",
    },
    summary: {
      criticalFindings:            0,
      highFindings:                0,
      criticalRootCauses:          0,
      highPriorityRecommendations: 0,
      benchmarkAlerts:             0,
    },
    narrative:       {} as MGDReport["narrative"],
    findings:        [],
    rootCauses:      [],
    recommendations: [],
    benchmarks:      [],
    ...overrides,
  } as MGDReport;
}

describe("report-store — canonical id round trip", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    // Always clean up, even on assertion failure, so the real
    // server/data/mgd-reports.json is never left polluted by this suite.
    while (createdIds.length > 0) {
      const id = createdIds.pop()!;
      await deleteReport(id);
    }
  });

  it("saveReport persists the record under the caller-supplied id, and getReport resolves it by that same id", async () => {
    const suppliedId = crypto.randomUUID();
    const report = makeFixtureReport({ id: suppliedId });

    const saved = await saveReport({
      id:         suppliedId,
      clientId:   TEST_MARKER,
      clientName: "Test Fixture Co.",
      industry:   "manufacturing",
      report,
      runtimeMs:  123,
    });
    expect(saved).not.toBeNull();
    createdIds.push(saved!.id);

    // This is the canonical-handoff guarantee: the id embedded in the report
    // itself (report.id, what Presentation Mode / PDF export see) must equal
    // the id the record is persisted under (what GET /api/mgd/reports/:id
    // resolves by).
    expect(saved!.id).toBe(suppliedId);
    expect(saved!.report.id).toBe(suppliedId);

    const fetched = await getReport(suppliedId);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(suppliedId);
    expect(fetched!.clientId).toBe(TEST_MARKER);
    expect(fetched!.report.metadata.clientName).toBe("Test Fixture Co.");
  });

  it("saveReport without a caller-supplied id still generates one and persists correctly", async () => {
    const report = makeFixtureReport();
    const saved = await saveReport({
      clientId:  TEST_MARKER,
      report,
      runtimeMs: 45,
    });
    expect(saved).not.toBeNull();
    createdIds.push(saved!.id);
    expect(typeof saved!.id).toBe("string");
    expect(saved!.id.length).toBeGreaterThan(0);

    const fetched = await getReport(saved!.id);
    expect(fetched?.id).toBe(saved!.id);
  });

  it("listReports includes the saved record and honours the clientId filter", async () => {
    const id = crypto.randomUUID();
    const saved = await saveReport({
      id, clientId: TEST_MARKER, report: makeFixtureReport({ id }), runtimeMs: 10,
    });
    createdIds.push(saved!.id);

    const filtered = await listReports(TEST_MARKER);
    expect(filtered.some(r => r.id === id)).toBe(true);
    expect(filtered.every(r => r.clientId === TEST_MARKER)).toBe(true);

    const all = await listReports();
    expect(all.some(r => r.id === id)).toBe(true);
  });

  it("getReport returns null for an id that was never persisted", async () => {
    const result = await getReport("this-id-does-not-exist-" + crypto.randomUUID());
    expect(result).toBeNull();
  });

  it("deleteReport removes the record so a subsequent getReport returns null", async () => {
    const id = crypto.randomUUID();
    const saved = await saveReport({
      id, clientId: TEST_MARKER, report: makeFixtureReport({ id }), runtimeMs: 5,
    });
    expect(saved).not.toBeNull();

    const removed = await deleteReport(id);
    expect(removed).toBe(true);

    const afterDelete = await getReport(id);
    expect(afterDelete).toBeNull();

    // Already deleted — don't double-delete in afterEach.
  });
});
