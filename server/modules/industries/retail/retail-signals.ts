export const retailSignals = [

  {
    signal: "stockout",
    description: "Products unavailable on store shelves",
    signalType: "inventory",
    relatedKPI: "shelf_availability"
  },

  {
    signal: "inventory_shortage",
    description: "Insufficient stock to meet demand",
    signalType: "inventory",
    relatedKPI: "inventory_turnover"
  },

  {
    signal: "inventory_overstock",
    description: "Excess inventory beyond demand levels",
    signalType: "inventory",
    relatedKPI: "inventory_turnover"
  },

  {
    signal: "forecast_error",
    description: "Mismatch between forecasted and actual sales",
    signalType: "planning",
    relatedKPI: "forecast_accuracy"
  },

  {
    signal: "supplier_delay",
    description: "Suppliers delivering goods later than scheduled",
    signalType: "supplier",
    relatedKPI: "supplier_on_time_delivery"
  },

  {
    signal: "empty_shelves",
    description: "Shelves not replenished with available inventory",
    signalType: "store_operations",
    relatedKPI: "shelf_availability"
  },

  {
    signal: "checkout_delay",
    description: "Customers waiting long at checkout counters",
    signalType: "store_operations",
    relatedKPI: "checkout_time"
  },

  {
    signal: "customer_queue",
    description: "Long customer queues forming in stores",
    signalType: "store_operations",
    relatedKPI: "checkout_time"
  },

  {
    signal: "dc_delay",
    description: "Distribution center processing delays",
    signalType: "logistics",
    relatedKPI: "replenishment_time"
  },

  {
    signal: "shipment_backlog",
    description: "Accumulation of pending shipments",
    signalType: "logistics",
    relatedKPI: "replenishment_time"
  }

];
