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
