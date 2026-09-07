import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "crypto";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";

// mgd-routes.ts imports `{ storage }` from "../system/storage" (relative to
// server/routes/) at module load time. That module transitively imports
// server/system/db.ts, which throws if DATABASE_URL is unset — true in this
// test environment, and true generally since this suite must run without a
// real database. Stubbed here (vi.mock resolves this specifier against the
// same physical file mgd-routes.ts imports) with only the one method
// mgd-routes.ts actually calls (`getClientDocument`, used solely by
// POST /api/mgd/run's document-extraction path, not exercised below).
vi.mock("../../system/storage", () => ({
  storage: { getClientDocument: vi.fn() },
}));

// generateMGDPdfReport pulls in `pdfkit`, which is unnecessary weight for a
// test that only asserts *which* report export-pdf hands to the renderer —
// not what PDF bytes come out. Stubbed to a fast, deterministic fake.
vi.mock("../../mgd/pdf-export", () => ({
  generateMGDPdfReport: vi.fn(async () => Buffer.from("fake-pdf")),
}));

// runMGDPipeline is the real analytical engine (findings/root-causes/
// benchmarks/narrative) — exercising it for real here would duplicate the
// engines' own unit tests. Stubbed so the canonical-id tests below can
// assert exactly what /api/mgd/run does with the pipeline's output (mint an
// id, embed it, persist it) without depending on engine internals.
vi.mock("../../mgd/mgd-pipeline", () => ({
  runMGDPipeline: vi.fn(async (params: any) => ({
    report: {
      metadata: {
        generatedAt: new Date().toISOString(),
        clientName: params?.clientName,
        industry: params?.industry,
        reportVersion: "test",
      },
      summary: {
        criticalFindings: 0, highFindings: 0, criticalRootCauses: 0,
        highPriorityRecommendations: 0, benchmarkAlerts: 0,
      },
      narrative: {},
      findings: [], rootCauses: [], recommendations: [], benchmarks: [],
    },
    runtimeMs: 1,
    traceId: "test-trace",
    steps: {
      findingsCount: 0, rootCauseCount: 0, recommendationCount: 0,
      benchmarkCount: 0, healthScore: 0, healthScoreSource: "estimated",
    },
  })),
}));

import { registerMGDRoutes } from "../mgd-routes.js";
import { saveReport, getReport, deleteReport } from "../../mgd/report-store.js";
import { generateMGDPdfReport } from "../../mgd/pdf-export.js";
import { runMGDPipeline } from "../../mgd/mgd-pipeline.js";
import type { MGDReport } from "../../mgd/report-composer.js";

function makeFixtureReport(overrides: Partial<MGDReport> = {}): MGDReport {
  return {
    metadata: {
      generatedAt:   new Date().toISOString(),
      clientName:    "Export Test Co.",
      industry:      "manufacturing",
      reportVersion: "test",
    },
    summary: {
      criticalFindings: 0, highFindings: 0, criticalRootCauses: 0,
      highPriorityRecommendations: 0, benchmarkAlerts: 0,
    },
    narrative: {} as MGDReport["narrative"],
    findings: [], rootCauses: [], recommendations: [], benchmarks: [],
    ...overrides,
  } as MGDReport;
}

function jsonBody(app: Express) {
  app.use(express.json());
}

async function post(app: Express, path: string, body: unknown) {
  const server = app.listen(0);
  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await res.json() : await res.arrayBuffer();
    return { status: res.status, payload };
  } finally {
    server.close();
  }
}

describe("POST /api/mgd/export-pdf — always exports the selected persisted report, never re-runs the pipeline", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.mocked(generateMGDPdfReport).mockClear();
    while (createdIds.length > 0) await deleteReport(createdIds.pop()!);
  });

  it("400s when reportId is missing", async () => {
    const app = express();
    jsonBody(app);
    registerMGDRoutes(app);

    const { status, payload } = await post(app, "/api/mgd/export-pdf", {});
    expect(status).toBe(400);
    expect((payload as any).success).toBe(false);
    expect(generateMGDPdfReport).not.toHaveBeenCalled();
  });

  it("404s when reportId does not resolve to a persisted report", async () => {
    const app = express();
    jsonBody(app);
    registerMGDRoutes(app);

    const { status, payload } = await post(app, "/api/mgd/export-pdf", { reportId: "does-not-exist" });
    expect(status).toBe(404);
    expect((payload as any).success).toBe(false);
    expect(generateMGDPdfReport).not.toHaveBeenCalled();
  });

  it("on a valid reportId, renders exactly the stored report — no fresh pipeline run", async () => {
    const id = crypto.randomUUID();
    const report = makeFixtureReport({ id });
    const saved = await saveReport({ id, clientName: "Export Test Co.", report, runtimeMs: 1 });
    createdIds.push(saved!.id);

    const app = express();
    jsonBody(app);
    registerMGDRoutes(app);

    const { status } = await post(app, "/api/mgd/export-pdf", { reportId: id });
    expect(status).toBe(200);
    expect(generateMGDPdfReport).toHaveBeenCalledTimes(1);
    // The exact stored report object (by content) was handed to the
    // renderer — not a freshly recomputed one.
    const renderedWith = vi.mocked(generateMGDPdfReport).mock.calls[0][0];
    expect(renderedWith.id).toBe(id);
    expect(renderedWith.metadata.clientName).toBe("Export Test Co.");
  });
});

