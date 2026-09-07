export const eventManagementRootCauses = [

  // ── OPERATIONS / EVENT EXECUTION ─────────────────────────────────────────────

  {
    id: "EM001",
    category: "Operations",
    rootCause: "Reactive event execution without structured run-sheet discipline",
    description: "Events proceed without confirmed run-sheets, role assignments or contingency plans. Issues surface on the day with no pre-agreed resolution protocol, forcing ad-hoc responses that compound into client-visible disruption.",
    signals: ["setup_delay", "incomplete_setup", "last_minute_change", "timeline_overrun", "event_delay"],
    kpis: ["on_time_setup", "event_readiness"],
    impactWeight: 0.93
  },

  {
    id: "EM002",
    category: "Operations",
    rootCause: "No designated event-day command owner",
    description: "Events run without a single named commander responsible for decisions and escalation. Problems during live execution circulate unresolved, each minute of ambiguity compounding setup delays and client dissatisfaction.",
    signals: ["no_supervisor", "team_miscommunication", "guest_complaint", "coordination_issue", "escalation_failure"],
    kpis: ["event_readiness", "client_satisfaction"],
    impactWeight: 0.90
  },

  {
    id: "EM003",
    category: "Operations",
    rootCause: "Setup sequencing failure causing readiness gaps at event start",
    description: "Setup tasks executed in wrong order or without coordination between teams. Dependencies are missed — venue access, AV, and furniture arriving in conflicting sequences — leaving the event incomplete at the agreed ready-time.",
    signals: ["late_setup", "incomplete_setup", "venue_issue", "setup_delay", "coordination_issue"],
    kpis: ["setup_completion", "on_time_setup"],
    impactWeight: 0.87
  },

  {
    id: "EM004",
    category: "Operations",
    rootCause: "Venue readiness failure at event handover",
    description: "Venue is not accessible, correctly configured, or compatible with event requirements at the agreed handover window. This forces reactive workarounds that cascade into setup delays and compressed execution time.",
    signals: ["venue_issue", "setup_delay", "event_delay", "access_issue"],
    kpis: ["on_time_setup", "event_readiness"],
    impactWeight: 0.83
  },

  {
    id: "EM005",
    category: "Operations",
    rootCause: "Uncontrolled last-minute change absorption",
    description: "Late client or vendor changes are absorbed without a formal change process. The cost, scheduling impact and knock-on effects on crew and inventory are invisible, creating reactive firefighting that erodes both margin and execution quality.",
    signals: ["last_minute_change", "timeline_overrun", "coordination_issue", "event_overtime", "scope_addition"],
    kpis: ["booking_lead_time", "event_readiness", "event_margin"],
    impactWeight: 0.82
  },

  {
    id: "EM006",
    category: "Operations",
    rootCause: "Inconsistent event-day escalation process",
    description: "When issues arise during live events, there is no agreed escalation path — leading to delayed responses, unilateral decisions by junior crew, and recurring client-facing service failures.",
    signals: ["escalation_failure", "guest_complaint", "coordination_issue", "service_complaint"],
    kpis: ["client_satisfaction", "event_readiness"],
    impactWeight: 0.78
  },

  // ── ASSETS & EQUIPMENT (INVENTORY / RENTAL) ──────────────────────────────────

  {
    id: "EM007",
    category: "Inventory",
    rootCause: "Incomplete rental readiness before event dispatch",
    description: "Assets leave the warehouse without confirmed quantities, condition verification or completeness checks. Shortfalls and damaged items are only discovered on-site, forcing emergency substitutions at premium cost and delaying event setup.",
    signals: ["stock_shortage", "missing_item", "insufficient_chairs", "dome_shortage", "insufficient_tableware", "dispatch_error"],
    kpis: ["inventory_accuracy", "equipment_utilization"],
    impactWeight: 0.93
  },

  {
    id: "EM008",
    category: "Inventory",
    rootCause: "Dispatch pack accuracy failure — wrong or missing items",
    description: "No standardised loading checklist is used before dispatch. Items are incorrectly packed, substituted without authorisation or omitted entirely. The error is only discovered on-site, generating rework and emergency re-runs.",
    signals: ["wrong_item_packed", "missing_item", "setup_delay", "dispatch_error", "loading_error"],
    kpis: ["inventory_accuracy", "setup_completion"],
    impactWeight: 0.90
  },

  {
    id: "EM009",
    category: "Inventory",
    rootCause: "Weak equipment turnaround between back-to-back events",
    description: "Assets returned from one event are not processed, cleaned and restocked before the next deployment window. Redeployment gaps create availability shortfalls that force last-minute substitutions or cancellations.",
    signals: ["return_delay", "equipment_unavailable", "rental_turnaround", "redeployment_gap"],
    kpis: ["rental_turnaround", "equipment_utilization"],
    impactWeight: 0.87
  },

  {
    id: "EM010",
    category: "Inventory",
    rootCause: "Asset condition blind spot — no pre-dispatch serviceability check",
    description: "Equipment leaves the warehouse without a condition assessment. Worn, damaged or functionally impaired assets reach the event site and are only identified during setup, creating rework, substitution cost and client-visible failures.",
    signals: ["repair_backlog", "broken_item", "equipment_unavailable", "damaged_dispatch"],
    kpis: ["equipment_utilization", "damaged_items"],
    impactWeight: 0.84
  },

  {
    id: "EM011",
    category: "Inventory",
    rootCause: "Missing and damaged asset recovery failure",
    description: "Assets returned by clients with damage, loss or wear are not systematically logged, photographed or costed. Recovery charges are not raised, absorbing the financial loss into operational overhead.",
    signals: ["damaged_return", "broken_item", "missing_item", "unrecovered_loss"],
    kpis: ["damaged_items", "missing_items", "inventory_accuracy"],
    impactWeight: 0.81
  },

  {
    id: "EM012",
    category: "Inventory",
    rootCause: "Inventory visibility mismatch between system and actual stock",
    description: "Stock counts in the booking system do not reflect actual available, in-service or under-repair inventory. Overbooking and phantom availability lead to dispatch shortfalls and on-site substitutions.",
    signals: ["stock_shortage", "overbooking", "inventory_discrepancy", "system_mismatch"],
    kpis: ["inventory_accuracy", "equipment_utilization"],
    impactWeight: 0.79
  },

  {
    id: "EM013",
    category: "Inventory",
    rootCause: "Event-specific stock allocation not reserved at booking",
    description: "Rental inventory is not ring-fenced at booking confirmation. Assets are consumed by earlier events, leaving confirmed bookings under-resourced and triggering last-minute emergency sourcing.",
    signals: ["stock_shortage", "missing_item", "emergency_purchase", "allocation_gap"],
    kpis: ["inventory_accuracy", "event_margin"],
    impactWeight: 0.77
  },

  // ── CREW & FIELD EXECUTION (MANPOWER) ────────────────────────────────────────

  {
    id: "EM014",
    category: "Manpower",
    rootCause: "Crew capacity shortfall for event scale and complexity",
    description: "Insufficient crew is deployed relative to event size, setup complexity and time constraints. Remaining crew absorb excess work, slowing setup, increasing error rates and making overtime structural.",
    signals: ["crew_shortage", "insufficient_manpower", "event_overtime", "crew_overtime"],
    kpis: ["on_time_setup", "event_readiness"],
    impactWeight: 0.92
  },

  {
    id: "EM015",
    category: "Manpower",
    rootCause: "Weak event-day supervision and role ownership",
    description: "Events proceed without experienced supervisors on-site. Quality failures go undetected, coordination breakdowns go unresolved and client-facing issues escalate because no one has clear authority to act.",
    signals: ["no_supervisor", "guest_complaint", "service_complaint", "coordination_issue", "supervision_gap"],
    kpis: ["client_satisfaction", "event_readiness"],
    impactWeight: 0.89
  },

  {
    id: "EM016",
    category: "Manpower",
    rootCause: "Role ambiguity during live event setup and execution",
    description: "Crew members are unclear on individual responsibilities during setup and live execution. Tasks are duplicated, missed or handed off without confirmation. The cumulative effect is avoidable rework and execution delay.",
    signals: ["team_miscommunication", "no_supervisor", "coordination_issue", "role_confusion"],
    kpis: ["setup_completion", "event_readiness"],
    impactWeight: 0.85
  },

  {
    id: "EM017",
    category: "Manpower",
    rootCause: "Poor crew briefing discipline before event deployment",
    description: "Crew arrive at events without a clear brief — no timeline, no role assignment, no escalation contact. Setup quality is inconsistent across teams because execution relies on individual initiative rather than structured instruction.",
    signals: ["briefing_gap", "role_confusion", "coordination_issue", "setup_error"],
    kpis: ["setup_completion", "event_readiness"],
    impactWeight: 0.82
  },

  {
    id: "EM018",
    category: "Manpower",
    rootCause: "Structural overtime dependency and crew fatigue",
    description: "Overtime has become the default response to under-resourcing. Recurring overtime across multiple events drives fatigue, degrades execution quality, increases attrition risk and erodes margins through unplanned labour cost.",
    signals: ["crew_overtime", "event_fatigue", "event_overtime", "high_turnover"],
    kpis: ["event_readiness", "client_satisfaction", "event_margin"],
    impactWeight: 0.80
  },

  {
    id: "EM019",
    category: "Manpower",
    rootCause: "Key-person dependency on critical operational knowledge",
    description: "Event execution depends on 1–2 senior staff who carry all coordination knowledge informally. Their absence or departure triggers immediate operational disruption with no documented handover or backup capability.",
    signals: ["skill_gap", "knowledge_dependency", "high_turnover", "coordination_issue"],
    kpis: ["event_readiness", "client_satisfaction"],
    impactWeight: 0.76
  },

  // ── INVENTORY & SUPPLIER FLOW (SUPPLIERS / MATERIALS) ────────────────────────

  {
    id: "EM020",
    category: "Suppliers",
    rootCause: "Supplier coordination instability creating event-day risk",
    description: "Third-party vendors (caterers, AV, decorators, tentage) are unreliable, unconfirmed or mis-scheduled. Delivery windows overlap or conflict, and coordination failures surface on event day with no backup plan.",
    signals: ["vendor_no_show", "supplier_delay", "last_minute_change", "vendor_miscommunication"],
    kpis: ["on_time_setup", "event_readiness"],
    impactWeight: 0.89
  },

  {
    id: "EM021",
    category: "Suppliers",
    rootCause: "Late third-party delivery blocking setup windows",
    description: "Critical items or services from suppliers arrive after setup windows close. The sequential dependency means downstream setup tasks cannot begin, compressing available time and forcing rushed or incomplete execution.",
    signals: ["supplier_delay", "late_deliveries", "setup_delay", "delivery_window_missed"],
    kpis: ["on_time_setup", "booking_lead_time"],
    impactWeight: 0.86
  },

  {
    id: "EM022",
    category: "Suppliers",
    rootCause: "Supplier dependency concentration — single-source event critical items",
    description: "Core event deliverables rely on one or two suppliers with no qualified backup. Any delay or failure from these suppliers creates an immediate event execution crisis with limited recovery options.",
    signals: ["vendor_no_show", "supplier_delay", "single_source_risk", "emergency_purchase"],
    kpis: ["on_time_setup", "event_readiness", "event_margin"],
    impactWeight: 0.82
  },

  {
    id: "EM023",
    category: "Suppliers",
    rootCause: "Event pack incompleteness from supplier partial delivery",
    description: "Suppliers deliver partial orders — missing quantities, wrong specifications or substitute items — without advance notice. The team discovers gaps at setup, forcing emergency procurement at premium rates.",
    signals: ["missing_item", "wrong_item_packed", "emergency_purchase", "partial_delivery"],
    kpis: ["inventory_accuracy", "event_readiness", "event_margin"],
    impactWeight: 0.79
  },

  {
    id: "EM024",
    category: "Suppliers",
    rootCause: "No pre-event supplier lock-in and confirmation process",
    description: "Supplier bookings are not formally confirmed before the event window. Vendors redirect capacity to competing bookings, leaving the team without confirmed supply and scrambling for replacements at short notice.",
    signals: ["vendor_no_show", "supplier_delay", "last_minute_change", "booking_conflict"],
    kpis: ["on_time_setup", "event_readiness"],
    impactWeight: 0.76
  },

  // ── COMMERCIAL CONTROL (FINANCIAL) ────────────────────────────────────────────

  {
    id: "EM025",
    category: "Financial",
    rootCause: "Margin leakage from reactive event execution costs",
    description: "Unplanned overtime, emergency sourcing, on-site substitutions and last-minute fixes erode event margins that were commercially viable at quotation stage. The operational cost of firefighting is borne by margin, not captured back from clients.",
    signals: ["cost_overrun", "emergency_purchase", "overtime_charges", "low_margin", "unplanned_cost"],
    kpis: ["event_margin", "client_cancellations"],
    impactWeight: 0.93
  },

  {
    id: "EM026",
    category: "Financial",
    rootCause: "Underquoted event scope — incomplete cost modelling at quotation",
    description: "Events are quoted below true cost of delivery because labour, equipment wear, setup time and contingency costs are not fully modelled. As-delivered costs consistently exceed as-quoted revenue, creating structural margin erosion.",
    signals: ["underquoted_event", "low_margin", "cost_overrun", "pricing_gap"],
    kpis: ["event_margin"],
    impactWeight: 0.91
  },

  {
    id: "EM027",
    category: "Financial",
    rootCause: "Scope creep absorbed without change-order capture",
    description: "Additional client requests during event planning and execution are delivered without being billed. The team's instinct to accommodate requests erodes quotation margin with each untracked addition.",
    signals: ["scope_addition", "untracked_add_on", "low_margin", "cost_overrun"],
    kpis: ["event_margin"],
    impactWeight: 0.87
  },

  {
    id: "EM028",
    category: "Financial",
    rootCause: "Damage and loss charges not systematically recovered",
    description: "Client-caused damage or unreturned rental assets are documented inconsistently and charged rarely. The financial loss is absorbed into operating costs, compounding over time into a material drag on profitability.",
    signals: ["damaged_return", "missing_item", "refund_issue", "replacement_cost", "unrecovered_loss"],
    kpis: ["damaged_items", "missing_items", "event_margin"],
    impactWeight: 0.84
  },

  {
    id: "EM029",
    category: "Financial",
    rootCause: "Emergency procurement cost overrun from planning gaps",
    description: "Gaps in pre-event preparation force last-minute procurement at premium vendor rates. Emergency sourcing costs are predictable in pattern but untracked as a discrete cost category, masking the true cost of planning failures.",
    signals: ["emergency_purchase", "cost_overrun", "supplier_delay", "premium_cost"],
    kpis: ["event_margin"],
    impactWeight: 0.81
  },

  {
    id: "EM030",
    category: "Financial",
    rootCause: "Delayed collection and overdue account exposure",
    description: "Post-event invoicing is slow and follow-up on overdue accounts is inconsistent. Cash drag from collections creates working capital strain that limits the business's ability to fund upcoming event commitments.",
    signals: ["overdue_account", "delayed_invoice", "collection_gap", "cash_flow_issue"],
    kpis: ["collection_days", "event_margin"],
    impactWeight: 0.78
  },

  {
    id: "EM031",
    category: "Financial",
    rootCause: "No event-level profitability visibility by job type",
    description: "Margin is tracked at company level, not per event or event type. High-margin and loss-making event formats are indistinguishable. Pricing decisions are made without feedback on which jobs generate or destroy commercial value.",
    signals: ["low_margin", "pricing_gap", "no_job_costing", "margin_blind_spot"],
    kpis: ["event_margin"],
    impactWeight: 0.75
  },

];
