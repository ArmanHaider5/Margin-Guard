export const logisticsSignals = [

  {
    signal: "route_delay",
    description: "Delivery routes taking longer than expected",
    signalType: "transport",
    relatedKPI: "delivery_time"
  },

  {
    signal: "delivery_delay",
    description: "Orders delivered later than scheduled",
    signalType: "transport",
    relatedKPI: "delivery_time"
  },

  {
    signal: "vehicle_breakdown",
    description: "Fleet vehicles experiencing mechanical failures",
    signalType: "machinery",
    relatedKPI: "fleet_utilization"
  },

  {
    signal: "fleet_unavailability",
    description: "Vehicles unavailable due to maintenance or breakdowns",
    signalType: "capacity",
    relatedKPI: "fleet_utilization"
  },

  {
    signal: "picking_delay",
    description: "Warehouse picking operations taking longer than expected",
    signalType: "warehouse",
    relatedKPI: "order_fulfillment_time"
  },

  {
    signal: "order_backlog",
    description: "Accumulated orders awaiting fulfillment",
    signalType: "capacity",
    relatedKPI: "order_cycle_time"
  },

  {
    signal: "inventory_mismatch",
    description: "Discrepancies between recorded and actual inventory",
    signalType: "inventory",
    relatedKPI: "inventory_accuracy"
  },

  {
    signal: "inventory_shortage",
    description: "Insufficient inventory to fulfill orders",
    signalType: "inventory",
    relatedKPI: "order_fill_rate"
  },

  {
    signal: "inventory_overstock",
    description: "Excess inventory exceeding storage capacity",
    signalType: "inventory",
    relatedKPI: "inventory_turnover"
  },

  {
    signal: "supplier_delay",
    description: "Suppliers delivering goods later than expected",
    signalType: "supplier",
    relatedKPI: "supplier_on_time_delivery"
  }

];
