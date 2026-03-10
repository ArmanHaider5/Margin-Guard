export interface ManufacturingRootCause {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  category: "Machinery" | "Manpower" | "Materials" | "Money";
  description: string;
  triggers: string[];
  supportSignals: string[];
  diagnosticChains?: string[];
  relatedKPIs?: string[];
}

export const manufacturingRootCauses: ManufacturingRootCause[] = [

  // ═══════════════════════════════════════════════════════════════
  // TIER 1 — MACHINERY (operational)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-maintenance-reactive",
    name: "Reactive maintenance causing unplanned downtime",
    tier: 1,
    category: "Machinery",
    triggers: ["maintenance_backlog", "downtime"],
    supportSignals: ["machine_breakdown", "repair_activity"],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["mtbf", "mttr", "oee"],
    description: "Maintenance occurs only after breakdowns instead of scheduled preventive servicing."
  },

  {
    id: "mfg-equipment-aging",
    name: "Aging equipment reducing reliability",
    tier: 1,
    category: "Machinery",
    triggers: ["downtime"],
    supportSignals: ["machine_breakdown"],
    relatedKPIs: ["mtbf", "oee"],
    description: "Old equipment results in frequent failures and lower efficiency."
  },

  {
    id: "mfg-capacity-bottleneck",
    name: "Production bottleneck limiting output capacity",
    tier: 1,
    category: "Machinery",
    triggers: ["overtime_spike"],
    supportSignals: ["downtime"],
    diagnosticChains: ["capacity_stress_chain"],
    relatedKPIs: ["oee", "throughput"],
    description: "Production throughput is limited by one or more constrained workstations."
  },

  {
    id: "mfg-changeover-inefficiency",
    name: "Frequent changeovers reducing effective production time",
    tier: 1,
    category: "Machinery",
    triggers: ["downtime"],
    supportSignals: [],
    relatedKPIs: ["oee", "changeover_time"],
    description: "Production lines spend excessive time switching between product variants."
  },

  {
    id: "mfg-maintenance-backlog",
    name: "Preventive maintenance backlog increasing failure risk",
    tier: 1,
    category: "Machinery",
    triggers: ["maintenance_backlog"],
    supportSignals: [],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["pm_compliance", "mtbf"],
    description: "Delayed preventive maintenance increases breakdown probability."
  },

  {
    id: "mfg-process-variability",
    name: "Process variability reducing production consistency",
    tier: 1,
    category: "Machinery",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["cpk", "first_pass_yield"],
    description: "Inconsistent process conditions lead to fluctuating output quality."
  },

  {
    id: "mfg-utilization-loss",
    name: "Low equipment utilization reducing output efficiency",
    tier: 1,
    category: "Machinery",
    triggers: ["downtime"],
    supportSignals: [],
    relatedKPIs: ["oee", "utilization_rate"],
    description: "Machines are idle for significant periods, reducing production capacity."
  },

  {
    id: "mfg-line-balancing",
    name: "Production line imbalance creating local bottlenecks",
    tier: 1,
    category: "Machinery",
    triggers: ["overtime_spike"],
    supportSignals: ["downtime"],
    diagnosticChains: ["capacity_stress_chain"],
    relatedKPIs: ["oee", "throughput"],
    description: "Uneven workstation workloads create production bottlenecks."
  },

  {
    id: "mfg-calibration-drift",
    name: "Equipment calibration drift affecting product quality",
    tier: 1,
    category: "Machinery",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    relatedKPIs: ["cpk", "scrap_rate"],
    description: "Machine calibration drift causes dimensional inaccuracies."
  },

  {
    id: "mfg-microstoppages",
    name: "Frequent micro-stoppages reducing effective throughput",
    tier: 1,
    category: "Machinery",
    triggers: ["downtime"],
    supportSignals: [],
    relatedKPIs: ["oee", "availability"],
    description: "Short recurring stops reduce line productivity."
  },

  {
    id: "mfg-changeover-planning",
    name: "Poor changeover planning reducing line efficiency",
    tier: 1,
    category: "Machinery",
    triggers: ["downtime"],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["changeover_time", "oee"],
    description: "Inadequate changeover sequencing and preparation cause avoidable production loss."
  },

  {
    id: "mfg-machine-jams",
    name: "Machine jams during high-volume production",
    tier: 1,
    category: "Machinery",
    triggers: ["downtime"],
    supportSignals: ["machine_breakdown", "scrap"],
    relatedKPIs: ["oee", "availability", "mttr"],
    description: "Equipment jams halt production runs and damage in-process material."
  },

  {
    id: "mfg-tooling-wear",
    name: "Tooling wear causing dimensional drift and defects",
    tier: 1,
    category: "Machinery",
    triggers: ["rework", "scrap"],
    supportSignals: ["machine_breakdown"],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["cpk", "scrap_rate", "tool_life"],
    description: "Worn tooling produces parts outside specification limits."
  },

  {
    id: "mfg-speed-loss",
    name: "Equipment running below rated speed",
    tier: 1,
    category: "Machinery",
    triggers: ["downtime"],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["oee", "performance_rate", "throughput"],
    description: "Machines operate below designed cycle time, reducing effective output."
  },

  {
    id: "mfg-startup-loss",
    name: "Production startup losses after shutdowns",
    tier: 1,
    category: "Machinery",
    triggers: ["downtime", "scrap"],
    supportSignals: ["rework"],
    relatedKPIs: ["oee", "scrap_rate", "availability"],
    description: "Machines produce defective output during warmup and stabilization after restarts."
  },

  {
    id: "mfg-pneumatic-hydraulic-failure",
    name: "Pneumatic or hydraulic system failures causing stoppages",
    tier: 1,
    category: "Machinery",
    triggers: ["downtime", "machine_breakdown"],
    supportSignals: ["maintenance_backlog"],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["mtbf", "mttr", "availability"],
    description: "Failures in pneumatic or hydraulic subsystems halt production equipment."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 1 — MANPOWER (operational)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-workforce-overload",
    name: "Workforce overload from sustained overtime",
    tier: 1,
    category: "Manpower",
    triggers: ["overtime_spike"],
    supportSignals: [],
    diagnosticChains: ["capacity_stress_chain"],
    relatedKPIs: ["overtime_ratio"],
    description: "Operators are consistently working extended hours to maintain production output."
  },

  {
    id: "mfg-operator-fatigue",
    name: "Operator fatigue affecting production performance",
    tier: 1,
    category: "Manpower",
    triggers: ["overtime_spike"],
    supportSignals: ["rework"],
    diagnosticChains: ["capacity_stress_chain"],
    relatedKPIs: ["overtime_ratio", "first_pass_yield"],
    description: "Extended shifts reduce worker concentration and accuracy."
  },

  {
    id: "mfg-operator-error-rate",
    name: "High operator error rates causing rework",
    tier: 1,
    category: "Manpower",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["first_pass_yield", "rework_rate"],
    description: "Frequent operator mistakes produce non-conforming output requiring correction."
  },

  {
    id: "mfg-understaffed-shifts",
    name: "Understaffed production shifts reducing throughput",
    tier: 1,
    category: "Manpower",
    triggers: ["overtime_spike"],
    supportSignals: ["downtime"],
    diagnosticChains: ["capacity_stress_chain"],
    relatedKPIs: ["throughput", "overtime_ratio", "labor_utilization"],
    description: "Insufficient headcount on shifts forces overtime and reduces production capacity."
  },

  {
    id: "mfg-equipment-training-gap",
    name: "Insufficient operator training for specific equipment",
    tier: 1,
    category: "Manpower",
    triggers: ["rework", "downtime"],
    supportSignals: ["machine_breakdown"],
    relatedKPIs: ["first_pass_yield", "mtbf"],
    description: "Operators lack training on specific machines, causing errors and equipment misuse."
  },

  {
    id: "mfg-absenteeism",
    name: "High absenteeism disrupting production manning",
    tier: 1,
    category: "Manpower",
    triggers: ["overtime_spike"],
    supportSignals: ["downtime"],
    relatedKPIs: ["absenteeism_rate", "overtime_ratio", "throughput"],
    description: "Unplanned absences leave production lines undermanned and reduce output."
  },

  {
    id: "mfg-new-operator-productivity",
    name: "New operator learning curve reducing line speed",
    tier: 1,
    category: "Manpower",
    triggers: ["rework"],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["first_pass_yield", "throughput", "labor_utilization"],
    description: "Recently onboarded operators produce at lower speed and higher defect rates."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 1 — MATERIALS (operational)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-quality-instability",
    name: "Quality instability causing rework and scrap",
    tier: 1,
    category: "Materials",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["first_pass_yield", "scrap_rate"],
    description: "Inconsistent product quality results in rework loops and material waste."
  },

  {
    id: "mfg-material-variability",
    name: "Material quality variability impacting production",
    tier: 1,
    category: "Materials",
    triggers: ["scrap"],
    supportSignals: ["rework"],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["scrap_rate", "incoming_quality"],
    description: "Incoming material inconsistencies cause defects during production."
  },

  {
    id: "mfg-material-shortage",
    name: "Material shortages disrupting production flow",
    tier: 1,
    category: "Materials",
    triggers: ["inventory_shortage"],
    supportSignals: ["downtime"],
    relatedKPIs: ["material_availability", "throughput"],
    description: "Insufficient materials halt or slow production operations."
  },

  {
    id: "mfg-incoming-quality",
    name: "Poor incoming material quality causing defects",
    tier: 1,
    category: "Materials",
    triggers: ["scrap"],
    supportSignals: ["rework"],
    relatedKPIs: ["incoming_quality", "scrap_rate"],
    description: "Supplier material defects cause downstream production failures."
  },

  {
    id: "mfg-supplier-late-delivery",
    name: "Late supplier deliveries delaying production",
    tier: 1,
    category: "Materials",
    triggers: ["inventory_shortage"],
    supportSignals: ["downtime", "overtime_spike"],
    relatedKPIs: ["supplier_otd", "material_availability"],
    description: "Suppliers consistently miss delivery dates, causing production line starvation."
  },

  {
    id: "mfg-high-scrap-rate",
    name: "High scrap rate from process instability",
    tier: 1,
    category: "Materials",
    triggers: ["scrap"],
    supportSignals: ["rework"],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["scrap_rate", "cost_per_unit", "first_pass_yield"],
    description: "Unstable process conditions generate excessive scrap volumes."
  },

  {
    id: "mfg-high-rework-rate",
    name: "High rework rate from quality deviations",
    tier: 1,
    category: "Materials",
    triggers: ["rework"],
    supportSignals: ["overtime_spike"],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["rework_rate", "first_pass_yield", "cost_per_unit"],
    description: "Quality deviations force repeated correction cycles that consume capacity."
  },

  {
    id: "mfg-wip-congestion",
    name: "Work-in-progress congestion blocking production flow",
    tier: 1,
    category: "Materials",
    triggers: ["inventory_buildup"],
    supportSignals: ["downtime"],
    relatedKPIs: ["wip_turns", "throughput", "lead_time"],
    description: "Excess WIP accumulates between workstations, obstructing material flow."
  },

  {
    id: "mfg-material-handling-damage",
    name: "Material handling damage increasing scrap",
    tier: 1,
    category: "Materials",
    triggers: ["scrap"],
    supportSignals: [],
    relatedKPIs: ["scrap_rate", "material_loss_rate"],
    description: "Poor material handling practices damage parts before or during production."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 1 — MONEY (operational)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-maintenance-cost-escalation",
    name: "Escalating maintenance costs reducing profitability",
    tier: 1,
    category: "Money",
    triggers: ["maintenance_backlog"],
    supportSignals: ["machine_breakdown", "downtime"],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["maintenance_cost_ratio", "cost_per_unit"],
    description: "Frequent breakdowns and emergency repairs drive maintenance spend above budget."
  },

  {
    id: "mfg-energy-cost-operational",
    name: "Energy cost increases affecting manufacturing margins",
    tier: 1,
    category: "Money",
    triggers: ["overtime_spike"],
    supportSignals: [],
    relatedKPIs: ["cost_per_unit", "energy_cost", "gross_margin"],
    description: "Extended operating hours and inefficient equipment drive energy costs above target."
  },

  {
    id: "mfg-scrap-cost",
    name: "High scrap losses increasing cost of goods sold",
    tier: 1,
    category: "Money",
    triggers: ["scrap"],
    supportSignals: ["rework"],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["scrap_rate", "cost_per_unit", "gross_margin"],
    description: "Material and labor embedded in scrapped output directly increase unit costs."
  },

  {
    id: "mfg-capital-utilization-operational",
    name: "Poor capital utilization reducing ROI on equipment",
    tier: 1,
    category: "Money",
    triggers: ["downtime"],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["oee", "roi", "utilization_rate"],
    description: "Equipment sits idle or runs below capacity, eroding return on capital invested."
  },

  {
    id: "mfg-overtime-cost",
    name: "Excessive overtime costs eroding production margins",
    tier: 1,
    category: "Money",
    triggers: ["overtime_spike"],
    supportSignals: [],
    relatedKPIs: ["overtime_ratio", "cost_per_unit", "labor_cost_ratio"],
    description: "Sustained overtime premiums inflate labor costs beyond planned budgets."
  },

  {
    id: "mfg-rework-cost",
    name: "Rework costs consuming production budget",
    tier: 1,
    category: "Money",
    triggers: ["rework"],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["rework_rate", "cost_per_unit", "gross_margin"],
    description: "Labor and materials spent on rework reduce effective production margin."
  },

  {
    id: "mfg-expediting-cost",
    name: "Expediting costs from rush orders and emergency shipments",
    tier: 1,
    category: "Money",
    triggers: ["inventory_shortage", "otd_decline"],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["cost_per_unit", "freight_cost", "supplier_otd"],
    description: "Emergency procurement and freight premiums inflate costs to meet delivery commitments."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 — MACHINERY (process / coordination)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-production-planning",
    name: "Production planning misaligned with sales demand volatility",
    tier: 2,
    category: "Machinery",
    triggers: ["otd_decline"],
    supportSignals: ["inventory_buildup", "overtime_spike"],
    relatedKPIs: ["otd", "schedule_adherence"],
    description: "Production schedules fail to adjust to changes in demand, causing frequent rescheduling."
  },

  {
    id: "mfg-production-scheduling",
    name: "Poor production scheduling causing frequent rescheduling",
    tier: 2,
    category: "Machinery",
    triggers: ["otd_decline", "overtime_spike"],
    supportSignals: ["downtime"],
    relatedKPIs: ["schedule_adherence", "throughput"],
    description: "Scheduling process lacks stability, causing constant plan changes and shop floor disruption."
  },

  {
    id: "mfg-lead-time-growth",
    name: "Production lead times increasing due to process inefficiencies",
    tier: 2,
    category: "Machinery",
    triggers: ["lead_time_increase"],
    supportSignals: [],
    relatedKPIs: ["cycle_time", "lead_time"],
    description: "Process delays lengthen the time required to produce finished goods."
  },

  {
    id: "mfg-machine-utilization-imbalance",
    name: "Uneven machine utilization across production lines",
    tier: 2,
    category: "Machinery",
    triggers: ["downtime"],
    supportSignals: [],
    relatedKPIs: ["utilization_rate", "oee"],
    description: "Some machines become bottlenecks while others remain idle."
  },

  {
    id: "mfg-maintenance-procedure-gap",
    name: "Lack of standardized maintenance procedures",
    tier: 2,
    category: "Machinery",
    triggers: ["maintenance_backlog"],
    supportSignals: ["machine_breakdown", "downtime"],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["mtbf", "mttr", "pm_compliance"],
    description: "Maintenance tasks are performed inconsistently due to missing or outdated procedures."
  },

  {
    id: "mfg-pm-planning-ineffective",
    name: "Ineffective preventive maintenance planning",
    tier: 2,
    category: "Machinery",
    triggers: ["maintenance_backlog", "downtime"],
    supportSignals: ["machine_breakdown"],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["pm_compliance", "mtbf", "oee"],
    description: "Preventive maintenance schedules are poorly designed or not followed, increasing breakdown risk."
  },

  {
    id: "mfg-process-instability",
    name: "Unstable production processes causing defect variation",
    tier: 2,
    category: "Machinery",
    triggers: ["rework", "scrap"],
    supportSignals: [],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["cpk", "first_pass_yield", "scrap_rate"],
    description: "Process parameters drift without detection, causing inconsistent output quality."
  },

  {
    id: "mfg-engineering-change-control",
    name: "Poor engineering change control causing specification confusion",
    tier: 2,
    category: "Machinery",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    relatedKPIs: ["first_pass_yield", "rework_rate"],
    description: "Engineering changes are not communicated or implemented consistently on the shop floor."
  },

  {
    id: "mfg-equipment-condition-monitoring",
    name: "Lack of equipment condition monitoring delaying fault detection",
    tier: 2,
    category: "Machinery",
    triggers: ["downtime", "machine_breakdown"],
    supportSignals: ["maintenance_backlog"],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["mtbf", "mttr", "availability"],
    description: "Equipment degradation goes undetected until failure occurs due to missing condition monitoring."
  },

  {
    id: "mfg-spc-absence",
    name: "Absence of statistical process control in critical operations",
    tier: 2,
    category: "Machinery",
    triggers: ["rework", "scrap"],
    supportSignals: [],
    relatedKPIs: ["cpk", "first_pass_yield", "scrap_rate"],
    description: "Process drift is not detected in real time, allowing defects to accumulate before correction."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 — MANPOWER (process / coordination)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-skill-gap",
    name: "Operator skill gaps affecting production stability",
    tier: 2,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework"],
    relatedKPIs: ["first_pass_yield"],
    description: "Production errors occur due to insufficient training or operator experience."
  },

  {
    id: "mfg-quality-inspection-bottleneck",
    name: "Insufficient quality control checkpoints in production flow",
    tier: 2,
    category: "Manpower",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    relatedKPIs: ["first_pass_yield", "throughput"],
    description: "Defects propagate through multiple operations before detection due to missing inspection gates."
  },

  {
    id: "mfg-supervision-gap",
    name: "Supervisory oversight gaps affecting shop floor execution",
    tier: 2,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework"],
    relatedKPIs: ["first_pass_yield"],
    description: "Lack of effective supervision allows production errors to propagate."
  },

  {
    id: "mfg-shift-handover",
    name: "Poor shift handover causing production errors",
    tier: 2,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework"],
    relatedKPIs: ["first_pass_yield", "rework_rate"],
    description: "Information loss during shift transitions causes mistakes."
  },

  {
    id: "mfg-training-gap",
    name: "Insufficient operator training reducing productivity",
    tier: 2,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework"],
    relatedKPIs: ["first_pass_yield"],
    description: "Operators lack the skills required for stable production."
  },

  {
    id: "mfg-production-discipline",
    name: "Weak production discipline affecting process consistency",
    tier: 2,
    category: "Manpower",
    triggers: [],
    supportSignals: ["scrap"],
    relatedKPIs: ["scrap_rate", "first_pass_yield"],
    description: "Standard operating procedures are inconsistently followed."
  },

  {
    id: "mfg-supervision-capacity",
    name: "Insufficient supervisory coverage on production floor",
    tier: 2,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework"],
    relatedKPIs: ["first_pass_yield", "rework_rate"],
    description: "Limited supervision allows small issues to escalate."
  },

  {
    id: "mfg-workforce-planning",
    name: "Insufficient workforce planning for demand variability",
    tier: 2,
    category: "Manpower",
    triggers: ["overtime_spike"],
    supportSignals: ["downtime"],
    relatedKPIs: ["overtime_ratio", "labor_utilization", "throughput"],
    description: "Manning plans do not flex with demand changes, causing chronic over- or understaffing."
  },

  {
    id: "mfg-training-program-ineffective",
    name: "Poor training programs for machine operators",
    tier: 2,
    category: "Manpower",
    triggers: ["rework"],
    supportSignals: ["scrap", "machine_breakdown"],
    relatedKPIs: ["first_pass_yield", "rework_rate", "mtbf"],
    description: "Training programs lack structure or relevance, leaving operators unprepared for production demands."
  },

  {
    id: "mfg-skill-concentration",
    name: "High dependency on a small number of skilled operators",
    tier: 2,
    category: "Manpower",
    triggers: ["overtime_spike"],
    supportSignals: ["downtime", "rework"],
    relatedKPIs: ["labor_utilization", "overtime_ratio"],
    description: "Critical production knowledge is concentrated in few individuals, creating single points of failure."
  },

  {
    id: "mfg-work-instruction-gap",
    name: "Lack of standardized work instructions for operators",
    tier: 2,
    category: "Manpower",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    relatedKPIs: ["first_pass_yield", "rework_rate"],
    description: "Operators perform tasks differently due to missing or outdated standard work instructions."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 — MATERIALS (process / coordination)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-supplier-instability",
    name: "Supplier reliability issues affecting production flow",
    tier: 2,
    category: "Materials",
    triggers: ["inventory_shortage"],
    supportSignals: [],
    relatedKPIs: ["supplier_otd"],
    description: "Supplier delays or inconsistent deliveries disrupt production scheduling."
  },

  {
    id: "mfg-inventory-misalignment",
    name: "Weak inventory planning causing stock imbalances",
    tier: 2,
    category: "Materials",
    triggers: ["inventory_buildup"],
    supportSignals: ["inventory_shortage"],
    relatedKPIs: ["inventory_turnover", "inventory_accuracy"],
    description: "Inventory planning does not balance supply with consumption, causing surpluses and shortages."
  },

  {
    id: "mfg-supplier-leadtime",
    name: "Supplier lead-time volatility destabilizing inventory",
    tier: 2,
    category: "Materials",
    triggers: ["inventory_shortage"],
    supportSignals: [],
    relatedKPIs: ["supplier_otd"],
    description: "Supplier delivery variability disrupts production planning."
  },

  {
    id: "mfg-batch-variation",
    name: "Batch variation in materials affecting consistency",
    tier: 2,
    category: "Materials",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    relatedKPIs: ["first_pass_yield", "scrap_rate"],
    description: "Material batch differences cause production variability."
  },

  {
    id: "mfg-inventory-visibility",
    name: "Poor inventory visibility causing supply mismatches",
    tier: 2,
    category: "Materials",
    triggers: ["inventory_buildup"],
    supportSignals: ["inventory_shortage"],
    relatedKPIs: ["inventory_accuracy", "inventory_turnover"],
    description: "Inventory tracking systems fail to reflect real stock levels."
  },

  {
    id: "mfg-supplier-performance-monitoring",
    name: "Lack of supplier performance monitoring",
    tier: 2,
    category: "Materials",
    triggers: ["inventory_shortage"],
    supportSignals: ["scrap"],
    relatedKPIs: ["supplier_otd", "incoming_quality"],
    description: "Supplier delivery and quality performance are not systematically tracked or managed."
  },

  {
    id: "mfg-supplier-quality-control",
    name: "Ineffective supplier quality control",
    tier: 2,
    category: "Materials",
    triggers: ["scrap"],
    supportSignals: ["rework"],
    relatedKPIs: ["incoming_quality", "scrap_rate"],
    description: "Incoming material inspection processes fail to catch supplier quality issues before production."
  },

  {
    id: "mfg-material-specification-drift",
    name: "Material specification drift across supplier batches",
    tier: 2,
    category: "Materials",
    triggers: ["rework", "scrap"],
    supportSignals: [],
    relatedKPIs: ["incoming_quality", "first_pass_yield"],
    description: "Suppliers gradually deviate from agreed specifications without formal notification."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 — MONEY (process / coordination)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-cost-tracking-weak",
    name: "Weak cost tracking across production processes",
    tier: 2,
    category: "Money",
    triggers: [],
    supportSignals: ["overtime_spike", "scrap"],
    relatedKPIs: ["cost_per_unit", "gross_margin"],
    description: "Production costs are not tracked at process level, hiding waste and inefficiency sources."
  },

  {
    id: "mfg-cost-allocation-unclear",
    name: "Unclear cost allocation for manufacturing operations",
    tier: 2,
    category: "Money",
    triggers: [],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["cost_per_unit", "gross_margin", "labor_cost_ratio"],
    description: "Overhead and indirect costs are not accurately allocated to products or processes."
  },

  {
    id: "mfg-budget-variance-unmanaged",
    name: "Unmanaged budget variances in production operations",
    tier: 2,
    category: "Money",
    triggers: ["overtime_spike"],
    supportSignals: ["scrap", "maintenance_backlog"],
    relatedKPIs: ["cost_per_unit", "gross_margin"],
    description: "Actual production costs consistently exceed budgets without corrective action."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 3 — MACHINERY (systemic / management)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-production-visibility-gap",
    name: "Lack of real-time production visibility for managers",
    tier: 3,
    category: "Machinery",
    triggers: ["downtime", "otd_decline"],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["oee", "throughput", "schedule_adherence"],
    description: "Management lacks real-time data on production status, delaying decisions on disruptions."
  },

  {
    id: "mfg-reactive-management-culture",
    name: "Reactive management culture focused on firefighting",
    tier: 3,
    category: "Machinery",
    triggers: ["downtime", "maintenance_backlog"],
    supportSignals: ["overtime_spike", "rework"],
    relatedKPIs: ["oee", "mtbf", "schedule_adherence"],
    description: "Management intervenes only after failures occur instead of preventing them systematically."
  },

  {
    id: "mfg-kpi-governance-weak",
    name: "Weak operational KPI governance across production lines",
    tier: 3,
    category: "Machinery",
    triggers: [],
    supportSignals: ["downtime", "rework", "scrap"],
    relatedKPIs: ["oee", "first_pass_yield", "throughput"],
    description: "KPIs are not consistently defined, measured, or acted upon across production areas."
  },

  {
    id: "mfg-cross-department-coordination",
    name: "Poor cross-department coordination between production and planning",
    tier: 3,
    category: "Machinery",
    triggers: ["otd_decline", "inventory_buildup"],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["schedule_adherence", "otd", "inventory_turnover"],
    description: "Production, planning, and sales operate in silos, causing misaligned priorities and schedules."
  },

  {
    id: "mfg-continuous-improvement-absent",
    name: "Lack of continuous improvement culture in operations",
    tier: 3,
    category: "Machinery",
    triggers: [],
    supportSignals: ["rework", "scrap", "downtime"],
    relatedKPIs: ["oee", "first_pass_yield", "cost_per_unit"],
    description: "No structured approach to identifying and eliminating recurring operational waste."
  },

  {
    id: "mfg-rca-absent",
    name: "No structured root cause analysis for recurring defects",
    tier: 3,
    category: "Machinery",
    triggers: ["rework", "scrap"],
    supportSignals: [],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["first_pass_yield", "scrap_rate", "rework_rate"],
    description: "Recurring quality problems are addressed symptomatically without identifying true root causes."
  },

  {
    id: "mfg-maintenance-strategy-weak",
    name: "Weak maintenance strategy across production facilities",
    tier: 3,
    category: "Machinery",
    triggers: ["maintenance_backlog", "downtime"],
    supportSignals: ["machine_breakdown"],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["mtbf", "mttr", "pm_compliance", "oee"],
    description: "No coherent maintenance strategy links equipment criticality to maintenance investment."
  },

  {
    id: "mfg-operational-data-fragmented",
    name: "Fragmented operational data preventing performance monitoring",
    tier: 3,
    category: "Machinery",
    triggers: [],
    supportSignals: ["downtime", "rework"],
    relatedKPIs: ["oee", "throughput", "first_pass_yield"],
    description: "Production data is scattered across disconnected systems, preventing holistic performance analysis."
  },

  {
    id: "mfg-metrics-unstandardized",
    name: "Lack of standardized operational metrics across plants",
    tier: 3,
    category: "Machinery",
    triggers: [],
    supportSignals: [],
    relatedKPIs: ["oee", "first_pass_yield", "throughput"],
    description: "Different production areas use inconsistent metrics, preventing meaningful comparison and benchmarking."
  },

  {
    id: "mfg-capital-investment-planning",
    name: "Poor capital investment planning for equipment upgrades",
    tier: 3,
    category: "Machinery",
    triggers: ["downtime", "maintenance_backlog"],
    supportSignals: ["machine_breakdown"],
    relatedKPIs: ["oee", "roi", "mtbf"],
    description: "Equipment replacement and upgrade decisions are reactive rather than planned against lifecycle data."
  },

  {
    id: "mfg-technology-adoption-lag",
    name: "Slow technology adoption limiting production capability",
    tier: 3,
    category: "Machinery",
    triggers: [],
    supportSignals: ["downtime"],
    relatedKPIs: ["oee", "throughput", "cost_per_unit"],
    description: "Outdated technology constrains production capability while competitors advance."
  },

  {
    id: "mfg-capacity-planning-strategic",
    name: "Weak long-term capacity planning against market growth",
    tier: 3,
    category: "Machinery",
    triggers: ["overtime_spike", "otd_decline"],
    supportSignals: ["inventory_buildup"],
    relatedKPIs: ["utilization_rate", "throughput", "otd"],
    description: "Capacity expansion decisions lag behind demand growth, creating chronic constraint."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 3 — MANPOWER (systemic / management)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-workforce-development-strategy",
    name: "Weak workforce development strategy",
    tier: 3,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework", "overtime_spike"],
    relatedKPIs: ["first_pass_yield", "labor_utilization", "overtime_ratio"],
    description: "No systematic plan for developing operator skills aligned with production technology requirements."
  },

  {
    id: "mfg-skill-certification-absent",
    name: "Lack of structured operator skill certification",
    tier: 3,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework"],
    relatedKPIs: ["first_pass_yield", "rework_rate"],
    description: "No formal certification process validates operator competency before assignment to critical tasks."
  },

  {
    id: "mfg-retention-strategy-weak",
    name: "Weak employee retention strategy increasing turnover",
    tier: 3,
    category: "Manpower",
    triggers: ["overtime_spike"],
    supportSignals: ["downtime"],
    relatedKPIs: ["turnover_rate", "overtime_ratio", "labor_utilization"],
    description: "High turnover of skilled operators erodes production capability and increases training costs."
  },

  {
    id: "mfg-succession-planning-absent",
    name: "No succession planning for critical production roles",
    tier: 3,
    category: "Manpower",
    triggers: [],
    supportSignals: ["overtime_spike", "downtime"],
    relatedKPIs: ["labor_utilization", "overtime_ratio"],
    description: "Departure of key personnel creates immediate capability gaps with no prepared replacements."
  },

  {
    id: "mfg-safety-culture-weak",
    name: "Weak safety culture increasing incident risk",
    tier: 3,
    category: "Manpower",
    triggers: [],
    supportSignals: ["downtime", "overtime_spike"],
    relatedKPIs: ["incident_rate", "lost_time_injury"],
    description: "Safety is not embedded in operational culture, increasing incident frequency and production disruption."
  },

  {
    id: "mfg-knowledge-management-absent",
    name: "No knowledge management system for production expertise",
    tier: 3,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework"],
    relatedKPIs: ["first_pass_yield", "rework_rate"],
    description: "Critical production knowledge exists only in individuals' heads and is lost when they leave."
  },

  {
    id: "mfg-performance-management-weak",
    name: "Weak performance management system for production staff",
    tier: 3,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework", "scrap"],
    relatedKPIs: ["first_pass_yield", "labor_utilization"],
    description: "No structured feedback or accountability system links individual performance to production outcomes."
  },

  {
    id: "mfg-organizational-structure-misaligned",
    name: "Organizational structure misaligned with production priorities",
    tier: 3,
    category: "Manpower",
    triggers: [],
    supportSignals: ["overtime_spike", "rework"],
    relatedKPIs: ["throughput", "schedule_adherence"],
    description: "Reporting lines and role definitions do not support efficient production decision-making."
  },

  {
    id: "mfg-leadership-development-gap",
    name: "Lack of leadership development for production supervisors",
    tier: 3,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework", "overtime_spike"],
    relatedKPIs: ["first_pass_yield", "throughput"],
    description: "Supervisors are promoted without management training, reducing shop floor effectiveness."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 3 — MATERIALS (systemic / management)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-supplier-collaboration-strategy",
    name: "Weak supplier collaboration strategy",
    tier: 3,
    category: "Materials",
    triggers: ["inventory_shortage"],
    supportSignals: ["scrap"],
    relatedKPIs: ["supplier_otd", "incoming_quality"],
    description: "Supplier relationships are transactional rather than collaborative, limiting joint improvement."
  },

  {
    id: "mfg-supply-chain-resilience",
    name: "Lack of long-term supply chain resilience planning",
    tier: 3,
    category: "Materials",
    triggers: ["inventory_shortage"],
    supportSignals: ["downtime"],
    relatedKPIs: ["supplier_otd", "material_availability"],
    description: "Supply chain is vulnerable to disruption due to single-source dependencies and no contingency plans."
  },

  {
    id: "mfg-inventory-strategy-misaligned",
    name: "Inventory strategy misaligned with production complexity",
    tier: 3,
    category: "Materials",
    triggers: ["inventory_buildup", "inventory_shortage"],
    supportSignals: [],
    relatedKPIs: ["inventory_turnover", "inventory_accuracy"],
    description: "Inventory policies do not reflect product mix complexity, lead time variability, or demand patterns."
  },

  {
    id: "mfg-supplier-development-absent",
    name: "No supplier development program for critical materials",
    tier: 3,
    category: "Materials",
    triggers: ["scrap"],
    supportSignals: ["inventory_shortage"],
    relatedKPIs: ["incoming_quality", "supplier_otd"],
    description: "No structured effort to improve supplier capabilities for quality and delivery performance."
  },

  {
    id: "mfg-material-standardization-weak",
    name: "Weak material standardization increasing procurement complexity",
    tier: 3,
    category: "Materials",
    triggers: ["inventory_buildup"],
    supportSignals: [],
    relatedKPIs: ["inventory_turnover", "cost_per_unit"],
    description: "Excessive material variants inflate inventory and complicate procurement without adding value."
  },

  {
    id: "mfg-demand-supply-integration",
    name: "Poor demand-supply integration across planning horizons",
    tier: 3,
    category: "Materials",
    triggers: ["inventory_buildup", "otd_decline"],
    supportSignals: ["inventory_shortage"],
    relatedKPIs: ["forecast_accuracy", "inventory_turnover", "otd"],
    description: "Sales forecasts, production plans, and procurement are not synchronized across time horizons."
  },

  {
    id: "mfg-quality-system-maturity",
    name: "Low quality management system maturity",
    tier: 3,
    category: "Materials",
    triggers: ["rework", "scrap"],
    supportSignals: [],
    diagnosticChains: ["quality_breakdown_chain"],
    relatedKPIs: ["first_pass_yield", "scrap_rate", "rework_rate"],
    description: "Quality management lacks systematic processes for prevention, detection, and continuous improvement."
  },

  {
    id: "mfg-traceability-gap",
    name: "Lack of material traceability across production processes",
    tier: 3,
    category: "Materials",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    relatedKPIs: ["first_pass_yield", "scrap_rate"],
    description: "Materials cannot be traced from receipt through production, hindering defect investigation."
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 3 — MONEY (systemic / management)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "mfg-demand-volatility",
    name: "Demand fluctuations destabilizing production schedules",
    tier: 3,
    category: "Money",
    triggers: ["inventory_buildup"],
    supportSignals: ["otd_decline"],
    relatedKPIs: ["forecast_accuracy", "inventory_turnover"],
    description: "Sudden demand changes disrupt production planning and capacity usage."
  },

  {
    id: "mfg-margin-erosion",
    name: "Margin erosion from rising production costs",
    tier: 3,
    category: "Money",
    triggers: [],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["cost_per_unit", "gross_margin"],
    description: "Operational inefficiencies increase cost per unit."
  },

  {
    id: "mfg-forecast-inaccuracy",
    name: "Forecast inaccuracies disrupting production planning",
    tier: 3,
    category: "Money",
    triggers: ["inventory_buildup"],
    supportSignals: ["inventory_shortage"],
    relatedKPIs: ["forecast_accuracy", "inventory_turnover"],
    description: "Inaccurate demand forecasting leads to unstable production planning."
  },

  {
    id: "mfg-energy-cost-spike",
    name: "Structural energy cost increases affecting margins",
    tier: 3,
    category: "Money",
    triggers: [],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["cost_per_unit", "energy_cost"],
    description: "Systemic energy price increases erode manufacturing profitability."
  },

  {
    id: "mfg-maintenance-cost",
    name: "Systemic maintenance cost overruns reducing profitability",
    tier: 3,
    category: "Money",
    triggers: ["maintenance_backlog"],
    supportSignals: [],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["maintenance_cost_ratio"],
    description: "Chronic underinvestment in maintenance drives escalating repair expenditure."
  },

  {
    id: "mfg-production-waste",
    name: "Production waste increasing cost of goods sold",
    tier: 3,
    category: "Money",
    triggers: ["scrap"],
    supportSignals: ["rework"],
    relatedKPIs: ["scrap_rate", "cost_per_unit"],
    description: "High scrap and rework increase manufacturing costs."
  },

  {
    id: "mfg-capital-utilization",
    name: "Strategic capital utilization gap reducing equipment ROI",
    tier: 3,
    category: "Money",
    triggers: ["downtime"],
    supportSignals: [],
    relatedKPIs: ["oee", "roi"],
    description: "Long-term equipment underutilization reduces capital efficiency."
  },

  {
    id: "mfg-cost-structure",
    name: "Cost structure imbalance affecting manufacturing margins",
    tier: 3,
    category: "Money",
    triggers: [],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["gross_margin", "cost_per_unit"],
    description: "Inefficient cost allocation reduces profitability."
  },

  {
    id: "mfg-financial-visibility",
    name: "Lack of financial visibility into operational efficiency",
    tier: 3,
    category: "Money",
    triggers: [],
    supportSignals: ["overtime_spike", "scrap"],
    relatedKPIs: ["cost_per_unit", "gross_margin", "roi"],
    description: "Financial reporting does not connect operational performance to cost outcomes at process level."
  },

  {
    id: "mfg-investment-prioritization",
    name: "Poor investment prioritization for operational improvements",
    tier: 3,
    category: "Money",
    triggers: [],
    supportSignals: ["downtime", "maintenance_backlog"],
    relatedKPIs: ["roi", "oee", "cost_per_unit"],
    description: "Capital and operational improvement budgets are allocated without data-driven prioritization."
  },

  {
    id: "mfg-total-cost-ownership-absent",
    name: "No total cost of ownership analysis for equipment decisions",
    tier: 3,
    category: "Money",
    triggers: ["maintenance_backlog"],
    supportSignals: ["downtime"],
    relatedKPIs: ["roi", "maintenance_cost_ratio", "oee"],
    description: "Equipment purchase decisions consider acquisition cost only, ignoring lifetime operating costs."
  },

  {
    id: "mfg-profitability-analysis-gap",
    name: "Lack of product-level profitability analysis",
    tier: 3,
    category: "Money",
    triggers: [],
    supportSignals: ["overtime_spike", "scrap"],
    relatedKPIs: ["gross_margin", "cost_per_unit"],
    description: "Unable to identify which products or orders are profitable versus loss-making."
  },

  {
    id: "mfg-working-capital-management",
    name: "Poor working capital management in manufacturing operations",
    tier: 3,
    category: "Money",
    triggers: ["inventory_buildup"],
    supportSignals: [],
    relatedKPIs: ["inventory_turnover", "cash_conversion_cycle"],
    description: "Excess inventory and slow receivables tie up capital needed for operational improvements."
  },

  {
    id: "mfg-automation-strategy-absent",
    name: "No automation strategy for repetitive production tasks",
    tier: 3,
    category: "Machinery",
    triggers: [],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["throughput", "cost_per_unit", "labor_utilization"],
    description: "Manual processes persist where automation would improve consistency and reduce labor dependency."
  },

  {
    id: "mfg-change-management-weak",
    name: "Weak change management for production process updates",
    tier: 3,
    category: "Manpower",
    triggers: ["rework"],
    supportSignals: ["scrap"],
    relatedKPIs: ["first_pass_yield", "rework_rate"],
    description: "Process changes are implemented without structured communication, training, or validation."
  },

  {
    id: "mfg-supplier-risk-management",
    name: "Lack of supplier risk management framework",
    tier: 3,
    category: "Materials",
    triggers: ["inventory_shortage"],
    supportSignals: [],
    relatedKPIs: ["supplier_otd", "material_availability"],
    description: "No formal assessment of supplier financial health, capacity constraints, or geopolitical risk."
  },

  {
    id: "mfg-waste-reduction-strategy",
    name: "No systematic waste reduction strategy across operations",
    tier: 3,
    category: "Money",
    triggers: ["scrap"],
    supportSignals: ["rework", "overtime_spike"],
    relatedKPIs: ["scrap_rate", "cost_per_unit", "gross_margin"],
    description: "Waste is accepted as normal rather than systematically targeted for reduction."
  },

  {
    id: "mfg-benchmarking-absent",
    name: "Lack of operational benchmarking against industry standards",
    tier: 3,
    category: "Machinery",
    triggers: [],
    supportSignals: [],
    relatedKPIs: ["oee", "first_pass_yield", "cost_per_unit"],
    description: "Performance is measured in isolation without comparison to industry or competitor benchmarks."
  },

  {
    id: "mfg-shift-pattern-strategy",
    name: "Shift pattern strategy misaligned with production demand",
    tier: 3,
    category: "Manpower",
    triggers: ["overtime_spike"],
    supportSignals: ["downtime"],
    relatedKPIs: ["overtime_ratio", "utilization_rate", "throughput"],
    description: "Shift structures do not flex with demand cycles, causing chronic over- or understaffing."
  }

];
