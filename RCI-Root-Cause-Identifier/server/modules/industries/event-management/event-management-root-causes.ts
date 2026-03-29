export const eventManagementRootCauses = [

  // ── OPERATIONS / EVENT EXECUTION ────────────────────────────────────────────

  {
    id: "EM001",
    category: "Operations",
    rootCause: "Weak event execution planning",
    description: "Events proceed without structured run-sheets, role assignments or contingency plans, resulting in on-site chaos and service failures",
    signals: ["setup_delay", "incomplete_setup", "last_minute_change", "timeline_overrun"],
    kpis: ["on_time_setup", "event_readiness"],
    impactWeight: 0.93
  },

  {
    id: "EM002",
    category: "Operations",
    rootCause: "Poor event-day command structure",
    description: "No designated event commander or escalation chain, causing unresolved issues to cascade during live events",
    signals: ["no_supervisor", "team_miscommunication", "guest_complaint", "coordination_issue"],
    kpis: ["event_readiness", "client_satisfaction"],
    impactWeight: 0.88
  },

  {
    id: "EM003",
    category: "Operations",
    rootCause: "Setup sequencing breakdown",
    description: "Setup activities executed in wrong order or without synchronisation, causing delays and incomplete readiness at event start",
    signals: ["late_setup", "incomplete_setup", "venue_issue", "setup_delay"],
    kpis: ["setup_completion", "on_time_setup"],
    impactWeight: 0.85
  },

  {
    id: "EM004",
    category: "Operations",
    rootCause: "Venue readiness failure",
    description: "Venue is not prepared, accessible or compatible with event requirements at handover time",
    signals: ["venue_issue", "setup_delay", "event_delay"],
    kpis: ["on_time_setup", "event_readiness"],
    impactWeight: 0.82
  },

  {
    id: "EM005",
    category: "Operations",
    rootCause: "Last-minute change dependency",
    description: "Operations absorb frequent late client or vendor changes without a formal change management process, creating reactive fire-fighting",
    signals: ["last_minute_change", "timeline_overrun", "coordination_issue", "event_overtime"],
    kpis: ["booking_lead_time", "event_readiness"],
    impactWeight: 0.80
  },

  // ── INVENTORY / RENTAL / EQUIPMENT (MACHINERY + MATERIALS) ──────────────────

  {
    id: "EM006",
    category: "Inventory",
    rootCause: "Rental inventory availability mismatch",
    description: "Stock of high-demand rental items (chairs, canopies, tableware, domes) does not match booking demand, causing shortfalls at dispatch",
    signals: ["stock_shortage", "missing_item", "insufficient_chairs", "dome_shortage", "insufficient_tableware"],
    kpis: ["inventory_accuracy", "equipment_utilization"],
    impactWeight: 0.91
  },

  {
    id: "EM007",
    category: "Inventory",
    rootCause: "Weak loading and dispatch control",
    description: "No standardised loading checklist; items are incorrectly packed or left behind, discovered only on-site",
    signals: ["wrong_item_packed", "missing_item", "setup_delay"],
    kpis: ["inventory_accuracy", "setup_completion"],
    impactWeight: 0.88
  },

  {
    id: "EM008",
    category: "Inventory",
    rootCause: "Poor equipment turnaround discipline",
    description: "Rental items returned late or unprocessed between events, blocking redeployment for subsequent bookings",
    signals: ["return_delay", "equipment_unavailable", "rental_turnaround"],
    kpis: ["rental_turnaround", "equipment_utilization"],
    impactWeight: 0.85
  },

  {
    id: "EM009",
    category: "Inventory",
    rootCause: "Asset maintenance backlog",
    description: "Damaged or worn rental equipment not repaired promptly, reducing usable asset pool and increasing replacement costs",
    signals: ["repair_backlog", "broken_item", "equipment_unavailable"],
    kpis: ["equipment_utilization", "damaged_items"],
    impactWeight: 0.82
  },

  {
    id: "EM010",
    category: "Inventory",
    rootCause: "Return and damage processing failure",
    description: "Damaged items returned by clients are not logged, costed or recovered, creating untracked losses",
    signals: ["damaged_return", "broken_item", "missing_item"],
    kpis: ["damaged_items", "missing_items", "inventory_accuracy"],
    impactWeight: 0.80
  },

  // ── MANPOWER ─────────────────────────────────────────────────────────────────

  {
    id: "EM011",
    category: "Manpower",
    rootCause: "Event crew capacity shortfall",
    description: "Insufficient crew deployed for event scale, forcing remaining crew to work beyond safe capacity",
    signals: ["crew_shortage", "insufficient_manpower", "event_overtime", "crew_overtime"],
    kpis: ["on_time_setup", "event_readiness"],
    impactWeight: 0.90
  },

  {
    id: "EM012",
    category: "Manpower",
    rootCause: "Weak on-site supervision",
    description: "Events proceed without experienced supervisors, leading to undetected quality failures and unresolved issues",
    signals: ["no_supervisor", "guest_complaint", "service_complaint", "coordination_issue"],
    kpis: ["client_satisfaction", "event_readiness"],
    impactWeight: 0.87
  },

  {
    id: "EM013",
    category: "Manpower",
    rootCause: "Role ambiguity during event execution",
    description: "Crew members unclear on responsibilities during live events, resulting in duplicated effort and missed tasks",
    signals: ["team_miscommunication", "no_supervisor", "coordination_issue"],
    kpis: ["setup_completion", "event_readiness"],
    impactWeight: 0.83
  },

  {
    id: "EM014",
    category: "Manpower",
    rootCause: "Overtime-driven fatigue and service degradation",
    description: "Recurring crew overtime degrades service quality in back-to-back events and increases attrition risk",
    signals: ["crew_overtime", "event_fatigue", "event_overtime"],
    kpis: ["event_readiness", "client_satisfaction"],
    impactWeight: 0.78
  },

  // ── MATERIALS / SUPPLIERS ────────────────────────────────────────────────────

  {
    id: "EM015",
    category: "Suppliers",
    rootCause: "Supplier coordination instability",
    description: "Third-party vendors (caterers, decorators, AV) unreliable or mis-scheduled, directly impacting event delivery",
    signals: ["vendor_no_show", "supplier_delay", "last_minute_change"],
    kpis: ["on_time_setup", "event_readiness"],
    impactWeight: 0.87
  },

  {
    id: "EM016",
    category: "Suppliers",
    rootCause: "Late third-party delivery dependency",
    description: "Critical items or services from suppliers arrive after setup windows close, blocking event execution",
    signals: ["supplier_delay", "late_deliveries", "setup_delay"],
    kpis: ["on_time_setup", "booking_lead_time"],
    impactWeight: 0.84
  },

  {
    id: "EM017",
    category: "Suppliers",
    rootCause: "Event pack completeness failure",
    description: "Supplier deliveries or internal packs missing agreed items, requiring emergency procurement at event cost",
    signals: ["missing_item", "wrong_item_packed", "emergency_purchase"],
    kpis: ["inventory_accuracy", "event_readiness"],
    impactWeight: 0.81
  },

  // ── FINANCIAL / COMMERCIAL ───────────────────────────────────────────────────

  {
    id: "EM018",
    category: "Financial",
    rootCause: "Margin leakage from reactive execution",
    description: "Unplanned overtime, emergency sourcing and last-minute fixes erode event margins that were viable at quotation stage",
    signals: ["cost_overrun", "emergency_purchase", "overtime_charges", "low_margin"],
    kpis: ["event_margin", "client_cancellations"],
    impactWeight: 0.89
  },

  {
    id: "EM019",
    category: "Financial",
    rootCause: "Underpricing of event packages",
    description: "Events quoted below true cost of delivery due to incomplete cost modelling, particularly for labour and equipment wear",
    signals: ["underquoted_event", "low_margin", "cost_overrun"],
    kpis: ["event_margin"],
    impactWeight: 0.86
  },

  {
    id: "EM020",
    category: "Financial",
    rootCause: "Damage and loss recovery weakness",
    description: "Client-caused damage or unreturned items are not systematically billed, absorbing costs into operational budget",
    signals: ["damaged_return", "missing_item", "refund_issue", "replacement_cost"],
    kpis: ["damaged_items", "missing_items", "event_margin"],
    impactWeight: 0.82
  },

  {
    id: "EM021",
    category: "Financial",
    rootCause: "Cost overrun from emergency sourcing",
    description: "Gaps in planning force last-minute procurement at premium prices, significantly exceeding planned event costs",
    signals: ["emergency_purchase", "cost_overrun", "supplier_delay"],
    kpis: ["event_margin"],
    impactWeight: 0.80
  }

];
