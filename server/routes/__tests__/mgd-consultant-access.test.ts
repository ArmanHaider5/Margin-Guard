import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import crypto from "crypto";
import express from "express";
import type { Express, NextFunction, Request, RequestHandler, Response } from "express";

// Same isolation rationale as mgd-routes.test.ts: mgd-routes.ts imports
// `{ storage }` from "../system/storage" at module load time, and that
// module transitively requires a real DATABASE_URL — unusable in this test
// environment. Stubbed with every method the MGD Consultant Access routes
// actually call. `getClientDocument` is kept only because POST /api/mgd/run's
// extraction path calls it (not exercised by the scoping tests below).
const storageMock = vi.hoisted(() => ({
  getUser:                          vi.fn(),
  getAllClients:                    vi.fn(),
  getAssignedClients:               vi.fn(),
  isClientAssignedToUser:           vi.fn(),
  getClient:                        vi.fn(),
  getClientDocument:                vi.fn(),
  getClientDocuments:               vi.fn(),
  createClientDocument:             vi.fn(),
}));
vi.mock("../../system/storage", () => ({ storage: storageMock }));

// mgd-pipeline is the real analytical engine — stubbed exactly as
// mgd-routes.test.ts does, so POST /api/mgd/run's scoping check can be
// exercised without depending on engine internals.
vi.mock("../../mgd/mgd-pipeline", () => ({
  runMGDPipeline: vi.fn(async (params: any) => ({
    report: {
      metadata: { generatedAt: new Date().toISOString(), clientName: params?.clientName, industry: params?.industry, reportVersion: "test" },
      summary: { criticalFindings: 0, highFindings: 0, criticalRootCauses: 0, highPriorityRecommendations: 0, benchmarkAlerts: 0 },
      narrative: {}, findings: [], rootCauses: [], recommendations: [], benchmarks: [],
    },
    runtimeMs: 1, traceId: "test-trace",
    steps: { findingsCount: 0, rootCauseCount: 0, recommendationCount: 0, benchmarkCount: 0, healthScore: 0, healthScoreSource: "estimated" },
  })),
}));

import { registerMGDRoutes } from "../mgd-routes.js";
import { saveReport, deleteReport } from "../../mgd/report-store.js";
import type { MGDReport } from "../../mgd/report-composer.js";

// ── Fixtures ────────────────────────────────────────────────────────────────

const ADMIN_ID      = "admin-1";
const CONSULTANT_ID = "consultant-1";
const ASSIGNED_CLIENT   = "client-assigned";
const UNASSIGNED_CLIENT = "client-unassigned";

function configureUsers() {
  storageMock.getUser.mockImplementation(async (id: string) => {
    if (id === ADMIN_ID) return { id: ADMIN_ID, role: "admin" } as any;
    if (id === CONSULTANT_ID) return { id: CONSULTANT_ID, role: "consultant" } as any;
    return undefined;
  });
  storageMock.isClientAssignedToUser.mockImplementation(
    async (userId: string, clientId: string) => userId === CONSULTANT_ID && clientId === ASSIGNED_CLIENT,
  );
  storageMock.getAssignedClients.mockImplementation(async (userId: string) =>
    userId === CONSULTANT_ID ? [{ id: ASSIGNED_CLIENT, name: "Assigned Co.", industry: "manufacturing" }] : [],
  );
  storageMock.getAllClients.mockResolvedValue([
    { id: ASSIGNED_CLIENT, name: "Assigned Co.", industry: "manufacturing" },
    { id: UNASSIGNED_CLIENT, name: "Unassigned Co.", industry: "retail" },
  ]);
}

/** Simulates the real isAuthenticated + isAdminOrConsultant chain's effect
 *  on req.user — sets req.user.claims.sub so mgd-routes.ts's own
 *  currentUser() helper (req.user.claims.sub → storage.getUser) resolves the
 *  same way it does in production. */
function withUser(userId: string): RequestHandler {
  return (req: any, _res: Response, next: NextFunction) => {
    req.user = { claims: { sub: userId } };
    next();
  };
}

function jsonBody(app: Express) {
  app.use(express.json());
}

async function request(app: Express, method: "GET" | "POST" | "DELETE", path: string, body?: unknown) {
  const server = app.listen(0);
  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const contentType = res.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await res.json() : await res.arrayBuffer();
    return { status: res.status, payload: payload as any };
  } finally {
    server.close();
  }
}

