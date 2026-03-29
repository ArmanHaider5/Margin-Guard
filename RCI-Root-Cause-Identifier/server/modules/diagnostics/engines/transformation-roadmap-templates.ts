// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORMATION ROADMAP TEMPLATES
//
// Structured 30/60/90-day action plans for each named root cause pattern.
// Each template has 3 phases with specific, actionable steps — avoiding
// generic filler ("improve processes", "enhance monitoring").
//
// Template lookup: exact match on root cause title → phase array.
// Fallback: category-level templates used by the roadmap engine.
// ─────────────────────────────────────────────────────────────────────────────

export interface RoadmapPhase {
  phase: string;
  title: string;
  description: string;
  actions: string[];
}

export type RoadmapTemplate = RoadmapPhase[];

export const transformationRoadmapTemplates: Record<string, RoadmapTemplate> = {

  // ── MACHINERY ──────────────────────────────────────────────────────────────

  "Reactive maintenance culture": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Stop the Bleeding",
      description: "Immediately reduce unplanned breakdowns by restoring maintenance discipline and clearing the backlog.",
      actions: [
        "Audit all overdue PM tasks and produce a prioritised backlog clearance list",
        "Assign dedicated maintenance windows for the top 5 highest-risk assets",
        "Establish a spare parts minimum stock level for critical consumables",
        "Stand up a daily equipment status review with the maintenance lead",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Build a Preventive Maintenance System",
      description: "Replace reactive firefighting with a structured, asset-based maintenance programme.",
      actions: [
        "Define PM schedules for all production-critical assets (frequency + responsibility owner)",
        "Introduce a simple CMMS or maintenance logbook if none exists",
        "Train operators on first-line equipment checks (autonomous maintenance basics)",
        "Track Mean Time Between Failures (MTBF) weekly to measure reliability trend",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Lock In Reliability Gains",
      description: "Institutionalise maintenance discipline to sustain the improvement beyond the initial push.",
      actions: [
        "Set PM compliance as a KPI reported in weekly operations meetings",
        "Introduce a monthly equipment reliability review with corrective actions tracked",
        "Review and optimise the top 3 most breakdown-prone assets for predictive maintenance",
        "Document lessons from recurring failures and update PM procedures accordingly",
      ],
    },
  ],

  "Equipment reliability failure": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Contain Reliability Failures",
      description: "Immediately identify and isolate the assets with highest downtime contribution.",
      actions: [
        "Rank assets by downtime contribution and focus resources on the top 20%",
        "Implement an immediate response protocol for breakdown events (escalation + spare parts access)",
        "Audit current maintenance records to identify gaps in asset history",
        "Assign ownership for each critical asset's reliability performance",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Restore Asset Performance",
      description: "Implement structured reliability improvement for the assets causing the most disruption.",
      actions: [
        "Conduct root cause analysis for each major recurring breakdown (using 5-Why or fishbone)",
        "Update PM frequencies based on actual failure history rather than manufacturer defaults",
        "Introduce operator-led inspections for early fault detection",
        "Establish downtime reporting so all stoppages are captured with cause codes",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Sustain Equipment Health",
      description: "Create a continuous improvement loop for asset reliability.",
      actions: [
        "Review MTBF and MTTR monthly and set quarterly improvement targets",
        "Evaluate investment case for predictive maintenance on highest-cost assets",
        "Integrate asset performance into the site's operational scorecard",
        "Ensure maintenance competence is part of technician onboarding and annual assessment",
      ],
    },
  ],

  // ── MATERIALS / SUPPLY CHAIN ──────────────────────────────────────────────

  "Production planning instability": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Reduce Schedule Volatility",
      description: "Immediately reduce the frequency of last-minute schedule changes and their downstream impact.",
      actions: [
        "Institute a production schedule freeze window (e.g., no changes within 48 hours of production)",
        "Map the top 5 most frequent causes of schedule disruption and escalate each to an owner",
        "Conduct a material availability check at the point of schedule release — not after",
        "Hold a daily cross-functional production alignment between planning, procurement, and floor supervisors",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Strengthen Planning Inputs",
      description: "Improve the quality of upstream data feeding the production plan.",
      actions: [
        "Review demand forecasting accuracy and identify systematic over- or under-estimation patterns",
        "Set supplier on-time delivery (OTD) as a tracked KPI with weekly supplier communication",
        "Implement a material readiness gate before each production order is released to the floor",
        "Align procurement lead times with production cycle times in the planning system",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Institutionalise Planning Discipline",
      description: "Lock in planning improvements and build resilience against future disruptions.",
      actions: [
        "Formalise a Sales & Operations Planning (S&OP) rhythm if one does not exist",
        "Set schedule adherence as a reported metric in operations reviews",
        "Review the top-3 suppliers with chronic delivery issues and activate alternative sourcing",
        "Conduct a quarterly planning process audit to catch emerging inefficiencies early",
      ],
    },
  ],

  "Supply chain instability": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Secure Material Flow",
      description: "Immediately address material shortages that are blocking production.",
      actions: [
        "Identify all current material shortages and expedite critical items from alternative sources",
        "Implement a daily materials status report shared between procurement and production planning",
        "Set emergency buffer stock levels for the 10 highest-risk raw materials",
        "Contact the 3 most unreliable suppliers to understand root cause of recent delays",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Strengthen Supplier Performance",
      description: "Reduce dependency on unreliable suppliers and improve procurement predictability.",
      actions: [
        "Formally score all key suppliers on OTD, quality, and responsiveness",
        "Qualify at least one alternative supplier for each single-source critical material",
        "Introduce purchase order acknowledgement tracking to detect delays earlier",
        "Align safety stock levels to supplier risk rating rather than using a flat formula",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Build Supply Chain Resilience",
      description: "Institutionalise supply chain risk management as a standard operational process.",
      actions: [
        "Create a supplier development programme for strategic suppliers",
        "Introduce a quarterly supplier review meeting with shared KPI scorecards",
        "Conduct a supply chain risk mapping exercise covering the top 20 materials by spend",
        "Integrate supply chain risk into the monthly operations leadership review",
      ],
    },
  ],

  // ── MANPOWER / WORKFORCE ───────────────────────────────────────────────────

  "High workforce turnover": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Retain Current Workforce",
      description: "Immediately reduce the rate of attrition by addressing the most visible pain points.",
      actions: [
        "Conduct exit interview analysis on the last 10 departures to identify the primary reasons for leaving",
        "Audit working conditions, shift patterns, and compensation against local market rates",
        "Identify the 5 most experienced operators at highest flight risk and engage them directly",
        "Ensure all current vacancies have active recruitment in progress with clear timelines",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Rebuild Workforce Stability",
      description: "Address structural causes of turnover and build a more attractive working environment.",
      actions: [
        "Introduce a structured onboarding programme to reduce the time-to-competency for new hires",
        "Implement a simple recognition scheme tied to operational performance",
        "Review and formalise career path options for operators and technicians",
        "Reduce unpredictable overtime by improving schedule stability and workload distribution",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Build a Stable Workforce Foundation",
      description: "Institutionalise practices that make the organisation a competitive employer.",
      actions: [
        "Track turnover rate monthly and set a 6-month reduction target",
        "Conduct an annual workforce engagement survey and act on the top 3 findings",
        "Build a skills matrix that informs cross-training and development investment",
        "Ensure workforce stability is a standing agenda item in operations leadership reviews",
      ],
    },
  ],

  "Skills gap and training deficit": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Contain Competency Risk",
      description: "Immediately identify where skills gaps are creating the highest operational risk.",
      actions: [
        "Map current skills against role requirements for all operators and technicians",
        "Identify the 3 highest-risk competency gaps — those causing defects, downtime, or errors",
        "Assign experienced operators to shadow and support gaps in critical roles immediately",
        "Review training records to identify employees who are overdue for certification",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Build Training Capability",
      description: "Implement structured training to close the identified gaps.",
      actions: [
        "Develop or source training modules for the top 3 identified competency gaps",
        "Create on-the-job training checklists for each critical production role",
        "Assign internal trainers or mentors for hands-on skills transfer",
        "Set a 60-day competency uplift target for the highest-risk individuals",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Institutionalise Learning",
      description: "Build a continuous skills development culture.",
      actions: [
        "Maintain a live skills matrix reviewed quarterly by operations management",
        "Integrate competency targets into performance reviews",
        "Develop a succession plan for critical operational roles",
        "Introduce monthly knowledge-sharing sessions or toolbox talks",
      ],
    },
  ],

  // ── QUALITY ────────────────────────────────────────────────────────────────

  "Quality management failure": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Stop the Quality Leakage",
      description: "Immediately halt the most costly quality failures and contain their impact.",
      actions: [
        "Identify the top 3 defect types by frequency and cost — these are the immediate focus",
        "Introduce a hold-and-review gate for any batch exceeding the current defect threshold",
        "Conduct a rapid process walk to identify visible non-conformances in the production flow",
        "Ensure all rework and scrap is recorded with a cause code to build a baseline",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Address Upstream Quality Causes",
      description: "Apply root cause methods to eliminate recurring defect sources.",
      actions: [
        "Run a 5-Why or fishbone analysis on each of the top 3 defect types",
        "Implement in-process inspection checkpoints at the highest-defect stages",
        "Review incoming material quality — confirm suppliers are meeting agreed specifications",
        "Tighten process parameters (temperature, speed, pressure) on the most defect-prone steps",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Build a Quality System",
      description: "Institutionalise quality management so improvements are self-sustaining.",
      actions: [
        "Track First Pass Yield (FPY) and Cost of Poor Quality (CoPQ) as standing KPIs",
        "Introduce a monthly quality review meeting with corrective action tracking",
        "Develop or update Standard Operating Procedures (SOPs) for the highest-defect processes",
        "Link quality performance to operator and supervisor performance reviews",
      ],
    },
  ],

  // ── MONEY / COST ────────────────────────────────────────────────────────────

  "Cost overrun and financial leakage": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Establish Cost Visibility",
      description: "Immediately understand where the money is going before attempting to control it.",
      actions: [
        "Conduct a 30-day operational cost breakdown by category (labour, materials, energy, maintenance, downtime)",
        "Identify the top 3 cost lines that are trending above budget or plan",
        "Assign a cost owner to each major budget line with authority to act",
        "Stop all discretionary expenditure not essential to maintaining current output",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Address the Cost Drivers",
      description: "Tackle the operational root causes of cost overrun — not just the symptoms.",
      actions: [
        "Analyse the primary cost drivers: is it overtime, scrap, energy, or downtime-driven?",
        "Introduce variance reporting — actual vs. budgeted cost at the process level",
        "Implement controls on the top 3 cost categories (approval thresholds, purchase order discipline)",
        "Review energy consumption against production output for efficiency opportunities",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Sustain Financial Discipline",
      description: "Build a cost management culture that maintains gains.",
      actions: [
        "Report cost per unit produced weekly as a leading operational KPI",
        "Conduct a monthly cost review at operations management level",
        "Tie operational improvement targets to specific cost reduction goals",
        "Benchmark key cost ratios against industry norms and set a 12-month improvement target",
      ],
    },
  ],

  // ── PROCESS DISCIPLINE ─────────────────────────────────────────────────────

  "Process inconsistency and non-compliance": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Map the Gaps",
      description: "Identify where processes are not being followed and what the immediate impact is.",
      actions: [
        "Conduct a floor walk to observe actual vs. documented process at each production step",
        "Identify the top 5 process deviations contributing to defects, delays, or waste",
        "Confirm that all critical SOPs are accessible, current, and understood by operators",
        "Assign a supervisor to physically verify compliance on the highest-risk processes daily",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Standardise and Train",
      description: "Close the gap between defined processes and actual practice.",
      actions: [
        "Rewrite or simplify the 5 most frequently violated SOPs using visual standards",
        "Run refresher training for all operators on the rewritten procedures",
        "Introduce a short daily start-of-shift briefing covering key process standards",
        "Implement a simple checklist system for critical process steps",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Sustain Process Discipline",
      description: "Build internal mechanisms that maintain compliance without constant supervision.",
      actions: [
        "Introduce peer-level process audits (operators checking each other's workstations)",
        "Track process compliance as a KPI and review monthly",
        "Link process adherence to individual performance feedback",
        "Update all documentation following any process change — no verbal-only changes",
      ],
    },
  ],

  // ── EVENT MANAGEMENT ───────────────────────────────────────────────────────

  "Reactive event execution without structured run-sheet discipline": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Establish Event Run-Sheet and Command Structure",
      description: "Stop events running on informal coordination. Introduce a basic run-sheet and a named event commander for every deployment.",
      actions: [
        "Create a standard event run-sheet template covering timeline, role assignments and escalation contacts",
        "Name a single event commander for each upcoming booking — responsible for all on-day decisions",
        "Brief all crew on their roles and the escalation path before each event",
        "Track all last-minute changes and on-site issues in a simple post-event log",
      ],
    },
    {
      phase: "Days 31–60: Control",
      title: "Standardise Pre-Event Readiness Sign-Off",
      description: "Build a formal readiness gate before every event deployment.",
      actions: [
        "Introduce a 48-hour pre-event readiness sign-off covering crew, inventory and supplier confirmation",
        "Create a standardised crew briefing checklist covering roles, timeline and escalation",
        "Define a formal change-request process — no same-day client changes absorbed without sign-off",
        "Debrief every event within 24 hours and log all deviations from the run-sheet",
      ],
    },
    {
      phase: "Days 61–90: Scale",
      title: "Build a Repeatable Event Execution Playbook",
      description: "Convert the best practices into a living playbook the whole team can follow.",
      actions: [
        "Document the event execution playbook covering all event types the business operates",
        "Introduce a post-event operational review cadence — monthly, using debrief data",
        "Use recurring issue patterns to update run-sheet templates before the next cycle",
        "Measure on-time setup rate and client satisfaction per event and review weekly",
      ],
    },
  ],

  "Incomplete rental readiness before event dispatch": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Introduce Dispatch Pack Sign-Off",
      description: "Stop assets leaving the warehouse without a verified checklist.",
      actions: [
        "Create a per-event dispatch checklist covering item type, quantity and condition",
        "Assign a warehouse lead responsible for signing off every outbound pack",
        "Log all on-site shortfalls and emergency substitutions immediately after each event",
        "Ring-fence confirmed bookings' inventory in the tracking system at booking stage",
      ],
    },
    {
      phase: "Days 31–60: Control",
      title: "Build Asset Readiness and Turnaround Discipline",
      description: "Close the gap between assets returned and assets redeployed.",
      actions: [
        "Introduce a post-event return process: condition check, repair tagging, restock confirmation",
        "Set a turnaround target for all rental assets between events (e.g. 24 hours)",
        "Add a pre-dispatch condition check to the warehouse sign-off checklist",
        "Track emergency substitution rate per event week as a warehouse performance metric",
      ],
    },
    {
      phase: "Days 61–90: Scale",
      title: "Formalise Damage and Loss Recovery Controls",
      description: "Convert asset losses into recoverable charges and close the write-off cycle.",
      actions: [
        "Implement a post-event damage log with photographic evidence and client attribution",
        "Create a standard damage recovery billing process — raised within 48 hours of event close",
        "Review asset pool utilisation monthly and identify chronic shortfall items for top-up",
        "Build an event profitability review that includes asset wear and loss costs per booking",
      ],
    },
  ],

  "Crew capacity shortfall for event scale and complexity": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Match Crew to Event Scale at Booking Stage",
      description: "Stop under-resourcing events at the planning stage.",
      actions: [
        "Create a crew sizing guide by event type and scale (e.g. 1 crew per 50 pax setup)",
        "Review all upcoming bookings against the guide and flag resource gaps",
        "Assign a crew lead (supervisor) for every upcoming event — not just on the day",
        "Track overtime hours per event for the next 30 days as a baseline",
      ],
    },
    {
      phase: "Days 31–60: Control",
      title: "Reduce Structural Overtime and Fatigue",
      description: "Replace reactive overtime with proactive crew planning.",
      actions: [
        "Set a crew overtime threshold per event — escalate for approval if exceeded",
        "Build a casual crew roster to cover surge periods without permanent overhead",
        "Standardise crew briefings — roles, timelines and the escalation contact before every deployment",
        "Review post-event fatigue and execution quality correlation in the debrief log",
      ],
    },
    {
      phase: "Days 61–90: Scale",
      title: "Build Execution Consistency and Knowledge Depth",
      description: "Remove key-person dependency and develop a crew capable of consistent delivery.",
      actions: [
        "Document crew roles and best practices into a field operations handbook",
        "Introduce a junior-to-senior crew pairing system for knowledge transfer",
        "Create an event-day execution scorecard reviewed monthly with crew leads",
        "Build a post-event operational review cadence that feeds crew development priorities",
      ],
    },
  ],

  "Margin leakage from reactive event execution costs": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Track Every Reactive Cost by Event",
      description: "Make the financial cost of firefighting visible before fixing it.",
      actions: [
        "Start recording emergency sourcing, overtime and substitution costs per event",
        "Log all unplanned costs against the specific booking — not into overhead",
        "Identify the 3 events with the highest reactive cost in the last 90 days",
        "Brief the operations team on why margin visibility matters commercially",
      ],
    },
    {
      phase: "Days 31–60: Control",
      title: "Close the Commercial Leakage Points",
      description: "Address the specific patterns causing margin erosion.",
      actions: [
        "Introduce a formal change-order process — any scope addition requires client sign-off before delivery",
        "Build a damage recovery billing workflow — raised within 48 hours of event close",
        "Review all underquoted events from the last 6 months to identify pricing gaps",
        "Set a target margin per event type and review actuals at monthly management meetings",
      ],
    },
    {
      phase: "Days 61–90: Scale",
      title: "Build Event-Level Profitability Discipline",
      description: "Make per-event margin a standard management metric.",
      actions: [
        "Implement job costing at event level — revenue vs. actual delivery cost per booking",
        "Create a monthly event profitability review loop with management",
        "Formalise damage and loss recovery controls as part of the post-event close process",
        "Use profitability data to reprice chronic loss-making event formats",
      ],
    },
  ],

  "Supplier coordination instability creating event-day risk": [
    {
      phase: "Days 1–30: Stabilise",
      title: "Confirm All Critical Vendors Before Event Windows",
      description: "Stop vendor no-shows and delivery surprises from becoming event-day crises.",
      actions: [
        "Introduce a 72-hour vendor confirmation call for all critical third-party suppliers",
        "Identify at least one qualified backup for each critical vendor category",
        "Log all late deliveries and vendor no-shows immediately for pattern tracking",
        "Define what a 'critical vendor' means for your event type — and who confirms them",
      ],
    },
    {
      phase: "Days 31–60: Control",
      title: "Formalise Supplier Lock-In and Confirmation Milestones",
      description: "Create a structured pre-event supplier management process.",
      actions: [
        "Define confirmation milestones: 7 days out, 48 hours out, morning of event",
        "Create a preferred vendor list with confirmed capacity, reliability rating and backup contacts",
        "Introduce delivery window agreements with all critical vendors — not just verbal commitments",
        "Track supplier reliability score per vendor monthly and use it to update preferred vendor rankings",
      ],
    },
    {
      phase: "Days 61–90: Scale",
      title: "Build a Resilient Supplier Ecosystem",
      description: "Reduce single-source dependency and create a vendor base that scales with the business.",
      actions: [
        "Qualify and onboard backup vendors for the top 3 single-source supplier categories",
        "Introduce supplier performance reviews quarterly — sharing reliability data and setting SLAs",
        "Build a supplier playbook covering confirmation, delivery and escalation procedures",
        "Review emergency sourcing costs quarterly and set a target reduction percentage",
      ],
    },
  ],

};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY-LEVEL FALLBACK TEMPLATES
// Used when no exact root cause title match is found.
// Keyed by 4M category or generic "default".
// ─────────────────────────────────────────────────────────────────────────────

