import { ManufacturingRootCause } from "../industries/manufacturing-root-causes";
import { NormalizedSignal } from "../signals/signal-normalizer";
import { DiagnosticChain } from "../industries/manufacturing-diagnostic-chains";

export interface FinancialImpact {
  estimatedSeverity: "low" | "moderate" | "high" | "critical";
  affectedCategories: string[];
  costDrivers: string[];
}

export interface Recommendation {
  action: string;
  priority: "immediate" | "short-term" | "medium-term";
  targetCategory: string;
  relatedRootCauseId: string;
}

export interface DiagnosisConfidence {
  score: number;
  level: "low" | "moderate" | "high";
  signalCoverage: number;
  chainMatchCount: number;
}

export interface ConsultingDiagnosticReport {
  primaryRootCause: ManufacturingRootCause;
  secondaryRootCauses: ManufacturingRootCause[];
  operationalSymptoms: string[];
  financialImpact: FinancialImpact;
  recommendations: Recommendation[];
  confidence: DiagnosisConfidence;
}

interface ConsultingDiagnosticInput {
  rootCauses: ManufacturingRootCause[];
  signals: NormalizedSignal[];
  kpis: string[];
  chains: DiagnosticChain[];
}

function estimateFinancialImpact(
  rootCauses: ManufacturingRootCause[],
  signals: NormalizedSignal[],
  kpis: string[]
): FinancialImpact {
  const categories = new Set(rootCauses.map(rc => rc.category));
  const affectedCategories = Array.from(categories);

  const costDrivers: string[] = [];
  const moneySignals = signals.filter(s => s.category === "Money");
  for (const ms of moneySignals) {
    costDrivers.push(ms.signalId);
  }

  const financialKpis = kpis.filter(k => {
    const lower = k.toLowerCase();
    return lower.includes("cost") || lower.includes("margin") || lower.includes("roi");
  });
  for (const fk of financialKpis) {
    if (!costDrivers.includes(fk)) {
      costDrivers.push(fk);
    }
  }

  let severityScore = 0;
  severityScore += Math.min(rootCauses.length, 5) * 2;
  severityScore += Math.min(signals.length, 10);
  severityScore += moneySignals.length * 3;
  severityScore += financialKpis.length * 2;

  const hasTier3 = rootCauses.some(rc => rc.tier === 3);
  if (hasTier3) severityScore += 5;

  let estimatedSeverity: FinancialImpact["estimatedSeverity"];
  if (severityScore >= 25) estimatedSeverity = "critical";
  else if (severityScore >= 15) estimatedSeverity = "high";
  else if (severityScore >= 8) estimatedSeverity = "moderate";
  else estimatedSeverity = "low";

  return { estimatedSeverity, affectedCategories, costDrivers };
}

function generateRecommendations(
  primary: ManufacturingRootCause,
  secondary: ManufacturingRootCause[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  recommendations.push({
    action: `Address root cause: ${primary.name}`,
    priority: "immediate",
    targetCategory: primary.category,
    relatedRootCauseId: primary.id
  });

  for (const rc of secondary) {
    const priority: Recommendation["priority"] =
      rc.tier === 1 ? "short-term" : "medium-term";

    recommendations.push({
      action: `Investigate and remediate: ${rc.name}`,
      priority,
      targetCategory: rc.category,
      relatedRootCauseId: rc.id
    });
  }

  return recommendations;
}

function calculateDiagnosisConfidence(
  rootCauses: ManufacturingRootCause[],
  signals: NormalizedSignal[],
  chains: DiagnosticChain[]
): DiagnosisConfidence {
  const signalIds = new Set(signals.map(s => s.signalId));

  let totalTriggers = 0;
  let matchedTriggers = 0;
  for (const rc of rootCauses) {
    for (const trigger of rc.triggers) {
      totalTriggers++;
      if (signalIds.has(trigger)) matchedTriggers++;
    }
  }

  const signalCoverage = totalTriggers > 0
    ? Math.round((matchedTriggers / totalTriggers) * 100)
    : 0;

  let chainMatchCount = 0;
  for (const chain of chains) {
    const matched = chain.signals.filter(s => signalIds.has(s)).length;
    if (matched >= 2) chainMatchCount++;
  }

  let score = 0;
  score += signalCoverage * 0.5;
  score += Math.min(chainMatchCount, 5) * 8;
  score += Math.min(signals.length, 15) * 1;
  score = Math.min(Math.round(score), 100);

  let level: DiagnosisConfidence["level"];
  if (score >= 70) level = "high";
  else if (score >= 40) level = "moderate";
  else level = "low";

  return { score, level, signalCoverage, chainMatchCount };
}

export function generateConsultingDiagnosticReport({
  rootCauses,
  signals,
  kpis,
  chains
}: ConsultingDiagnosticInput): ConsultingDiagnosticReport | null {
  if (rootCauses.length === 0) {
    return null;
  }

  const primary = rootCauses[0];
  const secondary = rootCauses.slice(1, 4);
  const symptoms = signals.map(s => s.signalId);

  const financialImpact = estimateFinancialImpact(rootCauses, signals, kpis);
  const recommendations = generateRecommendations(primary, secondary);
  const confidence = calculateDiagnosisConfidence(rootCauses, signals, chains);

  return {
    primaryRootCause: primary,
    secondaryRootCauses: secondary,
    operationalSymptoms: symptoms,
    financialImpact,
    recommendations,
    confidence
  };
}
