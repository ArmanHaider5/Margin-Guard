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

    description:
      "Maintenance is performed only after breakdowns occur, leading to repeated equipment stoppages and productivity loss.",

    triggerSignals: [
      "downtime",
      "maintenance_backlog"
    ],

    supportingSignals: [
      "capacity_constraint",
      "overtime_spike"
    ]
  },

  {
    id: "mfg-capacity-bottleneck",

    category: "Machinery",

    name: "Production bottleneck limiting throughput",

    description:
      "Production capacity is constrained by equipment or process bottlenecks, reducing output and increasing overtime.",

    triggerSignals: [
      "capacity_constraint"
    ],

    supportingSignals: [
      "downtime",
      "overtime_spike"
    ]
  },

  {
    id: "mfg-margin-erosion",

    category: "Money",

    name: "Margin erosion due to cost escalation",

    description:
      "Production or procurement costs are increasing faster than selling prices, compressing margins.",

    triggerSignals: [
      "margin_erosion"
    ],

    supportingSignals: [
      "inventory_buildup",
      "material_shortage"
    ]
  },

  {
    id: "mfg-workforce-overload",

    category: "Manpower",

    name: "Workforce overload causing operational instability",

    description:
      "High overtime and staff turnover indicate workforce stress and unstable operations.",

    triggerSignals: [
      "overtime_spike",
      "staff_turnover"
    ],

    supportingSignals: [
      "downtime"
    ]
  }

];