function appAs(userId: string): Express {
  const app = express();
  jsonBody(app);
  registerMGDRoutes(app, [withUser(userId)]);
  return app;
}

function makeFixtureReport(overrides: Partial<MGDReport> = {}): MGDReport {
  return {
    metadata: { generatedAt: new Date().toISOString(), clientName: "Fixture Co.", industry: "manufacturing", reportVersion: "test" },
    summary: { criticalFindings: 0, highFindings: 0, criticalRootCauses: 0, highPriorityRecommendations: 0, benchmarkAlerts: 0 },
    narrative: {} as MGDReport["narrative"],
    findings: [], rootCauses: [], recommendations: [], benchmarks: [],
    ...overrides,
  } as MGDReport;
}

beforeEach(() => {
  vi.clearAllMocks();
  configureUsers();
});

// ── GET /api/mgd/clients ─────────────────────────────────────────────────────

describe("GET /api/mgd/clients", () => {
  it("admin sees every client", async () => {
    const { status, payload } = await request(appAs(ADMIN_ID), "GET", "/api/mgd/clients");
    expect(status).toBe(200);
    expect(payload.clients.map((c: any) => c.id).sort()).toEqual([ASSIGNED_CLIENT, UNASSIGNED_CLIENT].sort());
    expect(storageMock.getAllClients).toHaveBeenCalledTimes(1);
    expect(storageMock.getAssignedClients).not.toHaveBeenCalled();
  });

  it("consultant sees only their assigned clients", async () => {
    const { status, payload } = await request(appAs(CONSULTANT_ID), "GET", "/api/mgd/clients");
    expect(status).toBe(200);
    expect(payload.clients.map((c: any) => c.id)).toEqual([ASSIGNED_CLIENT]);
    expect(storageMock.getAllClients).not.toHaveBeenCalled();
  });
});

// ── GET / POST /api/mgd/clients/:id/documents ────────────────────────────────

describe("GET /api/mgd/clients/:id/documents", () => {
  it("admin can list documents for any client, assigned or not", async () => {
    storageMock.getClient.mockResolvedValue({ id: UNASSIGNED_CLIENT, name: "Unassigned Co." });
    storageMock.getClientDocuments.mockResolvedValue([{ id: "doc-1", fileName: "a.xlsx" }]);
    const { status, payload } = await request(appAs(ADMIN_ID), "GET", `/api/mgd/clients/${UNASSIGNED_CLIENT}/documents`);
    expect(status).toBe(200);
    expect(payload.documents).toHaveLength(1);
  });

  it("assigned consultant can list documents for their client", async () => {
    storageMock.getClient.mockResolvedValue({ id: ASSIGNED_CLIENT, name: "Assigned Co." });
    storageMock.getClientDocuments.mockResolvedValue([]);
    const { status } = await request(appAs(CONSULTANT_ID), "GET", `/api/mgd/clients/${ASSIGNED_CLIENT}/documents`);
    expect(status).toBe(200);
  });

  it("unassigned consultant is rejected with 403 — never reaches storage.getClientDocuments", async () => {
    const { status, payload } = await request(appAs(CONSULTANT_ID), "GET", `/api/mgd/clients/${UNASSIGNED_CLIENT}/documents`);
    expect(status).toBe(403);
    expect(payload.success).toBe(false);
    expect(storageMock.getClientDocuments).not.toHaveBeenCalled();
  });
});

describe("POST /api/mgd/clients/:id/documents", () => {
  it("unassigned consultant is rejected with 403 before any upload/storage work happens", async () => {
    const { status, payload } = await request(appAs(CONSULTANT_ID), "POST", `/api/mgd/clients/${UNASSIGNED_CLIENT}/documents`, {});
    expect(status).toBe(403);
    expect(payload.success).toBe(false);
    expect(storageMock.getClient).not.toHaveBeenCalled();
    expect(storageMock.createClientDocument).not.toHaveBeenCalled();
  });
});

// ── POST /api/mgd/run — client scoping ───────────────────────────────────────