describe("POST /api/mgd/run — canonical report.id lifecycle (unchanged by this milestone, guarded against regression)", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    vi.mocked(runMGDPipeline).mockClear();
    while (createdIds.length > 0) await deleteReport(createdIds.pop()!);
  });

  it("mints one id, embeds it as report.id, and persists the record under that exact id", async () => {
    const app = express();
    jsonBody(app);
    registerMGDRoutes(app);

    const { status, payload } = await post(app, "/api/mgd/run", {
      clientId: "client-abc", clientName: "Canonical Test Co.", industry: "manufacturing",
    });
    expect(status).toBe(200);
    const body = payload as any;
    expect(body.success).toBe(true);
    const reportId: string = body.report.id;
    expect(typeof reportId).toBe("string");
    expect(reportId.length).toBeGreaterThan(0);
    createdIds.push(reportId);

    // The exact same id the response embeds is what the record was actually
    // persisted under — the one canonical handoff this milestone must not
    // regress (Report Viewer / Presentation Mode / PDF export all resolve
    // by this id via GET /api/mgd/reports/:id).
    const stored = await getReport(reportId);
    expect(stored).not.toBeNull();
    expect(stored!.id).toBe(reportId);
    expect(stored!.report.id).toBe(reportId);
    expect(stored!.clientName).toBe("Canonical Test Co.");
  });

  it("never fabricates transactions — passes the request body's own transactions/clientId straight to the real pipeline", async () => {
    const app = express();
    jsonBody(app);
    registerMGDRoutes(app);

    const realTransactions = [{ id: "tx-real-1", entityName: "Real Client Item" }];
    const { payload } = await post(app, "/api/mgd/run", {
      clientId: "client-real", clientName: "Real Co.", industry: "retail",
      transactions: realTransactions,
    });
    createdIds.push((payload as any).report.id);

    expect(runMGDPipeline).toHaveBeenCalledTimes(1);
    const calledWith = vi.mocked(runMGDPipeline).mock.calls[0][0] as any;
    // Exactly what was submitted — never MOCK_TRANSACTIONS or any other
    // hardcoded fixture. mgd-runner-page.tsx's MOCK_TRANSACTIONS is a
    // frontend-only constant with no import anywhere in this backend route
    // (see the static sweep in mgd-route-classification.test.ts).
    expect(calledWith.transactions).toEqual(realTransactions);
    expect(calledWith.clientName).toBe("Real Co.");
  });
});

describe("registerMGDRoutes — authMiddleware is applied to every /api/mgd/* route except the health probe", () => {
  function collectMiddlewareNames(app: Express, path: string): string[] {
    const layer = (app as any)._router.stack.find(
      (l: any) => l.route?.path === path,
    );
    if (!layer) throw new Error(`Route ${path} was not registered`);
    return layer.route.stack.map((s: any) => s.name || s.handle?.name || "<anonymous>");
  }

  it("mounts the guard before the handler on a representative sample of routes, but not on GET /api/mgd/health", () => {
    const guardA = function guardA(_req: Request, _res: Response, next: NextFunction) { next(); };
    const guardB = function guardB(_req: Request, _res: Response, next: NextFunction) { next(); };

    const app = express();
    jsonBody(app);
    registerMGDRoutes(app, [guardA, guardB]);

    for (const path of ["/api/mgd/run", "/api/mgd/export-pdf", "/api/mgd/reports", "/api/mgd/reports/:id"]) {
      const names = collectMiddlewareNames(app, path);
      expect(names.slice(0, 2)).toEqual(["guardA", "guardB"]);
    }

    const healthNames = collectMiddlewareNames(app, "/api/mgd/health");
    expect(healthNames).not.toContain("guardA");
    expect(healthNames).not.toContain("guardB");
  });

  it("defaults to no guard at all when authMiddleware is omitted (kept only for direct callability/testability)", () => {
    const app = express();
    jsonBody(app);
    registerMGDRoutes(app);

    const names = collectMiddlewareNames(app, "/api/mgd/run");
    // Just the route's own handler — no guard layer in front of it.
    expect(names.length).toBe(1);
  });
});
