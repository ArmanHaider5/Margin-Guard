import { buildRootCauseTree } from "../engines/root-cause-tree-engine";
import { buildCausalChains } from "../engines/causal-chain-engine";
import { generateConsultingNarrative } from "../engines/consulting-narrative-engine";
import { estimateCostSavings } from "../engines/cost-saving-engine";
import { evaluateIndustryBenchmarks } from "../engines/industry-benchmark-engine";
import { calculateOperationalHealthScore } from "../engines/operational-health-score-engine";
import { detectRootCausePatterns } from "../engines/root-cause-pattern-engine";
import { generateTransformationRoadmap } from "../engines/transformation-roadmap-engine";
import { industryRegistry } from "../industry-models/industry-registry";

export async function runMGDDiagnostic(industry: string, signals: string[], kpiData: any) {
  const industryModel = (industryRegistry as any)[industry];

  if (!industryModel) {
    throw new Error("Industry model not found");
  }

  const rootCauseTree = buildRootCauseTree(
    signals,
    industryModel.rootCauses,
    industryModel.mappings
  );

  // Flatten tree nodes for engines that need an array of scored root causes
  const allRootCauses = [
    rootCauseTree.primaryCause,
    ...rootCauseTree.secondaryCauses,
    ...rootCauseTree.contributingFactors,
  ].filter(Boolean);

  const causalChains = buildCausalChains(
    signals,
    allRootCauses
  );

  const patterns = detectRootCausePatterns(signals);

  const benchmarks = evaluateIndustryBenchmarks(
    kpiData,
    industryModel.benchmarks
  );

  const healthScore = calculateOperationalHealthScore(
    allRootCauses,
    benchmarks.benchmarkResults
  );

  const narrative = generateConsultingNarrative(rootCauseTree, causalChains);

  const savings = estimateCostSavings(rootCauseTree, causalChains);

  const roadmap = generateTransformationRoadmap(rootCauseTree.primaryCause);

  console.log("MGD Diagnostic Running");

  console.log(
    JSON.stringify(
      {
        healthScore,
        rootCauseTree,
        causalChains,
        benchmarks,
        savings,
        roadmap
      },
      null,
      2
    )
  );

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
