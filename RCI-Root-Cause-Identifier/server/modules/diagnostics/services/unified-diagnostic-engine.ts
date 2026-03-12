import { buildRootCauseTree } from "../engines/root-cause-tree-engine";
import { buildCausalChains } from "../engines/causal-chain-engine";
import { detectRootCausePatterns } from "../engines/root-cause-pattern-engine";
import { evaluateIndustryBenchmarks } from "../engines/industry-benchmark-engine";
import { calculateOperationalHealthScore } from "../engines/operational-health-score-engine";
import { estimateCostSavings } from "../engines/cost-saving-engine";
import { generateTransformationRoadmap } from "../engines/transformation-roadmap-engine";
import { generateConsultingNarrative } from "../engines/consulting-narrative-engine";
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

  const industryModel = (industryRegistry as any)[industry];

  if (!industryModel) {
    throw new Error("Industry model not found: " + industry);
  }

  const financialImpact = estimateFinancialImpact(signals);

  const rootCauseTree = buildRootCauseTree(
    baseFindings
  );

  const rootCauses = baseFindings;

  const confidenceScores = calculateRootCauseConfidence(rootCauses);

  const causalChains = buildCausalChains(
    signals,
    rootCauses
  );

  const patterns = detectRootCausePatterns(signals);

  const benchmarks = evaluateIndustryBenchmarks(
    kpiData,
    industryModel.benchmarks
  );

  const healthScore = calculateOperationalHealthScore(
    rootCauses,
    benchmarks.benchmarkResults
  );

  const savings = estimateCostSavings(rootCauseTree, causalChains);

  const roadmap = generateTransformationRoadmap(
    rootCauseTree.primaryCause
  );

  const narrative = generateConsultingNarrative(
    rootCauseTree,
    causalChains
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
    financialImpact
  };

  logDiagnosticTrace({
    signals,
    rootCauses,
    causalChains,
    recommendations: savings || []
  });

  return {
    findings: baseFindings,
    mgdAnalysis
  };
}
