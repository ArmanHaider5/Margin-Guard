// ─────────────────────────────────────────────────────────────────────────────
// MGD REPORT COMPOSER
//
// Composes all MGD operational intelligence outputs into a unified executive
// report structure for rendering, export, and executive presentation.
//
// Design principles:
//   • No AI/LLM — pure data assembly and sorting.
//   • Never throws — top-level and per-section try/catch with safe fallbacks.
//   • All input arrays are sanitised (null elements removed) before composition.
//   • Sorting is applied consistently: findings (severity→confidence),
//     root causes (confidence), recommendations (priority→confidence),
//     benchmarks (status→confidence).
//   • reportVersion = "MGD-V1" — bump when schema shape changes.
// ─────────────────────────────────────────────────────────────────────────────

import type { OperationalFinding }        from "./findings-engine";
import type { RootCause }                 from "./root-cause-engine";
import type { OperationalRecommendation } from "./recommendation-engine";
import type { BenchmarkResult }           from "./benchmark-engine";
import type { ExecutiveNarrativeReport }  from "./executive-narrative-engine";
import type { EventSignals }              from "./event-signals";
import {
  generateIndustryInsights,
  type IndustryRule,
  type MaturityLevel,
} from "./industry-engine.js";
import {
  generateConsultantInsights,
  type ConsultantNote,
} from "./consultant-notes-engine.js";

// ── Constants ──────────────────────────────────────────────────────────────────

const REPORT_VERSION = "MGD-V1";

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1,
};

const BENCHMARK_STATUS_ORDER: Record<string, number> = {
  CRITICAL: 4, ELEVATED: 3, WATCHLIST: 2, HEALTHY: 1,
};

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1,
};

// ── Exported interfaces ────────────────────────────────────────────────────────

export interface MGDReport {
  metadata: {
    generatedAt:              string;
    clientName?:              string;
    industry?:                string;
    operationalHealthScore?:  number;
    reportVersion:            string;
  };

  summary: {
    criticalFindings:              number;
    highFindings:                  number;
    criticalRootCauses:            number;
    highPriorityRecommendations:   number;
    benchmarkAlerts:               number;
  };

  narrative:        ExecutiveNarrativeReport;

  findings:         OperationalFinding[];

  rootCauses:       RootCause[];

  recommendations:  OperationalRecommendation[];

  benchmarks:       BenchmarkResult[];

  visualMetrics: {
    operationalHealthLabel:   string;
    operationalRiskLevel:     string;
    benchmarkStatusBreakdown: {
      healthy:   number;
      watchlist: number;
      elevated:  number;
      critical:  number;
    };
  };

  industryInsights?: {
    maturityLevel:    MaturityLevel;
    rules:            IndustryRule[];
    topRisks:         IndustryRule[];   // HIGH + CRITICAL rules, desc by confidence
    topOpportunities: IndustryRule[];   // LOW + MEDIUM rules, desc by confidence
  };

  consultantInsights?: {
    executiveObservations: string[];
    operationalConcerns:   string[];
    notes:                 { title: string; category: string; observation: string }[];
  };

  eventDiagnostics?: {
    dispatchesAnalysed:       number;
    dispatchFailureRate:      number;
    dispatchDelayRate:        number;
    averageDelayMinutes:      number;
    missingItemRate:          number;
    substitutionRate:         number;
    damageEvents:             number;
    damageRecoveryRate:       number;
    unrecoveredDamageRate:    number;
    inventoryVisibilityScore: number;
    eventReadinessScore:      number;
  };
}

export interface ReportComposerParams {
  clientName?:             string;
  industry?:               string;
  findings:                OperationalFinding[];
  rootCauses:              RootCause[];
  recommendations:         OperationalRecommendation[];
  benchmarks:              BenchmarkResult[];
  narrative:               ExecutiveNarrativeReport;
  operationalHealthScore?: number;
  consultantNotes?:        ConsultantNote[];
  businessConcerns?:       string[];
  eventSignals?:           EventSignals;
}

// ── Sorting helpers ────────────────────────────────────────────────────────────

function sortFindings(findings: OperationalFinding[]): OperationalFinding[] {
  return [...findings].sort((a, b) => {
    // Primary: findingPriority DESC (EVENT_SPECIFIC=100 > INVENTORY_SPECIFIC=80 > GENERIC=50)
    const pd = (b.findingPriority ?? 0) - (a.findingPriority ?? 0);
    if (pd !== 0) return pd;
    // Secondary: confidence DESC
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });
}