describe("POST /api/mgd/run — MGD Consultant Access client scoping", () => {
  const createdIds: string[] = [];
  afterEach(async () => { while (createdIds.length > 0) await deleteReport(createdIds.pop()!); });

  it("admin can run a diagnostic for any clientId, including one with no assignment row", async () => {
    const { status, payload } = await request(appAs(ADMIN_ID), "POST", "/api/mgd/run", {
      clientId: UNASSIGNED_CLIENT, clientName: "Unassigned Co.", industry: "retail",
    });
    expect(status).toBe(200);
    createdIds.push(payload.report.id);
  });

  it("assigned consultant can run a diagnostic for their own client", async () => {
    const { status, payload } = await request(appAs(CONSULTANT_ID), "POST", "/api/mgd/run", {
      clientId: ASSIGNED_CLIENT, clientName: "Assigned Co.", industry: "manufacturing",
    });
    expect(status).toBe(200);
    createdIds.push(payload.report.id);
  });

  it("consultant is rejected (403) for a client they are not assigned to — no silent substitution", async () => {
    const { status, payload } = await request(appAs(CONSULTANT_ID), "POST", "/api/mgd/run", {
      clientId: UNASSIGNED_CLIENT, clientName: "Unassigned Co.", industry: "retail",
    });
    expect(status).toBe(403);
    expect(payload.success).toBe(false);
  });

  it("consultant with no clientId at all is rejected (403), never proceeds unscoped", async () => {
    const { status } = await request(appAs(CONSULTANT_ID), "POST", "/api/mgd/run", { clientName: "No Client" });
    expect(status).toBe(403);
  });
});

// ── GET /api/mgd/reports — scoping ───────────────────────────────────────────

describe("GET /api/mgd/reports — MGD Consultant Access scoping", () => {
  const createdIds: string[] = [];
  afterEach(async () => { while (createdIds.length > 0) await deleteReport(createdIds.pop()!); });

  it("admin sees reports across every client, unrestricted", async () => {
    const idA = crypto.randomUUID();
    const idB = crypto.randomUUID();
    await saveReport({ id: idA, clientId: ASSIGNED_CLIENT,   clientName: "Assigned Co.",   report: makeFixtureReport({ id: idA }), runtimeMs: 1 });
    await saveReport({ id: idB, clientId: UNASSIGNED_CLIENT, clientName: "Unassigned Co.", report: makeFixtureReport({ id: idB }), runtimeMs: 1 });
    createdIds.push(idA, idB);

    const { status, payload } = await request(appAs(ADMIN_ID), "GET", "/api/mgd/reports");
    expect(status).toBe(200);
    const ids = payload.reports.map((r: any) => r.id);
    expect(ids).toEqual(expect.arrayContaining([idA, idB]));
  });

  it("consultant with no ?clientId= sees only reports for their assigned client(s)", async () => {
    const idA = crypto.randomUUID();
    const idB = crypto.randomUUID();
    await saveReport({ id: idA, clientId: ASSIGNED_CLIENT,   clientName: "Assigned Co.",   report: makeFixtureReport({ id: idA }), runtimeMs: 1 });
    await saveReport({ id: idB, clientId: UNASSIGNED_CLIENT, clientName: "Unassigned Co.", report: makeFixtureReport({ id: idB }), runtimeMs: 1 });
    createdIds.push(idA, idB);

    const { status, payload } = await request(appAs(CONSULTANT_ID), "GET", "/api/mgd/reports");
    expect(status).toBe(200);
    const ids = payload.reports.map((r: any) => r.id);
    expect(ids).toContain(idA);
    expect(ids).not.toContain(idB);
  });

  it("consultant cannot widen access via an arbitrary ?clientId= they are not assigned to", async () => {
    const { status, payload } = await request(appAs(CONSULTANT_ID), "GET", `/api/mgd/reports?clientId=${UNASSIGNED_CLIENT}`);
    expect(status).toBe(403);
    expect(payload.success).toBe(false);
  });

  it("consultant querying their own assigned ?clientId= is honoured", async () => {
    const id = crypto.randomUUID();
    await saveReport({ id, clientId: ASSIGNED_CLIENT, clientName: "Assigned Co.", report: makeFixtureReport({ id }), runtimeMs: 1 });
    createdIds.push(id);

    const { status, payload } = await request(appAs(CONSULTANT_ID), "GET", `/api/mgd/reports?clientId=${ASSIGNED_CLIENT}`);
    expect(status).toBe(200);
    expect(payload.reports.map((r: any) => r.id)).toEqual([id]);
  });
});

