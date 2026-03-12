export function detectRootCausePatterns(signals: string[]) {
  const patterns: { pattern: string; description: string }[] = [];

  if (
    signals.includes("maintenance_overdue") &&
    signals.includes("machine_breakdown") &&
    signals.includes("downtime")
  ) {
    patterns.push({
      pattern: "Reactive Maintenance Culture",
      description: "Maintenance issues leading to breakdowns and downtime"
    });
  }

  if (
    signals.includes("inventory_shortage") &&
    signals.includes("production_reschedule") &&
    signals.includes("overtime")
  ) {
    patterns.push({
      pattern: "Production Planning Instability",
      description: "Unstable production scheduling due to material shortages"
    });
  }

  if (
    signals.includes("overtime") &&
    signals.includes("staff_fatigue") &&
    signals.includes("backlog")
  ) {
    patterns.push({
      pattern: "Workforce Overload",
      description: "Excessive workload causing operational inefficiency"
    });
  }

  return patterns;
}
