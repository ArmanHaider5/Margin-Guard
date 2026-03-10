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
    name: "Poor changeover planning reducing production efficiency",
    tier: 2,
    category: "Machinery",
    triggers: ["downtime"],
    supportSignals: [],
    relatedKPIs: ["changeover_time", "oee"],
    description: "Frequent product switches cause avoidable production loss."
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
    id: "mfg-material-shortage",
    name: "Material shortages disrupting production schedules",
    tier: 1,
    category: "Materials",
    triggers: ["inventory_shortage"],
    supportSignals: [],
    relatedKPIs: ["material_availability"],
    description: "Insufficient materials halt production operations."
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
    id: "mfg-incoming-quality",
    name: "Incoming material quality issues increasing defects",
    tier: 1,
    category: "Materials",
    triggers: ["scrap"],
    supportSignals: ["rework"],
    relatedKPIs: ["incoming_quality", "scrap_rate"],
    description: "Supplier material defects cause downstream production failures."
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
    id: "mfg-energy-cost-spike",
    name: "Energy cost increases affecting manufacturing margins",
    tier: 3,
    category: "Money",
    triggers: [],
    supportSignals: ["overtime_spike"],
    relatedKPIs: ["cost_per_unit", "energy_cost"],
    description: "Energy usage increases production cost per unit."
  },

  {
    id: "mfg-maintenance-cost",
    name: "Escalating maintenance costs reducing profitability",
    tier: 3,
    category: "Money",
    triggers: ["maintenance_backlog"],
    supportSignals: [],
    diagnosticChains: ["maintenance_failure_chain"],
    relatedKPIs: ["maintenance_cost_ratio"],
    description: "Equipment failures increase maintenance expenditure."
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
    name: "Poor capital utilization reducing ROI on equipment",
    tier: 3,
    category: "Money",
    triggers: ["downtime"],
    supportSignals: [],
    relatedKPIs: ["oee", "roi"],
    description: "Underutilized equipment reduces capital efficiency."
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