function sortRootCauses(rootCauses: RootCause[]): RootCause[] {
  return [...rootCauses].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

function sortRecommendations(recommendations: OperationalRecommendation[]): OperationalRecommendation[] {
  return [...recommendations].sort((a, b) => {
    const pd = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
    if (pd !== 0) return pd;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });
}

function sortBenchmarks(benchmarks: BenchmarkResult[]): BenchmarkResult[] {
  return [...benchmarks].sort((a, b) => {
    const sd = (BENCHMARK_STATUS_ORDER[b.status] ?? 0) - (BENCHMARK_STATUS_ORDER[a.status] ?? 0);
    if (sd !== 0) return sd;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });
}

// ── Summary metrics ───────────────────────────────────────────────────────────

/**
 * Count key signal counts across findings, root causes, recommendations,
 * and benchmarks for the summary block.
 */
export function buildSummaryMetrics(
  findings:        OperationalFinding[],
  rootCauses:      RootCause[],
  recommendations: OperationalRecommendation[],
  benchmarks:      BenchmarkResult[],
): MGDReport["summary"] {
  try {
    const criticalFindings = findings.filter(f => f?.severity === "CRITICAL").length;
    const highFindings     = findings.filter(f => f?.severity === "HIGH").length;
    const criticalRootCauses = rootCauses.filter(rc => rc?.severity === "CRITICAL").length;
    const highPriorityRecommendations = recommendations.filter(
      r => r?.priority === "CRITICAL" || r?.priority === "HIGH",
    ).length;
    const benchmarkAlerts = benchmarks.filter(
      b => b?.status === "CRITICAL" || b?.status === "ELEVATED",
    ).length;

    return {
      criticalFindings,
      highFindings,
      criticalRootCauses,
      highPriorityRecommendations,
      benchmarkAlerts,
    };
  } catch (err) {
    console.error("[MGD][REPORT] buildSummaryMetrics error:", err);
    return {
      criticalFindings: 0,
      highFindings: 0,
      criticalRootCauses: 0,
      highPriorityRecommendations: 0,
      benchmarkAlerts: 0,
    };
  }
}

// ── Visual metrics ─────────────────────────────────────────────────────────────

/**
 * Classify health score into a label (4-band) and derive a risk level from
 * the count of critical findings.
 */
export function buildVisualMetrics(
  operationalHealthScore: number | undefined,
  findings:   OperationalFinding[],
  benchmarks: BenchmarkResult[],
): MGDReport["visualMetrics"] {
  try {
    // Health label
    let operationalHealthLabel: string;
    if (operationalHealthScore == null) {
      operationalHealthLabel = "Not Assessed";
    } else if (operationalHealthScore >= 80) {
      operationalHealthLabel = "Operationally Stable";
    } else if (operationalHealthScore >= 65) {
      operationalHealthLabel = "Moderate Operational Strain";
    } else if (operationalHealthScore >= 50) {
      operationalHealthLabel = "Elevated Operational Strain";
    } else {
      operationalHealthLabel = "Critical Operational Instability";
    }

    // Risk level from critical finding count
    const critCount = findings.filter(f => f?.severity === "CRITICAL").length;
    let operationalRiskLevel: string;
    if (critCount <= 1) {
      operationalRiskLevel = "Controlled";
    } else if (critCount <= 3) {
      operationalRiskLevel = "Elevated";
    } else {
      operationalRiskLevel = "High Risk";
    }

    // Benchmark breakdown
    const benchmarkStatusBreakdown = {
      healthy:   benchmarks.filter(b => b?.status === "HEALTHY").length,
      watchlist: benchmarks.filter(b => b?.status === "WATCHLIST").length,
      elevated:  benchmarks.filter(b => b?.status === "ELEVATED").length,
      critical:  benchmarks.filter(b => b?.status === "CRITICAL").length,
    };

    return { operationalHealthLabel, operationalRiskLevel, benchmarkStatusBreakdown };
  } catch (err) {
    console.error("[MGD][REPORT] buildVisualMetrics error:", err);
    return {
      operationalHealthLabel: "Not Assessed",
      operationalRiskLevel: "Controlled",
      benchmarkStatusBreakdown: { healthy: 0, watchlist: 0, elevated: 0, critical: 0 },
    };
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Compose all MGD intelligence outputs into a single normalised report object.
 * Suitable for UI rendering, PDF export, and executive presentation.
 * Never throws.
 */
export function composeMGDReport(params: ReportComposerParams | null | undefined): MGDReport {
  try {
    if (params == null) {
      console.log("[MGD][REPORT] composeMGDReport — called with null/undefined params, returning empty report");
      return buildEmptyReport();
    }

    const {
      clientName,
      industry,
      operationalHealthScore,
      narrative,
      consultantNotes,
      businessConcerns,
      eventSignals,
    } = params;

    // Sanitise arrays — remove null/undefined elements
    const findings        = (Array.isArray(params.findings)        ? params.findings        : []).filter((f): f is OperationalFinding        => f != null);
    const rootCauses      = (Array.isArray(params.rootCauses)      ? params.rootCauses      : []).filter((r): r is RootCause                 => r != null);
    const recommendations = (Array.isArray(params.recommendations) ? params.recommendations : []).filter((r): r is OperationalRecommendation  => r != null);
    const benchmarks      = (Array.isArray(params.benchmarks)      ? params.benchmarks      : []).filter((b): b is BenchmarkResult            => b != null);

    console.log(
      `[MGD][REPORT] composeMGDReport — ` +
      `client="${clientName ?? "unknown"}", ` +
      `industry="${industry ?? "unspecified"}", ` +
      `findings=${findings.length}, ` +
      `rootCauses=${rootCauses.length}, ` +
      `recommendations=${recommendations.length}, ` +
      `benchmarks=${benchmarks.length}, ` +
      `healthScore=${operationalHealthScore ?? "n/a"}`,
    );

    // Sort all arrays
    const sortedFindings        = sortFindings(findings);
    const sortedRootCauses      = sortRootCauses(rootCauses);
    const sortedRecommendations = sortRecommendations(recommendations);
    const sortedBenchmarks      = sortBenchmarks(benchmarks);

    // Build sub-sections
    const summary       = buildSummaryMetrics(sortedFindings, sortedRootCauses, sortedRecommendations, sortedBenchmarks);
    const visualMetrics = buildVisualMetrics(operationalHealthScore, sortedFindings, sortedBenchmarks);

    // Consultant insights — deterministic, never throws
    const hasConsultantInput = (consultantNotes && consultantNotes.length > 0)
      || (businessConcerns && businessConcerns.length > 0);
    const consultantInsights = hasConsultantInput
      ? {
          ...generateConsultantInsights({ consultantNotes, businessConcerns }),
          notes: (consultantNotes ?? []).map(n => ({
            title:       n.title,
            category:    n.category,
            observation: n.observation,
          })),
        }
      : undefined;

    // Industry insights — deterministic, never throws
    const insightsResult = generateIndustryInsights({
      industry,
      findings:   sortedFindings,
      rootCauses: sortedRootCauses,
      benchmarks: sortedBenchmarks,
      metrics:    operationalHealthScore != null
        ? { operationalHealthScore }
        : {},
    });
    const topRisks         = insightsResult.rules.filter(r => r.severity === "HIGH" || r.severity === "CRITICAL");
    const topOpportunities = insightsResult.rules.filter(r => r.severity === "LOW"  || r.severity === "MEDIUM");
    // Both sub-arrays inherit the descending-confidence sort from the pack evaluator

    const report: MGDReport = {
      metadata: {
        generatedAt:            new Date().toISOString(),
        clientName,
        industry,
        operationalHealthScore,
        reportVersion:          REPORT_VERSION,
      },
      summary,
      narrative,
      findings:        sortedFindings,
      rootCauses:      sortedRootCauses,
      recommendations: sortedRecommendations,
      benchmarks:      sortedBenchmarks,
      visualMetrics,
      industryInsights: {
        maturityLevel:    insightsResult.maturityLevel,
        rules:            insightsResult.rules,
        topRisks,
        topOpportunities,
      },
      consultantInsights,
      eventDiagnostics: eventSignals ? {
        dispatchesAnalysed:       eventSignals.totalDispatches,
        dispatchFailureRate:      eventSignals.dispatchFailureRate,
        dispatchDelayRate:        eventSignals.dispatchDelayRate,
        averageDelayMinutes:      eventSignals.averageDelayMinutes,
        missingItemRate:          eventSignals.missingItemRate,
        substitutionRate:         eventSignals.substitutionRate,
        damageEvents:             eventSignals.totalDamageEvents,
        damageRecoveryRate:       eventSignals.damageRecoveryRate,
        unrecoveredDamageRate:    eventSignals.unrecoveredDamageRate,
        inventoryVisibilityScore: eventSignals.inventoryVisibilityScore,
        eventReadinessScore:      eventSignals.eventReadinessScore,
      } : undefined,
    };

    // Log summary
    console.log(
      `[MGD][REPORT] Report composed — ` +
      `version=${REPORT_VERSION}, ` +
      `criticalFindings=${summary.criticalFindings}, ` +
      `criticalRootCauses=${summary.criticalRootCauses}, ` +
      `highPriorityRecs=${summary.highPriorityRecommendations}, ` +
      `benchmarkAlerts=${summary.benchmarkAlerts}, ` +
      `maturity=${insightsResult.maturityLevel}, ` +
      `industryRules=${insightsResult.rules.length} (risks=${topRisks.length} opps=${topOpportunities.length}), ` +
      `consultantObs=${consultantInsights?.executiveObservations.length ?? 0}, ` +
      `consultantConcerns=${consultantInsights?.operationalConcerns.length ?? 0}`,
    );
    console.log(`[MGD][REPORT]   Health: ${visualMetrics.operationalHealthLabel} | Risk: ${visualMetrics.operationalRiskLevel}`);
    console.log(
      `[MGD][REPORT]   Benchmarks — ` +
      `CRITICAL=${visualMetrics.benchmarkStatusBreakdown.critical}, ` +
      `ELEVATED=${visualMetrics.benchmarkStatusBreakdown.elevated}, ` +
      `WATCHLIST=${visualMetrics.benchmarkStatusBreakdown.watchlist}, ` +
      `HEALTHY=${visualMetrics.benchmarkStatusBreakdown.healthy}`,
    );

    return report;
  } catch (err) {
    console.error("[MGD][REPORT] composeMGDReport top-level error:", err);
    return buildEmptyReport();
  }
}

// ── Empty report fallback ─────────────────────────────────────────────────────

function buildEmptyReport(): MGDReport {
  const emptyNarrative: ExecutiveNarrativeReport = {
    executiveOverview:  { id: "executive-overview",  title: "Executive Overview",        content: "", priority: 1 },
    keyFindings:        { id: "key-findings",         title: "Key Operational Findings",  content: "", priority: 2 },
    rootCauseSummary:   { id: "root-cause-summary",  title: "Root Cause Analysis",       content: "", priority: 3 },
    operationalHealth:  { id: "operational-health",  title: "Operational Health",        content: "", priority: 4 },
    priorityActions:    { id: "priority-actions",    title: "Priority Actions",          content: "", priority: 5 },
    strategicDirection: { id: "strategic-direction", title: "Strategic Direction",       content: "", priority: 6 },
    finalConclusion:    { id: "final-conclusion",    title: "Conclusion",                content: "", priority: 7 },
    metadata: {
      generatedAt:         new Date().toISOString(),
      findingsCount:       0,
      rootCauseCount:      0,
      recommendationCount: 0,
    },
  };

  return {
    metadata: {
      generatedAt:   new Date().toISOString(),
      reportVersion: REPORT_VERSION,
    },
    summary: {
      criticalFindings:            0,
      highFindings:                0,
      criticalRootCauses:          0,
      highPriorityRecommendations: 0,
      benchmarkAlerts:             0,
    },
    narrative:        emptyNarrative,
    findings:         [],
    rootCauses:       [],
    recommendations:  [],
    benchmarks:       [],
    visualMetrics: {
      operationalHealthLabel:   "Not Assessed",
      operationalRiskLevel:     "Controlled",
      benchmarkStatusBreakdown: { healthy: 0, watchlist: 0, elevated: 0, critical: 0 },
    },
    industryInsights: {
      maturityLevel:    "FOUNDATIONAL",
      rules:            [],
      topRisks:         [],
      topOpportunities: [],
    },
  };
}
