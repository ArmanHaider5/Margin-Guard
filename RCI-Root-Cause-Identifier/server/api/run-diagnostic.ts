import { buildRootCauseTree } from "../diagnostics/root-cause-tree-engine";
import { buildCausalChains } from "../diagnostics/causal-chain-engine";
import { generateConsultingNarrative } from "../diagnostics/consulting-narrative-engine";
import { estimateCostSavings } from "../diagnostics/cost-saving-engine";
import { evaluateIndustryBenchmarks } from "../diagnostics/industry-benchmark-engine";
import { calculateOperationalHealthScore } from "../diagnostics/operational-health-score-engine";
import { detectRootCausePatterns } from "../diagnostics/root-cause-pattern-engine";
import { generateTransformationRoadmap } from "../diagnostics/transformation-roadmap-engine";
import { industryRegistry } from "../industry-models/industry-registry";

export async function runMGDDiagnostic(industry: string, signals: string[], kpiData: any) {
  const industryModel = (industryRegistry as any)[industry];

  if (!industryModel) {
    throw new Error("Industry model not found");
  }

  const rootCauseTree = buildRootCauseTree(signals);

  const causalChains = buildCausalChains(signals, rootCauseTree.findings || []);

  const patterns = detectRootCausePatterns(signals);

  const benchmarks = evaluateIndustryBenchmarks(kpiData);

  const healthScore = calculateOperationalHealthScore(
    rootCauseTree.findings || [],
    benchmarks.benchmarkResults
  );

  const narrative = generateConsultingNarrative(rootCauseTree, causalChains);

  const savings = estimateCostSavings(rootCauseTree, causalChains);

  const roadmap = generateTransformationRoadmap(rootCauseTree.primary);

  return {
    healthScore,
    rootCauseTree,
    causalChains,
    patterns,
    benchmarks,
    savings,
    roadmap,
    narrative
  };
}
