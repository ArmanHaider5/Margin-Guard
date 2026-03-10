export const manufacturingKPIs = {

  downtime: {
    name: "Machine Downtime",
    unit: "hours/week",
    category: "Machinery",
    description: "Total machine downtime during production",
    good: 6,
    average: 12,
    poor: 20
  },

  overtime: {
    name: "Labour Overtime",
    unit: "%",
    category: "Manpower",
    description: "Percentage of labour overtime",
    good: 5,
    average: 10,
    poor: 20
  },

  scrap_rate: {
    name: "Scrap Rate",
    unit: "%",
    category: "Materials",
    description: "Percentage of defective scrap produced",
    good: 1,
    average: 3,
    poor: 6
  },

  rework_rate: {
    name: "Rework Rate",
    unit: "%",
    category: "Materials",
    description: "Percentage of reworked production output",
    good: 2,
    average: 5,
    poor: 10
  },

  lead_time: {
    name: "Production Lead Time",
    unit: "days",
    category: "Process",
    description: "Average production lead time from order to completion",
    good: 3,
    average: 7,
    poor: 14
  },

  otd: {
    name: "On Time Delivery",
    unit: "%",
    category: "Process",
    description: "Percentage of orders delivered on time",
    good: 95,
    average: 85,
    poor: 70
  },

  inventory_turnover: {
    name: "Inventory Turnover",
    unit: "turns/year",
    category: "Materials",
    description: "Frequency of inventory replenishment",
    good: 10,
    average: 6,
    poor: 3
  }

};
