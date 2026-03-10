export interface ManufacturingRootCauseEntry {
  id: string;
  name: string;
  category: "Money" | "Manpower" | "Machinery" | "Materials";
  tier: "primary" | "secondary";
  triggers: string[];
  supportingSignals: string[];
  description: string;
}

export const manufacturingRootCauseLibrary: ManufacturingRootCauseEntry[] = [

  // ═══════════════════════════════════════════════════════════════
  // MACHINERY — Primary Tier-1 Causes
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-maintenance-reactive",
    name: "Reactive maintenance culture",
    category: "Machinery",
    tier: "primary",
    triggers: ["maintenance_backlog", "machine_breakdown"],
    supportingSignals: ["unplanned_downtime", "repair_activity", "spare_parts_cost"],
    description: "Maintenance occurs only after equipment fails rather than through scheduled preventive servicing, leading to repeated unplanned stoppages and higher repair costs."
  },

  {
    id: "mfg-maintenance-backlog",
    name: "Accumulated maintenance backlog",
    category: "Machinery",
    tier: "primary",
    triggers: ["maintenance_backlog", "pm_overdue"],
    supportingSignals: ["maintenance_overdue", "machine_breakdown", "downtime"],
    description: "Preventive maintenance tasks accumulate faster than the maintenance team can complete them, increasing equipment failure risk across the plant."
  },

  {
    id: "mfg-equipment-aging",
    name: "Aging equipment reducing reliability",
    category: "Machinery",
    tier: "primary",
    triggers: ["downtime", "machine_breakdown"],
    supportingSignals: ["oee_decline", "speed_loss", "wear_detected", "depreciation_impact"],
    description: "Old equipment breaks down more frequently and runs below rated speed, compounding production losses and increasing maintenance burden."
  },

  {
    id: "mfg-capacity-bottleneck",
    name: "Production capacity bottleneck",
    category: "Machinery",
    tier: "primary",
    triggers: ["capacity_constraint", "overtime_spike"],
    supportingSignals: ["otd_decline", "wip_congestion", "line_stoppage"],
    description: "One or more workstations constrain total throughput, forcing overtime and delaying customer deliveries."
  },

  {
    id: "mfg-line-balancing",
    name: "Poor production line balancing",
    category: "Machinery",
    tier: "primary",
    triggers: ["wip_congestion", "cycle_time_variance"],
    supportingSignals: ["speed_loss", "micro_stoppage", "operator_fatigue"],
    description: "Uneven workload distribution across workstations creates idle time at some stations and overload at others, reducing overall line efficiency."
  },

  {
    id: "mfg-changeover-inefficiency",
    name: "Excessive changeover time",
    category: "Machinery",
    tier: "primary",
    triggers: ["changeover_delay", "downtime"],
    supportingSignals: ["startup_loss", "speed_loss", "changeover_cost"],
    description: "Product changeovers take longer than necessary due to poor standardisation, missing tooling, or lack of SMED practices."
  },

  {
    id: "mfg-utilization-loss",
    name: "Low equipment utilization",
    category: "Machinery",
    tier: "primary",
    triggers: ["oee_decline", "asset_utilization_low"],
    supportingSignals: ["downtime", "speed_loss", "startup_loss"],
    description: "Equipment runs significantly below its rated capacity due to stoppages, speed losses, and quality defects reducing available productive time."
  },

  {
    id: "mfg-machine-utilization-imbalance",
    name: "Machine utilization imbalance across lines",
    category: "Machinery",
    tier: "primary",
    triggers: ["asset_utilization_low", "capacity_constraint"],
    supportingSignals: ["wip_congestion", "overtime_spike", "cycle_time_variance"],
    description: "Some production lines run at full capacity while others sit idle, indicating poor production scheduling and resource allocation."
  },

  {
    id: "mfg-microstoppages",
    name: "Frequent micro-stoppages",
    category: "Machinery",
    tier: "primary",
    triggers: ["micro_stoppage", "frequent_adjustments"],
    supportingSignals: ["oee_decline", "speed_loss", "operator_fatigue", "manual_intervention"],
    description: "Short repeated equipment stops caused by sensor faults, jams, or minor misfeeds that individually seem small but collectively consume significant productive time."
  },

  {
    id: "mfg-unplanned-downtime",
    name: "Chronic unplanned downtime",
    category: "Machinery",
    tier: "primary",
    triggers: ["unplanned_downtime", "downtime_spike"],
    supportingSignals: ["machine_breakdown", "maintenance_backlog", "repair_activity", "downtime_cost"],
    description: "Equipment fails without warning at a rate that disrupts production scheduling, causing missed deadlines and emergency repair costs."
  },

  // ═══════════════════════════════════════════════════════════════
  // MANPOWER — Primary Tier-1 Causes
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-workforce-overload",
    name: "Workforce overload and excessive overtime",
    category: "Manpower",
    tier: "primary",
    triggers: ["overtime_spike", "extended_shifts"],
    supportingSignals: ["operator_fatigue", "workload_imbalance", "overtime_cost", "overtime_refusal"],
    description: "Operators consistently work beyond standard hours to meet production targets, leading to fatigue, increased error rates, and rising overtime costs."
  },

  {
    id: "mfg-operator-fatigue",
    name: "Operator fatigue driving errors",
    category: "Manpower",
    tier: "primary",
    triggers: ["operator_fatigue", "operator_error"],
    supportingSignals: ["overtime_spike", "night_shift_fatigue", "safety_incident", "scrap"],
    description: "Physical and mental exhaustion from sustained workload causes operators to make mistakes that produce defects and safety incidents."
  },

  {
    id: "mfg-skill-gap",
    name: "Operator skill gaps",
    category: "Manpower",
    tier: "primary",
    triggers: ["skill_gap", "operator_error"],
    supportingSignals: ["training_gap", "new_operator_issue", "quality_deviation", "rework"],
    description: "Operators lack the technical competence to run equipment or processes correctly, resulting in quality defects and slower throughput."
  },

  {
    id: "mfg-training-gap",
    name: "Insufficient training programs",
    category: "Manpower",
    tier: "primary",
    triggers: ["training_gap", "skill_gap"],
    supportingSignals: ["new_operator_issue", "work_instruction_missing", "cross_training_gap", "training_cost_overrun"],
    description: "Training does not keep pace with workforce turnover or process changes, leaving operators unprepared for their assigned tasks."
  },

  {
    id: "mfg-supervision-gap",
    name: "Inadequate shop floor supervision",
    category: "Manpower",
    tier: "primary",
    triggers: ["supervision_gap", "discipline_issue"],
    supportingSignals: ["operator_error", "ppe_non_compliance", "shift_handover_issue", "morale_issue"],
    description: "Insufficient supervisor presence or capability on the shop floor allows process deviations, safety shortcuts, and quality lapses to go undetected."
  },

  // ═══════════════════════════════════════════════════════════════
  // MATERIALS — Primary Tier-1 Causes
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-material-shortage",
    name: "Chronic material shortages",
    category: "Materials",
    tier: "primary",
    triggers: ["material_shortage", "inventory_shortage"],
    supportingSignals: ["line_stoppage", "lead_time_increase", "supplier_late_delivery"],
    description: "Production regularly stops or slows because required raw materials or components are not available when needed."
  },

  {
    id: "mfg-supplier-delay",
    name: "Supplier delivery delays",
    category: "Materials",
    tier: "primary",
    triggers: ["supplier_late_delivery", "lead_time_increase"],
    supportingSignals: ["material_shortage", "supplier_capacity_issue", "inventory_shortage", "otd_decline"],
    description: "Key suppliers consistently deliver late, extending production lead times and forcing schedule adjustments."
  },

  {
    id: "mfg-quality-defect",
    name: "Incoming material quality defects",
    category: "Materials",
    tier: "primary",
    triggers: ["incoming_quality_failure", "component_defect"],
    supportingSignals: ["batch_rejection", "scrap", "rework", "quality_deviation"],
    description: "Raw materials or purchased components arrive out of specification, causing downstream defects, rework, and batch rejections."
  },

  {
    id: "mfg-high-scrap-rate",
    name: "High scrap rate",
    category: "Materials",
    tier: "primary",
    triggers: ["scrap", "scrap_rate_high"],
    supportingSignals: ["material_waste", "scrap_cost", "yield_loss", "quality_deviation"],
    description: "An excessive proportion of production output is scrapped due to process instability, material defects, or operator errors."
  },

  {
    id: "mfg-rework-cycle",
    name: "Persistent rework cycles",
    category: "Materials",
    tier: "primary",
    triggers: ["rework", "rework_rate_high"],
    supportingSignals: ["rework_cost", "quality_deviation", "cycle_time_variance", "wip_congestion"],
    description: "Defective output repeatedly returns through the production process for correction, consuming capacity and increasing costs."
  },

  // ═══════════════════════════════════════════════════════════════
  // MONEY — Primary Tier-1 Causes
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-margin-erosion",
    name: "Production margin erosion",
    category: "Money",
    tier: "primary",
    triggers: ["margin_erosion", "margin_pressure"],
    supportingSignals: ["cogs_increase", "scrap_cost", "overtime_cost", "rework_cost"],
    description: "Multiple operational inefficiencies compound to erode production margins, with costs rising faster than revenue."
  },

  {
    id: "mfg-energy-cost-spike",
    name: "Energy cost escalation",
    category: "Money",
    tier: "primary",
    triggers: ["energy_cost_spike", "high_production_cost"],
    supportingSignals: ["cost_overrun", "margin_pressure", "cogs_increase"],
    description: "Energy consumption per unit of output increases due to equipment inefficiency, extended run times, or rate increases."
  },

  {
    id: "mfg-maintenance-cost",
    name: "Escalating maintenance costs",
    category: "Money",
    tier: "primary",
    triggers: ["maintenance_cost_increase", "spare_parts_cost"],
    supportingSignals: ["repair_activity", "maintenance_backlog", "downtime_cost", "budget_overrun"],
    description: "Maintenance spending rises disproportionately due to aging equipment, reactive repair patterns, and increasing spare parts consumption."
  },

  {
    id: "mfg-capital-utilization",
    name: "Poor capital asset utilization",
    category: "Money",
    tier: "primary",
    triggers: ["asset_utilization_low", "roi_decline"],
    supportingSignals: ["depreciation_impact", "capacity_loss_cost", "oee_decline"],
    description: "Capital equipment generates insufficient return because it sits idle, runs below capacity, or produces excessive waste."
  },

  {
    id: "mfg-cost-structure",
    name: "Unfavorable production cost structure",
    category: "Money",
    tier: "primary",
    triggers: ["high_production_cost", "cogs_increase"],
    supportingSignals: ["labor_cost_ratio", "material_cost_increase", "overtime_cost", "productivity_loss_cost"],
    description: "The overall cost per unit of production is too high relative to market pricing, driven by labour, material, and overhead inefficiencies."
  }

];
