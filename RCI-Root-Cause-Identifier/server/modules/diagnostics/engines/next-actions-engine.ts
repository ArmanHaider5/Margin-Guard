// ─────────────────────────────────────────────────────────────────────────────
// NEXT ACTIONS ENGINE
//
// Translates diagnostic findings into a structured, prioritised action plan
// that helps consultants move from diagnosis to intervention.
//
// Output structure:
//   immediate    — Actions for this week (critical findings, chain breaks)
//   thirtyDay    — 30-day stabilisation actions (high findings, patterns)
//   sixtyNinetyDay — 60–90-day structural changes (medium findings, embeds)
//   summary      — 1–2 sentence context for the section header
//
// Generation sources (in priority order):
//   1. Findings → severity + category → targeted action
//   2. Causal chain → first link → "break the chain at source" action
//   3. Financial impact → loss categories → containment action
//   4. Patterns → pattern-specific named actions
//   5. Roadmap → use phase 1 as 30-day input when no finding actions generated
//
// SAFETY: no numbers are invented. Financial containment language is
// directional (e.g. "quantify" not "save RM X"). All actions are grounded
// in the structured data passed in.
// ─────────────────────────────────────────────────────────────────────────────

export interface NextAction {
  title: string;
  description: string;
  priority: "critical" | "high" | "medium";
  category: string;
  timeframe: "this-week" | "30-days" | "60-90-days";
  type: "stabilise" | "investigate" | "implement" | "monitor";
  why?: string;
  expectedOutcome?: string;
  suggestedOwner?: string;
  effort?: "LOW" | "MEDIUM" | "HIGH";
}

