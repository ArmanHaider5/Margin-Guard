import { buildRootCauseTree } from "../engines/root-cause-tree-engine";
import { buildCausalChains } from "../engines/causal-chain-engine";
import { detectRootCausePatterns } from "../engines/root-cause-pattern-engine";
import { evaluateIndustryBenchmarks } from "../engines/industry-benchmark-engine";
import { calculateOperationalHealthScore } from "../engines/operational-health-score-engine";
import { estimateCostSavings } from "../engines/cost-saving-engine";
import { generateTransformationRoadmap } from "../engines/transformation-roadmap-engine";
import { generateConsultingNarrative } from "../engines/consulting-narrative-engine";
import { generateNextActions } from "../engines/next-actions-engine";
import { industryRegistry } from "../../industries/industry-registry";
import { logDiagnosticTrace } from "../utils/diagnostic-trace-logger";
import { calculateRootCauseConfidence } from "../engines/root-cause-confidence-engine";
import { estimateFinancialImpact } from "../engines/financial-impact-engine";

export async function runUnifiedDiagnostic({
  industry,
  signals,
  kpiData,
  baseFindings
}: {
  industry: string;
  signals: string[];
  kpiData: any;
  baseFindings: any[];
}) {

  const INDUSTRY_KEY_MAP: Record<string, string> = {
    event_management:     "professionalServices",
    finance:              "professionalServices",
    construction:         "professionalServices",
    property_development: "professionalServices",
    oil_gas:              "manufacturing",
    hospitality:          "retail",
    hotels_airbnb:        "retail",
    fnb_full_service:     "retail",
    fnb_qsr:              "retail",
    fnb_fast_food:        "retail",
    fnb_franchise:        "retail",
    fnb_independent:      "retail",
    fmcg:                 "retail",
    food_beverage:        "manufacturing",
    automotive:           "manufacturing",
    other:                "professionalServices",
  };

  const registryKey = (industryRegistry as any)[industry]
    ? industry
    : INDUSTRY_KEY_MAP[industry] ?? "professionalServices";

  const industryModel = (industryRegistry as any)[registryKey];

  if (!industryModel) {
    throw new Error("Industry model not found: " + industry);
  }

  if (registryKey !== industry) {
    console.warn(`[UnifiedDiagnostic] No model for "${industry}" — falling back to "${registryKey}"`);
  }

  // ── Financial impact ─────────────────────────────────────────────────────
  const financialImpact = estimateFinancialImpact(signals, baseFindings);

  // ── Root cause tree ──────────────────────────────────────────────────────
  const rootCauseTree = buildRootCauseTree(baseFindings);
  const rootCauses = baseFindings;

  // ── Confidence scoring ───────────────────────────────────────────────────
  const confidenceScores = calculateRootCauseConfidence(rootCauses);

  // ── Causal chains ────────────────────────────────────────────────────────
  const causalChains = buildCausalChains(signals, rootCauses);

  // ── Pattern detection ────────────────────────────────────────────────────
  const patterns = detectRootCausePatterns(signals, rootCauses);

  // ── Industry benchmarks ──────────────────────────────────────────────────
  const benchmarks = evaluateIndustryBenchmarks(kpiData, industryModel.benchmarks);

  // ── Health score ─────────────────────────────────────────────────────────
  const healthScore = calculateOperationalHealthScore(rootCauses, benchmarks.benchmarkResults);

  // ── Cost savings ─────────────────────────────────────────────────────────
  const savings = estimateCostSavings(rootCauseTree, causalChains);

  // ── Transformation roadmap ───────────────────────────────────────────────
  // Pass findings so the roadmap engine can use category-based fallback
  const roadmap = generateTransformationRoadmap(rootCauseTree.primaryCause, rootCauses);

  // ── Consulting narrative + executive summary ─────────────────────────────
  // Pass findings and healthScore for richer, context-aware prose generation
  const narrative = generateConsultingNarrative(
    rootCauseTree,
    causalChains,
    rootCauses,
    healthScore,
  );

  // ── Recommended next actions ─────────────────────────────────────────────
  // Translate diagnosis into a prioritised 90-day action plan
  const nextActions = generateNextActions(
    rootCauses,
    causalChains,
    financialImpact,
    healthScore,
    patterns,
    roadmap,
  );

  const mgdAnalysis = {
    rootCauseTree,
    causalChains,
    patterns,
    benchmarks,
    healthScore,
    savings,
    roadmap,
    narrative,
    confidenceScores,
    financialImpact,
    nextActions,
  };

  logDiagnosticTrace({
    signals,
    rootCauses,
    causalChains,
    recommendations: Array.isArray(savings) ? savings : [],
  });

  return {
    findings: baseFindings,
    mgdAnalysis,
  };
}