// ── GET /api/mgd/reports/:id — scoping ───────────────────────────────────────

describe("GET /api/mgd/reports/:id — MGD Consultant Access scoping", () => {
  const createdIds: string[] = [];
  afterEach(async () => { while (createdIds.length > 0) await deleteReport(createdIds.pop()!); });

  it("admin can retrieve any report by id", async () => {
    const id = crypto.randomUUID();
    await saveReport({ id, clientId: UNASSIGNED_CLIENT, clientName: "Unassigned Co.", report: makeFixtureReport({ id }), runtimeMs: 1 });
    createdIds.push(id);
    const { status } = await request(appAs(ADMIN_ID), "GET", `/api/mgd/reports/${id}`);
    expect(status).toBe(200);
  });

  it("assigned consultant can retrieve their own client's report", async () => {
    const id = crypto.randomUUID();
    await saveReport({ id, clientId: ASSIGNED_CLIENT, clientName: "Assigned Co.", report: makeFixtureReport({ id }), runtimeMs: 1 });
    createdIds.push(id);
    const { status } = await request(appAs(CONSULTANT_ID), "GET", `/api/mgd/reports/${id}`);
    expect(status).toBe(200);
  });

  it("consultant is rejected (403) for a foreign client's report", async () => {
    const id = crypto.randomUUID();
    await saveReport({ id, clientId: UNASSIGNED_CLIENT, clientName: "Unassigned Co.", report: makeFixtureReport({ id }), runtimeMs: 1 });
    createdIds.push(id);
    const { status } = await request(appAs(CONSULTANT_ID), "GET", `/api/mgd/reports/${id}`);
    expect(status).toBe(403);
  });

  it("consultant is rejected (403) for a report with no clientId at all — nothing to verify against", async () => {
    const id = crypto.randomUUID();
    await saveReport({ id, report: makeFixtureReport({ id }), runtimeMs: 1 });
    createdIds.push(id);
    const { status } = await request(appAs(CONSULTANT_ID), "GET", `/api/mgd/reports/${id}`);
    expect(status).toBe(403);
  });
});

// ── DELETE /api/mgd/reports/:id — admin-only, even for an assigned client ────

describe("DELETE /api/mgd/reports/:id — stays admin-only regardless of the top-level MGD guard", () => {
  const createdIds: string[] = [];
  afterEach(async () => { while (createdIds.length > 0) await deleteReport(createdIds.pop()!).catch(() => {}); });

  it("admin can delete a report", async () => {
    const id = crypto.randomUUID();
    await saveReport({ id, clientId: ASSIGNED_CLIENT, clientName: "Assigned Co.", report: makeFixtureReport({ id }), runtimeMs: 1 });
    const { status } = await request(appAs(ADMIN_ID), "DELETE", `/api/mgd/reports/${id}`);
    expect(status).toBe(200);
  });

  it("consultant is rejected (403) even for their own assigned client's report", async () => {
    const id = crypto.randomUUID();
    await saveReport({ id, clientId: ASSIGNED_CLIENT, clientName: "Assigned Co.", report: makeFixtureReport({ id }), runtimeMs: 1 });
    createdIds.push(id);
    const { status, payload } = await request(appAs(CONSULTANT_ID), "DELETE", `/api/mgd/reports/${id}`);
    expect(status).toBe(403);
    expect(payload.success).toBe(false);
  });
});

// ── Representative /api/mgd/* admin-only sub-routes reject consultant ────────

describe("Admin-only MGD sub-routes reject the consultant role (representative sample)", () => {
  it("POST /api/mgd/export-pdf rejects a consultant with 403 before touching report-store", async () => {
    const { status } = await request(appAs(CONSULTANT_ID), "POST", "/api/mgd/export-pdf", { reportId: "whatever" });
    expect(status).toBe(403);
  });

  it("GET /api/mgd/traces rejects a consultant with 403", async () => {
    const { status } = await request(appAs(CONSULTANT_ID), "GET", "/api/mgd/traces");
    expect(status).toBe(403);
  });

  it("POST /api/mgd/findings rejects a consultant with 403", async () => {
    const { status } = await request(appAs(CONSULTANT_ID), "POST", "/api/mgd/findings", { transactions: [] });
    expect(status).toBe(403);
  });
});
