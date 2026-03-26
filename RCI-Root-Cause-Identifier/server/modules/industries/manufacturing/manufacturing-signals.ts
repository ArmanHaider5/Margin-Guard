export interface ManufacturingSignal {
  id: string;
  category: "Machinery" | "Manpower" | "Materials" | "Money";
  phrases: string[];
}

export const manufacturingSignals: ManufacturingSignal[] = [

  // ═══════════════════════════════════════════════════════════════
  // MACHINERY SIGNALS
  // ═══════════════════════════════════════════════════════════════

  {
    id: "machine_breakdown",
    category: "Machinery",
    phrases: [
      "machine breakdown",
      "machine broke down",
      "equipment breakdown",
      "machine failure",
      "equipment malfunction",
      "machine malfunction",
      "sudden machine failure",
      "catastrophic failure"
    ]
  },
  {
    id: "machine_jam",
    category: "Machinery",
    phrases: [
      "machine jam",
      "machine jammed",
      "material jam",
      "feed jam",
      "paper jam",
      "product jam",
      "jam at station",
      "blockage in machine"
    ]
  },
  {
    id: "line_stoppage",
    category: "Machinery",
    phrases: [
      "line stoppage",
      "line stop",
      "line halt",
      "production line stopped",
      "production halt",
      "line shutdown",
      "production stoppage",
      "line down"
    ]
  },
  {
    id: "equipment_failure",
    category: "Machinery",
    phrases: [
      "equipment failure",
      "equipment fault",
      "machine fault",
      "equipment stall",
      "machine stall",
      "system failure",
      "functional failure",
      "component failure"
    ]
  },
  {
    id: "micro_stoppage",
    category: "Machinery",
    phrases: [
      "micro stoppage",
      "micro stop",
      "minor stoppage",
      "short stop",
      "brief stoppage",
      "intermittent stop",
      "recurring minor stop",
      "nuisance stop"
    ]
  },
  {
    id: "downtime",
    category: "Machinery",
    phrases: [
      "downtime",
      "machine downtime",
      "equipment downtime",
      "unplanned downtime",
      "planned downtime",
      "production downtime",
      "machine idle",
      "idle time",
      "lost production time"
    ]
  },
  {
    id: "downtime_spike",
    category: "Machinery",
    phrases: [
      "downtime spike",
      "downtime increase",
      "surge in downtime",
      "elevated downtime",
      "abnormal downtime",
      "excessive downtime",
      "downtime above target"
    ]
  },
  {
    id: "maintenance_overdue",
    category: "Machinery",
    phrases: [
      "maintenance overdue",
      "service overdue",
      "overdue maintenance",
      "maintenance past due",
      "missed maintenance",
      "skipped maintenance",
      "deferred maintenance",
      "maintenance delayed"
    ]
  },
  {
    id: "maintenance_backlog",
    category: "Machinery",
    phrases: [
      "maintenance backlog",
      "pm overdue",
      "preventive maintenance overdue",
      "maintenance queue",
      "outstanding work orders",
      "open work orders",
      "backlog of repairs",
      "deferred pm tasks"
    ]
  },
  {
    id: "pm_overdue",
    category: "Machinery",
    phrases: [
      "preventive maintenance overdue",
      "pm past due",
      "scheduled maintenance missed",
      "pm not completed",
      "pm compliance low",
      "preventive maintenance delayed",
      "pm backlog"
    ]
  },
  {
    id: "equipment_overheating",
    category: "Machinery",
    phrases: [
      "equipment overheating",
      "machine overheating",
      "overheating",
      "thermal alarm",
      "high temperature alarm",
      "motor overheating",
      "drive overheating",
      "heat buildup"
    ]
  },
  {
    id: "tool_wear",
    category: "Machinery",
    phrases: [
      "tool wear",
      "tooling wear",
      "worn tooling",
      "tool life exceeded",
      "tool degradation",
      "cutting tool worn",
      "die wear",
      "punch wear",
      "blade wear",
      "tool replacement needed"
    ]
  },
  {
    id: "sensor_failure",
    category: "Machinery",
    phrases: [
      "sensor failure",
      "sensor fault",
      "sensor malfunction",
      "faulty sensor",
      "sensor error",
      "detector failure",
      "proximity sensor fault",
      "sensor misreading"
    ]
  },
  {
    id: "hydraulic_pressure_loss",
    category: "Machinery",
    phrases: [
      "hydraulic pressure loss",
      "hydraulic leak",
      "low hydraulic pressure",
      "hydraulic failure",
      "hydraulic system fault",
      "oil pressure drop",
      "hydraulic line rupture",
      "hydraulic pump failure"
    ]
  },
  {
    id: "motor_vibration",
    category: "Machinery",
    phrases: [
      "motor vibration",
      "excessive vibration",
      "vibration alarm",
      "high vibration",
      "abnormal vibration",
      "machine vibration",
      "spindle vibration",
      "shaft vibration"
    ]
  },
  {
    id: "bearing_failure",
    category: "Machinery",
    phrases: [
      "bearing failure",
      "bearing worn",
      "bearing noise",
      "bearing replacement",
      "bearing damage",
      "bearing overheating",
      "bearing seized",
      "worn bearings"
    ]
  },
  {
    id: "unplanned_downtime",
    category: "Machinery",
    phrases: [
      "unplanned downtime",
      "unexpected downtime",
      "emergency stop",
      "unscheduled stoppage",
      "breakdown stop",
      "forced shutdown",
      "emergency shutdown",
      "surprise failure"
    ]
  },
  {
    id: "machine_reset",
    category: "Machinery",
    phrases: [
      "machine reset",
      "equipment reset",
      "system reset",
      "restart required",
      "machine reboot",
      "power cycle",
      "controller reset",
      "plc reset"
    ]
  },
  {
    id: "frequent_adjustments",
    category: "Machinery",
    phrases: [
      "frequent adjustments",
      "constant adjustment",
      "repeated setup",
      "frequent recalibration",
      "constant tweaking",
      "parameter adjustments",
      "machine needs adjusting",
      "ongoing corrections"
    ]
  },
  {
    id: "process_instability",
    category: "Machinery",
    phrases: [
      "process instability",
      "unstable process",
      "process variation",
      "process drift",
      "process out of control",
      "parameter drift",
      "inconsistent process",
      "erratic process"
    ]
  },
  {
    id: "changeover_delay",
    category: "Machinery",
    phrases: [
      "changeover delay",
      "long changeover",
      "setup time",
      "changeover time",
      "product changeover",
      "slow changeover",
      "extended setup",
      "changeover loss"
    ]
  },
  {
    id: "calibration_drift",
    category: "Machinery",
    phrases: [
      "calibration drift",
      "out of calibration",
      "calibration overdue",
      "measurement drift",
      "gauge drift",
      "instrument drift",
      "calibration failure",
      "dimensional drift"
    ]
  },
  {
    id: "speed_loss",
    category: "Machinery",
    phrases: [
      "speed loss",
      "reduced speed",
      "running below rate",
      "slow cycle",
      "cycle time increase",
      "below rated speed",
      "performance loss",
      "reduced throughput rate"
    ]
  },
  {
    id: "startup_loss",
    category: "Machinery",
    phrases: [
      "startup loss",
      "startup scrap",
      "warmup loss",
      "startup reject",
      "initial reject",
      "startup waste",
      "ramp up loss",
      "stabilization loss"
    ]
  },
  {
    id: "pneumatic_failure",
    category: "Machinery",
    phrases: [
      "pneumatic failure",
      "air pressure loss",
      "pneumatic leak",
      "compressed air fault",
      "air system failure",
      "cylinder failure",
      "pneumatic valve fault",
      "air supply interruption"
    ]
  },
  {
    id: "electrical_fault",
    category: "Machinery",
    phrases: [
      "electrical fault",
      "electrical failure",
      "power failure",
      "electrical trip",
      "circuit breaker trip",
      "power outage",
      "wiring fault",
      "short circuit"
    ]
  },
  {
    id: "conveyor_fault",
    category: "Machinery",
    phrases: [
      "conveyor fault",
      "conveyor stop",
      "belt failure",
      "conveyor jam",
      "conveyor breakdown",
      "belt slippage",
      "chain failure",
      "roller failure"
    ]
  },
  {
    id: "leak_detected",
    category: "Machinery",
    phrases: [
      "leak detected",
      "oil leak",
      "fluid leak",
      "coolant leak",
      "water leak",
      "air leak",
      "seal failure",
      "gasket failure"
    ]
  },
  {
    id: "alarm_frequency",
    category: "Machinery",
    phrases: [
      "frequent alarms",
      "alarm frequency",
      "recurring alarm",
      "nuisance alarm",
      "alarm flood",
      "repeated alarm",
      "alarm fatigue",
      "excessive alarms"
    ]
  },
  {
    id: "capacity_constraint",
    category: "Machinery",
    phrases: [
      "capacity constraint",
      "production bottleneck",
      "throughput limitation",
      "capacity limit",
      "capacity shortage",
      "output constrained",
      "capacity ceiling",
      "at maximum capacity"
    ]
  },
  {
    id: "material_shortage",
    category: "Materials",
    phrases: [
      "material shortage",
      "raw material shortage",
      "material stockout",
      "material unavailable",
      "material supply gap",
      "material not available",
      "shortage of material",
      "material supply disruption"
    ]
  },
  {
    id: "margin_erosion",
    category: "Money",
    phrases: [
      "margin erosion",
      "margin decline",
      "shrinking margins",
      "reduced margins",
      "profit margin drop",
      "margin deterioration",
      "eroding margins",
      "margin compression"
    ]
  },
  {
    id: "oee_decline",
    category: "Machinery",
    phrases: [
      "oee decline",
      "oee drop",
      "low oee",
      "oee below target",
      "overall equipment effectiveness low",
      "declining oee",
      "oee deterioration",
      "poor oee"
    ]
  },
  {
    id: "repair_activity",
    category: "Machinery",
    phrases: [
      "repair activity",
      "emergency repair",
      "breakdown repair",
      "corrective maintenance",
      "unplanned repair",
      "reactive repair",
      "repair frequency",
      "frequent repairs"
    ]
  },
  {
    id: "lubrication_issue",
    category: "Machinery",
    phrases: [
      "lubrication issue",
      "insufficient lubrication",
      "lubricant contamination",
      "oiling problem",
      "greasing overdue",
      "dry running",
      "lubrication failure",
      "lube system fault"
    ]
  },
  {
    id: "plc_error",
    category: "Machinery",
    phrases: [
      "plc error",
      "plc fault",
      "controller error",
      "plc communication failure",
      "program error",
      "logic controller fault",
      "automation fault",
      "plc alarm"
    ]
  },
  {
    id: "vacuum_system_fault",
    category: "Machinery",
    phrases: [
      "vacuum fault",
      "vacuum loss",
      "vacuum leak",
      "vacuum system failure",
      "suction failure",
      "vacuum pump fault",
      "vacuum pressure low",
      "vacuum system alarm"
    ]
  },
  {
    id: "cooling_system_fault",
    category: "Machinery",
    phrases: [
      "cooling system fault",
      "coolant failure",
      "chiller fault",
      "cooling water issue",
      "temperature control failure",
      "cooling system alarm",
      "overtemperature",
      "insufficient cooling"
    ]
  },
  {
    id: "drive_fault",
    category: "Machinery",
    phrases: [
      "drive fault",
      "vfd fault",
      "drive failure",
      "inverter fault",
      "servo fault",
      "motor drive error",
      "frequency drive alarm",
      "drive overload"
    ]
  },
  {
    id: "guarding_issue",
    category: "Machinery",
    phrases: [
      "guarding issue",
      "safety guard open",
      "interlock fault",
      "safety interlock",
      "light curtain fault",
      "guard removed",
      "safety device fault",
      "e-stop activated"
    ]
  },
  {
    id: "compressed_air_issue",
    category: "Machinery",
    phrases: [
      "compressed air issue",
      "air pressure low",
      "compressor fault",
      "air supply problem",
      "air dryer fault",
      "compressed air leak",
      "air quality issue",
      "moisture in air lines"
    ]
  },
  {
    id: "fixture_issue",
    category: "Machinery",
    phrases: [
      "fixture issue",
      "jig problem",
      "fixture wear",
      "fixture misalignment",
      "clamping problem",
      "holding fixture fault",
      "fixture damaged",
      "tooling fixture worn"
    ]
  },
  {
    id: "material_feed_issue",
    category: "Machinery",
    phrases: [
      "material feed issue",
      "feed problem",
      "feeder malfunction",
      "material flow issue",
      "hopper blockage",
      "feeder jam",
      "infeed problem",
      "feeding inconsistency"
    ]
  },
  {
    id: "noise_anomaly",
    category: "Machinery",
    phrases: [
      "noise anomaly",
      "unusual noise",
      "abnormal sound",
      "grinding noise",
      "rattling noise",
      "squealing",
      "knocking sound",
      "machine noise increase"
    ]
  },
  {
    id: "wear_detected",
    category: "Machinery",
    phrases: [
      "wear detected",
      "component wear",
      "part wear",
      "abrasion detected",
      "erosion detected",
      "surface wear",
      "wear pattern",
      "worn component"
    ]
  },
  {
    id: "alignment_issue",
    category: "Machinery",
    phrases: [
      "alignment issue",
      "misalignment",
      "shaft misalignment",
      "belt misalignment",
      "machine alignment",
      "out of alignment",
      "tracking issue",
      "registration error"
    ]
  },
  {
    id: "corrosion_detected",
    category: "Machinery",
    phrases: [
      "corrosion detected",
      "rust found",
      "corrosion damage",
      "oxidation",
      "rusting",
      "surface corrosion",
      "pipe corrosion",
      "tank corrosion"
    ]
  },
  {
    id: "weld_defect",
    category: "Machinery",
    phrases: [
      "weld defect",
      "weld crack",
      "weld porosity",
      "weld failure",
      "incomplete weld",
      "weld quality issue",
      "weld undercut",
      "weld spatter"
    ]
  },
  {
    id: "pressure_deviation",
    category: "Machinery",
    phrases: [
      "pressure deviation",
      "pressure drop",
      "pressure fluctuation",
      "abnormal pressure",
      "pressure alarm",
      "pressure below spec",
      "pressure above spec",
      "pressure instability"
    ]
  },
  {
    id: "temperature_deviation",
    category: "Machinery",
    phrases: [
      "temperature deviation",
      "temperature out of range",
      "temperature fluctuation",
      "high temperature",
      "low temperature",
      "temperature alarm",
      "thermal instability",
      "temperature control issue"
    ]
  },
  {
    id: "flow_rate_issue",
    category: "Machinery",
    phrases: [
      "flow rate issue",
      "flow rate low",
      "flow restriction",
      "blocked flow",
      "flow meter error",
      "inconsistent flow",
      "flow interruption",
      "flow rate deviation"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // MANPOWER SIGNALS
  // ═══════════════════════════════════════════════════════════════

  {
    id: "operator_fatigue",
    category: "Manpower",
    phrases: [
      "operator fatigue",
      "worker fatigue",
      "staff fatigue",
      "employee fatigue",
      "tired operators",
      "fatigue related",
      "exhaustion",
      "fatigue on shift"
    ]
  },
  {
    id: "extended_shifts",
    category: "Manpower",
    phrases: [
      "extended shifts",
      "long shifts",
      "12 hour shift",
      "double shift",
      "back to back shifts",
      "prolonged shift",
      "shift extension",
      "extra shift"
    ]
  },
  {
    id: "overtime_spike",
    category: "Manpower",
    phrases: [
      "overtime spike",
      "excess overtime",
      "operator overtime",
      "staff overtime",
      "overtime hours",
      "overtime increase",
      "high overtime",
      "overtime above budget",
      "overtime cost"
    ]
  },
  {
    id: "night_shift_fatigue",
    category: "Manpower",
    phrases: [
      "night shift fatigue",
      "night shift errors",
      "graveyard shift",
      "third shift issues",
      "overnight shift problems",
      "night shift productivity",
      "late shift fatigue"
    ]
  },
  {
    id: "operator_error",
    category: "Manpower",
    phrases: [
      "operator error",
      "human error",
      "worker mistake",
      "operator mistake",
      "manual error",
      "human factor",
      "procedural error",
      "handling error"
    ]
  },
  {
    id: "training_gap",
    category: "Manpower",
    phrases: [
      "training gap",
      "insufficient training",
      "lack of training",
      "untrained operator",
      "training needed",
      "training deficit",
      "training inadequate",
      "no training provided"
    ]
  },
  {
    id: "operator_shortage",
    category: "Manpower",
    phrases: [
      "operator shortage",
      "staff shortage",
      "understaffed",
      "short staffed",
      "insufficient operators",
      "manpower shortage",
      "headcount gap",
      "labor shortage"
    ]
  },
  {
    id: "skill_gap",
    category: "Manpower",
    phrases: [
      "skill gap",
      "skills gap",
      "competency gap",
      "skill deficiency",
      "lack of expertise",
      "inexperienced operator",
      "unskilled worker",
      "capability gap"
    ]
  },
  {
    id: "high_absenteeism",
    category: "Manpower",
    phrases: [
      "high absenteeism",
      "absenteeism",
      "absent operators",
      "unplanned absence",
      "sick leave",
      "absentee rate",
      "no show",
      "attendance issues"
    ]
  },
  {
    id: "staff_turnover",
    category: "Manpower",
    phrases: [
      "staff turnover",
      "employee turnover",
      "high turnover",
      "operator turnover",
      "attrition",
      "resignation",
      "retention problem",
      "people leaving"
    ]
  },
  {
    id: "manual_intervention",
    category: "Manpower",
    phrases: [
      "manual intervention",
      "manual override",
      "manual adjustment",
      "operator intervention",
      "hand operation",
      "manual workaround",
      "manual correction",
      "requires manual input"
    ]
  },
  {
    id: "shift_handover_issue",
    category: "Manpower",
    phrases: [
      "shift handover issue",
      "poor handover",
      "handover gap",
      "shift transition error",
      "shift change problem",
      "information lost at handover",
      "handover communication",
      "between shifts"
    ]
  },
  {
    id: "supervision_gap",
    category: "Manpower",
    phrases: [
      "supervision gap",
      "lack of supervision",
      "unsupervised",
      "insufficient oversight",
      "no supervisor present",
      "supervisory gap",
      "foreman absent",
      "team leader absent"
    ]
  },
  {
    id: "work_instruction_missing",
    category: "Manpower",
    phrases: [
      "work instruction missing",
      "no sop",
      "missing procedure",
      "no standard work",
      "sop not available",
      "undocumented process",
      "instructions unclear",
      "procedure not followed"
    ]
  },
  {
    id: "discipline_issue",
    category: "Manpower",
    phrases: [
      "discipline issue",
      "not following procedure",
      "sop violation",
      "non compliance",
      "procedural violation",
      "rule violation",
      "ignoring standards",
      "shortcuts taken"
    ]
  },
  {
    id: "new_operator_issue",
    category: "Manpower",
    phrases: [
      "new operator",
      "new employee",
      "new hire",
      "recently onboarded",
      "probationary operator",
      "learning curve",
      "newly assigned",
      "inexperienced staff"
    ]
  },
  {
    id: "morale_issue",
    category: "Manpower",
    phrases: [
      "low morale",
      "poor morale",
      "disengaged workers",
      "demotivated staff",
      "employee dissatisfaction",
      "worker frustration",
      "team morale low",
      "lack of motivation"
    ]
  },
  {
    id: "safety_incident",
    category: "Manpower",
    phrases: [
      "safety incident",
      "accident",
      "near miss",
      "injury",
      "safety violation",
      "unsafe act",
      "lost time injury",
      "recordable incident"
    ]
  },
  {
    id: "cross_training_gap",
    category: "Manpower",
    phrases: [
      "cross training gap",
      "no cross training",
      "single skill operator",
      "no backup operator",
      "cannot rotate",
      "skill concentration",
      "single point of knowledge",
      "one person knows"
    ]
  },
  {
    id: "communication_breakdown",
    category: "Manpower",
    phrases: [
      "communication breakdown",
      "miscommunication",
      "information not shared",
      "communication gap",
      "poor communication",
      "instruction misunderstood",
      "message not received",
      "verbal only instruction"
    ]
  },
  {
    id: "workload_imbalance",
    category: "Manpower",
    phrases: [
      "workload imbalance",
      "uneven workload",
      "overloaded station",
      "idle operator",
      "workload distribution",
      "unbalanced manning",
      "some idle some overloaded",
      "unequal task allocation"
    ]
  },
  {
    id: "temp_worker_issue",
    category: "Manpower",
    phrases: [
      "temp worker issue",
      "temporary worker",
      "contract worker problem",
      "agency staff",
      "temp staff error",
      "casual labor",
      "outsourced labor issue",
      "contractor quality"
    ]
  },
  {
    id: "ergonomic_issue",
    category: "Manpower",
    phrases: [
      "ergonomic issue",
      "repetitive strain",
      "ergonomic risk",
      "awkward posture",
      "manual handling risk",
      "lifting injury",
      "workstation ergonomics",
      "physical strain"
    ]
  },
  {
    id: "knowledge_loss",
    category: "Manpower",
    phrases: [
      "knowledge loss",
      "tribal knowledge",
      "undocumented knowledge",
      "expertise lost",
      "institutional knowledge gap",
      "key person left",
      "experience drain",
      "know how lost"
    ]
  },
  {
    id: "team_conflict",
    category: "Manpower",
    phrases: [
      "team conflict",
      "interpersonal conflict",
      "workplace dispute",
      "team dysfunction",
      "conflict between shifts",
      "department friction",
      "poor teamwork",
      "uncooperative staff"
    ]
  },
  {
    id: "certification_expired",
    category: "Manpower",
    phrases: [
      "certification expired",
      "license expired",
      "qualification lapsed",
      "recertification needed",
      "credential expired",
      "competency assessment overdue",
      "training certificate expired",
      "authorization lapsed"
    ]
  },
  {
    id: "ppe_non_compliance",
    category: "Manpower",
    phrases: [
      "ppe non compliance",
      "ppe not worn",
      "safety gear missing",
      "protective equipment violation",
      "no safety glasses",
      "no ear protection",
      "safety shoe violation",
      "ppe violation"
    ]
  },
  {
    id: "overtime_refusal",
    category: "Manpower",
    phrases: [
      "overtime refusal",
      "refusing overtime",
      "declining extra shift",
      "overtime rejection",
      "unwilling to work overtime",
      "overtime fatigue",
      "overtime burnout",
      "staff refusing extra hours"
    ]
  },
  {
    id: "recruitment_difficulty",
    category: "Manpower",
    phrases: [
      "recruitment difficulty",
      "hiring difficulty",
      "cannot fill vacancy",
      "hard to recruit",
      "talent shortage",
      "recruitment delay",
      "unfilled position",
      "vacancy open long"
    ]
  },
  {
    id: "multi_tasking_overload",
    category: "Manpower",
    phrases: [
      "multi tasking overload",
      "too many responsibilities",
      "wearing multiple hats",
      "role overload",
      "stretched too thin",
      "doing multiple jobs",
      "task overload",
      "responsibility creep"
    ]
  },
  {
    id: "language_barrier",
    category: "Manpower",
    phrases: [
      "language barrier",
      "language issue",
      "cannot read instructions",
      "translation needed",
      "language comprehension",
      "foreign worker communication",
      "instruction not understood",
      "language gap"
    ]
  },
  {
    id: "management_decision_delay",
    category: "Manpower",
    phrases: [
      "management decision delay",
      "waiting for approval",
      "slow decision making",
      "approval bottleneck",
      "management response slow",
      "escalation delayed",
      "decision paralysis",
      "pending management action"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // MATERIALS SIGNALS
  // ═══════════════════════════════════════════════════════════════

  {
    id: "scrap",
    category: "Materials",
    phrases: [
      "scrap",
      "scrap rate",
      "high scrap",
      "material scrap",
      "defective scrap",
      "scrapped units",
      "scrap loss",
      "scrap increase"
    ]
  },
  {
    id: "scrap_rate_high",
    category: "Materials",
    phrases: [
      "high scrap rate",
      "scrap rate above target",
      "excessive scrap",
      "scrap percentage high",
      "scrap trending up",
      "scrap above limit",
      "abnormal scrap"
    ]
  },
  {
    id: "rework",
    category: "Materials",
    phrases: [
      "rework",
      "rework activity",
      "defect reprocessing",
      "quality rework",
      "product rework",
      "rework loop",
      "rework station",
      "rework required"
    ]
  },
  {
    id: "rework_rate_high",
    category: "Materials",
    phrases: [
      "high rework rate",
      "rework rate above target",
      "excessive rework",
      "rework percentage high",
      "rework trending up",
      "rework above limit",
      "rework increasing"
    ]
  },
  {
    id: "batch_rejection",
    category: "Materials",
    phrases: [
      "batch rejection",
      "batch reject",
      "lot rejection",
      "batch failed",
      "rejected lot",
      "batch hold",
      "quarantined batch",
      "batch not released"
    ]
  },
  {
    id: "quality_deviation",
    category: "Materials",
    phrases: [
      "quality deviation",
      "quality issue",
      "quality failure",
      "out of spec",
      "non conformance",
      "ncr",
      "quality defect",
      "quality problem",
      "defect found"
    ]
  },
  {
    id: "inventory_shortage",
    category: "Materials",
    phrases: [
      "inventory shortage",
      "material shortage",
      "stock out",
      "stockout",
      "out of stock",
      "material unavailable",
      "parts shortage",
      "component shortage",
      "raw material shortage"
    ]
  },
  {
    id: "supplier_late_delivery",
    category: "Materials",
    phrases: [
      "late supplier delivery",
      "supplier delay",
      "supplier late",
      "delivery delay",
      "shipment delayed",
      "supplier missed deadline",
      "late shipment",
      "overdue delivery"
    ]
  },
  {
    id: "incoming_quality_failure",
    category: "Materials",
    phrases: [
      "incoming quality failure",
      "incoming inspection fail",
      "iqc failure",
      "incoming material defect",
      "supplier quality issue",
      "incoming reject",
      "receiving inspection failure",
      "incoming non conformance"
    ]
  },
  {
    id: "lead_time_increase",
    category: "Materials",
    phrases: [
      "lead time increase",
      "longer lead time",
      "extended lead time",
      "lead time growth",
      "delivery time increase",
      "procurement delay",
      "lead time above target",
      "leadtime increase"
    ]
  },
  {
    id: "inventory_buildup",
    category: "Materials",
    phrases: [
      "inventory buildup",
      "excess inventory",
      "stock buildup",
      "overstocked",
      "surplus inventory",
      "excess stock",
      "inventory accumulation",
      "wip buildup",
      "work in progress buildup"
    ]
  },
  {
    id: "component_defect",
    category: "Materials",
    phrases: [
      "component defect",
      "defective component",
      "faulty component",
      "part defect",
      "defective part",
      "component failure",
      "sub assembly defect",
      "purchased part defect"
    ]
  },
  {
    id: "material_damage",
    category: "Materials",
    phrases: [
      "material damage",
      "handling damage",
      "transport damage",
      "storage damage",
      "material contamination",
      "damaged goods",
      "material degradation",
      "corrosion detected"
    ]
  },
  {
    id: "otd_decline",
    category: "Materials",
    phrases: [
      "otd decline",
      "on time delivery decline",
      "late delivery",
      "delivery performance drop",
      "missed delivery date",
      "shipping delay",
      "fulfillment delay",
      "order delay"
    ]
  },
  {
    id: "wip_congestion",
    category: "Materials",
    phrases: [
      "wip congestion",
      "work in progress congestion",
      "wip buildup",
      "bottleneck wip",
      "material queue",
      "buffer overflow",
      "staging area full",
      "inter process inventory"
    ]
  },
  {
    id: "yield_loss",
    category: "Materials",
    phrases: [
      "yield loss",
      "low yield",
      "yield decline",
      "yield below target",
      "poor yield",
      "first pass yield low",
      "fpy decline",
      "yield drop"
    ]
  },
  {
    id: "specification_deviation",
    category: "Materials",
    phrases: [
      "specification deviation",
      "spec deviation",
      "out of tolerance",
      "dimension out of spec",
      "parameter deviation",
      "specification change",
      "engineering change",
      "drawing discrepancy"
    ]
  },
  {
    id: "material_waste",
    category: "Materials",
    phrases: [
      "material waste",
      "excess material usage",
      "material overuse",
      "waste material",
      "trim waste",
      "cut off waste",
      "offcut loss",
      "material inefficiency"
    ]
  },
  {
    id: "packaging_defect",
    category: "Materials",
    phrases: [
      "packaging defect",
      "packaging damage",
      "labeling error",
      "packaging failure",
      "incorrect packaging",
      "packaging reject",
      "packaging issue"
    ]
  },
  {
    id: "traceability_gap",
    category: "Materials",
    phrases: [
      "traceability gap",
      "no traceability",
      "lot traceability missing",
      "batch tracking failure",
      "serial number missing",
      "cannot trace material",
      "traceability lost"
    ]
  },
  {
    id: "shelf_life_expiry",
    category: "Materials",
    phrases: [
      "shelf life expiry",
      "expired material",
      "material expired",
      "past expiry date",
      "shelf life exceeded",
      "obsolete material",
      "material aging",
      "date coded material expired"
    ]
  },
  {
    id: "wrong_material_used",
    category: "Materials",
    phrases: [
      "wrong material used",
      "incorrect material",
      "material mix up",
      "wrong part used",
      "substitution error",
      "incorrect component",
      "material confusion",
      "part number error"
    ]
  },
  {
    id: "supplier_capacity_issue",
    category: "Materials",
    phrases: [
      "supplier capacity issue",
      "supplier at capacity",
      "supplier cannot deliver",
      "supplier overloaded",
      "supplier allocation",
      "supplier constraint",
      "supply capacity limit",
      "vendor capacity problem"
    ]
  },
  {
    id: "receiving_error",
    category: "Materials",
    phrases: [
      "receiving error",
      "wrong quantity received",
      "short shipment",
      "over shipment",
      "receiving discrepancy",
      "goods receipt error",
      "packing list mismatch",
      "delivery quantity wrong"
    ]
  },
  {
    id: "storage_condition_issue",
    category: "Materials",
    phrases: [
      "storage condition issue",
      "improper storage",
      "temperature excursion",
      "humidity damage",
      "storage contamination",
      "warehouse condition",
      "climate control failure",
      "storage environment"
    ]
  },
  {
    id: "color_variation",
    category: "Materials",
    phrases: [
      "color variation",
      "color mismatch",
      "color shift",
      "shade difference",
      "color inconsistency",
      "visual defect",
      "appearance defect",
      "cosmetic defect"
    ]
  },
  {
    id: "dimensional_deviation",
    category: "Materials",
    phrases: [
      "dimensional deviation",
      "out of tolerance",
      "dimension error",
      "measurement out of spec",
      "size deviation",
      "thickness variation",
      "width variation",
      "length deviation"
    ]
  },
  {
    id: "contamination_detected",
    category: "Materials",
    phrases: [
      "contamination detected",
      "foreign material",
      "foreign object",
      "contamination",
      "impurity found",
      "cross contamination",
      "particulate contamination",
      "foreign body"
    ]
  },
  {
    id: "customer_complaint",
    category: "Materials",
    phrases: [
      "customer complaint",
      "customer rejection",
      "field complaint",
      "customer quality issue",
      "product return",
      "customer dissatisfaction",
      "end user complaint",
      "market complaint"
    ]
  },
  {
    id: "moisture_content_issue",
    category: "Materials",
    phrases: [
      "moisture content issue",
      "moisture level high",
      "wet material",
      "moisture absorption",
      "humidity affected material",
      "moisture out of spec",
      "damp material",
      "moisture damage"
    ]
  },
  {
    id: "hardness_deviation",
    category: "Materials",
    phrases: [
      "hardness deviation",
      "hardness out of spec",
      "material too soft",
      "material too hard",
      "hardness test failure",
      "heat treatment issue",
      "temper issue",
      "hardness variation"
    ]
  },
  {
    id: "surface_defect",
    category: "Materials",
    phrases: [
      "surface defect",
      "surface finish issue",
      "surface roughness",
      "surface scratch",
      "surface pit",
      "surface blemish",
      "cosmetic surface defect",
      "finish quality issue"
    ]
  },
  {
    id: "bonding_failure",
    category: "Materials",
    phrases: [
      "bonding failure",
      "adhesion failure",
      "glue failure",
      "delamination",
      "bond strength low",
      "adhesive failure",
      "lamination failure",
      "coating peeling"
    ]
  },
  {
    id: "assembly_defect",
    category: "Materials",
    phrases: [
      "assembly defect",
      "assembly error",
      "wrong assembly",
      "missing component",
      "incorrect assembly",
      "assembly fit issue",
      "assembly gap",
      "assembly sequence error"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // MONEY SIGNALS
  // ═══════════════════════════════════════════════════════════════

  {
    id: "cost_overrun",
    category: "Money",
    phrases: [
      "cost overrun",
      "over budget",
      "budget exceeded",
      "cost exceeded",
      "spending over budget",
      "cost above plan",
      "expenditure exceeded",
      "cost blowout"
    ]
  },
  {
    id: "maintenance_cost_increase",
    category: "Money",
    phrases: [
      "maintenance cost increase",
      "rising maintenance cost",
      "high maintenance spend",
      "repair cost increase",
      "maintenance budget exceeded",
      "maintenance expense up",
      "escalating repair costs",
      "maintenance overspend"
    ]
  },
  {
    id: "energy_cost_spike",
    category: "Money",
    phrases: [
      "energy cost spike",
      "energy cost increase",
      "electricity cost high",
      "power cost increase",
      "utility cost spike",
      "energy bill increase",
      "energy consumption high",
      "high energy usage"
    ]
  },
  {
    id: "high_production_cost",
    category: "Money",
    phrases: [
      "high production cost",
      "production cost increase",
      "manufacturing cost high",
      "cost per unit high",
      "unit cost increase",
      "rising production cost",
      "production expense increase",
      "conversion cost high"
    ]
  },
  {
    id: "cogs_increase",
    category: "Money",
    phrases: [
      "cost of goods increase",
      "cogs increase",
      "cogs rising",
      "cost of goods sold high",
      "cogs above target",
      "cogs trending up",
      "manufacturing cost of goods"
    ]
  },
  {
    id: "margin_pressure",
    category: "Money",
    phrases: [
      "margin pressure",
      "margin squeeze",
      "margin erosion",
      "declining margins",
      "gross margin decline",
      "profit margin shrinking",
      "thin margins",
      "margin below target"
    ]
  },
  {
    id: "budget_overrun",
    category: "Money",
    phrases: [
      "budget overrun",
      "over budget",
      "budget exceeded",
      "budget variance",
      "unfavorable variance",
      "budget deficit",
      "spending above budget",
      "capex overrun"
    ]
  },
  {
    id: "asset_utilization_low",
    category: "Money",
    phrases: [
      "inefficient asset utilization",
      "low asset utilization",
      "poor asset utilization",
      "underutilized equipment",
      "idle capacity",
      "low capacity utilization",
      "asset efficiency low",
      "capital underutilized"
    ]
  },
  {
    id: "overtime_cost",
    category: "Money",
    phrases: [
      "overtime cost",
      "overtime expense",
      "overtime premium",
      "overtime spending",
      "labor cost overtime",
      "overtime budget exceeded",
      "overtime pay increase",
      "overtime above budget"
    ]
  },
  {
    id: "scrap_cost",
    category: "Money",
    phrases: [
      "scrap cost",
      "cost of scrap",
      "scrap expense",
      "scrap loss value",
      "scrap write off",
      "material loss cost",
      "waste cost",
      "scrap financial impact"
    ]
  },
  {
    id: "rework_cost",
    category: "Money",
    phrases: [
      "rework cost",
      "cost of rework",
      "rework expense",
      "rework labor cost",
      "quality cost",
      "cost of poor quality",
      "copq",
      "rework financial impact"
    ]
  },
  {
    id: "warranty_cost",
    category: "Money",
    phrases: [
      "warranty cost",
      "warranty claim",
      "warranty expense",
      "warranty return",
      "field failure",
      "customer return",
      "warranty rate increase",
      "post sale cost"
    ]
  },
  {
    id: "freight_cost_spike",
    category: "Money",
    phrases: [
      "freight cost spike",
      "shipping cost increase",
      "expedited freight",
      "air freight cost",
      "rush shipping",
      "transport cost increase",
      "logistics cost up",
      "freight premium"
    ]
  },
  {
    id: "inventory_carrying_cost",
    category: "Money",
    phrases: [
      "inventory carrying cost",
      "holding cost",
      "storage cost",
      "inventory cost high",
      "warehousing cost",
      "carrying cost increase",
      "inventory finance cost",
      "excess inventory cost"
    ]
  },
  {
    id: "labor_cost_ratio",
    category: "Money",
    phrases: [
      "labor cost ratio",
      "high labor cost",
      "labor cost increase",
      "labor cost per unit",
      "direct labor cost",
      "indirect labor cost",
      "labor expense ratio",
      "workforce cost"
    ]
  },
  {
    id: "roi_decline",
    category: "Money",
    phrases: [
      "roi decline",
      "return on investment low",
      "poor roi",
      "low return on assets",
      "roa decline",
      "investment underperforming",
      "roi below target",
      "payback period extended"
    ]
  },
  {
    id: "cash_flow_pressure",
    category: "Money",
    phrases: [
      "cash flow pressure",
      "cash flow tight",
      "working capital pressure",
      "cash constraint",
      "liquidity pressure",
      "cash flow negative",
      "cash conversion slow",
      "receivables aging"
    ]
  },
  {
    id: "downtime_cost",
    category: "Money",
    phrases: [
      "downtime cost",
      "cost of downtime",
      "production loss cost",
      "lost production value",
      "downtime financial impact",
      "stoppage cost",
      "idle cost",
      "lost output cost"
    ]
  },
  {
    id: "penalty_cost",
    category: "Money",
    phrases: [
      "penalty cost",
      "late delivery penalty",
      "contract penalty",
      "liquidated damages",
      "service level penalty",
      "customer penalty",
      "fine",
      "penalty charges"
    ]
  },
  {
    id: "material_cost_increase",
    category: "Money",
    phrases: [
      "material cost increase",
      "raw material price increase",
      "commodity price increase",
      "input cost increase",
      "material price volatility",
      "raw material inflation",
      "procurement cost rise",
      "material spend above budget"
    ]
  },
  {
    id: "productivity_loss_cost",
    category: "Money",
    phrases: [
      "productivity loss cost",
      "efficiency loss cost",
      "low productivity cost",
      "output below target cost",
      "capacity loss cost",
      "throughput loss value",
      "performance gap cost",
      "underperformance cost"
    ]
  },
  {
    id: "insurance_cost_increase",
    category: "Money",
    phrases: [
      "insurance cost increase",
      "premium increase",
      "insurance claim",
      "risk premium",
      "liability cost",
      "insurance cost up",
      "coverage cost increase",
      "indemnity cost"
    ]
  },
  {
    id: "compliance_cost",
    category: "Money",
    phrases: [
      "compliance cost",
      "regulatory cost",
      "audit cost",
      "certification cost",
      "compliance spending",
      "regulatory fine",
      "non compliance cost",
      "remediation cost"
    ]
  },
  {
    id: "tooling_cost",
    category: "Money",
    phrases: [
      "tooling cost",
      "tool replacement cost",
      "tooling expense",
      "die cost",
      "fixture cost",
      "tooling budget exceeded",
      "tooling investment",
      "consumable tooling cost"
    ]
  },
  {
    id: "quality_cost",
    category: "Money",
    phrases: [
      "quality cost",
      "cost of quality",
      "cost of poor quality",
      "copq",
      "appraisal cost",
      "prevention cost",
      "failure cost",
      "quality expense"
    ]
  },
  {
    id: "spare_parts_cost",
    category: "Money",
    phrases: [
      "spare parts cost",
      "spare parts expense",
      "parts inventory cost",
      "spare parts budget",
      "critical spares cost",
      "replacement parts cost",
      "mro cost",
      "maintenance parts spend"
    ]
  },
  {
    id: "depreciation_impact",
    category: "Money",
    phrases: [
      "depreciation impact",
      "depreciation cost",
      "asset depreciation",
      "book value decline",
      "equipment write down",
      "accelerated depreciation",
      "asset impairment",
      "depreciation expense"
    ]
  },
  {
    id: "disposal_cost",
    category: "Money",
    phrases: [
      "disposal cost",
      "waste disposal cost",
      "hazardous waste cost",
      "scrap disposal",
      "environmental disposal",
      "waste removal cost",
      "effluent treatment cost",
      "disposal fee"
    ]
  },
  {
    id: "training_cost_overrun",
    category: "Money",
    phrases: [
      "training cost overrun",
      "training expense high",
      "retraining cost",
      "onboarding cost",
      "training budget exceeded",
      "skill development cost",
      "training investment",
      "competency development spend"
    ]
  },
  {
    id: "changeover_cost",
    category: "Money",
    phrases: [
      "changeover cost",
      "setup cost",
      "changeover expense",
      "product switch cost",
      "line changeover cost",
      "setup time cost",
      "transition cost",
      "changeover labor cost"
    ]
  },
  {
    id: "yield_loss_cost",
    category: "Money",
    phrases: [
      "yield loss cost",
      "yield loss value",
      "low yield cost",
      "yield financial impact",
      "lost yield value",
      "first pass yield cost",
      "fpy cost impact",
      "yield gap cost"
    ]
  },
  {
    id: "capacity_loss_cost",
    category: "Money",
    phrases: [
      "capacity loss cost",
      "lost capacity value",
      "capacity gap cost",
      "bottleneck cost",
      "constraint cost",
      "capacity underutilization cost",
      "output gap cost",
      "capacity shortfall cost"
    ]
  },
  {
    id: "cycle_time_variance",
    category: "Machinery",
    phrases: [
      "cycle time variance",
      "cycle time deviation",
      "cycle time increase",
      "inconsistent cycle time",
      "cycle time above standard",
      "takt time deviation",
      "cycle time instability",
      "cycle time fluctuation"
    ]
  },
  {
    id: "dust_accumulation",
    category: "Machinery",
    phrases: [
      "dust accumulation",
      "dust buildup",
      "debris accumulation",
      "contamination buildup",
      "dirty machine",
      "cleaning overdue",
      "housekeeping issue",
      "5s non compliance"
    ]
  },
  {
    id: "inventory_count_discrepancy",
    category: "Materials",
    phrases: [
      "inventory count discrepancy",
      "stock count mismatch",
      "physical vs system variance",
      "inventory inaccuracy",
      "cycle count variance",
      "stock discrepancy",
      "inventory audit finding",
      "bin quantity mismatch"
    ]
  },
  {
    id: "schedule_deviation",
    category: "Machinery",
    phrases: [
      "schedule deviation",
      "schedule miss",
      "schedule not met",
      "off schedule",
      "schedule adherence low",
      "production schedule missed",
      "schedule disruption",
      "plan deviation"
    ]
  },
  {
    id: "rush_order",
    category: "Materials",
    phrases: [
      "rush order",
      "expedite order",
      "expediting",
      "hot job",
      "emergency order",
      "unplanned order",
      "priority order",
      "urgent order"
    ]
  },
  {
    id: "wip_buildup",
    category: "Machinery",
    phrases: [
      "WIP buildup",
      "work in progress buildup",
      "WIP accumulation",
      "high WIP",
      "WIP increasing",
      "excessive WIP",
      "work in progress high",
      "WIP pile up"
    ]
  },
  {
    id: "safety_stock_breach",
    category: "Materials",
    phrases: [
      "safety stock breach",
      "below safety stock",
      "safety stock depleted",
      "safety stock low",
      "safety stock violated",
      "safety level breached",
      "buffer stock depleted",
      "minimum stock breached"
    ]
  },
  {
    id: "reorder_point_failure",
    category: "Materials",
    phrases: [
      "reorder point breach",
      "below reorder point",
      "reorder point missed",
      "reorder level breached",
      "failed to reorder",
      "reorder not triggered",
      "reorder point not met",
      "reorder delay"
    ]
  },
  {
    id: "inventory_turnover_decline",
    category: "Materials",
    phrases: [
      "inventory turnover low",
      "slow inventory turns",
      "low stock turns",
      "inventory turnover decline",
      "poor inventory velocity",
      "slow moving inventory",
      "low turnover rate",
      "inventory turnover below target"
    ]
  },
  {
    id: "shift_handover_gap",
    category: "Manpower",
    phrases: [
      "shift handover issue",
      "handover incomplete",
      "no handover",
      "poor handover",
      "handover gap",
      "shift change problem",
      "handover not done",
      "shift transition failure"
    ]
  }

];

export const manufacturingVocabulary: Record<string, string[]> = Object.fromEntries(
  manufacturingSignals.map(s => [s.id, s.phrases])
);
