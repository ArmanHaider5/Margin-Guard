export const manufacturingRootCauses = [

  {
    id: "mfg-maintenance-reactive",
    name: "Reactive maintenance causing unplanned downtime",
    category: "Machinery",
    triggers: [
      "maintenance_backlog",
      "downtime"
    ],
    support: [
      "machine_breakdown",
      "repair_activity"
    ],
    description:
      "Maintenance occurs only after breakdowns instead of scheduled preventive servicing."
  },

  {
    id: "mfg-equipment-aging",
    name: "Aging equipment reducing reliability",
    category: "Machinery",
    triggers: [
      "downtime"
    ],
    support: [
      "machine_breakdown"
    ],
    description:
      "Old equipment results in frequent failures and lower efficiency."
  },

  {
    id: "mfg-capacity-bottleneck",
    name: "Production bottleneck limiting output capacity",
    category: "Machinery",
    triggers: [
      "overtime_spike"
    ],
    support: [
      "downtime"
    ],
    description:
      "Production throughput is limited by one or more constrained workstations."
  },

  {
    id: "mfg-workforce-overload",
    name: "Workforce overload from sustained overtime",
    category: "Manpower",
    triggers: [
      "overtime_spike"
    ],
    support: [],
    description:
      "Operators are consistently working extended hours to maintain production output."
  },

  {
    id: "mfg-skill-gap",
    name: "Operator skill gaps affecting production stability",
    category: "Manpower",
    triggers: [],
    support: [
      "rework"
    ],
    description:
      "Production errors occur due to insufficient training or operator experience."
  },

  {
    id: "mfg-quality-instability",
    name: "Quality instability causing rework and scrap",
    category: "Materials",
    triggers: [
      "rework"
    ],
    support: [
      "scrap"
    ],
    description:
      "Inconsistent product quality results in rework loops and material waste."
  },

  {
    id: "mfg-material-variability",
    name: "Material quality variability impacting production",
    category: "Materials",
    triggers: [
      "scrap"
    ],
    support: [
      "rework"
    ],
    description:
      "Incoming material inconsistencies cause defects during production."
  },

  {
    id: "mfg-supplier-instability",
    name: "Supplier reliability issues affecting production flow",
    category: "Materials",
    triggers: [
      "inventory_shortage"
    ],
    support: [],
    description:
      "Supplier delays or inconsistent deliveries disrupt production scheduling."
  },

  {
    id: "mfg-inventory-misalignment",
    name: "Inventory imbalance causing production inefficiencies",
    category: "Materials",
    triggers: [
      "inventory_buildup"
    ],
    support: [],
    description:
      "Excess or insufficient inventory levels disrupt production flow."
  },

  {
    id: "mfg-production-planning",
    name: "Production planning misaligned with demand volatility",
    category: "Machinery",
    triggers: [
      "otd_decline"
    ],
    support: [
      "inventory_buildup"
    ],
    description:
      "Production schedules fail to adjust to changes in demand."
  },

  {
    id: "mfg-changeover-inefficiency",
    name: "Frequent changeovers reducing effective production time",
    category: "Machinery",
    triggers: [
      "downtime"
    ],
    support: [],
    description:
      "Production lines spend excessive time switching between product variants."
  },

  {
    id: "mfg-maintenance-backlog",
    name: "Preventive maintenance backlog increasing failure risk",
    category: "Machinery",
    triggers: [
      "maintenance_backlog"
    ],
    support: [],
    description:
      "Delayed preventive maintenance increases breakdown probability."
  },

  {
    id: "mfg-demand-volatility",
    name: "Demand fluctuations destabilizing production schedules",
    category: "Money",
    triggers: [
      "inventory_buildup"
    ],
    support: [
      "otd_decline"
    ],
    description:
      "Sudden demand changes disrupt production planning and capacity usage."
  },

  {
    id: "mfg-margin-erosion",
    name: "Margin erosion from rising production costs",
    category: "Money",
    triggers: [],
    support: [
      "overtime_spike"
    ],
    description:
      "Operational inefficiencies increase cost per unit."
  },

  {
    id: "mfg-lead-time-growth",
    name: "Production lead times increasing due to process inefficiencies",
    category: "Machinery",
    triggers: [
      "lead_time_increase"
    ],
    support: [],
    description:
      "Process delays lengthen the time required to produce finished goods."
  },

  {
    id: "mfg-quality-inspection-bottleneck",
    name: "Quality inspection bottleneck slowing production flow",
    category: "Manpower",
    triggers: [
      "rework"
    ],
    support: [],
    description:
      "Inspection processes create delays in production throughput."
  },

  {
    id: "mfg-supervision-gap",
    name: "Supervisory oversight gaps affecting shop floor execution",
    category: "Manpower",
    triggers: [],
    support: [
      "rework"
    ],
    description:
      "Lack of effective supervision allows production errors to propagate."
  },

  {
    id: "mfg-process-variability",
    name: "Process variability reducing production consistency",
    category: "Machinery",
    triggers: [
      "rework"
    ],
    support: [
      "scrap"
    ],
    description:
      "Inconsistent process conditions lead to fluctuating output quality."
  },

  {
    id: "mfg-utilization-loss",
    name: "Low equipment utilization reducing output efficiency",
    category: "Machinery",
    triggers: [
      "downtime"
    ],
    support: [],
    description:
      "Machines are idle for significant periods, reducing production capacity."
  },

  {
    id: "mfg-forecast-inaccuracy",
    name: "Forecast inaccuracies disrupting production planning",
    category: "Money",
    triggers: [
      "inventory_buildup"
    ],
    support: [
      "inventory_shortage"
    ],
    description:
      "Inaccurate demand forecasting leads to unstable production planning."
  }

];
