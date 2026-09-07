export interface RootCauseSignalMap {

  rootCauseId: string;

  primarySignals: string[];

  secondarySignals: string[];

}

export const ROOT_CAUSE_SIGNAL_MAPS: RootCauseSignalMap[] = [

  {
    rootCauseId: "mfg-maintenance-reactive",

    primarySignals: [
      "downtime",
      "maintenance_backlog"
    ],

    secondarySignals: [
      "capacity_constraint",
      "overtime_spike"
    ]
  },

  {
    rootCauseId: "mfg-capacity-bottleneck",

    primarySignals: [
      "capacity_constraint"
    ],

    secondarySignals: [
      "downtime",
      "overtime_spike"
    ]
  },

  {
    rootCauseId: "mfg-equipment-aging",

    primarySignals: [
      "downtime"
    ],

    secondarySignals: [
      "maintenance_backlog"
    ]
  },

  {
    rootCauseId: "mfg-workforce-overload",

    primarySignals: [
      "overtime_spike"
    ],

    secondarySignals: [
      "staff_turnover"
    ]
  },

  {
    rootCauseId: "mfg-skill-gap",

    primarySignals: [
      "staff_turnover"
    ],

    secondarySignals: [
      "downtime"
    ]
  },

  {
    rootCauseId: "mfg-quality-loop",

    primarySignals: [
      "inventory_buildup"
    ],

    secondarySignals: [
      "material_shortage"
    ]
  },

  {
    rootCauseId: "mfg-supply-disruption",

    primarySignals: [
      "material_shortage"
    ],

    secondarySignals: [
      "inventory_buildup"
    ]
  },

  {
    rootCauseId: "mfg-margin-erosion",

    primarySignals: [
      "margin_erosion"
    ],

    secondarySignals: [
      "inventory_buildup"
    ]
  },

  {
    rootCauseId: "mfg-cashflow-pressure",

    primarySignals: [
      "cash_flow_pressure"
    ],

    secondarySignals: [
      "margin_erosion"
    ]
  },

  {
    rootCauseId: "mfg-planning-instability",

    primarySignals: [
      "capacity_constraint"
    ],

    secondarySignals: [
      "overtime_spike"
    ]
  }

];
