import { buildRootCauseTree } from "../engines/root-cause-tree-engine";
import { buildCausalChains } from "../engines/causal-chain-engine";
import { detectRootCausePatterns } from "../engines/root-cause-pattern-engine";
import { evaluateIndustryBenchmarks } from "../engines/industry-benchmark-engine";
import { calculateOperationalHealthScore } from "../engines/operational-health-score-engine";
import { estimateCostSavings } from "../engines/cost-saving-engine";
import { generateTransformationRoadmap } from "../engines/transformation-roadmap-engine";
import { generateConsultingNarrative } from "../engines/consulting-narrative-engine";

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

  const rootCauseTree = buildRootCauseTree(signals);

  const causalChains = buildCausalChains(
    signals,
    rootCauseTree.findings || []
  );

  const patterns = detectRootCausePatterns(signals);

  const benchmarks = evaluateIndustryBenchmarks(kpiData);

  const healthScore = calculateOperationalHealthScore(
    rootCauseTree.findings || [],
    benchmarks.benchmarkResults
  );

  const savings = estimateCostSavings(rootCauseTree, causalChains);

  const roadmap = generateTransformationRoadmap(rootCauseTree.primary);

  const narrative = generateConsultingNarrative(rootCauseTree, causalChains);

  return {
    findings: baseFindings,
    rootCauseTree,
    causalChains,
    patterns,
    benchmarks,
    healthScore,
    savings,
    roadmap,
    narrative
  };
}
