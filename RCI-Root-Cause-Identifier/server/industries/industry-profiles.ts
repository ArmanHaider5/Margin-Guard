export const industryProfiles: Record<string, { kpis: string[] }> = {

  manufacturing: {

    kpis: [
      "downtime",
      "overtime",
      "on-time delivery",
      "otd",
      "rework",
      "scrap",
      "inventory",
      "lead time",
      "utilization",
      "throughput"
    ]

  },

  logistics: {

    kpis: [
      "delivery time",
      "late deliveries",
      "fleet utilization",
      "fuel cost",
      "route efficiency",
      "warehouse throughput",
      "inventory turnover"
    ]

  },

  healthcare: {

    kpis: [
      "patient wait time",
      "bed occupancy",
      "surgery utilization",
      "staff overtime",
      "patient throughput",
      "readmission rate"
    ]

  },

  retail: {

    kpis: [
      "inventory turnover",
      "stockouts",
      "sell-through rate",
      "foot traffic",
      "average basket size",
      "margin"
    ]

  },

  finance: {

    kpis: [
      "margin",
      "cost ratio",
      "revenue growth",
      "cash flow",
      "operating expense",
      "burn rate"
    ]

  },

  event_management: {

    kpis: [
      "on-time setup",
      "event readiness",
      "equipment utilization",
      "rental turnaround",
      "damaged items",
      "missing items",
      "late deliveries",
      "event overtime",
      "crew overtime",
      "supplier delay",
      "inventory accuracy",
      "booking lead time",
      "setup completion",
      "event margin",
      "complaints",
      "client cancellations",
      "return delays"
    ]

  }

};
