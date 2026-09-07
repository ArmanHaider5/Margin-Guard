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
import type { EvidenceSufficiency }       from "./evidence-sufficiency";
import { buildDiagnosticScope, attachRelevantFindings, type DiagnosticScopeItem, type BusinessConcernInput } from "./diagnostic-scope.js";
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
  /**
   * The canonical, stable identifier for this report — identical to the
   * `StoredMGDReport.id` it is persisted under (server/mgd/report-store.ts).
   * Populated by the /api/mgd/run route handler after persistence, so that
   * every consumer of the report object (sessionStorage, the Report Viewer,
   * Presentation Mode, PDF export) can reference the exact same persisted
   * record via GET /api/mgd/reports/:id — the single canonical handoff
   * mechanism, replacing ad hoc prop/sessionStorage passing. Optional and
   * absent on reports composed before this field existed, or on reports
   * that were never persisted (e.g. a failed save) — every consumer must
   * treat its absence as "no stable id available," never as an error.
   */
  id?: string;

  metadata: {
    generatedAt:              string;
    clientName?:              string;
    industry?:                string;
    operationalHealthScore?:  number;
    reportVersion:            string;

    /**
     * What evidence this report was actually built from — see
     * server/mgd/evidence-sufficiency.ts and
     * docs/MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md. Optional and absent on
     * reports composed before this field existed; every consumer must
     * treat its absence as "unknown / not assessed", never assume
     * SUFFICIENT and never attempt to reconstruct it retroactively.
     */
    evidence?: EvidenceSufficiency;
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
    notes: {
      title: string; category: string; observation: string;
      /** Consultant-selected diagnostic area, if any — see ConsultantNote in consultant-notes-engine.ts. */
      relatedArea?: string;
      /** Findings whose category matches relatedArea — display cross-reference only, never evidence. */
      relevantFindingIds?: string[];
    }[];
  };

  /**
   * Structured Diagnostic Scope — "what the client asked MGD to investigate"
   * (each business concern), kept explicitly distinct from evidence,
   * findings, and conclusions. See
   * docs/MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md. Additive: absent on reports
   * composed before this field existed, or when no business concerns were
   * supplied — every consumer must treat its absence as "no scope recorded,"
   * never as an error, and must never treat a scope item as evidence or as
   * a finding. `consultantInsights.operationalConcerns` (above) still also
   * carries business concerns, unchanged, for backward-compatible display —
   * this field is an additional, explicitly-labeled representation, not a
   * replacement. Each item may additionally carry consultant-selected
   * `selectedAreas` and a read-only `relevantFindingIds` cross-reference —
   * see docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md. Both are optional;
   * historical reports and reports with no selected areas simply omit them.
   */
  diagnosticScope?: DiagnosticScopeItem[];

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
    inventoryVisibilityScore:   number;
    eventReadinessScore:        number;
    dispatchReliabilityScore:   number;
    assetAccountabilityScore:   number;
    // Financial exposure
    averageEventValue:          number;
    estimatedRevenueExposure:   number;
    dispatchFailureExposure:    number;
    assetDamageExposure:        number;
    unrecoveredDamageValue:     number;
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
  businessConcerns?:       BusinessConcernInput[];
  eventSignals?:           EventSignals;
  evidence?:               EvidenceSufficiency;
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
  return [...rootCauses].sort((a, b) => {
    // Primary: Event Pack root causes before generic (rootCausePriority DESC)
    const pp = (b.rootCausePriority ?? 0) - (a.rootCausePriority ?? 0);
    if (pp !== 0) return pp;
    // Secondary: confidence DESC
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });
}

