// ─────────────────────────────────────────────────────────────────────────────
// MGD ROUTES — API Endpoints for Margin Guard Diagnostics
//
// Exposes the full MGD operational intelligence pipeline through stable REST
// endpoints for frontend rendering, executive reports, dashboards, and exports.
//
// All routes are under /api/mgd
// All routes are wrapped in try/catch — never crash the process.
// All responses are valid JSON with { success: true|false, ... }.
//
// No auth guard applied at this layer — attach isAuthenticated in registerRoutes
// if you need it per-route.
// ─────────────────────────────────────────────────────────────────────────────

import type { Express, Request, Response } from "express";
import {
  runMGDPipeline,
  estimateOperationalHealth,
} from "../mgd/mgd-pipeline";
import { generateMGDPdfReport } from "../mgd/pdf-export";
import { generateOperationalFindings } from "../mgd/findings-engine";
import { generateRootCauses }          from "../mgd/root-cause-engine";
import { generateOperationalRecommendations } from "../mgd/recommendation-engine";
import { generateBenchmarkResults }    from "../mgd/benchmark-engine";
import { generateExecutiveNarrative }  from "../mgd/executive-narrative-engine";
import {
  saveReport,
  getReport,
  listReports,
  deleteReport,
} from "../mgd/report-store";

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeArray(v: unknown): any[] {
  return Array.isArray(v) ? v.filter(x => x != null) : [];
}

function safeMetrics(v: unknown): Record<string, number> {
  if (v != null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, number>;
  }
  return {};
}

function ok(res: Response, payload: object): void {
  res.json({ success: true, ...payload });
}

