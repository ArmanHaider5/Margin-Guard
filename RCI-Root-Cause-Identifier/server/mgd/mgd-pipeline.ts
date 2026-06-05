// ─────────────────────────────────────────────────────────────────────────────
// MGD PIPELINE — Master Orchestration Layer
//
// Runs all MGD operational intelligence modules in a deterministic sequence
// and returns a fully composed executive report.
//
// Pipeline order:
//   STEP 1  generateOperationalFindings()
//   STEP 2  generateRootCauses()
//   STEP 3  generateOperationalRecommendations()
//   STEP 4  generateBenchmarkResults()
//   STEP 5  estimateOperationalHealth()   ← uses provided score or estimates one
//   STEP 6  generateExecutiveNarrative()
//   STEP 7  composeMGDReport()
//
// Design principles:
//   • No AI/LLM — fully deterministic orchestration.
//   • Each step is individually guarded; a failure in one step produces an
//     empty result for that step but the pipeline continues.
//   • Runtime is measured end-to-end and logged.
//   • Never throws — top-level try/catch returns an empty report on catastrophic
//     failure so the caller always gets a valid MGDReport shape.
//   • A PipelineTrace is created at start and every step is recorded.
// ─────────────────────────────────────────────────────────────────────────────

import { generateOperationalFindings }        from "./findings-engine";
import { generateRootCauses }                 from "./root-cause-engine";
import { generateOperationalRecommendations } from "./recommendation-engine";
import { generateBenchmarkResults }           from "./benchmark-engine";
import { generateExecutiveNarrative }         from "./executive-narrative-engine";
import { composeMGDReport }                   from "./report-composer";
import {
  startTrace,
  addTraceStep,
  completeTrace,
  makeStep,
  TRACE_STEPS,
  type PipelineTraceStep,
} from "./pipeline-trace";

import type { OperationalFinding }        from "./findings-engine";
import type { RootCause }                 from "./root-cause-engine";
import type { OperationalRecommendation } from "./recommendation-engine";
import type { BenchmarkResult }           from "./benchmark-engine";
import type { MGDReport }                 from "./report-composer";
import type { ConsultantNote }            from "./consultant-notes-engine";

// ── Exported interfaces ────────────────────────────────────────────────────────

export interface MGDRunParams {
  clientName?: string;
  industry?:   string;

  transactions: any[];
  documents?:   any[];

  consultantNotes?:  ConsultantNote[];
  businessConcerns?: string[];

  metrics?: {
    inventoryLossRate?:          number;
    refundRate?:                 number;
    logisticsUtilization?:       number;
    rejectedJobsRate?:           number;
    operationalHealthScore?:     number;
    reconciliationDelayRate?:    number;
    manualWorkflowDependency?:   number;
    inventoryDiscrepancyRate?:   number;
    manpowerDependencyRate?:     number;
    overtimeExposureRate?:       number;
  };
}

export interface MGDPipelineResult {
  report:    MGDReport;
  runtimeMs: number;
  traceId:   string;
  steps: {
    findingsCount:       number;
    rootCauseCount:      number;
    recommendationCount: number;
    benchmarkCount:      number;
    healthScore:         number;
    healthScoreSource:   "provided" | "estimated";
    traceSteps:          PipelineTraceStep[];
  };
}

// ── Health score helpers ──────────────────────────────────────────────────────

/** Count findings of CRITICAL severity. */
export function countCriticalFindings(findings: OperationalFinding[]): number {
  if (!Array.isArray(findings)) return 0;
  return findings.filter(f => f?.severity === "CRITICAL").length;
}

/** Count benchmarks with CRITICAL or ELEVATED status. */
export function countCriticalBenchmarks(benchmarks: BenchmarkResult[]): number {
  if (!Array.isArray(benchmarks)) return 0;
  return benchmarks.filter(b => b?.status === "CRITICAL" || b?.status === "ELEVATED").length;
}

/**
 * Estimate an operational health score (0–100) from pipeline outputs when
 * no explicit score is provided.
 *
 * Scoring:
 *   Baseline:                       85  (no detected issues = stable)
 *   Per CRITICAL finding:          -10
 *   Per HIGH finding:               -5
 *   Per MEDIUM finding:             -2
 *   Per CRITICAL root cause:        -8
 *   Per HIGH root cause:            -4
 *   Per CRITICAL benchmark:         -7
 *   Per ELEVATED benchmark:         -3
 *
 * Result is clamped to [0, 100].
 */