function sortRecommendations(recommendations: OperationalRecommendation[]): OperationalRecommendation[] {
  return [...recommendations].sort((a, b) => {
    // Primary: Event Pack recommendations before generic (recommendationPriority DESC)
    const rp = (b.recommendationPriority ?? 0) - (a.recommendationPriority ?? 0);
    if (rp !== 0) return rp;
    // Secondary: severity (CRITICAL > HIGH > MEDIUM > LOW)
    const pd = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
    if (pd !== 0) return pd;
    // Tertiary: confidence DESC
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

    // Risk level from critical finding count — but a health score of null
    // means there was no evidence to derive ANY finding from, so "0 critical
    // findings" here means "nothing was evaluated," not "evaluated and
    // controlled." Without this guard, an unassessed diagnostic would
    // report a reassuring "Controlled" risk level next to its "Not
    // Assessed" health label — the same class of mismatch this field exists
    // to prevent.
    const critCount = findings.filter(f => f?.severity === "CRITICAL").length;
    let operationalRiskLevel: string;
    if (operationalHealthScore == null) {
      operationalRiskLevel = "Not Assessed";
    } else if (critCount <= 1) {
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
      evidence,
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

    // generateConsultantInsights formats plain concern TEXT only — it has no
    // knowledge of, and no need for, consultant-selected diagnostic areas
    // (those are handled entirely by diagnostic-scope.ts below). Extract the
    // text from either the legacy plain-string form or the richer
    // {text, selectedAreas} form so that function's signature and logic stay
    // completely untouched.
    const businessConcernTexts: string[] = (businessConcerns ?? [])
      .map(c => typeof c === "string" ? c : (c?.text ?? ""))
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0);

    // Consultant insights — deterministic, never throws
    const hasConsultantInput = (consultantNotes && consultantNotes.length > 0)
      || businessConcernTexts.length > 0;
    const consultantInsights = hasConsultantInput
      ? {
          ...generateConsultantInsights({ consultantNotes, businessConcerns: businessConcernTexts }),
          notes: (consultantNotes ?? []).map(n => {
            // Read-only cross-reference, same spirit as
            // attachRelevantFindings for Diagnostic Scope below — a
            // consultant-selected relatedArea surfaces findings that share
            // its category, purely for display; it is never evidence and
            // never influences the note itself or any analytical output.
            const relevantFindingIds = n.relatedArea
              ? sortedFindings.filter(f => f.category === n.relatedArea).map(f => f.id)
              : undefined;
            return {
              title:       n.title,
              category:    n.category,
              observation: n.observation,
              relatedArea: n.relatedArea,
              ...(relevantFindingIds && relevantFindingIds.length > 0 ? { relevantFindingIds } : {}),
            };
          }),
        }
      : undefined;

    // Structured Diagnostic Scope — reads only businessConcerns and the
    // already-computed report-level evidence.level; never recomputes
    // evidence, never touches findings/root causes/recommendations/
    // benchmarks/health score. See diagnostic-scope.ts and
    // docs/MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md and
    // docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md. attachRelevantFindings
    // is a separate, read-only, additive pass — it runs strictly AFTER the
    // full, unfiltered diagnostic already produced sortedFindings, and it
    // never changes which findings exist or their content (Model A —
    // scoping/display only, never analytical filtering).
    const scopeItemsRaw = buildDiagnosticScope(businessConcerns, evidence?.level);
    const scopeItems = attachRelevantFindings(scopeItemsRaw, sortedFindings);
    const diagnosticScope = scopeItems.length > 0 ? scopeItems : undefined;

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
        evidence,
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
      diagnosticScope,
      // Only included when there was actually a dispatch-shaped record to
      // measure (eventSignals.assessed) — omitted, not fabricated as a
      // "perfect 100/0%" block, when there was nothing to measure. Mirrors
      // the same "included only when there's something to say" pattern
      // already used above for industryInsights/consultantInsights.
      eventDiagnostics: eventSignals?.assessed ? {
        dispatchesAnalysed:       eventSignals.totalDispatches,
        dispatchFailureRate:      eventSignals.dispatchFailureRate,
        dispatchDelayRate:        eventSignals.dispatchDelayRate,
        averageDelayMinutes:      eventSignals.averageDelayMinutes,
        missingItemRate:          eventSignals.missingItemRate,
        substitutionRate:         eventSignals.substitutionRate,
        damageEvents:             eventSignals.totalDamageEvents,
        damageRecoveryRate:       eventSignals.damageRecoveryRate,
        unrecoveredDamageRate:    eventSignals.unrecoveredDamageRate,
        inventoryVisibilityScore:   eventSignals.inventoryVisibilityScore,
        eventReadinessScore:        eventSignals.eventReadinessScore,
        dispatchReliabilityScore:   eventSignals.dispatchReliabilityScore,
        assetAccountabilityScore:   eventSignals.assetAccountabilityScore,
        averageEventValue:          eventSignals.averageEventValue,
        estimatedRevenueExposure:   eventSignals.estimatedRevenueExposure,
        dispatchFailureExposure:    eventSignals.dispatchFailureExposure,
        assetDamageExposure:        eventSignals.assetDamageExposure,
        unrecoveredDamageValue:     eventSignals.unrecoveredDamageValue,
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
      `consultantConcerns=${consultantInsights?.operationalConcerns.length ?? 0}, ` +
      `diagnosticScope=${diagnosticScope?.length ?? 0}`,
    );
    console.log(`[MGD][REPORT]   Health: ${visualMetrics.operationalHealthLabel} | Risk: ${visualMetrics.operationalRiskLevel} | Evidence: ${evidence?.level ?? "unknown"}`);
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
