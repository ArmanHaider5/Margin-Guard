export interface BenchmarkResult {
  kpi: string;
  actual: number;
  benchmark: number;
  unit: string;
  severity: "Normal" | "High" | "Critical";
}

export interface BenchmarkEvaluation {
  benchmarkResults: BenchmarkResult[];
}

function evaluateSeverity(actual: number, target: number, isInverted: boolean): "Normal" | "High" | "Critical" {
  if (isInverted) {
    if (actual >= target) return "Normal";
    if (actual < target * 0.67) return "Critical";
    return "High";
  }

  if (actual <= target) return "Normal";
  if (actual > target * 1.5) return "Critical";
  return "High";
}

const INVERTED_KPIS = new Set(["otd", "oee", "yield", "first_pass_yield"]);

export function evaluateIndustryBenchmarks(
  kpiData: Record<string, number>,
  benchmarks: Record<string, { target: number; unit: string }>
): BenchmarkEvaluation {
  const benchmarkResults: BenchmarkResult[] = [];

  for (const [id, actual] of Object.entries(kpiData || {})) {
    const key = id.toLowerCase().replace(/ /g, "_");
    const bench = benchmarks?.[key];
    if (!bench) continue;

    const actualNum = typeof actual === "number" ? actual : parseFloat(actual as any);
    if (isNaN(actualNum)) continue;

    const isInverted = INVERTED_KPIS.has(key);
    const severity = evaluateSeverity(actualNum, bench.target, isInverted);

    benchmarkResults.push({
      kpi: key,
      actual: actualNum,
      benchmark: bench.target,
      unit: bench.unit,
      severity,
    });
  }

  console.log("📊 INDUSTRY BENCHMARKS EVALUATED");

  return { benchmarkResults };
}
