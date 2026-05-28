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
// ─────────────────────────────────────────────────────────────────────────────

import { generateOperationalFindings }     from "./findings-engine";
import { generateRootCauses }              from "./root-cause-engine";
import { generateOperationalRecommendations } from "./recommendation-engine";
import { generateBenchmarkResults }        from "./benchmark-engine";
import { generateExecutiveNarrative }      from "./executive-narrative-engine";
import { composeMGDReport }               from "./report-composer";

import type { OperationalFinding }        from "./findings-engine";
import type { RootCause }                 from "./root-cause-engine";
import type { OperationalRecommendation } from "./recommendation-engine";
import type { BenchmarkResult }           from "./benchmark-engine";
import type { MGDReport }                 from "./report-composer";

// ── Exported interfaces ────────────────────────────────────────────────────────

export interface MGDRunParams {
  clientName?: string;
  industry?:   string;

  transactions: any[];
  documents?:   any[];

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
  report:   MGDReport;
  runtimeMs: number;
  steps: {
    findingsCount:       number;
    rootCauseCount:      number;
    recommendationCount: number;
    benchmarkCount:      number;
    healthScore:         number;
    healthScoreSource:   "provided" | "estimated";
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

  const sF = Array.isArray(findings)   ? findings.filter(f => f != null)  : [];
  const sRC = Array.isArray(rootCauses) ? rootCauses.filter(r => r != null) : [];
  const sBM = Array.isArray(benchmarks) ? benchmarks.filter(b => b != null) : [];

  // Findings
  for (const f of sF) {
    if      (f.severity === "CRITICAL") score -= 10;
    else if (f.severity === "HIGH")     score -= 5;
    else if (f.severity === "MEDIUM")   score -= 2;
  }

  // Root causes
  for (const rc of sRC) {
    if      (rc.severity === "CRITICAL") score -= 8;
    else if (rc.severity === "HIGH")     score -= 4;
  }

  // Benchmarks
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
export async function runMGDPipeline(params: MGDRunParams | null | undefined): Promise<MGDPipelineResult> {
  const startedAt = Date.now();

  const empty = (): MGDPipelineResult => ({
    report:    composeMGDReport(null),
    runtimeMs: Date.now() - startedAt,
    steps: { findingsCount:0, rootCauseCount:0, recommendationCount:0, benchmarkCount:0, healthScore:0, healthScoreSource:"estimated" },
  });

  try {
    if (params == null) {
      console.log("[MGD][PIPELINE] runMGDPipeline — called with null/undefined params, returning empty report");
      return empty();
    }

    const {
      clientName,
      industry,
      metrics = {},
    } = params;

    const transactions = Array.isArray(params.transactions) ? params.transactions.filter(t => t != null) : [];
    const documents    = Array.isArray(params.documents)    ? params.documents.filter(d => d != null)    : [];

    console.log(
      `[MGD][PIPELINE] runMGDPipeline START — ` +
      `client="${clientName ?? "unknown"}", ` +
      `industry="${industry ?? "unspecified"}", ` +
      `transactions=${transactions.length}, ` +
      `documents=${documents.length}`,
    );

    // ── STEP 1: Findings ────────────────────────────────────────────────────
    let findings: OperationalFinding[] = [];
    try {
      findings = generateOperationalFindings({ transactions, documents, industry });
      console.log(`[MGD][PIPELINE] STEP 1 — findings=${findings.length}`);
    } catch (err) {
      console.error("[MGD][PIPELINE] STEP 1 (findings) failed:", err);
    }

    // ── STEP 2: Root Causes ─────────────────────────────────────────────────
    let rootCauses: RootCause[] = [];
    try {
      rootCauses = generateRootCauses({ findings, industry });
      console.log(`[MGD][PIPELINE] STEP 2 — rootCauses=${rootCauses.length}`);
    } catch (err) {
      console.error("[MGD][PIPELINE] STEP 2 (rootCauses) failed:", err);
    }

    // ── STEP 3: Recommendations ─────────────────────────────────────────────
    let recommendations: OperationalRecommendation[] = [];
    try {
      recommendations = generateOperationalRecommendations({ findings, rootCauses, industry });
      console.log(`[MGD][PIPELINE] STEP 3 — recommendations=${recommendations.length}`);
    } catch (err) {
      console.error("[MGD][PIPELINE] STEP 3 (recommendations) failed:", err);
    }

    // ── STEP 4: Benchmarks ──────────────────────────────────────────────────
    let benchmarks: BenchmarkResult[] = [];
    try {
      benchmarks = generateBenchmarkResults({ metrics, industry });
      console.log(`[MGD][PIPELINE] STEP 4 — benchmarks=${benchmarks.length}`);
    } catch (err) {
      console.error("[MGD][PIPELINE] STEP 4 (benchmarks) failed:", err);
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
      console.error("[MGD][PIPELINE] STEP 6 (narrative) failed:", err);
      narrative = generateExecutiveNarrative({ findings:[], rootCauses:[], recommendations:[] });
    }

    // ── STEP 7: Report Composition ──────────────────────────────────────────
    let report: MGDReport;
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
      });
      console.log(`[MGD][PIPELINE] STEP 7 — report composed (version=${report.metadata.reportVersion})`);
    } catch (err) {
      console.error("[MGD][PIPELINE] STEP 7 (report composition) failed:", err);
      report = composeMGDReport(null);
    }

    const runtimeMs = Date.now() - startedAt;

    console.log(
      `[MGD][PIPELINE] COMPLETE — ` +
      `runtime=${runtimeMs}ms, ` +
      `findings=${findings.length}, ` +
      `rootCauses=${rootCauses.length}, ` +
      `recommendations=${recommendations.length}, ` +
      `benchmarks=${benchmarks.length}, ` +
      `healthScore=${operationalHealthScore} (${healthScoreSource})`,
    );

    return {
      report,
      runtimeMs,
      steps: {
        findingsCount:       findings.length,
        rootCauseCount:      rootCauses.length,
        recommendationCount: recommendations.length,
        benchmarkCount:      benchmarks.length,
        healthScore:         operationalHealthScore,
        healthScoreSource,
      },
    };
  } catch (err) {
    const runtimeMs = Date.now() - startedAt;
    console.error(`[MGD][PIPELINE] FATAL — runtime=${runtimeMs}ms, error:`, err);
    return empty();
  }
}
