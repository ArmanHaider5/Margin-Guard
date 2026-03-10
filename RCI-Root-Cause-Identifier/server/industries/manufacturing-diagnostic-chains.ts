export interface DiagnosticChain {
  id: string;
  signals: string[];
  description: string;
}

export const manufacturingDiagnosticChains: DiagnosticChain[] = [

  {
    id: "maintenance_failure_chain",
    signals: ["maintenance_backlog", "machine_breakdown", "downtime", "repair_activity"],
    description: "Deferred maintenance accumulates until equipment fails, causing unplanned stoppages and emergency repairs."
  },

  {
    id: "capacity_stress_chain",
    signals: ["overtime_spike", "capacity_constraint", "otd_decline", "operator_fatigue"],
    description: "Production demand exceeds available capacity, forcing overtime that degrades delivery performance and operator effectiveness."
  },

  {
    id: "quality_breakdown_chain",
    signals: ["process_instability", "scrap", "rework", "quality_deviation"],
    description: "Unstable process conditions produce defective output, driving scrap and rework loops that consume capacity."
  },

  {
    id: "supplier_disruption_chain",
    signals: ["supplier_late_delivery", "lead_time_increase", "material_shortage", "inventory_shortage"],
    description: "Supplier delivery failures extend lead times and starve production of required materials."
  },

  {
    id: "inventory_misalignment_chain",
    signals: ["inventory_buildup", "inventory_shortage", "wip_congestion", "otd_decline"],
    description: "Poor inventory planning creates simultaneous surpluses and shortages, disrupting production flow and delivery commitments."
  },

  {
    id: "process_instability_chain",
    signals: ["frequent_adjustments", "micro_stoppage", "calibration_drift", "scrap_rate_high"],
    description: "Process parameters drift without detection, requiring constant adjustment and generating scrap between corrections."
  },

  {
    id: "operator_fatigue_chain",
    signals: ["overtime_spike", "extended_shifts", "operator_fatigue", "operator_error"],
    description: "Sustained overtime causes physical and mental fatigue, increasing error rates and quality defects."
  },

  {
    id: "tooling_degradation_chain",
    signals: ["tool_wear", "calibration_drift", "scrap", "rework"],
    description: "Worn tooling produces parts outside specification, causing scrap and rework until tools are replaced."
  },

  {
    id: "equipment_aging_chain",
    signals: ["maintenance_overdue", "machine_breakdown", "unplanned_downtime", "speed_loss"],
    description: "Aging equipment breaks down more frequently and runs below rated speed, compounding production losses."
  },

  {
    id: "material_quality_chain",
    signals: ["incoming_quality_failure", "component_defect", "scrap", "batch_rejection"],
    description: "Poor incoming material quality propagates through production, causing downstream defects and batch rejections."
  },

  {
    id: "skill_erosion_chain",
    signals: ["staff_turnover", "training_gap", "skill_gap", "operator_error"],
    description: "Experienced operators leave faster than replacements are trained, widening skill gaps and increasing errors."
  },

  {
    id: "cost_escalation_chain",
    signals: ["overtime_cost", "scrap_cost", "maintenance_cost_increase", "margin_erosion"],
    description: "Multiple operational inefficiencies compound into escalating costs that erode production margins."
  },

  {
    id: "changeover_loss_chain",
    signals: ["changeover_delay", "startup_loss", "downtime", "speed_loss"],
    description: "Extended changeovers followed by startup instability consume productive time and generate initial-run waste."
  },

  {
    id: "hydraulic_pneumatic_failure_chain",
    signals: ["hydraulic_pressure_loss", "pneumatic_failure", "machine_breakdown", "unplanned_downtime"],
    description: "Fluid power system degradation causes cascading equipment failures and production stoppages."
  },

  {
    id: "workforce_shortage_chain",
    signals: ["operator_shortage", "high_absenteeism", "overtime_spike", "workload_imbalance"],
    description: "Insufficient staffing forces remaining operators into overtime with uneven workload distribution."
  }

];
