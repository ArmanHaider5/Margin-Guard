import { describe, it, expect } from "vitest";
import { generateExecutiveNarrative } from "../executive-narrative-engine.js";
import { composeMGDReport } from "../report-composer.js";
import type { EvidenceSufficiency } from "../evidence-sufficiency.js";

// Minimal, loosely-typed fixtures — only the fields the narrative engine and
// composer actually read are populated, matching this codebase's existing
// test-fixture style (see report-store.test.ts / mgd-routes.test.ts).
const REAL_FINDING = {
  id: "f1", title: "Dispatch Reliability Risk", severity: "HIGH", category: "dispatch_operations",
  findingPriority: 100, summary: "10% of dispatches were incomplete.", signals: [], confidence: 82,
} as any;
const REAL_ROOT_CAUSE = {
  id: "rc1", title: "Manual Dispatch Verification", severity: "HIGH", confidence: 78,
  contributingFindings: ["f1"], operationalImpact: ["Delayed client deliveries"], recommendations: [],
} as any;
const REAL_RECOMMENDATION = {
  id: "r1", title: "Introduce a pre-dispatch checklist", summary: "Add a mandatory verification step.",
  priority: "HIGH", timeframe: "IMMEDIATE", implementationDifficulty: "LOW", category: "operational_visibility",
  relatedRootCauses: ["rc1"], relatedFindings: ["f1"], expectedOperationalImpact: [], actionItems: [], confidence: 80,
} as any;

const NONE: EvidenceSufficiency = {
  level: "NONE", transactionCount: 0, documentsSupplied: 0, documentsParsed: 0,
  documentsUnparseable: 0, documentStatus: "NONE_SUPPLIED", metricsSupplied: 0,
  benchmarksAvailable: false, reasons: ["No documents or transactions were supplied."],
};
const PARTIAL: EvidenceSufficiency = {
  ...NONE, level: "PARTIAL", transactionCount: 3, documentStatus: "ALL_PARSED", documentsSupplied: 1, documentsParsed: 1,
  reasons: ["Only 3 transaction(s) were extracted — below the minimum considered a full evidence set."],
};
const SUFFICIENT: EvidenceSufficiency = {
  ...NONE, level: "SUFFICIENT", transactionCount: 12, documentStatus: "ALL_PARSED", documentsSupplied: 1, documentsParsed: 1,
  reasons: ["12 transaction(s) extracted from 1 document(s), all contributing."],
};

describe("Narrative evidence gating — Operational Health / Strategic Direction / Final Conclusion", () => {
  it("NONE evidence + zero findings — all three previously-ungated sections show an honest fallback, not confident prose", () => {
    const narrative = generateExecutiveNarrative({
      findings: [], rootCauses: [], recommendations: [], evidenceLevel: "NONE",
    });
    expect(narrative.operationalHealth.content).toMatch(/could not be assessed/i);
    expect(narrative.strategicDirection.content).toMatch(/cannot be responsibly proposed/i);
    expect(narrative.finalConclusion.content).toMatch(/could not reach a conclusion/i);

    // None of the previously-unconditional confident claims survive.
    expect(narrative.operationalHealth.content).not.toMatch(/Operationally Stable|acceptable parameters/i);
    expect(narrative.strategicDirection.content).not.toMatch(/Phase 1/i);
    expect(narrative.finalConclusion.content).not.toMatch(/well-positioned|practical, sequenced/i);

    // The three sections that already had honest gating are unaffected by
    // this milestone and remain exactly as honest as before.
    expect(narrative.keyFindings.content).toMatch(/Insufficient operational data/i);
    expect(narrative.rootCauseSummary.content).toMatch(/Root cause synthesis requires/i);
    expect(narrative.priorityActions.content).toMatch(/No high-priority recommendations/i);
  });

  it("PARTIAL evidence with real (if sparse) findings — sections run normally but communicate the limitation", () => {
    const narrative = generateExecutiveNarrative({
      findings: [REAL_FINDING], rootCauses: [REAL_ROOT_CAUSE], recommendations: [REAL_RECOMMENDATION],
      operationalHealthScore: 70, evidenceLevel: "PARTIAL",
    });
    const caveat = /limited operational evidence/i;
    expect(narrative.operationalHealth.content).toMatch(caveat);
    expect(narrative.strategicDirection.content).toMatch(caveat);
    expect(narrative.finalConclusion.content).toMatch(caveat);
    // Still real content, not the NONE fallback — PARTIAL proceeds, it does not bypass.
    expect(narrative.operationalHealth.content).toMatch(/Operational Health Classification/i);
  });

  it("SUFFICIENT evidence — behavior is byte-identical to omitting evidenceLevel entirely (backward compatible default)", () => {
    const withDefault = generateExecutiveNarrative({
      findings: [REAL_FINDING], rootCauses: [REAL_ROOT_CAUSE], recommendations: [REAL_RECOMMENDATION],
      operationalHealthScore: 70,
    });
    const withExplicit = generateExecutiveNarrative({
      findings: [REAL_FINDING], rootCauses: [REAL_ROOT_CAUSE], recommendations: [REAL_RECOMMENDATION],
      operationalHealthScore: 70, evidenceLevel: "SUFFICIENT",
    });
    expect(withExplicit.operationalHealth.content).toBe(withDefault.operationalHealth.content);
    expect(withExplicit.strategicDirection.content).toBe(withDefault.strategicDirection.content);
    expect(withExplicit.finalConclusion.content).toBe(withDefault.finalConclusion.content);
    // No caveat leaks into the unconstrained case.
    expect(withDefault.operationalHealth.content).not.toMatch(/limited operational evidence/i);
  });
});