function fail(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, error: message });
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerMGDRoutes(app: Express): void {

  // ── GET /api/mgd/health ─────────────────────────────────────────────────────
  // Health probe — no pipeline invocation, returns immediately.
  app.get("/api/mgd/health", (_req: Request, res: Response) => {
    console.log("[MGD][API] GET /api/mgd/health");
    ok(res, {
      system:  "MGD",
      version: "MGD-V1",
      status:  "operational",
    });
  });

  // ── POST /api/mgd/run ───────────────────────────────────────────────────────
  // Full pipeline: findings → root causes → recommendations → benchmarks →
  // narrative → composed report.
  app.post("/api/mgd/run", async (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/run — start");
    try {
      const body = req.body ?? {};
      const result = await runMGDPipeline({
        clientName:   body.clientName   ?? undefined,
        industry:     body.industry     ?? undefined,
        transactions: safeArray(body.transactions),
        documents:    safeArray(body.documents),
        metrics:      safeMetrics(body.metrics),
      });
      console.log(
        `[MGD][API] POST /api/mgd/run — ` +
        `findings=${result.steps.findingsCount}, ` +
        `rootCauses=${result.steps.rootCauseCount}, ` +
        `recs=${result.steps.recommendationCount}, ` +
        `benchmarks=${result.steps.benchmarkCount}, ` +
        `health=${result.steps.healthScore} (${result.steps.healthScoreSource}), ` +
        `pipelineMs=${result.runtimeMs}, totalMs=${Date.now() - t0}`,
      );
      ok(res, {
        report:    result.report,
        runtimeMs: result.runtimeMs,
        steps:     result.steps,
      });

      // Fire-and-forget persistence — never blocks the response
      saveReport({
        clientId:   body.clientId   ?? undefined,
        clientName: body.clientName ?? undefined,
        industry:   body.industry   ?? undefined,
        report:     result.report,
        runtimeMs:  result.runtimeMs,
      }).catch(err => console.error("[MGD][API] POST /api/mgd/run — saveReport failed (non-fatal):", err));

    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/run — FATAL:", err);
      fail(res, 500, "Pipeline execution failed");
    }
  });

  // ── POST /api/mgd/estimate-health ──────────────────────────────────────────
  // Estimate operational health score from findings, root causes, benchmarks.
  app.post("/api/mgd/estimate-health", (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/estimate-health — start");
    try {
      const body = req.body ?? {};
      const findings    = safeArray(body.findings);
      const rootCauses  = safeArray(body.rootCauses);
      const benchmarks  = safeArray(body.benchmarks);
      const score = estimateOperationalHealth(findings, rootCauses, benchmarks);
      console.log(
        `[MGD][API] POST /api/mgd/estimate-health — ` +
        `score=${score}, ` +
        `findings=${findings.length}, rootCauses=${rootCauses.length}, benchmarks=${benchmarks.length}, ` +
        `ms=${Date.now() - t0}`,
      );
      ok(res, { estimatedHealthScore: score });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/estimate-health — error:", err);
      fail(res, 500, "Health estimation failed");
    }
  });

  // ── POST /api/mgd/findings ──────────────────────────────────────────────────
  // Generate operational findings from transaction data.
  app.post("/api/mgd/findings", (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/findings — start");
    try {
      const body = req.body ?? {};
      const transactions = safeArray(body.transactions);
      const documents    = safeArray(body.documents);
      const industry     = typeof body.industry === "string" ? body.industry : undefined;
      const findings = generateOperationalFindings({ transactions, documents, industry });
      console.log(
        `[MGD][API] POST /api/mgd/findings — ` +
        `count=${findings.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { findings, count: findings.length });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/findings — error:", err);
      fail(res, 500, "Findings generation failed");
    }
  });

  // ── POST /api/mgd/root-causes ───────────────────────────────────────────────
  // Map findings to systemic root causes.
  app.post("/api/mgd/root-causes", (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/root-causes — start");
    try {
      const body     = req.body ?? {};
      const findings = safeArray(body.findings);
      const industry = typeof body.industry === "string" ? body.industry : undefined;
      const rootCauses = generateRootCauses({ findings, industry });
      console.log(
        `[MGD][API] POST /api/mgd/root-causes — ` +
        `count=${rootCauses.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { rootCauses, count: rootCauses.length });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/root-causes — error:", err);
      fail(res, 500, "Root cause generation failed");
    }
  });

  // ── POST /api/mgd/recommendations ──────────────────────────────────────────
  // Generate prioritised corrective recommendations.
  app.post("/api/mgd/recommendations", (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/recommendations — start");
    try {
      const body      = req.body ?? {};
      const findings  = safeArray(body.findings);
      const rootCauses = safeArray(body.rootCauses);
      const industry  = typeof body.industry === "string" ? body.industry : undefined;
      const recommendations = generateOperationalRecommendations({ findings, rootCauses, industry });
      console.log(
        `[MGD][API] POST /api/mgd/recommendations — ` +
        `count=${recommendations.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { recommendations, count: recommendations.length });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/recommendations — error:", err);
      fail(res, 500, "Recommendations generation failed");
    }
  });

  // ── POST /api/mgd/benchmarks ────────────────────────────────────────────────
  // Compare operational metrics against industry benchmarks.
  app.post("/api/mgd/benchmarks", (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/benchmarks — start");
    try {
      const body     = req.body ?? {};
      const metrics  = safeMetrics(body.metrics);
      const industry = typeof body.industry === "string" ? body.industry : undefined;
      const benchmarks = generateBenchmarkResults({ metrics, industry });
      console.log(
        `[MGD][API] POST /api/mgd/benchmarks — ` +
        `count=${benchmarks.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { benchmarks, count: benchmarks.length });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/benchmarks — error:", err);
      fail(res, 500, "Benchmark generation failed");
    }
  });

  // ── POST /api/mgd/narrative ─────────────────────────────────────────────────
  // Generate a 7-section executive narrative from pipeline outputs.
  app.post("/api/mgd/narrative", (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/narrative — start");
    try {
      const body            = req.body ?? {};
      const findings        = safeArray(body.findings);
      const rootCauses      = safeArray(body.rootCauses);
      const recommendations = safeArray(body.recommendations);
      const industry        = typeof body.industry === "string" ? body.industry : undefined;
      const operationalHealthScore =
        typeof body.operationalHealthScore === "number" &&
        isFinite(body.operationalHealthScore)
          ? body.operationalHealthScore
          : undefined;
      const narrative = generateExecutiveNarrative({
        findings,
        rootCauses,
        recommendations,
        operationalHealthScore,
        industry,
      });
      console.log(
        `[MGD][API] POST /api/mgd/narrative — ` +
        `7 sections generated, ` +
        `findings=${findings.length}, rootCauses=${rootCauses.length}, ` +
        `recs=${recommendations.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { narrative });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/narrative — error:", err);
      fail(res, 500, "Narrative generation failed");
    }
  });

  // ── POST /api/mgd/export-pdf ────────────────────────────────────────────────
  // Run the full pipeline then generate and stream a PDF report.
  app.post("/api/mgd/export-pdf", async (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/export-pdf — start");
    try {
      const body = req.body ?? {};

      // Run the pipeline first to get a fully composed MGDReport
      const result = await runMGDPipeline({
        clientName:   body.clientName   ?? undefined,
        industry:     body.industry     ?? undefined,
        transactions: safeArray(body.transactions),
        documents:    safeArray(body.documents),
        metrics:      safeMetrics(body.metrics),
      });

      // Generate PDF from the composed report
      const pdfBuffer = await generateMGDPdfReport(result.report);

      const safeName = (body.clientName ?? "mgd-report")
        .replace(/[^a-z0-9]/gi, "-").toLowerCase().replace(/-+/g, "-").slice(0, 40);
      const filename = `${safeName}-mgd-report.pdf`;

      console.log(
        `[MGD][API] POST /api/mgd/export-pdf — ` +
        `pdf=${pdfBuffer.length} bytes, pipelineMs=${result.runtimeMs}, totalMs=${Date.now() - t0}`,
      );

      res
        .set("Content-Type",        "application/pdf")
        .set("Content-Disposition", `attachment; filename="${filename}"`)
        .set("Content-Length",      String(pdfBuffer.length))
        .send(pdfBuffer);
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/export-pdf — FATAL:", err);
      fail(res, 500, "PDF export failed");
    }
  });

  // ── GET /api/mgd/reports ────────────────────────────────────────────────────
  // List all stored reports, optionally filtered by ?clientId=
  app.get("/api/mgd/reports", async (req: Request, res: Response) => {
    try {
      const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
      console.log(`[MGD][REPORTS] GET /api/mgd/reports — clientId=${clientId ?? "all"}`);
      const reports = await listReports(clientId);
      console.log(`[MGD][REPORTS] GET /api/mgd/reports — returned ${reports.length} record(s)`);
      ok(res, { reports });
    } catch (err) {
      console.error("[MGD][REPORTS] GET /api/mgd/reports — error:", err);
      fail(res, 500, "Failed to list reports");
    }
  });

  // ── GET /api/mgd/reports/:id ─────────────────────────────────────────────────
  // Retrieve a single stored report by id.
  app.get("/api/mgd/reports/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`[MGD][REPORTS] GET /api/mgd/reports/${id}`);
      const report = await getReport(id);
      if (!report) {
        console.log(`[MGD][REPORTS] GET /api/mgd/reports/${id} — not found`);
        return fail(res, 404, `Report "${id}" not found`);
      }
      console.log(`[MGD][REPORTS] GET /api/mgd/reports/${id} — found`);
      ok(res, { report });
    } catch (err) {
      console.error("[MGD][REPORTS] GET /api/mgd/reports/:id — error:", err);
      fail(res, 500, "Failed to retrieve report");
    }
  });

  // ── DELETE /api/mgd/reports/:id ──────────────────────────────────────────────
  // Delete a single stored report by id.
  app.delete("/api/mgd/reports/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`[MGD][REPORTS] DELETE /api/mgd/reports/${id}`);
      const deleted = await deleteReport(id);
      if (!deleted) {
        console.log(`[MGD][REPORTS] DELETE /api/mgd/reports/${id} — not found`);
        return fail(res, 404, `Report "${id}" not found`);
      }
      console.log(`[MGD][REPORTS] DELETE /api/mgd/reports/${id} — deleted`);
      ok(res, { deleted: true });
    } catch (err) {
      console.error("[MGD][REPORTS] DELETE /api/mgd/reports/:id — error:", err);
      fail(res, 500, "Failed to delete report");
    }
  });

  console.log("[MGD][API] Routes registered: GET /api/mgd/{health,reports,reports/:id}, DELETE /api/mgd/reports/:id, POST /api/mgd/{run,estimate-health,findings,root-causes,recommendations,benchmarks,narrative,export-pdf}");
}