export function estimateOperationalHealth(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
  benchmarks: BenchmarkResult[],
): number {
  const BASELINE = 85;
  let score = BASELINE;

  const sF  = Array.isArray(findings)   ? findings.filter(f => f != null)   : [];
  const sRC = Array.isArray(rootCauses) ? rootCauses.filter(r => r != null) : [];
  const sBM = Array.isArray(benchmarks) ? benchmarks.filter(b => b != null) : [];

  for (const f of sF) {
    if      (f.severity === "CRITICAL") score -= 10;
    else if (f.severity === "HIGH")     score -= 5;
    else if (f.severity === "MEDIUM")   score -= 2;
  }

  for (const rc of sRC) {
    if      (rc.severity === "CRITICAL") score -= 8;
    else if (rc.severity === "HIGH")     score -= 4;
  }

  for (const bm of sBM) {
    if      (bm.status === "CRITICAL") score -= 7;
    else if (bm.status === "ELEVATED") score -= 3;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

/**
 * Run the full MGD diagnostic pipeline and return a composed report.
 * Never throws. On catastrophic failure an empty-but-valid MGDReport is returned.
 */
export async function runMGDPipeline(
  params: MGDRunParams | null | undefined,
): Promise<MGDPipelineResult> {
  const startedAt = Date.now();

  // Start trace immediately — never throws, returns in-memory trace on persist failure
  const trace = await startTrace();
  const { traceId } = trace;

  const traceSteps: PipelineTraceStep[] = [];

  async function record(step: PipelineTraceStep): Promise<void> {
    traceSteps.push(step);
    // fire-and-forget persist — pipeline never waits on trace I/O
    addTraceStep(traceId, step).catch(() => undefined);
  }

  const empty = async (): Promise<MGDPipelineResult> => ({
    report:    composeMGDReport(null),
    runtimeMs: Date.now() - startedAt,
    traceId,
    steps: {
      findingsCount: 0, rootCauseCount: 0, recommendationCount: 0,
      benchmarkCount: 0, healthScore: 0, healthScoreSource: "estimated",
      traceSteps,
    },
  });

  try {
    if (params == null) {
      console.log("[MGD][PIPELINE] runMGDPipeline — called with null/undefined params, returning empty report");
      return empty();
    }

    const { clientName, industry, metrics = {}, consultantNotes, businessConcerns } = params;

    const transactions = Array.isArray(params.transactions)
      ? params.transactions.filter(t => t != null) : [];
    const documents    = Array.isArray(params.documents)
      ? params.documents.filter(d => d != null)    : [];

    console.log(
      `[MGD][PIPELINE] runMGDPipeline START — ` +
      `client="${clientName ?? "unknown"}", ` +
      `industry="${industry ?? "unspecified"}", ` +
      `transactions=${transactions.length}, ` +
      `documents=${documents.length}, ` +
      `traceId=${traceId}`,
    );

    // ── TRACE: Document Processing ──────────────────────────────────────────
    // Records the raw input counts before any processing begins.
    {
      const t0 = new Date().toISOString();
      await record(makeStep({
        step:        TRACE_STEPS.DOCUMENT_PROCESSING,
        startedAt:   t0,
        status:      "completed",
        inputCount:  documents.length,
        outputCount: documents.length,
        metadata: {
          documents:    documents.length,
          transactions: transactions.length,
          clientName:   clientName ?? null,
          industry:     industry   ?? null,
        },
      }));
    }

    // ── TRACE: Transaction Extraction ───────────────────────────────────────
    // Records how many transaction rows are available for analysis.
    {
      const t0 = new Date().toISOString();
      await record(makeStep({
        step:        TRACE_STEPS.TRANSACTION_EXTRACTION,
        startedAt:   t0,
        status:      "completed",
        inputCount:  documents.length,
        outputCount: transactions.length,
        metadata:    { transactions: transactions.length },
      }));
    }

    // ── STEP 1: Findings ────────────────────────────────────────────────────
    let findings: OperationalFinding[] = [];
    {
      const t0 = new Date().toISOString();
      let status: "completed" | "failed" = "completed";
      try {
        findings = generateOperationalFindings({ transactions, documents, industry });
        console.log(`[MGD][PIPELINE] STEP 1 — findings=${findings.length}`);
      } catch (err) {
        status = "failed";
        console.error("[MGD][PIPELINE] STEP 1 (findings) failed:", err);
      }
      await record(makeStep({
        step:        TRACE_STEPS.FINDINGS_GENERATION,
        startedAt:   t0,
        status,
        inputCount:  transactions.length,
        outputCount: findings.length,
        metadata: {
          findings:     findings.length,
          critical:     findings.filter(f => f.severity === "CRITICAL").length,
          high:         findings.filter(f => f.severity === "HIGH").length,
          medium:       findings.filter(f => f.severity === "MEDIUM").length,
          low:          findings.filter(f => f.severity === "LOW").length,
          industry:     industry ?? null,
        },
      }));
    }

    // ── STEP 2: Root Causes ─────────────────────────────────────────────────
    let rootCauses: RootCause[] = [];
    {
      const t0 = new Date().toISOString();
      let status: "completed" | "failed" = "completed";
      try {
        rootCauses = generateRootCauses({ findings, industry });
        console.log(`[MGD][PIPELINE] STEP 2 — rootCauses=${rootCauses.length}`);
      } catch (err) {
        status = "failed";
        console.error("[MGD][PIPELINE] STEP 2 (rootCauses) failed:", err);
      }
      await record(makeStep({
        step:        TRACE_STEPS.ROOT_CAUSE_GENERATION,
        startedAt:   t0,
        status,
        inputCount:  findings.length,
        outputCount: rootCauses.length,
        metadata: {
          rootCauses: rootCauses.length,
          critical:   rootCauses.filter(r => r.severity === "CRITICAL").length,
          high:       rootCauses.filter(r => r.severity === "HIGH").length,
        },
      }));
    }

    // ── STEP 3: Recommendations ─────────────────────────────────────────────
    let recommendations: OperationalRecommendation[] = [];
    {
      const t0 = new Date().toISOString();
      let status: "completed" | "failed" = "completed";
      try {
        recommendations = generateOperationalRecommendations({ findings, rootCauses, industry });
        console.log(`[MGD][PIPELINE] STEP 3 — recommendations=${recommendations.length}`);
      } catch (err) {
        status = "failed";
        console.error("[MGD][PIPELINE] STEP 3 (recommendations) failed:", err);
      }
      await record(makeStep({
        step:        TRACE_STEPS.RECOMMENDATION_GENERATION,
        startedAt:   t0,
        status,
        inputCount:  findings.length + rootCauses.length,
        outputCount: recommendations.length,
        metadata: {
          recommendations: recommendations.length,
          immediate:       recommendations.filter(r => r.timeframe === "IMMEDIATE").length,
          thirtyDays:      recommendations.filter(r => r.timeframe === "30_DAYS").length,
          ninetyDays:      recommendations.filter(r => r.timeframe === "90_DAYS").length,
          longTerm:        recommendations.filter(r => r.timeframe === "LONG_TERM").length,
        },
      }));
    }

    // ── STEP 4: Benchmarks ──────────────────────────────────────────────────
    let benchmarks: BenchmarkResult[] = [];
    {
      const t0 = new Date().toISOString();
      let status: "completed" | "failed" = "completed";
      try {
        benchmarks = generateBenchmarkResults({ metrics, industry });
        console.log(`[MGD][PIPELINE] STEP 4 — benchmarks=${benchmarks.length}`);
      } catch (err) {
        status = "failed";
        console.error("[MGD][PIPELINE] STEP 4 (benchmarks) failed:", err);
      }
      await record(makeStep({
        step:        TRACE_STEPS.BENCHMARK_GENERATION,
        startedAt:   t0,
        status,
        inputCount:  Object.keys(metrics).length,
        outputCount: benchmarks.length,
        metadata: {
          benchmarks: benchmarks.length,
          critical:   benchmarks.filter(b => b.status === "CRITICAL").length,
          elevated:   benchmarks.filter(b => b.status === "ELEVATED").length,
          watchlist:  benchmarks.filter(b => b.status === "WATCHLIST").length,
          healthy:    benchmarks.filter(b => b.status === "HEALTHY").length,
        },
      }));
    }

    // ── STEP 5: Operational Health Score ────────────────────────────────────
    let operationalHealthScore: number;
    let healthScoreSource: "provided" | "estimated";

    if (metrics.operationalHealthScore != null && isFinite(metrics.operationalHealthScore)) {
      operationalHealthScore = Math.max(0, Math.min(100, Math.round(metrics.operationalHealthScore)));
      healthScoreSource = "provided";
      console.log(`[MGD][PIPELINE] STEP 5 — healthScore=${operationalHealthScore} (provided)`);
    } else {
      operationalHealthScore = estimateOperationalHealth(findings, rootCauses, benchmarks);
      healthScoreSource = "estimated";
      console.log(
        `[MGD][PIPELINE] STEP 5 — healthScore=${operationalHealthScore} (estimated) ` +
        `[critFindings=${countCriticalFindings(findings)}, critBM=${countCriticalBenchmarks(benchmarks)}]`,
      );
    }

    // ── STEP 6: Executive Narrative ─────────────────────────────────────────
    let narrative;
    {
      const t0 = new Date().toISOString();
      let status: "completed" | "failed" = "completed";
      try {
        narrative = generateExecutiveNarrative({
          findings,
          rootCauses,
          recommendations,
          operationalHealthScore,
          industry,
        });
        console.log(`[MGD][PIPELINE] STEP 6 — narrative generated (7 sections)`);
      } catch (err) {
        status = "failed";
        console.error("[MGD][PIPELINE] STEP 6 (narrative) failed:", err);
        narrative = generateExecutiveNarrative({ findings: [], rootCauses: [], recommendations: [] });
      }
      await record(makeStep({
        step:        TRACE_STEPS.NARRATIVE_GENERATION,
        startedAt:   t0,
        status,
        inputCount:  findings.length + rootCauses.length + recommendations.length,
        outputCount: 7,
        metadata: {
          sections:            7,
          operationalHealthScore,
          healthScoreSource,
          industry:            industry ?? null,
        },
      }));
    }

    // ── STEP 7: Report Composition ──────────────────────────────────────────
    let report: MGDReport;
    {
      const t0 = new Date().toISOString();
      let status: "completed" | "failed" = "completed";
      try {
        report = composeMGDReport({
          clientName,
          industry,
          findings,
          rootCauses,
          recommendations,
          benchmarks,
          narrative,
          operationalHealthScore,
          consultantNotes,
          businessConcerns,
        });
        console.log(`[MGD][PIPELINE] STEP 7 — report composed (version=${report.metadata.reportVersion})`);
      } catch (err) {
        status = "failed";
        console.error("[MGD][PIPELINE] STEP 7 (report composition) failed:", err);
        report = composeMGDReport(null);
      }
      await record(makeStep({
        step:        TRACE_STEPS.REPORT_COMPOSITION,
        startedAt:   t0,
        status,
        inputCount:  findings.length + rootCauses.length + recommendations.length + benchmarks.length,
        outputCount: 1,
        metadata: {
          reportVersion:         report.metadata.reportVersion,
          operationalHealthScore,
          healthScoreSource,
          documents:             documents.length,
          transactions:          transactions.length,
          findings:              findings.length,
          rootCauses:            rootCauses.length,
          recommendations:       recommendations.length,
          benchmarks:            benchmarks.length,
        },
      }));
    }

    const runtimeMs = Date.now() - startedAt;

    // Persist final trace state (fire-and-forget)
    completeTrace(traceId).catch(() => undefined);

    console.log(
      `[MGD][PIPELINE] COMPLETE — ` +
      `runtime=${runtimeMs}ms, ` +
      `findings=${findings.length}, ` +
      `rootCauses=${rootCauses.length}, ` +
      `recommendations=${recommendations.length}, ` +
      `benchmarks=${benchmarks.length}, ` +
      `healthScore=${operationalHealthScore} (${healthScoreSource}), ` +
      `traceId=${traceId}, ` +
      `traceSteps=${traceSteps.length}`,
    );

    return {
      report,
      runtimeMs,
      traceId,
      steps: {
        findingsCount:       findings.length,
        rootCauseCount:      rootCauses.length,
        recommendationCount: recommendations.length,
        benchmarkCount:      benchmarks.length,
        healthScore:         operationalHealthScore,
        healthScoreSource,
        traceSteps,
      },
    };
  } catch (err) {
    const runtimeMs = Date.now() - startedAt;
    console.error(`[MGD][PIPELINE] FATAL — runtime=${runtimeMs}ms, traceId=${traceId}, error:`, err);
    completeTrace(traceId).catch(() => undefined);
    return empty();
  }
}
