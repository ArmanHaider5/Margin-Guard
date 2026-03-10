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

const benchmarks: Record<string, { target: number; unit: string }> = {
  downtime: { target: 6, unit: "hours/week" },
  overtime: { target: 5, unit: "% workforce" },
  otd: { target: 95, unit: "%" },
  scrap_rate: { target: 2, unit: "%" },
  rework_rate: { target: 3, unit: "%" },
};

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

const INVERTED_KPIS = new Set(["otd"]);

export function evaluateIndustryBenchmarks(detectedKpis: any[]): BenchmarkEvaluation {
  const benchmarkResults: BenchmarkResult[] = [];

  for (const kpi of detectedKpis || []) {
    const id = (kpi.kpiId || kpi.id || "").toLowerCase().replace(/ /g, "_");
    const bench = benchmarks[id];
    if (!bench) continue;

    const actual = typeof kpi.value === "number" ? kpi.value : parseFloat(kpi.value);
    if (isNaN(actual)) continue;

    const isInverted = INVERTED_KPIS.has(id);
    const severity = evaluateSeverity(actual, bench.target, isInverted);

    benchmarkResults.push({
      kpi: id,
      actual,
      benchmark: bench.target,
      unit: bench.unit,
      severity,
    });
  }

  console.log("📊 INDUSTRY BENCHMARKS EVALUATED");

  return { benchmarkResults };
}
