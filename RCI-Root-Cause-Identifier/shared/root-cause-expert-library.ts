export interface ExpertRootCause {

  id: string;

  category:
    | "Money"
    | "Manpower"
    | "Machinery"
    | "Materials";

  name: string;

  description: string;

  triggerSignals: string[];

  supportingSignals: string[];

}

export const EXPERT_ROOT_CAUSES: ExpertRootCause[] = [

  {
    id: "mfg-maintenance-reactive",
    category: "Machinery",
    name: "Reactive maintenance causing unplanned downtime",
    description: "Maintenance occurs only after breakdowns instead of scheduled preventive servicing.",
    triggerSignals: ["downtime", "maintenance_backlog"],
    supportingSignals: ["capacity_constraint", "overtime_spike"]
  },

  {
    id: "mfg-capacity-bottleneck",
    category: "Machinery",
    name: "Production bottleneck limiting throughput",
    description: "Production capacity constrained by equipment limitations or process bottlenecks.",
    triggerSignals: ["capacity_constraint"],
    supportingSignals: ["downtime", "overtime_spike"]
  },

  {
    id: "mfg-equipment-aging",
    category: "Machinery",
    name: "Aging equipment reducing reliability",
    description: "Old equipment results in frequent failures and lower efficiency.",
    triggerSignals: ["downtime"],
    supportingSignals: ["maintenance_backlog"]
  },

  {
    id: "mfg-workforce-overload",
    category: "Manpower",
    name: "Workforce overload causing instability",
    description: "Excess overtime indicates insufficient staffing or poor workload distribution.",
    triggerSignals: ["overtime_spike"],
    supportingSignals: ["staff_turnover"]
  },

  {
    id: "mfg-skill-gap",
    category: "Manpower",
    name: "Operational skill gap affecting productivity",
    description: "Lack of experienced operators reduces efficiency and increases defects.",
    triggerSignals: ["staff_turnover"],
    supportingSignals: ["downtime"]
  },

  {
    id: "mfg-quality-loop",
    category: "Materials",
    name: "Recurring defects causing rework cycles",
    description: "Defects repeatedly appear because root causes are not permanently resolved.",
    triggerSignals: ["inventory_buildup"],
    supportingSignals: ["material_shortage"]
  },

  {
    id: "mfg-supply-disruption",
    category: "Materials",
    name: "Supply chain disruption impacting production",
    description: "Supplier delays or shortages interrupt production flow.",
    triggerSignals: ["material_shortage"],
    supportingSignals: ["inventory_buildup"]
  },

  {
    id: "mfg-margin-erosion",
    category: "Money",
    name: "Margin erosion from cost escalation",
    description: "Production costs increase faster than revenue growth.",
    triggerSignals: ["margin_erosion"],
    supportingSignals: ["inventory_buildup"]
  },

  {
    id: "mfg-cashflow-pressure",
    category: "Money",
    name: "Operational cash flow pressure",
    description: "Working capital stress from delayed payments or high operating costs.",
    triggerSignals: ["cash_flow_pressure"],
    supportingSignals: ["margin_erosion"]
  },

  {
    id: "mfg-planning-instability",
    category: "Machinery",
    name: "Production planning instability",
    description: "Frequent schedule changes disrupt production flow and efficiency.",
    triggerSignals: ["capacity_constraint"],
    supportingSignals: ["overtime_spike"]
  }

];
