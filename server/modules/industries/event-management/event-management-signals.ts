export const eventManagementSignals = [

  // ── OPERATIONS / EVENT EXECUTION ────────────────────────────────────────────

  {
    signal: "setup_delay",
    description: "Event setup not completed within the planned window before event start",
    signalType: "operations",
    relatedKPI: "on_time_setup"
  },

  {
    signal: "late_setup",
    description: "Setup team arrived late to site or began work behind schedule",
    signalType: "operations",
    relatedKPI: "on_time_setup"
  },

  {
    signal: "incomplete_setup",
    description: "Event setup was not finished by the time guests or clients arrived",
    signalType: "operations",
    relatedKPI: "setup_completion"
  },

  {
    signal: "event_delay",
    description: "Event itself started later than the confirmed schedule",
    signalType: "operations",
    relatedKPI: "event_readiness"
  },

  {
    signal: "timeline_overrun",
    description: "Event ran beyond planned duration due to preparation or execution issues",
    signalType: "operations",
    relatedKPI: "event_readiness"
  },

  {
    signal: "coordination_issue",
    description: "Breakdown in communication or sequencing between internal teams or with vendors",
    signalType: "operations",
    relatedKPI: "event_readiness"
  },

  {
    signal: "last_minute_change",
    description: "Client or operational change received with insufficient lead time to absorb cleanly",
    signalType: "operations",
    relatedKPI: "booking_lead_time"
  },

  {
    signal: "venue_issue",
    description: "Venue was unprepared, inaccessible or incompatible at time of setup",
    signalType: "operations",
    relatedKPI: "event_readiness"
  },

  {
    signal: "guest_complaint",
    description: "Client or guest formally raised a service or execution complaint during or after the event",
    signalType: "quality",
    relatedKPI: "complaints"
  },

  {
    signal: "service_complaint",
    description: "Complaint related to service quality, crew behaviour or catering standards",
    signalType: "quality",
    relatedKPI: "complaints"
  },

  // ── RENTAL / EQUIPMENT / READINESS ──────────────────────────────────────────

  {
    signal: "missing_item",
    description: "Required rental item not present at event site at setup time",
    signalType: "inventory",
    relatedKPI: "inventory_accuracy"
  },

  {
    signal: "broken_item",
    description: "Rental item discovered damaged or non-functional at the event",
    signalType: "inventory",
    relatedKPI: "damaged_items"
  },

  {
    signal: "damaged_return",
    description: "Rental items returned by client in damaged or unusable condition",
    signalType: "inventory",
    relatedKPI: "damaged_items"
  },

  {
    signal: "stock_shortage",
    description: "Insufficient stock of a required rental item category to fulfil all active bookings",
    signalType: "inventory",
    relatedKPI: "equipment_utilization"
  },

  {
    signal: "wrong_item_packed",
    description: "Incorrect item type, size or configuration was loaded for the event",
    signalType: "inventory",
    relatedKPI: "inventory_accuracy"
  },

  {
    signal: "insufficient_chairs",
    description: "Chair quantity dispatched was less than the event booking required",
    signalType: "inventory",
    relatedKPI: "inventory_accuracy"
  },

  {
    signal: "insufficient_tableware",
    description: "Cutlery, crockery or tableware quantity was below event requirements",
    signalType: "inventory",
    relatedKPI: "inventory_accuracy"
  },

  {
    signal: "dome_shortage",
    description: "Dome tents or canopies were unavailable or insufficient for the event",
    signalType: "inventory",
    relatedKPI: "equipment_utilization"
  },

  {
    signal: "canopy_issue",
    description: "Canopy damaged, incorrectly sized or unavailable for the event",
    signalType: "inventory",
    relatedKPI: "equipment_utilization"
  },

  {
    signal: "return_delay",
    description: "Rental items not returned within the agreed collection window after event",
    signalType: "inventory",
    relatedKPI: "rental_turnaround"
  },

  {
    signal: "repair_backlog",
    description: "Damaged rental items awaiting repair with no clear completion timeline",
    signalType: "inventory",
    relatedKPI: "damaged_items"
  },

  {
    signal: "equipment_unavailable",
    description: "Equipment item marked unavailable due to being damaged, in repair, or not returned",
    signalType: "inventory",
    relatedKPI: "equipment_utilization"
  },

  {
    signal: "rental_turnaround",
    description: "Time between return and redeployment of rental items is too long",
    signalType: "inventory",
    relatedKPI: "rental_turnaround"
  },

  // ── MANPOWER / CREW ──────────────────────────────────────────────────────────

  {
    signal: "crew_shortage",
    description: "Fewer crew members available than required for the event scale",
    signalType: "manpower",
    relatedKPI: "on_time_setup"
  },

  {
    signal: "insufficient_manpower",
    description: "General staffing level below what the event scope demands",
    signalType: "manpower",
    relatedKPI: "event_readiness"
  },

  {
    signal: "event_fatigue",
    description: "Crew exhaustion observed or reported from back-to-back event assignments",
    signalType: "manpower",
    relatedKPI: "event_readiness"
  },

  {
    signal: "crew_overtime",
    description: "Crew regularly working beyond contracted hours on event days",
    signalType: "manpower",
    relatedKPI: "event_margin"
  },

  {
    signal: "event_overtime",
    description: "Events extending significantly past planned end time due to operational issues",
    signalType: "manpower",
    relatedKPI: "event_margin"
  },

  {
    signal: "team_miscommunication",
    description: "Internal coordination breakdown between setup, catering and logistics teams",
    signalType: "manpower",
    relatedKPI: "setup_completion"
  },

  {
    signal: "setup_team_late",
    description: "Setup team arrived at site significantly later than the planned mobilisation time",
    signalType: "manpower",
    relatedKPI: "on_time_setup"
  },

  {
    signal: "no_supervisor",
    description: "Event proceeded without a designated on-site supervisor or event commander",
    signalType: "manpower",
    relatedKPI: "event_readiness"
  },

  // ── SUPPLIERS ────────────────────────────────────────────────────────────────

  {
    signal: "vendor_no_show",
    description: "Third-party vendor failed to appear or deliver as contracted for the event",
    signalType: "supplier",
    relatedKPI: "on_time_setup"
  },

  {
    signal: "supplier_delay",
    description: "Supplier delivery arrived after the required setup window",
    signalType: "supplier",
    relatedKPI: "on_time_setup"
  },

  {
    signal: "late_deliveries",
    description: "Recurring late deliveries from suppliers affecting event readiness",
    signalType: "supplier",
    relatedKPI: "on_time_setup"
  },

  // ── FINANCIAL / COMMERCIAL ───────────────────────────────────────────────────

  {
    signal: "overtime_charges",
    description: "Unplanned overtime costs charged to the event beyond original budget",
    signalType: "financial",
    relatedKPI: "event_margin"
  },

  {
    signal: "refund_issue",
    description: "Client requesting refund or deposit dispute following service failure",
    signalType: "financial",
    relatedKPI: "client_cancellations"
  },

  {
    signal: "deposit_refund",
    description: "Deposit refund requested due to cancellation or disputed delivery",
    signalType: "financial",
    relatedKPI: "client_cancellations"
  },

  {
    signal: "replacement_cost",
    description: "Unrecovered cost of replacing damaged or missing rental assets",
    signalType: "financial",
    relatedKPI: "event_margin"
  },

  {
    signal: "emergency_purchase",
    description: "Last-minute procurement of items at premium prices to cover shortfalls",
    signalType: "financial",
    relatedKPI: "event_margin"
  },

  {
    signal: "underquoted_event",
    description: "Event package priced below true delivery cost at quotation stage",
    signalType: "financial",
    relatedKPI: "event_margin"
  },

  {
    signal: "low_margin",
    description: "Event gross margin significantly below company target",
    signalType: "financial",
    relatedKPI: "event_margin"
  },

  {
    signal: "cost_overrun",
    description: "Actual event costs exceeded approved budget due to reactive spend",
    signalType: "financial",
    relatedKPI: "event_margin"
  }

];