export interface NextActionsOutput {
  immediate: NextAction[];
  thirtyDay: NextAction[];
  sixtyNinetyDay: NextAction[];
  summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION VOCABULARY BY CATEGORY AND SEVERITY
// ─────────────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low";
type Category = "Machinery" | "Materials" | "Manpower" | "Money" | string;

interface ActionTemplate {
  title: string;
  description: string;
  type: NextAction["type"];
  why: string;
  expectedOutcome: string;
  suggestedOwner: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
}

const CATEGORY_ACTIONS: Record<string, Record<Severity, ActionTemplate>> = {

  Machinery: {
    critical: {
      title: "Assess and contain highest-risk equipment failures",
      description: "Immediately identify the assets causing the most downtime and assess their safety and reliability status. Assign a maintenance lead to each asset with a 48-hour reporting deadline.",
      type: "stabilise",
      why: "Addresses recurring unplanned downtime and missing loss visibility at the asset level.",
      expectedOutcome: "Contains the highest-risk assets and prevents further unplanned downtime this week.",
      suggestedOwner: "Maintenance Lead",
      effort: "HIGH",
    },
    high: {
      title: "Commission a PM backlog audit",
      description: "Produce a ranked list of all overdue preventive maintenance tasks sorted by production risk. Assign maintenance slots for the top 10 within the current week.",
      type: "investigate",
      why: "Targets maintenance backlog accumulation and poor PM execution discipline.",
      expectedOutcome: "Reduces breakdown frequency by clearing the highest-risk overdue maintenance items.",
      suggestedOwner: "Maintenance Lead",
      effort: "MEDIUM",
    },
    medium: {
      title: "Define a forward PM schedule for critical assets",
      description: "Establish written PM schedules for all production-critical equipment with assigned owners and compliance tracked weekly in operations meetings.",
      type: "implement",
      why: "Without a forward PM schedule, maintenance remains reactive by default.",
      expectedOutcome: "Establishes predictable maintenance discipline and reduces reactive callouts.",
      suggestedOwner: "Maintenance Lead",
      effort: "MEDIUM",
    },
    low: {
      title: "Monitor equipment health metrics",
      description: "Introduce a simple equipment health dashboard tracking MTBF and downtime per asset to support evidence-based maintenance prioritisation.",
      type: "monitor",
      why: "Lack of equipment health data prevents evidence-based maintenance decisions.",
      expectedOutcome: "Improves visibility into equipment reliability trends over time.",
      suggestedOwner: "Maintenance Lead",
      effort: "LOW",
    },
  },

  Materials: {
    critical: {
      title: "Initiate emergency procurement review",
      description: "Identify all materials currently in shortage or at single-source risk. Activate alternative suppliers or emergency stock orders for items that will block production within 14 days.",
      type: "stabilise",
      why: "Material shortages or supply risks will directly halt production lines.",
      expectedOutcome: "Prevents production stoppage from material unavailability in the next 14 days.",
      suggestedOwner: "Supply Chain Planner",
      effort: "HIGH",
    },
    high: {
      title: "Audit supplier on-time delivery performance",
      description: "Pull OTD data for all key suppliers over the last 90 days. Identify the three most unreliable and initiate a formal supplier conversation with corrective action requirements.",
      type: "investigate",
      why: "Unreliable suppliers are a root cause of schedule disruptions and expediting costs.",
      expectedOutcome: "Identifies and addresses the highest-risk supplier relationships.",
      suggestedOwner: "Supply Chain Planner",
      effort: "LOW",
    },
    medium: {
      title: "Establish risk-based safety stock levels",
      description: "Set minimum stock levels for all critical materials based on supplier lead time and delivery reliability — not a flat formula. Review quarterly.",
      type: "implement",
      why: "Flat safety stock formulas do not account for supplier variability, causing stockouts or excess.",
      expectedOutcome: "Reduces stockout frequency and excess inventory carrying cost.",
      suggestedOwner: "Supply Chain Planner",
      effort: "MEDIUM",
    },
    low: {
      title: "Introduce purchase order acknowledgement tracking",
      description: "Ensure all purchase orders receive a supplier acknowledgement with confirmed delivery date. Flag any missing acknowledgements within 48 hours of issue.",
      type: "monitor",
      why: "Missing delivery confirmations lead to late-detected supply failures.",
      expectedOutcome: "Improves early warning of delivery failures before they impact production.",
      suggestedOwner: "Supply Chain Planner",
      effort: "LOW",
    },
  },

  Manpower: {
    critical: {
      title: "Identify and engage highest-risk employees immediately",
      description: "Identify the 5 most experienced team members at risk of departure. Hold structured stay conversations this week to understand their key concerns and what would retain them.",
      type: "stabilise",
      why: "Loss of key experienced staff will compound operational instability immediately.",
      expectedOutcome: "Identifies flight risks and takes targeted retention action before departures occur.",
      suggestedOwner: "HR / Workforce Lead",
      effort: "MEDIUM",
    },
    high: {
      title: "Conduct structured exit interviews with recent departures",
      description: "Analyse exit data from the last 10 departures to identify the primary drivers of attrition. Produce a ranked list of push factors for management review.",
      type: "investigate",
      why: "Without understanding why people leave, attrition will continue unchecked.",
      expectedOutcome: "Identifies the primary drivers of attrition for targeted intervention.",
      suggestedOwner: "HR / Workforce Lead",
      effort: "LOW",
    },
    medium: {
      title: "Map skills against role requirements across the team",
      description: "Build a skills matrix for all operators and technicians. Identify the three highest-risk competency gaps — those currently causing errors, delays, or quality issues.",
      type: "implement",
      why: "Unknown skill gaps lead to errors, quality issues, and production delays.",
      expectedOutcome: "Identifies the highest-risk competency gaps for structured training intervention.",
      suggestedOwner: "HR / Workforce Lead",
      effort: "MEDIUM",
    },
    low: {
      title: "Track turnover and absenteeism monthly",
      description: "Establish a simple workforce stability scorecard reviewed in monthly operations meetings. Set a 6-month target for turnover rate reduction.",
      type: "monitor",
      why: "Without tracking, workforce instability is invisible until it becomes critical.",
      expectedOutcome: "Enables early detection of workforce stability trends before they escalate.",
      suggestedOwner: "HR / Workforce Lead",
      effort: "LOW",
    },
  },

  Money: {
    critical: {
      title: "Freeze discretionary expenditure and initiate cost audit",
      description: "Immediately halt all non-essential spending and conduct a 30-day cost breakdown by category (labour, materials, energy, maintenance, downtime). Assign a cost owner to each major line.",
      type: "stabilise",
      why: "Uncontrolled costs without visibility will escalate further without immediate ownership.",
      expectedOutcome: "Creates cost visibility and assigns ownership to halt uncontrolled spending.",
      suggestedOwner: "Finance Controller",
      effort: "HIGH",
    },
    high: {
      title: "Identify and own the top 3 cost overrun areas",
      description: "Identify the three cost categories most above plan. Assign named owners with clear authority and accountability to each. Set a fortnightly review cycle.",
      type: "investigate",
      why: "Cost overruns without named owners will not be resolved.",
      expectedOutcome: "Assigns clear accountability for the highest-cost areas with review cadence.",
      suggestedOwner: "Finance Controller",
      effort: "MEDIUM",
    },
    medium: {
      title: "Introduce process-level cost variance reporting",
      description: "Implement variance reporting that tracks actual versus budgeted cost at the process level — not just at total cost centre level. This enables targeted intervention.",
      type: "implement",
      why: "Total-level cost reporting masks the process-level decisions driving overruns.",
      expectedOutcome: "Enables targeted cost intervention by revealing process-level variance.",
      suggestedOwner: "Finance Controller",
      effort: "MEDIUM",
    },
    low: {
      title: "Benchmark cost ratios against industry norms",
      description: "Compare key cost ratios (cost per unit, labour as % of revenue, maintenance cost as % of asset value) against industry benchmarks and set improvement targets.",
      type: "monitor",
      why: "Without benchmarking, there is no context to evaluate whether cost ratios are acceptable.",
      expectedOutcome: "Sets evidence-based improvement targets for key cost ratios.",
      suggestedOwner: "Finance Controller",
      effort: "LOW",
    },
  },

  Quality: {
    critical: {
      title: "Hold and review all non-conforming batches immediately",
      description: "Place all suspect output on hold pending review. Quantify the current cost of non-conformance — rework hours, scrap volume, and customer impact — before releasing any product.",
      type: "stabilise",
      why: "Non-conforming product in the production stream creates compounding rework and customer risk.",
      expectedOutcome: "Contains immediate quality losses and prevents non-conforming product from reaching customers.",
      suggestedOwner: "Quality Supervisor",
      effort: "HIGH",
    },
    high: {
      title: "Run root cause analysis on the top 3 defect types",
      description: "Use 5-Why or fishbone analysis on the highest-frequency defect types. Document findings and present to operations management within 14 days with corrective actions.",
      type: "investigate",
      why: "Without structured root cause analysis, the same defects will recur indefinitely.",
      expectedOutcome: "Identifies and addresses the root cause of the top defect types.",
      suggestedOwner: "Quality Supervisor",
      effort: "LOW",
    },
    medium: {
      title: "Implement in-process inspection at highest-defect stages",
      description: "Add inspection checkpoints at the process steps generating the most defects. This catches non-conformances before they compound into larger losses.",
      type: "implement",
      why: "Late detection of defects increases rework cost and customer exposure significantly.",
      expectedOutcome: "Reduces defect escape rate through earlier in-process detection.",
      suggestedOwner: "Quality Supervisor",
      effort: "MEDIUM",
    },
    low: {
      title: "Track First Pass Yield and Cost of Poor Quality weekly",
      description: "Introduce FPY and CoPQ as standing operational KPIs. Review weekly in production meetings with ownership for corrective actions.",
      type: "monitor",
      why: "Without FPY and CoPQ tracking, quality losses remain invisible in financial reporting.",
      expectedOutcome: "Creates weekly quality cost visibility for management review.",
      suggestedOwner: "Quality Supervisor",
      effort: "LOW",
    },
  },

  Operations: {
    critical: {
      title: "Stabilise production schedule immediately",
      description: "Implement a schedule freeze window — no changes within 48 hours of production start. Identify and escalate the primary causes of schedule disruption to leadership.",
      type: "stabilise",
      why: "Uncontrolled schedule changes create cascading disruptions across all production areas.",
      expectedOutcome: "Stabilises the production schedule and reduces downstream disruption.",
      suggestedOwner: "Production Manager",
      effort: "MEDIUM",
    },
    high: {
      title: "Map and eliminate the top 3 production bottlenecks",
      description: "Identify the process steps with the highest wait time or rework rate. Assign dedicated improvement resource to each and track cycle time improvement weekly.",
      type: "investigate",
      why: "Unaddressed bottlenecks are constraining throughput and driving avoidable cost.",
      expectedOutcome: "Increases throughput and reduces wait time at the identified bottlenecks.",
      suggestedOwner: "Production Manager",
      effort: "MEDIUM",
    },
    medium: {
      title: "Standardise and document critical process steps",
      description: "Produce or update Standard Operating Procedures for the processes generating the most variation. Conduct a floor walk to validate actual practice against documented standards.",
      type: "implement",
      why: "Process variation without documented standards cannot be measured or improved.",
      expectedOutcome: "Reduces process variation and enables consistent, repeatable performance.",
      suggestedOwner: "Production Manager",
      effort: "MEDIUM",
    },
    low: {
      title: "Introduce a daily production performance review",
      description: "Stand up a 15-minute daily ops meeting covering output vs. plan, downtime, quality, and staffing. Ensure all issues are captured with an owner and resolution timeline.",
      type: "monitor",
      why: "Without a daily review cadence, operational issues accumulate before they are escalated.",
      expectedOutcome: "Creates a daily operational discipline for proactive issue management.",
      suggestedOwner: "Production Manager",
      effort: "LOW",
    },
  },

};

// Fallback for unknown categories
const DEFAULT_ACTION: Record<Severity, ActionTemplate> = {
  critical: {
    title: "Define and assign immediate stabilisation priorities",
    description: "Identify the operational areas at highest immediate risk and assign named owners. Set a 48-hour checkpoint to confirm stabilisation actions are underway.",
    type: "stabilise",
    why: "Critical operational risk requires immediate visible ownership to prevent further escalation.",
    expectedOutcome: "Establishes who is responsible for each critical area and confirms action is underway.",
    suggestedOwner: "Operations Manager",
    effort: "HIGH",
  },
  high: {
    title: "Investigate and document the primary operational failure modes",
    description: "Conduct a structured investigation into the identified root causes. Document findings with supporting evidence and present to the leadership team within 14 days.",
    type: "investigate",
    why: "Structured investigation prevents the same root cause from recurring without documented evidence.",
    expectedOutcome: "Documents root causes with evidence to support targeted management decisions.",
    suggestedOwner: "Operations Manager",
    effort: "MEDIUM",
  },
  medium: {
    title: "Implement process controls for identified problem areas",
    description: "Define and implement controls for the areas identified in this diagnostic. Assign ownership, set review cadence, and track compliance.",
    type: "implement",
    why: "Identified problem areas need formal controls to prevent recurrence.",
    expectedOutcome: "Reduces recurrence of identified problems through structured controls.",
    suggestedOwner: "Operations Manager",
    effort: "MEDIUM",
  },
  low: {
    title: "Establish monitoring for emerging operational risks",
    description: "Set up simple tracking mechanisms for the areas identified as lower-priority but worth watching. Review monthly.",
    type: "monitor",
    why: "Lower-priority risks can escalate if not tracked over time.",
    expectedOutcome: "Maintains visibility over emerging risks before they become critical.",
    suggestedOwner: "Operations Manager",
    effort: "LOW",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CAUSAL CHAIN → BREAK-THE-CHAIN ACTION
// Maps the starting step of a chain to a specific chain-break intervention.
// ─────────────────────────────────────────────────────────────────────────────

const CHAIN_BREAK_ACTIONS: Record<string, ActionTemplate> = {
  "pm overdue": {
    title: "Clear overdue PM backlog before next production run",
    description: "The diagnostic chain starts with deferred preventive maintenance. Assign dedicated maintenance time within 72 hours to address the highest-risk overdue PM tasks.",
    type: "stabilise",
    why: "Deferred PM is the first link in the identified failure chain — clearing it breaks the sequence.",
    expectedOutcome: "Reduces breakdown risk by addressing the highest-risk overdue PM tasks this week.",
    suggestedOwner: "Maintenance Lead",
    effort: "HIGH",
  },
  "maintenance backlog": {
    title: "Prioritise and schedule the maintenance backlog this week",
    description: "A maintenance backlog is the first link in the identified failure chain. Rank all outstanding items by production risk and schedule the top five within the current week.",
    type: "stabilise",
    why: "A maintenance backlog is the root of reactive maintenance and unplanned downtime.",
    expectedOutcome: "Reduces breakdown frequency by clearing the highest-impact maintenance backlog items.",
    suggestedOwner: "Maintenance Lead",
    effort: "HIGH",
  },
  "supplier delay": {
    title: "Contact at-risk suppliers and establish delivery commitments",
    description: "Supplier delay is the root of the identified operational chain. Make direct contact with the responsible suppliers, confirm revised delivery dates, and activate contingency stock.",
    type: "stabilise",
    why: "Supplier delay is the root of production scheduling and inventory disruption.",
    expectedOutcome: "Re-establishes reliable supply commitments to restore production stability.",
    suggestedOwner: "Supply Chain Planner",
    effort: "MEDIUM",
  },
  "quality drift": {
    title: "Halt and investigate the quality drift at its source",
    description: "Quality drift is the starting point of the identified chain. Pause the affected process, identify the root of the deviation, and implement a corrective control before resuming.",
    type: "stabilise",
    why: "Quality drift allowed to continue will escalate scrap, rework, and customer complaints.",
    expectedOutcome: "Arrests the quality drift and prevents further non-conformance propagation.",
    suggestedOwner: "Quality Supervisor",
    effort: "HIGH",
  },
  "high turnover": {
    title: "Initiate urgent retention assessment for at-risk team members",
    description: "High workforce turnover is triggering the identified operational chain. Hold structured conversations with the most experienced team members this week to understand and address flight risk.",
    type: "stabilise",
    why: "Workforce attrition at critical levels will compound all other operational problems.",
    expectedOutcome: "Identifies the highest retention risks and takes targeted action before further departures.",
    suggestedOwner: "HR / Workforce Lead",
    effort: "MEDIUM",
  },
  "capacity utilization high": {
    title: "Assess and reallocate capacity across production lines",
    description: "Capacity running at or near its limit is the source of the identified chain. Review current production allocation and identify opportunities to reduce peak loading within the week.",
    type: "investigate",
    why: "Near-capacity operations leave no buffer for disruptions — any deviation triggers cascading delays.",
    expectedOutcome: "Creates headroom in the production system to absorb variability.",
    suggestedOwner: "Production Manager",
    effort: "MEDIUM",
  },
  "inventory discrepancy": {
    title: "Conduct an immediate stock count and reconcile discrepancies",
    description: "Inventory discrepancies are the starting point of the identified operational chain. Conduct a targeted stock count in the identified areas and reconcile with system records within 48 hours.",
    type: "investigate",
    why: "Inventory discrepancies create planning errors, production surprises, and write-off risk.",
    expectedOutcome: "Reconciles stock records to restore planning accuracy.",
    suggestedOwner: "Supply Chain Planner",
    effort: "MEDIUM",
  },
};

function normaliseStep(step: string): string {
  return step.toLowerCase().replace(/_/g, " ").trim();
}

function getChainBreakAction(chain: string[]): NextAction | null {
  if (!chain || chain.length < 2) return null;
  const firstStep = normaliseStep(chain[0]);
  const template = CHAIN_BREAK_ACTIONS[firstStep];
  if (!template) return null;
  return {
    ...template,
    priority: "critical",
    category: "Operations",
    timeframe: "this-week",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL IMPACT → CONTAINMENT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

function getFinancialContainmentActions(financialImpact: any): NextAction[] {
  const actions: NextAction[] = [];
  const impact = financialImpact ?? {};

  if ((impact.downtimeLoss ?? 0) > 0) {
    actions.push({
      title: "Quantify and track downtime losses daily",
      description: "Downtime losses are identified in this diagnostic. Establish a daily downtime log that captures cause, duration, and production impact — this creates the evidence base for prioritising maintenance investment.",
      priority: "high",
      category: "Machinery",
      timeframe: "this-week",
      type: "investigate",
      why: "Unquantified downtime losses cannot be prioritised or justified for maintenance investment.",
      expectedOutcome: "Improves visibility into daily downtime loss to support maintenance investment decisions.",
      suggestedOwner: "Maintenance Lead",
      effort: "LOW",
    });
  }

  if ((impact.qualityLoss ?? impact.scrapLoss ?? 0) > 0) {
    actions.push({
      title: "Establish a daily scrap and rework cost tracking mechanism",
      description: "Quality losses are identified in this diagnostic. Capture scrap volume and rework hours daily by process step. This data will immediately reveal where quality intervention will have the highest financial return.",
      priority: "high",
      category: "Quality",
      timeframe: "this-week",
      type: "investigate",
      why: "Quality losses are often hidden in overhead rather than tracked as visible, actionable cost.",
      expectedOutcome: "Reduces hidden quality and rework cost by creating process-level visibility.",
      suggestedOwner: "Quality Supervisor",
      effort: "LOW",
    });
  }

  if ((impact.workforceLoss ?? impact.overtimeCost ?? 0) > 0) {
    actions.push({
      title: "Audit overtime hours and validate approval process",
      description: "Workforce-related financial losses are identified in this diagnostic. Review overtime hours over the last 30 days, confirm all are properly authorised, and identify whether overtime is compensating for a recurring capacity gap.",
      priority: "high",
      category: "Manpower",
      timeframe: "30-days",
      type: "investigate",
      why: "Overtime costs may be compensating for a structural capacity or planning gap — not a temporary need.",
      expectedOutcome: "Identifies whether overtime is planned or reactive and whether it is structurally necessary.",
      suggestedOwner: "HR / Workforce Lead",
      effort: "LOW",
    });
  }

  if ((impact.supplyChainLoss ?? 0) > 0) {
    actions.push({
      title: "Review supply chain cost leakage: expediting fees and stock-out penalties",
      description: "Supply chain financial losses are identified. Quantify the cost of expediting and stock-out events over the last quarter. This provides the business case for safety stock and supplier development investment.",
      priority: "medium",
      category: "Materials",
      timeframe: "30-days",
      type: "investigate",
      why: "Expediting fees and stockout penalties are often untracked and poorly managed.",
      expectedOutcome: "Quantifies supply chain cost leakage to build the case for supply chain investment.",
      suggestedOwner: "Supply Chain Planner",
      effort: "LOW",
    });
  }

  return actions;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN → NAMED FOCUS ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

const PATTERN_ACTIONS: Record<string, NextAction> = {
  "Reactive Maintenance Culture": {
    title: "Establish a maintenance planning discipline this month",
    description: "The diagnostic identifies a pattern of reactive maintenance. Introduce a weekly maintenance planning meeting with a fixed agenda: backlog review, upcoming PMs, and spare parts availability check.",
    priority: "high",
    category: "Machinery",
    timeframe: "30-days",
    type: "implement",
    why: "Reactive maintenance without a planning discipline will perpetuate breakdowns and unplanned downtime.",
    expectedOutcome: "Establishes a weekly maintenance planning routine that reduces reactive callouts.",
    suggestedOwner: "Maintenance Lead",
    effort: "MEDIUM",
  },
  "Production Planning Instability": {
    title: "Implement a production schedule freeze and daily alignment",
    description: "Production planning instability is identified as a systemic pattern. Introduce a schedule freeze window (no changes within 48 hours of production) and a daily cross-functional alignment meeting.",
    priority: "high",
    category: "Materials",
    timeframe: "30-days",
    type: "implement",
    why: "Without schedule stability, all downstream production activities are disrupted.",
    expectedOutcome: "Reduces last-minute schedule changes and improves production predictability.",
    suggestedOwner: "Production Manager",
    effort: "MEDIUM",
  },
  "Workforce Overload Pattern": {
    title: "Conduct a workforce capacity assessment",
    description: "A workforce overload pattern is identified. Map current headcount against production volume requirements, and determine whether overtime is covering a structural headcount gap or a planning inefficiency.",
    priority: "high",
    category: "Manpower",
    timeframe: "30-days",
    type: "investigate",
    why: "Structural overload causes fatigue, error rates, and attrition — all of which compound each other.",
    expectedOutcome: "Identifies whether the capacity gap is a headcount or planning issue and assigns corrective ownership.",
    suggestedOwner: "HR / Workforce Lead",
    effort: "MEDIUM",
  },
  "Quality Degradation Loop": {
    title: "Run a quality failure mode workshop with the production team",
    description: "A quality degradation loop is identified. Bring together operators, quality staff, and supervisors in a structured session to map the defect sources and agree on the top 3 priority corrective actions.",
    priority: "high",
    category: "Quality",
    timeframe: "30-days",
    type: "implement",
    why: "Quality loops self-reinforce — rework creates more defects without structured cross-functional intervention.",
    expectedOutcome: "Identifies the top 3 defect sources and agrees corrective actions with production ownership.",
    suggestedOwner: "Quality Supervisor",
    effort: "MEDIUM",
  },
  "Supply Chain Vulnerability": {
    title: "Qualify at least one alternative supplier for each critical material",
    description: "Supply chain vulnerability is identified as a systemic risk. Prioritise finding and qualifying backup suppliers for the top 5 single-source materials to reduce concentration risk.",
    priority: "medium",
    category: "Materials",
    timeframe: "60-90-days",
    type: "implement",
    why: "Single-source dependencies create concentration risk that can halt production without warning.",
    expectedOutcome: "Reduces supply chain concentration risk through alternative supplier qualification.",
    suggestedOwner: "Supply Chain Planner",
    effort: "HIGH",
  },
  "Workforce Attrition Cycle": {
    title: "Design and launch a structured employee retention programme",
    description: "A workforce attrition cycle is identified. Based on exit interview findings, develop targeted retention initiatives — addressing pay, working conditions, career progression, or workload — and communicate them clearly.",
    priority: "high",
    category: "Manpower",
    timeframe: "60-90-days",
    type: "implement",
    why: "Without a targeted retention programme, attrition will continue to cycle and erode operational capability.",
    expectedOutcome: "Reduces voluntary turnover by addressing the identified push factors.",
    suggestedOwner: "HR / Workforce Lead",
    effort: "HIGH",
  },
  "Cost Escalation Pattern": {
    title: "Establish a monthly cost review with ownership accountability",
    description: "A cost escalation pattern is identified across multiple categories. Introduce a monthly cost review meeting with named cost owners for each major category reporting against plan.",
    priority: "medium",
    category: "Money",
    timeframe: "30-days",
    type: "implement",
    why: "Cost escalation across multiple categories requires structured ownership and a regular governance rhythm.",
    expectedOutcome: "Creates a monthly cost governance rhythm with named accountability for each major category.",
    suggestedOwner: "Finance Controller",
    effort: "MEDIUM",
  },
  "Capacity Bottleneck": {
    title: "Conduct a capacity utilisation analysis across production lines",
    description: "Capacity bottlenecks are identified. Map utilisation rates across all production lines and identify whether bottlenecks are driven by machine availability, staffing, or planning — each requires a different intervention.",
    priority: "high",
    category: "Machinery",
    timeframe: "30-days",
    type: "investigate",
    why: "Bottlenecks constrain throughput and their true cause must be identified before investing in solutions.",
    expectedOutcome: "Identifies the root cause of capacity bottlenecks and assigns improvement ownership.",
    suggestedOwner: "Production Manager",
    effort: "MEDIUM",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION
// Prevents the same action title appearing more than once across all timeframes.
// ─────────────────────────────────────────────────────────────────────────────

function deduplicateActions(actions: NextAction[]): NextAction[] {
  const seen = new Set<string>();
  return actions.filter((a) => {
    const key = a.title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function generateNextActions(
  findings: any[],
  causalChains: any[],
  financialImpact: any,
  healthScore: { overallScore: number; riskLevel: string },
  patterns: any[],
  roadmap: any[],
): NextActionsOutput {

  const immediateRaw: NextAction[] = [];
  const thirtyDayRaw: NextAction[] = [];
  const sixtyNinetyDayRaw: NextAction[] = [];

  const riskLevel = healthScore?.riskLevel ?? "Moderate";
  const isCritical = riskLevel === "Critical";
  const isHigh = riskLevel === "High" || isCritical;

  // ── 1. Findings → severity-based actions ─────────────────────────────────
  for (const finding of findings ?? []) {
    const category = (finding.category ?? finding.fourMCategory ?? "Operations").trim();
    const severity: Severity = (finding.severity ?? "medium").toLowerCase() as Severity;
    const templates = CATEGORY_ACTIONS[category] ?? DEFAULT_ACTION;
    const template = (templates as any)[severity] ?? DEFAULT_ACTION[severity];

    const action: NextAction = {
      title: template.title,
      description: template.description,
      priority: severity === "critical" ? "critical" : severity === "high" ? "high" : "medium",
      category,
      timeframe:
        severity === "critical" ? "this-week" :
        severity === "high" ? (isCritical ? "this-week" : "30-days") :
        "60-90-days",
      type: template.type,
      why: template.why,
      expectedOutcome: template.expectedOutcome,
      suggestedOwner: template.suggestedOwner,
      effort: template.effort,
    };

    if (action.timeframe === "this-week") immediateRaw.push(action);
    else if (action.timeframe === "30-days") thirtyDayRaw.push(action);
    else sixtyNinetyDayRaw.push(action);
  }

  // ── 2. Causal chain → break-the-chain action ────────────────────────────
  const primaryChain = causalChains?.[0]?.chain ?? [];
  const chainBreak = getChainBreakAction(primaryChain);
  if (chainBreak) {
    immediateRaw.unshift(chainBreak); // chain-break action always comes first
  }

  // ── 3. Financial impact → containment actions ───────────────────────────
  const financialActions = getFinancialContainmentActions(financialImpact);
  for (const fa of financialActions) {
    if (fa.timeframe === "this-week") immediateRaw.push(fa);
    else if (fa.timeframe === "30-days") thirtyDayRaw.push(fa);
    else sixtyNinetyDayRaw.push(fa);
  }

  // ── 4. Patterns → named focus actions ──────────────────────────────────
  for (const pattern of patterns ?? []) {
    const patternName = pattern.pattern ?? pattern.name ?? "";
    const patternAction = PATTERN_ACTIONS[patternName];
    if (patternAction) {
      if (patternAction.timeframe === "this-week") immediateRaw.push(patternAction);
      else if (patternAction.timeframe === "30-days") thirtyDayRaw.push(patternAction);
      else sixtyNinetyDayRaw.push(patternAction);
    }
  }

  // ── 5. Roadmap phase 1 → supplement 30-day actions if thin ─────────────
  if (thirtyDayRaw.length < 2 && Array.isArray(roadmap) && roadmap.length > 0) {
    const phase1 = roadmap[0];
    const phase1Actions: string[] = phase1?.actions ?? [];
    for (const actionText of phase1Actions.slice(0, 3)) {
      thirtyDayRaw.push({
        title: actionText,
        description: `From the transformation roadmap: ${phase1.description ?? "Stabilisation phase action."}`,
        priority: "high",
        category: "Operations",
        timeframe: "30-days",
        type: "implement",
        why: "Derived from the diagnostic roadmap stabilisation phase.",
        expectedOutcome: "Advances the 30-day stabilisation plan.",
        suggestedOwner: "Operations Manager",
        effort: "MEDIUM",
      });
    }
  }

  // ── Deduplicate and cap each bucket ─────────────────────────────────────
  const immediate = deduplicateActions(immediateRaw).slice(0, 5);
  const thirtyDay = deduplicateActions(thirtyDayRaw).slice(0, 5);
  const sixtyNinetyDay = deduplicateActions(sixtyNinetyDayRaw).slice(0, 5);

  // ── Ensure each bucket has at least something ────────────────────────────
  if (immediate.length === 0) {
    immediate.push({
      title: "Confirm diagnostic findings with the client operations team",
      description: "Walk through each identified finding with the client team to validate accuracy, add context, and align on which issues are most critical to address first.",
      priority: "high",
      category: "Operations",
      timeframe: "this-week",
      type: "investigate",
      why: "Findings require validation with the people closest to the operations before intervention begins.",
      expectedOutcome: "Aligns the team on the most critical issues and confirms the diagnostic accuracy.",
      suggestedOwner: "Operations Manager",
      effort: "LOW",
    });
  }

  if (thirtyDay.length === 0) {
    thirtyDay.push({
      title: "Develop and present a prioritised corrective action plan",
      description: "Based on the validated findings, produce a structured corrective action plan with named owners, defined deliverables, and 30-day checkpoints for each priority area.",
      priority: "high",
      category: "Operations",
      timeframe: "30-days",
      type: "implement",
      why: "Without a structured plan, diagnostic findings do not translate into operational change.",
      expectedOutcome: "Creates a documented, owned corrective action plan for the identified root causes.",
      suggestedOwner: "Operations Manager",
      effort: "MEDIUM",
    });
  }

  if (sixtyNinetyDay.length === 0) {
    sixtyNinetyDay.push({
      title: "Review and embed improvement gains",
      description: "At 60–90 days, conduct a structured review of the corrective actions taken. Validate that improvements are holding, identify any emerging risks, and set targets for the next improvement cycle.",
      priority: "medium",
      category: "Operations",
      timeframe: "60-90-days",
      type: "monitor",
      why: "Improvements made without a follow-up review often revert to previous patterns.",
      expectedOutcome: "Validates that corrective actions are holding and sets targets for the next improvement cycle.",
      suggestedOwner: "Operations Manager",
      effort: "LOW",
    });
  }

  // ── Summary sentence ────────────────────────────────────────────────────
  const totalActions = immediate.length + thirtyDay.length + sixtyNinetyDay.length;
  const criticalCount = immediate.filter((a) => a.priority === "critical").length;

  const summary =
    criticalCount > 0
      ? `${criticalCount} critical action${criticalCount > 1 ? "s" : ""} require${criticalCount === 1 ? "s" : ""} immediate attention this week. ${totalActions} total recommended actions are sequenced across a 90-day intervention window.`
      : `${totalActions} recommended actions are sequenced across a 90-day intervention window, beginning with stabilisation priorities for the current period.`;

  console.log(
    `📋 NEXT ACTIONS: immediate=${immediate.length}, 30-day=${thirtyDay.length}, 60-90-day=${sixtyNinetyDay.length}`
  );

  return { immediate, thirtyDay, sixtyNinetyDay, summary };
}
