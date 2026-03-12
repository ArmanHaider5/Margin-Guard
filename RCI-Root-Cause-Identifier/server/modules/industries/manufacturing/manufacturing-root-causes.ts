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
    id: "mfg-pm-compliance-failure",
    name: "PM schedule non-compliance",
    category: "Machinery",
    tier: "secondary",
    triggers: ["pm_overdue", "maintenance_overdue"],
    supportingSignals: ["maintenance_backlog", "machine_breakdown"],
    description: "Preventive maintenance tasks are scheduled but consistently not executed on time, allowing equipment to degrade until failure."
  },
  {
    id: "mfg-maintenance-resource-shortage",
    name: "Insufficient maintenance resources",
    category: "Machinery",
    tier: "secondary",
    triggers: ["maintenance_backlog", "repair_activity"],
    supportingSignals: ["operator_shortage", "spare_parts_cost", "downtime"],
    description: "The maintenance team lacks enough technicians, tools, or budget to keep pace with preventive and corrective maintenance demand."
  },
  {
    id: "mfg-spare-parts-delay",
    name: "Spare parts availability delays",
    category: "Machinery",
    tier: "secondary",
    triggers: ["spare_parts_cost", "lead_time_increase"],
    supportingSignals: ["downtime", "repair_activity", "inventory_shortage"],
    description: "Critical spare parts are not stocked or take too long to procure, extending equipment downtime during repairs."
  },
  {
    id: "mfg-maintenance-scheduling-failure",
    name: "Maintenance scheduling conflicts",
    category: "Machinery",
    tier: "secondary",
    triggers: ["maintenance_backlog", "downtime"],
    supportingSignals: ["pm_overdue", "capacity_constraint", "overtime_spike"],
    description: "Production demands consistently override maintenance windows, pushing PM tasks into backlog and increasing breakdown risk."
  },
  {
    id: "mfg-breakdown-response-delay",
    name: "Slow breakdown response time",
    category: "Machinery",
    tier: "secondary",
    triggers: ["unplanned_downtime", "repair_activity"],
    supportingSignals: ["downtime_cost", "machine_breakdown", "operator_shortage"],
    description: "When equipment fails, the time to diagnose, source parts, and restore operation is excessive, amplifying production losses."
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
    id: "mfg-pm-task-overload",
    name: "PM task volume exceeds capacity",
    category: "Machinery",
    tier: "secondary",
    triggers: ["maintenance_backlog", "maintenance_overdue"],
    supportingSignals: ["pm_overdue", "workload_imbalance", "overtime_spike"],
    description: "The number of scheduled PM tasks exceeds what the maintenance team can complete within available windows."
  },
  {
    id: "mfg-maintenance-data-gap",
    name: "Incomplete maintenance records",
    category: "Machinery",
    tier: "secondary",
    triggers: ["maintenance_backlog", "pm_overdue"],
    supportingSignals: ["machine_breakdown", "traceability_gap"],
    description: "Missing or inconsistent maintenance logs prevent accurate tracking of PM compliance and failure patterns."
  },
  {
    id: "mfg-deferred-maintenance-risk",
    name: "Deferred maintenance risk accumulation",
    category: "Machinery",
    tier: "secondary",
    triggers: ["pm_overdue", "machine_breakdown"],
    supportingSignals: ["wear_detected", "maintenance_cost_increase", "unplanned_downtime"],
    description: "Repeatedly postponed maintenance creates compounding failure risk as multiple equipment systems degrade simultaneously."
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
    id: "mfg-obsolete-components",
    name: "Obsolete component sourcing difficulty",
    category: "Machinery",
    tier: "secondary",
    triggers: ["spare_parts_cost", "lead_time_increase"],
    supportingSignals: ["downtime", "machine_breakdown", "repair_activity"],
    description: "Replacement parts for aging equipment are discontinued or difficult to source, extending repair times and increasing costs."
  },
  {
    id: "mfg-reliability-degradation",
    name: "Progressive reliability degradation",
    category: "Machinery",
    tier: "secondary",
    triggers: ["wear_detected", "machine_breakdown"],
    supportingSignals: ["oee_decline", "unplanned_downtime", "calibration_drift"],
    description: "Equipment reliability deteriorates progressively as components wear beyond design life, increasing failure frequency."
  },
  {
    id: "mfg-speed-loss-aging",
    name: "Speed loss from worn mechanisms",
    category: "Machinery",
    tier: "secondary",
    triggers: ["speed_loss", "oee_decline"],
    supportingSignals: ["cycle_time_variance", "wear_detected", "motor_vibration"],
    description: "Worn mechanical components force equipment to run below rated speed to maintain stability, reducing throughput."
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
    id: "mfg-line-balancing-failure",
    name: "Line balancing failure at bottleneck",
    category: "Machinery",
    tier: "secondary",
    triggers: ["wip_congestion", "capacity_constraint"],
    supportingSignals: ["cycle_time_variance", "line_stoppage", "overtime_spike"],
    description: "The bottleneck workstation is not identified or addressed, causing upstream buildup and downstream starvation."
  },
  {
    id: "mfg-machine-throughput-constraint",
    name: "Machine throughput below requirement",
    category: "Machinery",
    tier: "secondary",
    triggers: ["capacity_constraint", "speed_loss"],
    supportingSignals: ["oee_decline", "otd_decline", "overtime_spike"],
    description: "Key equipment cannot achieve the throughput rate needed to meet production demand, creating a persistent capacity gap."
  },
  {
    id: "mfg-process-cycle-time-imbalance",
    name: "Process cycle time imbalance",
    category: "Machinery",
    tier: "secondary",
    triggers: ["cycle_time_variance", "wip_congestion"],
    supportingSignals: ["micro_stoppage", "speed_loss", "operator_fatigue"],
    description: "Cycle times vary significantly between workstations, causing idle time and work-in-progress accumulation at transitions."
  },
  {
    id: "mfg-workstation-overload",
    name: "Workstation overloading",
    category: "Machinery",
    tier: "secondary",
    triggers: ["capacity_constraint", "overtime_spike"],
    supportingSignals: ["equipment_overheating", "operator_fatigue", "machine_breakdown"],
    description: "Individual workstations are pushed beyond rated capacity to compensate for bottlenecks, accelerating wear and operator stress."
  },
  {
    id: "mfg-batch-size-inefficiency",
    name: "Batch size inefficiency",
    category: "Machinery",
    tier: "secondary",
    triggers: ["changeover_delay", "wip_congestion"],
    supportingSignals: ["inventory_buildup", "capacity_constraint", "startup_loss"],
    description: "Batch sizes are not optimised for the production system, causing excessive changeovers or inventory buildup at bottleneck stations."
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
    id: "mfg-takt-time-mismatch",
    name: "Takt time mismatch between stations",
    category: "Machinery",
    tier: "secondary",
    triggers: ["cycle_time_variance", "wip_congestion"],
    supportingSignals: ["speed_loss", "overtime_spike", "line_stoppage"],
    description: "Individual stations cannot match the required takt time, creating synchronisation failures across the production line."
  },
  {
    id: "mfg-work-element-imbalance",
    name: "Unequal work element distribution",
    category: "Machinery",
    tier: "secondary",
    triggers: ["wip_congestion", "operator_fatigue"],
    supportingSignals: ["cycle_time_variance", "workload_imbalance", "micro_stoppage"],
    description: "Manual work elements are unevenly distributed, overloading some operators while others wait."
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
    id: "mfg-changeover-preparation-gap",
    name: "Inadequate changeover preparation",
    category: "Machinery",
    tier: "secondary",
    triggers: ["changeover_delay", "startup_loss"],
    supportingSignals: ["downtime", "fixture_issue", "tool_wear"],
    description: "External preparation tasks are not completed before machine stops, extending changeover time unnecessarily."
  },
  {
    id: "mfg-tooling-availability",
    name: "Tooling and fixture unavailability",
    category: "Machinery",
    tier: "secondary",
    triggers: ["changeover_delay", "fixture_issue"],
    supportingSignals: ["tool_wear", "downtime", "tooling_cost"],
    description: "Required tools, dies, or fixtures are missing, damaged, or not staged at the machine when changeover begins."
  },
  {
    id: "mfg-startup-quality-loss",
    name: "Post-changeover startup quality loss",
    category: "Machinery",
    tier: "secondary",
    triggers: ["startup_loss", "scrap"],
    supportingSignals: ["quality_deviation", "changeover_delay", "calibration_drift"],
    description: "The first production run after changeover produces defective output until parameters stabilise, wasting material and time."
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
    id: "mfg-availability-loss",
    name: "Equipment availability loss",
    category: "Machinery",
    tier: "secondary",
    triggers: ["downtime", "unplanned_downtime"],
    supportingSignals: ["machine_breakdown", "changeover_delay", "oee_decline"],
    description: "Planned and unplanned stoppages reduce the proportion of scheduled time that equipment is actually available for production."
  },
  {
    id: "mfg-performance-loss",
    name: "Equipment performance rate loss",
    category: "Machinery",
    tier: "secondary",
    triggers: ["speed_loss", "micro_stoppage"],
    supportingSignals: ["oee_decline", "cycle_time_variance", "manual_intervention"],
    description: "Equipment runs but at reduced speed or with frequent minor stoppages, producing less output than its rated capacity."
  },
  {
    id: "mfg-quality-loss-oee",
    name: "OEE quality loss component",
    category: "Machinery",
    tier: "secondary",
    triggers: ["scrap", "rework"],
    supportingSignals: ["oee_decline", "yield_loss", "quality_deviation"],
    description: "Equipment produces output that fails quality checks, reducing the proportion of good units in the OEE calculation."
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
    id: "mfg-scheduling-allocation-gap",
    name: "Production scheduling allocation gap",
    category: "Machinery",
    tier: "secondary",
    triggers: ["asset_utilization_low", "wip_congestion"],
    supportingSignals: ["capacity_constraint", "overtime_spike", "management_decision_delay"],
    description: "Production orders are not distributed across available lines to balance utilisation, overloading some while underusing others."
  },
  {
    id: "mfg-product-mix-constraint",
    name: "Product-machine compatibility constraint",
    category: "Machinery",
    tier: "secondary",
    triggers: ["capacity_constraint", "changeover_delay"],
    supportingSignals: ["asset_utilization_low", "line_stoppage", "wip_congestion"],
    description: "Certain products can only run on specific machines, creating utilisation imbalances when demand mix shifts."
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
    id: "mfg-sensor-reliability-issue",
    name: "Sensor and detection reliability issues",
    category: "Machinery",
    tier: "secondary",
    triggers: ["sensor_failure", "micro_stoppage"],
    supportingSignals: ["frequent_adjustments", "plc_error", "alarm_frequency"],
    description: "Worn or poorly calibrated sensors trigger false stops, each requiring operator intervention to clear and restart."
  },
  {
    id: "mfg-material-feed-stoppage",
    name: "Material feed mechanism failures",
    category: "Machinery",
    tier: "secondary",
    triggers: ["material_feed_issue", "micro_stoppage"],
    supportingSignals: ["machine_jam", "manual_intervention", "speed_loss"],
    description: "Feed mechanisms jam or misalign, causing brief stops that require manual clearing before production can resume."
  },
  {
    id: "mfg-alarm-fatigue",
    name: "Alarm fatigue from nuisance alerts",
    category: "Machinery",
    tier: "secondary",
    triggers: ["alarm_frequency", "micro_stoppage"],
    supportingSignals: ["operator_fatigue", "manual_intervention", "speed_loss"],
    description: "Excessive nuisance alarms desensitise operators, slowing response times and allowing minor stoppages to persist longer."
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
  {
    id: "mfg-failure-pattern-undetected",
    name: "Undetected failure patterns",
    category: "Machinery",
    tier: "secondary",
    triggers: ["machine_breakdown", "unplanned_downtime"],
    supportingSignals: ["wear_detected", "motor_vibration", "noise_anomaly"],
    description: "Recurring failure modes are not analysed or tracked, preventing identification of root causes and predictive intervention."
  },
  {
    id: "mfg-electrical-system-failure",
    name: "Electrical and control system failures",
    category: "Machinery",
    tier: "secondary",
    triggers: ["electrical_fault", "plc_error"],
    supportingSignals: ["unplanned_downtime", "machine_breakdown", "sensor_failure"],
    description: "Electrical faults, PLC errors, or control system malfunctions cause sudden equipment shutdowns."
  },
  {
    id: "mfg-hydraulic-pneumatic-degradation",
    name: "Hydraulic and pneumatic system degradation",
    category: "Machinery",
    tier: "secondary",
    triggers: ["hydraulic_pressure_loss", "pneumatic_failure"],
    supportingSignals: ["leak_detected", "unplanned_downtime", "machine_breakdown"],
    description: "Fluid power systems degrade through leaks, contamination, or component wear, causing force loss and equipment failure."
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
    id: "mfg-overtime-dependency",
    name: "Structural overtime dependency",
    category: "Manpower",
    tier: "secondary",
    triggers: ["overtime_spike", "overtime_cost"],
    supportingSignals: ["extended_shifts", "operator_fatigue", "labor_cost_ratio"],
    description: "The production plan relies on overtime as standard capacity rather than exception, embedding excessive cost and fatigue risk."
  },
  {
    id: "mfg-staffing-shortage",
    name: "Chronic staffing shortage",
    category: "Manpower",
    tier: "secondary",
    triggers: ["operator_shortage", "recruitment_difficulty"],
    supportingSignals: ["overtime_spike", "workload_imbalance", "high_absenteeism"],
    description: "Headcount is persistently below the level required to staff production lines at standard hours."
  },
  {
    id: "mfg-production-schedule-instability",
    name: "Production schedule instability",
    category: "Manpower",
    tier: "secondary",
    triggers: ["overtime_spike", "workload_imbalance"],
    supportingSignals: ["management_decision_delay", "wip_congestion", "operator_fatigue"],
    description: "Frequent last-minute schedule changes force unplanned overtime and disrupt operator work-life balance."
  },
  {
    id: "mfg-shift-coverage-gap",
    name: "Shift coverage gaps",
    category: "Manpower",
    tier: "secondary",
    triggers: ["high_absenteeism", "operator_shortage"],
    supportingSignals: ["overtime_spike", "shift_handover_issue", "temp_worker_issue"],
    description: "Insufficient staff to cover all scheduled shifts forces remaining operators into extended hours or leaves lines understaffed."
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
    id: "mfg-night-shift-fatigue",
    name: "Night shift performance degradation",
    category: "Manpower",
    tier: "secondary",
    triggers: ["night_shift_fatigue", "operator_error"],
    supportingSignals: ["operator_fatigue", "safety_incident", "quality_deviation"],
    description: "Night shift operators experience higher fatigue and lower alertness, resulting in more errors and safety incidents than day shifts."
  },
  {
    id: "mfg-ergonomic-strain",
    name: "Ergonomic strain from workstation design",
    category: "Manpower",
    tier: "secondary",
    triggers: ["ergonomic_issue", "operator_fatigue"],
    supportingSignals: ["safety_incident", "high_absenteeism", "speed_loss"],
    description: "Poor workstation ergonomics causes physical strain that accelerates fatigue and increases injury risk."
  },
  {
    id: "mfg-break-schedule-inadequacy",
    name: "Inadequate rest and break scheduling",
    category: "Manpower",
    tier: "secondary",
    triggers: ["operator_fatigue", "extended_shifts"],
    supportingSignals: ["operator_error", "overtime_spike", "morale_issue"],
    description: "Rest breaks are insufficient or skipped under production pressure, preventing operators from recovering during shifts."
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
    id: "mfg-multi-skill-shortage",
    name: "Multi-skill and cross-training shortage",
    category: "Manpower",
    tier: "secondary",
    triggers: ["cross_training_gap", "skill_gap"],
    supportingSignals: ["operator_shortage", "workload_imbalance", "knowledge_loss"],
    description: "Operators are trained on only one station, preventing flexible redeployment when demand shifts or absenteeism occurs."
  },
  {
    id: "mfg-knowledge-retention-failure",
    name: "Knowledge retention failure",
    category: "Manpower",
    tier: "secondary",
    triggers: ["knowledge_loss", "staff_turnover"],
    supportingSignals: ["skill_gap", "new_operator_issue", "work_instruction_missing"],
    description: "Critical process knowledge leaves with departing operators and is not captured in documentation or training materials."
  },
  {
    id: "mfg-new-operator-integration",
    name: "New operator integration failure",
    category: "Manpower",
    tier: "secondary",
    triggers: ["new_operator_issue", "operator_error"],
    supportingSignals: ["training_gap", "scrap", "rework", "quality_deviation"],
    description: "New hires are placed on production before achieving competency, producing higher defect rates during their learning curve."
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
    id: "mfg-work-instruction-gap",
    name: "Missing or outdated work instructions",
    category: "Manpower",
    tier: "secondary",
    triggers: ["work_instruction_missing", "operator_error"],
    supportingSignals: ["training_gap", "quality_deviation", "process_instability"],
    description: "Standard operating procedures are missing, outdated, or inaccessible, forcing operators to rely on memory or guesswork."
  },
  {
    id: "mfg-training-effectiveness",
    name: "Training delivery ineffectiveness",
    category: "Manpower",
    tier: "secondary",
    triggers: ["training_gap", "operator_error"],
    supportingSignals: ["skill_gap", "new_operator_issue", "training_cost_overrun"],
    description: "Training is delivered but does not produce competent operators due to poor content, methods, or insufficient practice time."
  },
  {
    id: "mfg-process-change-training-lag",
    name: "Process change training lag",
    category: "Manpower",
    tier: "secondary",
    triggers: ["training_gap", "quality_deviation"],
    supportingSignals: ["process_instability", "operator_error", "rework"],
    description: "Process or equipment changes are implemented before operators are retrained, causing errors during the transition period."
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
  {
    id: "mfg-supervisor-span-overload",
    name: "Supervisor span of control overload",
    category: "Manpower",
    tier: "secondary",
    triggers: ["supervision_gap", "workload_imbalance"],
    supportingSignals: ["operator_error", "discipline_issue", "quality_deviation"],
    description: "Each supervisor is responsible for too many operators or stations, preventing adequate oversight and coaching."
  },
  {
    id: "mfg-shift-handover-failure",
    name: "Shift handover communication failure",
    category: "Manpower",
    tier: "secondary",
    triggers: ["shift_handover_issue", "communication_breakdown"],
    supportingSignals: ["operator_error", "quality_deviation", "process_instability"],
    description: "Critical information about machine status, quality issues, or work-in-progress is lost during shift transitions."
  },
  {
    id: "mfg-team-conflict-impact",
    name: "Team conflict affecting performance",
    category: "Manpower",
    tier: "secondary",
    triggers: ["team_conflict", "morale_issue"],
    supportingSignals: ["high_absenteeism", "staff_turnover", "supervision_gap"],
    description: "Interpersonal conflicts between team members disrupt collaboration and reduce productivity on the shop floor."
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
    id: "mfg-demand-forecast-error",
    name: "Demand forecasting inaccuracy",
    category: "Materials",
    tier: "secondary",
    triggers: ["inventory_shortage", "inventory_buildup"],
    supportingSignals: ["material_shortage", "wip_congestion", "otd_decline"],
    description: "Material procurement is based on inaccurate demand forecasts, causing alternating shortages and surpluses."
  },
  {
    id: "mfg-reorder-point-failure",
    name: "Reorder point and safety stock failure",
    category: "Materials",
    tier: "secondary",
    triggers: ["inventory_shortage", "material_shortage"],
    supportingSignals: ["line_stoppage", "inventory_count_discrepancy", "lead_time_increase"],
    description: "Reorder triggers and safety stock levels are set incorrectly or not maintained, allowing stock to run out before replenishment arrives."
  },
  {
    id: "mfg-inventory-accuracy-gap",
    name: "Inventory record inaccuracy",
    category: "Materials",
    tier: "secondary",
    triggers: ["inventory_count_discrepancy", "inventory_shortage"],
    supportingSignals: ["material_shortage", "receiving_error", "traceability_gap"],
    description: "System inventory records do not match physical stock, causing procurement decisions based on incorrect data."
  },
  {
    id: "mfg-single-source-dependency",
    name: "Single-source supplier dependency",
    category: "Materials",
    tier: "secondary",
    triggers: ["supplier_late_delivery", "material_shortage"],
    supportingSignals: ["supplier_capacity_issue", "lead_time_increase", "line_stoppage"],
    description: "Critical materials depend on a single supplier with no backup, creating supply chain fragility."
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
    id: "mfg-supplier-capacity-limit",
    name: "Supplier capacity limitation",
    category: "Materials",
    tier: "secondary",
    triggers: ["supplier_capacity_issue", "lead_time_increase"],
    supportingSignals: ["supplier_late_delivery", "material_shortage", "otd_decline"],
    description: "Supplier production capacity cannot meet volume requirements, especially during demand surges."
  },
  {
    id: "mfg-supplier-quality-inconsistency",
    name: "Supplier quality inconsistency",
    category: "Materials",
    tier: "secondary",
    triggers: ["incoming_quality_failure", "supplier_late_delivery"],
    supportingSignals: ["batch_rejection", "component_defect", "rework"],
    description: "Suppliers deliver materials that intermittently fail quality requirements, causing rejection and reorder delays."
  },
  {
    id: "mfg-logistics-disruption",
    name: "Inbound logistics disruption",
    category: "Materials",
    tier: "secondary",
    triggers: ["lead_time_increase", "supplier_late_delivery"],
    supportingSignals: ["freight_cost_spike", "material_shortage", "inventory_shortage"],
    description: "Transportation delays, customs holds, or logistics failures extend material delivery timelines beyond supplier lead times."
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
    id: "mfg-process-control-variation",
    name: "Process control parameter variation",
    category: "Materials",
    tier: "secondary",
    triggers: ["process_instability", "quality_deviation"],
    supportingSignals: ["scrap", "rework", "specification_deviation"],
    description: "Key process parameters drift outside control limits, producing non-conforming output between inspection intervals."
  },
  {
    id: "mfg-inspection-failure",
    name: "Incoming inspection failure",
    category: "Materials",
    tier: "secondary",
    triggers: ["incoming_quality_failure", "receiving_error"],
    supportingSignals: ["component_defect", "batch_rejection", "traceability_gap"],
    description: "Incoming inspection does not catch defective materials, allowing them to enter production and cause downstream failures."
  },
  {
    id: "mfg-specification-misalignment",
    name: "Specification misalignment with supplier",
    category: "Materials",
    tier: "secondary",
    triggers: ["specification_deviation", "component_defect"],
    supportingSignals: ["incoming_quality_failure", "quality_deviation", "customer_complaint"],
    description: "Material specifications are ambiguous or not aligned between buyer and supplier, causing acceptance disputes and quality issues."
  },
  {
    id: "mfg-machine-calibration-drift",
    name: "Machine calibration drift affecting quality",
    category: "Materials",
    tier: "secondary",
    triggers: ["calibration_drift", "quality_deviation"],
    supportingSignals: ["dimensional_deviation", "scrap", "rework_rate_high"],
    description: "Machine calibration drifts between intervals, producing parts that gradually move outside specification tolerances."
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
    id: "mfg-yield-loss-pattern",
    name: "Systematic yield loss pattern",
    category: "Materials",
    tier: "secondary",
    triggers: ["yield_loss", "scrap_rate_high"],
    supportingSignals: ["scrap", "material_waste", "process_instability"],
    description: "Yield loss follows identifiable patterns linked to specific machines, shifts, or material batches but is not analysed for root causes."
  },
  {
    id: "mfg-material-waste-excess",
    name: "Excessive material waste in process",
    category: "Materials",
    tier: "secondary",
    triggers: ["material_waste", "scrap"],
    supportingSignals: ["scrap_cost", "disposal_cost", "yield_loss"],
    description: "Production processes consume more material than engineering specifications require, through overcuts, spillage, or poor nesting."
  },
  {
    id: "mfg-defect-containment-failure",
    name: "Defect containment failure",
    category: "Materials",
    tier: "secondary",
    triggers: ["scrap_rate_high", "batch_rejection"],
    supportingSignals: ["customer_complaint", "warranty_cost", "traceability_gap"],
    description: "Defective products are not contained at the point of creation, spreading into downstream processes or reaching customers."
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
  {
    id: "mfg-rework-root-cause-gap",
    name: "Rework root cause not addressed",
    category: "Materials",
    tier: "secondary",
    triggers: ["rework_rate_high", "process_instability"],
    supportingSignals: ["rework", "quality_deviation", "scrap"],
    description: "Rework is treated as routine rather than investigated for root cause, allowing the same defect modes to persist."
  },
  {
    id: "mfg-rework-capacity-consumption",
    name: "Rework consuming production capacity",
    category: "Materials",
    tier: "secondary",
    triggers: ["rework", "capacity_constraint"],
    supportingSignals: ["overtime_spike", "wip_congestion", "rework_cost"],
    description: "Rework volume consumes significant production line capacity, reducing effective throughput for new production."
  },
  {
    id: "mfg-rework-traceability-gap",
    name: "Rework traceability and tracking gap",
    category: "Materials",
    tier: "secondary",
    triggers: ["rework", "traceability_gap"],
    supportingSignals: ["rework_rate_high", "inventory_count_discrepancy", "quality_deviation"],
    description: "Reworked items are not properly tracked through the system, creating inventory discrepancies and quality uncertainty."
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
    id: "mfg-hidden-cost-accumulation",
    name: "Hidden factory cost accumulation",
    category: "Money",
    tier: "secondary",
    triggers: ["cogs_increase", "margin_erosion"],
    supportingSignals: ["scrap_cost", "rework_cost", "downtime_cost", "overtime_cost"],
    description: "Costs of quality failures, rework, scrap, and unplanned downtime are not tracked separately and silently erode margins."
  },
  {
    id: "mfg-pricing-cost-disconnect",
    name: "Product pricing disconnected from actual cost",
    category: "Money",
    tier: "secondary",
    triggers: ["margin_pressure", "high_production_cost"],
    supportingSignals: ["cogs_increase", "material_cost_increase", "labor_cost_ratio"],
    description: "Product prices are based on outdated cost estimates, not reflecting current operational inefficiencies and input cost increases."
  },
  {
    id: "mfg-waste-cost-visibility",
    name: "Lack of waste cost visibility",
    category: "Money",
    tier: "secondary",
    triggers: ["scrap_cost", "rework_cost"],
    supportingSignals: ["margin_erosion", "quality_cost", "disposal_cost"],
    description: "The financial impact of production waste is not measured or reported, preventing informed cost reduction decisions."
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
    id: "mfg-energy-waste-equipment",
    name: "Energy waste from inefficient equipment",
    category: "Money",
    tier: "secondary",
    triggers: ["energy_cost_spike", "oee_decline"],
    supportingSignals: ["equipment_overheating", "high_production_cost", "depreciation_impact"],
    description: "Aging or poorly maintained equipment consumes more energy per unit of output than modern equivalents."
  },
  {
    id: "mfg-idle-energy-consumption",
    name: "Energy consumed during idle and standby",
    category: "Money",
    tier: "secondary",
    triggers: ["energy_cost_spike", "downtime"],
    supportingSignals: ["asset_utilization_low", "cost_overrun", "changeover_delay"],
    description: "Equipment continues consuming energy during idle periods, changeovers, and unplanned stoppages without producing output."
  },
  {
    id: "mfg-compressed-air-waste",
    name: "Compressed air system waste",
    category: "Money",
    tier: "secondary",
    triggers: ["compressed_air_issue", "energy_cost_spike"],
    supportingSignals: ["leak_detected", "cost_overrun", "maintenance_overdue"],
    description: "Compressed air leaks, pressure drops, and oversized systems waste energy, often one of the largest hidden utility costs."
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
    id: "mfg-emergency-repair-premium",
    name: "Emergency repair cost premium",
    category: "Money",
    tier: "secondary",
    triggers: ["maintenance_cost_increase", "unplanned_downtime"],
    supportingSignals: ["spare_parts_cost", "repair_activity", "downtime_cost"],
    description: "Emergency repairs cost significantly more than planned maintenance due to rush parts, overtime labour, and production penalties."
  },
  {
    id: "mfg-contractor-dependency-cost",
    name: "External contractor dependency cost",
    category: "Money",
    tier: "secondary",
    triggers: ["maintenance_cost_increase", "repair_activity"],
    supportingSignals: ["spare_parts_cost", "skill_gap", "budget_overrun"],
    description: "Lack of in-house maintenance capability forces reliance on expensive external contractors for routine and emergency repairs."
  },
  {
    id: "mfg-spare-parts-inventory-cost",
    name: "Spare parts inventory carrying cost",
    category: "Money",
    tier: "secondary",
    triggers: ["spare_parts_cost", "inventory_carrying_cost"],
    supportingSignals: ["maintenance_cost_increase", "inventory_buildup", "shelf_life_expiry"],
    description: "Overstocking spare parts ties up capital and risks obsolescence, while understocking extends downtime during breakdowns."
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
    id: "mfg-depreciation-vs-output",
    name: "Depreciation outpacing output value",
    category: "Money",
    tier: "secondary",
    triggers: ["depreciation_impact", "roi_decline"],
    supportingSignals: ["asset_utilization_low", "oee_decline", "capacity_loss_cost"],
    description: "Equipment depreciates on schedule regardless of output volume, making cost-per-unit unsustainable at low utilisation rates."
  },
  {
    id: "mfg-investment-timing-gap",
    name: "Capital investment timing misalignment",
    category: "Money",
    tier: "secondary",
    triggers: ["roi_decline", "capacity_constraint"],
    supportingSignals: ["asset_utilization_low", "budget_overrun", "management_decision_delay"],
    description: "Capital investments are made too early or too late relative to demand, creating either underutilised assets or capacity shortfalls."
  },

  {
    id: "mfg-cost-structure",
    name: "Unfavorable production cost structure",
    category: "Money",
    tier: "primary",
    triggers: ["high_production_cost", "cogs_increase"],
    supportingSignals: ["labor_cost_ratio", "material_cost_increase", "overtime_cost", "productivity_loss_cost"],
    description: "The overall cost per unit of production is too high relative to market pricing, driven by labour, material, and overhead inefficiencies."
  },
  {
    id: "mfg-labor-cost-productivity-gap",
    name: "Labour cost exceeding productivity gains",
    category: "Money",
    tier: "secondary",
    triggers: ["labor_cost_ratio", "overtime_cost"],
    supportingSignals: ["high_production_cost", "productivity_loss_cost", "workload_imbalance"],
    description: "Labour costs increase faster than productivity improvements, widening the gap between input cost and output value."
  },
  {
    id: "mfg-material-cost-escalation",
    name: "Material cost escalation",
    category: "Money",
    tier: "secondary",
    triggers: ["material_cost_increase", "cogs_increase"],
    supportingSignals: ["margin_pressure", "freight_cost_spike", "high_production_cost"],
    description: "Raw material and component costs rise due to market conditions, supplier pricing, or logistics costs without offsetting price adjustments."
  },
  {
    id: "mfg-overhead-absorption-failure",
    name: "Overhead absorption failure",
    category: "Money",
    tier: "secondary",
    triggers: ["high_production_cost", "capacity_loss_cost"],
    supportingSignals: ["asset_utilization_low", "downtime_cost", "cogs_increase"],
    description: "Fixed overhead costs are spread across fewer units than planned due to low utilisation, inflating per-unit costs."
  }

];
