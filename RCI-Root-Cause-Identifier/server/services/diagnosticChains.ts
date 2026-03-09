export const diagnosticChains: Record<string, string[]> = {

  maintenance_failure_chain: [
    "pm_overdue",
    "maintenance_backlog",
    "machine_breakdown",
    "downtime",
    "overtime_spike"
  ],

  capacity_stress_chain: [
    "capacity_utilization_high",
    "line_bottleneck",
    "overtime_spike",
    "production_delay"
  ],

  quality_failure_chain: [
    "quality_drift",
    "defect_rate",
    "rework",
    "scrap_spike"
  ],

  supply_instability_chain: [
    "supplier_delay",
    "leadtime_increase",
    "material_shortage"
  ],

  workforce_fatigue_chain: [
    "overtime_spike",
    "extended_shift",
    "operator_fatigue",
    "operator_error"
  ]

};

export function detectDiagnosticChains(signals: string[]) {

  const detectedChains: { chain: string; strength: number }[] = [];

  Object.entries(diagnosticChains).forEach(([chainName, chainSignals]) => {

    const matches = chainSignals.filter(s => signals.includes(s));

    if (matches.length >= 2) {
      detectedChains.push({
        chain: chainName,
        strength: matches.length
      });
    }

  });

  return detectedChains;

}