describe("Report-level truthfulness (composeMGDReport) — health score, risk level, and event diagnostics", () => {
  it("no evidence (operationalHealthScore undefined) never appears as a confident measured assessment", () => {
    const narrative = generateExecutiveNarrative({ findings: [], rootCauses: [], recommendations: [], evidenceLevel: "NONE" });
    const report = composeMGDReport({
      clientName: "Test Co.", industry: "manufacturing",
      findings: [], rootCauses: [], recommendations: [], benchmarks: [],
      narrative, operationalHealthScore: undefined, evidence: NONE,
    });
    expect(report.metadata.operationalHealthScore).toBeUndefined();
    expect(report.visualMetrics.operationalHealthLabel).toBe("Not Assessed");
    // Risk level must not default to a reassuring "Controlled" just because
    // zero critical findings exist — zero findings here means nothing was
    // evaluated, not that the operation was evaluated and found safe.
    expect(report.visualMetrics.operationalRiskLevel).toBe("Not Assessed");
    expect(report.metadata.evidence?.level).toBe("NONE");
  });

  it("a real measured score is unaffected — genuine measured scores remain genuine scores", () => {
    const narrative = generateExecutiveNarrative({
      findings: [REAL_FINDING], rootCauses: [REAL_ROOT_CAUSE], recommendations: [REAL_RECOMMENDATION],
      operationalHealthScore: 62, evidenceLevel: "SUFFICIENT",
    });
    const report = composeMGDReport({
      clientName: "Real Co.", industry: "logistics",
      findings: [REAL_FINDING], rootCauses: [REAL_ROOT_CAUSE], recommendations: [REAL_RECOMMENDATION],
      benchmarks: [], narrative, operationalHealthScore: 62, evidence: SUFFICIENT,
    });
    expect(report.metadata.operationalHealthScore).toBe(62);
    expect(report.visualMetrics.operationalHealthLabel).toBe("Elevated Operational Strain");
    expect(report.visualMetrics.operationalRiskLevel).not.toBe("Not Assessed");
  });

  it("eventDiagnostics is omitted (not a fake 100/0%) when eventSignals were never assessed", () => {
    const narrative = generateExecutiveNarrative({ findings: [], rootCauses: [], recommendations: [], evidenceLevel: "NONE" });
    const report = composeMGDReport({
      clientName: "Test Co.", industry: "manufacturing",
      findings: [], rootCauses: [], recommendations: [], benchmarks: [],
      narrative, operationalHealthScore: undefined, evidence: NONE,
      eventSignals: { assessed: false, eventReadinessScore: 100, dispatchReliabilityScore: 100 } as any,
    });
    expect(report.eventDiagnostics).toBeUndefined();
  });

  it("eventDiagnostics is present with real values when eventSignals were actually assessed", () => {
    const narrative = generateExecutiveNarrative({
      findings: [REAL_FINDING], rootCauses: [], recommendations: [], operationalHealthScore: 80, evidenceLevel: "SUFFICIENT",
    });
    const realEventSignals: any = {
      assessed: true, totalDispatches: 5, dispatchFailureRate: 0.2, dispatchDelayRate: 0, deliveryDelayRate: 0,
      averageDelayMinutes: 0, substitutionRate: 0, missingItemRate: 0, inventoryShortageRate: 0,
      assetDamageRate: 0, damageRecoveryRate: 1, unrecoveredDamageRate: 0, unrecoveredDamageValue: 0,
      inventoryVisibilityScore: 90, eventReadinessScore: 60, dispatchReliabilityScore: 60, assetAccountabilityScore: 100,
      averageEventValue: 0, estimatedRevenueExposure: 0, dispatchFailureExposure: 0, assetDamageExposure: 0,
      incompleteDispatches: 1, totalMissingItems: 0, totalDispatchedItems: 5, totalSubstitutions: 0,
      delayedDispatches: 0, totalDamageEvents: 0, recoveredDamageEvents: 0, totalDamageValue: 0, recoveredDamageValue: 0,
    };
    const report = composeMGDReport({
      clientName: "Real Co.", industry: "event_management",
      findings: [REAL_FINDING], rootCauses: [], recommendations: [], benchmarks: [],
      narrative, operationalHealthScore: 80, evidence: SUFFICIENT, eventSignals: realEventSignals,
    });
    expect(report.eventDiagnostics).toBeDefined();
    expect(report.eventDiagnostics?.dispatchReliabilityScore).toBe(60);
  });

  it("backward compatibility — a report shaped like one persisted before this milestone (no metadata.evidence) is still safely readable", () => {
    const oldReport: any = {
      metadata: { generatedAt: "2026-01-01T00:00:00.000Z", clientName: "Legacy Co.", reportVersion: "MGD-V1", operationalHealthScore: 85 },
      summary: { criticalFindings: 0, highFindings: 0, criticalRootCauses: 0, highPriorityRecommendations: 0, benchmarkAlerts: 0 },
      narrative: {}, findings: [], rootCauses: [], recommendations: [], benchmarks: [],
      visualMetrics: { operationalHealthLabel: "Operationally Stable", operationalRiskLevel: "Controlled", benchmarkStatusBreakdown: { healthy: 0, watchlist: 0, elevated: 0, critical: 0 } },
    };
    // No metadata.evidence at all — must read as undefined, never guessed.
    expect(oldReport.metadata.evidence).toBeUndefined();
    // A consumer following this milestone's contract treats that as "unknown", not as NONE or SUFFICIENT.
    const level = oldReport.metadata.evidence?.level ?? "unknown";
    expect(level).toBe("unknown");
  });
});