export const categoryFallbackTemplates: Record<string, RoadmapTemplate> = {

  Machinery: [
    {
      phase: "Days 1–30: Stabilise",
      title: "Restore Equipment Availability",
      description: "Prioritise the assets and maintenance actions with the highest immediate impact.",
      actions: [
        "Identify the top 3 assets by downtime contribution and assign dedicated maintenance focus",
        "Audit overdue PM tasks and immediately schedule the highest-priority items",
        "Ensure critical spare parts are available for the most breakdown-prone equipment",
        "Stand up a daily equipment status review",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Build Preventive Maintenance Capability",
      description: "Transition from reactive to preventive maintenance across critical assets.",
      actions: [
        "Define PM schedules for all production-critical assets",
        "Introduce operator-led first-line inspections",
        "Track MTBF weekly to measure reliability improvement",
        "Train maintenance team on cause-code-based failure analysis",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Sustain Equipment Health",
      description: "Lock in reliability gains through systematic performance management.",
      actions: [
        "Set PM compliance as a standing KPI",
        "Conduct monthly equipment reliability reviews",
        "Evaluate predictive maintenance investment for highest-cost assets",
        "Document lessons from recurring failures and update procedures",
      ],
    },
  ],

  Materials: [
    {
      phase: "Days 1–30: Stabilise",
      title: "Secure Material Availability",
      description: "Address immediate material shortages and improve procurement visibility.",
      actions: [
        "Audit current material stock against production requirements for the next 4 weeks",
        "Expedite critical shortages from alternative sources where necessary",
        "Set daily material status reporting between procurement and production planning",
        "Identify which suppliers are causing the most disruption",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Improve Procurement Reliability",
      description: "Reduce dependency on unreliable suppliers and improve material predictability.",
      actions: [
        "Score all key suppliers on OTD and quality compliance",
        "Qualify at least one alternative for each single-source critical material",
        "Introduce purchase order acknowledgement tracking",
        "Align safety stock to supplier risk level",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Build Supply Chain Resilience",
      description: "Institutionalise supply chain risk management.",
      actions: [
        "Introduce a quarterly supplier review meeting",
        "Map supply chain risk for all top-20 materials by spend",
        "Integrate supply chain performance into the monthly operations review",
        "Develop contingency sourcing plans for all critical materials",
      ],
    },
  ],

  Manpower: [
    {
      phase: "Days 1–30: Stabilise",
      title: "Stabilise Workforce Capacity",
      description: "Contain immediate workforce capacity and competency risks.",
      actions: [
        "Identify current workforce gaps against production requirements",
        "Prioritise filling critical open roles — define must-fill vs. can-wait vacancies",
        "Assign experienced operators to shadow highest-risk gaps",
        "Audit overtime levels and identify if they are causing fatigue or attrition risk",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Rebuild Workforce Capability",
      description: "Address the structural causes of workforce weakness.",
      actions: [
        "Introduce structured onboarding to reduce new hire time-to-competency",
        "Map skills gaps against role requirements and target training at the top 3 gaps",
        "Reduce unpredictable overtime through better schedule planning",
        "Engage with employees on working conditions, pay, and career progression",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Build a Stable, Capable Team",
      description: "Institutionalise practices that sustain workforce strength.",
      actions: [
        "Track turnover rate and absenteeism monthly with ownership accountability",
        "Maintain a live skills matrix reviewed quarterly",
        "Introduce a succession plan for all critical operational roles",
        "Link training investment to operational improvement targets",
      ],
    },
  ],

  Money: [
    {
      phase: "Days 1–30: Stabilise",
      title: "Establish Cost Visibility",
      description: "Understand where the cost overruns are occurring before acting.",
      actions: [
        "Break down operational costs by category over the last 3 months",
        "Identify the top 3 cost lines exceeding plan and assign owners",
        "Stop non-essential discretionary expenditure",
        "Confirm current budget vs. actual variance reporting is accurate and timely",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Control the Primary Cost Drivers",
      description: "Act on the identified drivers of cost overrun.",
      actions: [
        "Analyse whether overruns are driven by overtime, scrap, energy, or downtime",
        "Introduce cost variance reporting at process level",
        "Set approval thresholds for discretionary spend",
        "Review energy and utility consumption for reduction opportunities",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Sustain Financial Discipline",
      description: "Build a cost management culture.",
      actions: [
        "Report cost per unit produced as a weekly operational KPI",
        "Conduct a monthly cost review at management level",
        "Set 12-month cost reduction targets tied to specific operational improvements",
        "Benchmark key cost ratios against industry norms",
      ],
    },
  ],

  // ── Event Management category fallbacks ─────────────────────────────────────
  // Used when no exact EM root cause title match is found but the industry is
  // event_management. Keyed by EM root cause category names.

  Inventory: [
    {
      phase: "Days 1–30: Stabilise",
      title: "Introduce Dispatch Sign-Off and Asset Tracking",
      description: "Stop assets leaving without verification and stop shortfalls being discovered on-site.",
      actions: [
        "Create a per-event dispatch checklist: item type, quantity, condition",
        "Assign warehouse lead accountability for every outbound pack",
        "Log all on-site shortfalls and emergency substitutions post-event",
        "Ring-fence inventory for confirmed bookings in the tracking system",
      ],
    },
    {
      phase: "Days 31–60: Control",
      title: "Build Turnaround Discipline and Condition Standards",
      description: "Ensure assets returned from events are ready for redeployment within a defined window.",
      actions: [
        "Introduce a post-return process: condition check, repair tag, restock confirmation",
        "Set a turnaround target for all rental assets (e.g. 24 hours from return to ready)",
        "Add pre-dispatch condition check to the warehouse sign-off routine",
        "Track same-day substitution rate per week as a dispatch quality KPI",
      ],
    },
    {
      phase: "Days 61–90: Scale",
      title: "Formalise Loss Recovery and Asset Lifecycle Visibility",
      description: "Convert untracked losses into recoverable charges and maintain a clean asset register.",
      actions: [
        "Implement post-event damage log with photographic evidence and client attribution",
        "Raise damage recovery billing within 48 hours of event close",
        "Review asset pool utilisation monthly and identify chronic shortfall items for replenishment",
        "Build an event profitability review that includes asset wear and loss costs per booking",
      ],
    },
  ],

  Suppliers: [
    {
      phase: "Days 1–30: Stabilise",
      title: "Confirm All Critical Vendors Before Every Event Window",
      description: "Eliminate vendor surprises on event day.",
      actions: [
        "Introduce a 72-hour vendor confirmation call for all critical third-party suppliers",
        "Identify at least one backup for each critical vendor category",
        "Log all late deliveries and no-shows immediately for pattern tracking",
        "Define which vendors are 'critical' for each event type your business runs",
      ],
    },
    {
      phase: "Days 31–60: Control",
      title: "Formalise Supplier Confirmation Milestones",
      description: "Create a structured pre-event supplier management process.",
      actions: [
        "Define confirmation milestones: 7 days out, 48 hours, morning of event",
        "Create a preferred vendor list with capacity, reliability rating and backup contacts",
        "Introduce delivery window agreements — not just verbal commitments",
        "Track supplier reliability score per vendor and update quarterly",
      ],
    },
    {
      phase: "Days 61–90: Scale",
      title: "Build a Resilient Supplier Ecosystem",
      description: "Reduce single-source dependency across all critical supply categories.",
      actions: [
        "Qualify and onboard backup vendors for top 3 single-source categories",
        "Introduce quarterly supplier performance reviews with shared SLAs",
        "Build a supplier playbook covering confirmation, delivery and escalation",
        "Review emergency sourcing costs quarterly and set a target reduction",
      ],
    },
  ],

  Financial: [
    {
      phase: "Days 1–30: Stabilise",
      title: "Make Reactive Cost Visible Per Event",
      description: "Understand the financial cost of firefighting before trying to fix it.",
      actions: [
        "Record emergency sourcing, overtime and substitution costs per event",
        "Log all unplanned costs against specific bookings — not into overhead",
        "Identify the 3 events with highest reactive cost in the last 90 days",
        "Start tracking event-level margin actuals vs. quoted margin",
      ],
    },
    {
      phase: "Days 31–60: Control",
      title: "Close Commercial Leakage Points",
      description: "Address the specific patterns causing margin erosion.",
      actions: [
        "Introduce a formal change-order process — any scope addition requires client sign-off before delivery",
        "Build a damage recovery billing workflow — raised within 48 hours of event close",
        "Review all underquoted events from the last 6 months to identify pricing gaps",
        "Set a target margin per event type and review actuals monthly",
      ],
    },
    {
      phase: "Days 61–90: Scale",
      title: "Build Event-Level Profitability Discipline",
      description: "Make per-event margin a standard management reporting metric.",
      actions: [
        "Implement job costing at event level — revenue vs. actual delivery cost per booking",
        "Create a monthly event profitability review with management",
        "Formalise damage and loss recovery controls as part of the post-event close process",
        "Use profitability data to reprice chronic loss-making event formats",
      ],
    },
  ],

  default: [
    {
      phase: "Days 1–30: Stabilise",
      title: "Diagnose and Contain",
      description: "Identify the highest-impact problems and prevent them from worsening.",
      actions: [
        "Map the current state of the identified problem areas with specific metrics",
        "Assign clear ownership for each identified root cause",
        "Implement interim controls to prevent further deterioration",
        "Stand up a weekly operational review focused on the identified issues",
      ],
    },
    {
      phase: "Days 31–60: Improve",
      title: "Implement Targeted Fixes",
      description: "Apply specific interventions to address each root cause.",
      actions: [
        "Run structured root cause analysis on the top 3 findings",
        "Implement process, system, or structural changes based on findings",
        "Track improvement against a defined baseline",
        "Communicate progress and early wins to the team",
      ],
    },
    {
      phase: "Days 61–90: Embed",
      title: "Sustain the Improvement",
      description: "Lock in gains and build a continuous improvement foundation.",
      actions: [
        "Ensure all changes are documented and owned by named individuals",
        "Integrate improvement KPIs into regular management reporting",
        "Conduct a 90-day retrospective and identify the next improvement priority",
        "Build an internal capability to sustain problem identification and resolution",
      ],
    },
  ],

};
