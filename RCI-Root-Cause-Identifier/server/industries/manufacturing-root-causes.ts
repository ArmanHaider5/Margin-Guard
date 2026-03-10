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
  // TIER 2 — PROCESS LEVEL
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
    name: "Inventory imbalance causing production inefficiencies",
    tier: 2,
    category: "Materials",
    triggers: ["inventory_buildup"],
    supportSignals: [],
    relatedKPIs: ["inventory_turnover"],
    description: "Excess or insufficient inventory levels disrupt production flow."
  },

  {
    id: "mfg-production-planning",
    name: "Production planning misaligned with demand volatility",
    tier: 2,
    category: "Machinery",
    triggers: ["otd_decline"],
    supportSignals: ["inventory_buildup"],
    relatedKPIs: ["otd", "schedule_adherence"],
    description: "Production schedules fail to adjust to changes in demand."
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
    id: "mfg-quality-inspection-bottleneck",
    name: "Quality inspection bottleneck slowing production flow",
    tier: 2,
    category: "Manpower",
    triggers: ["rework"],
    supportSignals: [],
    relatedKPIs: ["first_pass_yield", "throughput"],
    description: "Inspection processes create delays in production throughput."
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
    id: "mfg-shift-handover",
    name: "Poor shift handover causing production errors",
    tier: 2,
    category: "Manpower",
    triggers: [],
    supportSignals: ["rework"],
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
    description: "Limited supervision allows small issues to escalate."
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

  // ═══════════════════════════════════════════════════════════════
  // TIER 3 — MANAGEMENT / FINANCIAL
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
  }

];
