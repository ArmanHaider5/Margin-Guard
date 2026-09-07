export type SignalCategory =
  | "Money"
  | "Manpower"
  | "Machinery"
  | "Materials";

export interface SignalDefinition {
  id: string;
  category: SignalCategory;
  synonyms: string[];
}

export const SIGNAL_LIBRARY: SignalDefinition[] = [

  // =====================
  // MACHINERY SIGNALS
  // =====================

  {
    id: "downtime",
    category: "Machinery",
    synonyms: [
      "machine stoppage",
      "equipment outage",
      "production halt",
      "line stoppage",
      "availability loss",
      "unplanned downtime"
    ]
  },

  {
    id: "maintenance_backlog",
    category: "Machinery",
    synonyms: [
      "pm overdue",
      "preventive maintenance overdue",
      "maintenance backlog",
      "delayed maintenance",
      "service overdue"
    ]
  },

  {
    id: "capacity_constraint",
    category: "Machinery",
    synonyms: [
      "production bottleneck",
      "capacity constraint",
      "throughput limitation",
      "line capacity issue"
    ]
  },

  // =====================
  // MANPOWER SIGNALS
  // =====================

  {
    id: "overtime_spike",
    category: "Manpower",
    synonyms: [
      "overtime hours",
      "excess overtime",
      "extended shifts",
      "extra working hours"
    ]
  },

  {
    id: "staff_turnover",
    category: "Manpower",
    synonyms: [
      "staff leaving",
      "employee turnover",
      "resignations",
      "high attrition"
    ]
  },

  // =====================
  // MONEY SIGNALS
  // =====================

  {
    id: "margin_erosion",
    category: "Money",
    synonyms: [
      "margin pressure",
      "profit compression",
      "cost escalation",
      "shrinking margins"
    ]
  },

  {
    id: "cash_flow_pressure",
    category: "Money",
    synonyms: [
      "cash flow tight",
      "liquidity pressure",
      "working capital stress",
      "cash shortage"
    ]
  },

  // =====================
  // MATERIAL SIGNALS
  // =====================

  {
    id: "inventory_buildup",
    category: "Materials",
    synonyms: [
      "excess inventory",
      "stock accumulation",
      "warehouse overflow"
    ]
  },

  {
    id: "material_shortage",
    category: "Materials",
    synonyms: [
      "material shortage",
      "supplier delay",
      "raw material shortage"
    ]
  }

];
