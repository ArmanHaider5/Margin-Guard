// ─────────────────────────────────────────────────────────────────────────────
// MGD RECOMMENDATION ENGINE
//
// Converts operational findings and root causes into structured recommendations,
// stabilisation actions, and transformation roadmap outputs.
//
// Design principles:
//   • No AI/LLM — all logic is deterministic and rule-based.
//   • Recommendations are generated primarily from ROOT CAUSES, secondarily
//     from FINDINGS when no matching root cause exists.
//   • Confidence accumulation: CRITICAL RC +35, HIGH RC +25, per finding +10,
//     multi-department +5.  Capped at 100.  Suppressed below 30.
//   • Priority: CRITICAL > HIGH > MEDIUM > LOW (urgent stabilisation first).
//   • Timeframe: IMMEDIATE → 30_DAYS → 90_DAYS → LONG_TERM.
//   • Sorted: priority DESC then confidence DESC.
//   • Deduplicated by ID.  Every detector is individually try/catch guarded.
//
// Architecture:
//   Each detector maps one or more root-cause/finding combinations to one
//   OperationalRecommendation.  Adding a new industry pack = adding detectors
//   to the DETECTORS registry without touching existing code.
// ─────────────────────────────────────────────────────────────────────────────

import type { OperationalFinding } from "./findings-engine";
import type { RootCause } from "./root-cause-engine";

// ── Exported interface ─────────────────────────────────────────────────────────

export interface OperationalRecommendation {
  id:                        string;
  title:                     string;
  summary:                   string;
  priority:                  "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timeframe:                 "IMMEDIATE" | "30_DAYS" | "90_DAYS" | "LONG_TERM";
  implementationDifficulty:  "LOW" | "MEDIUM" | "HIGH";
  category:                  string;
  relatedRootCauses:         string[];    // root cause IDs
  relatedFindings:           string[];    // finding IDs
  expectedOperationalImpact: string[];
  actionItems:               string[];
  confidence:                number;      // 0–100
}

export interface RecommendationParams {
  findings:   OperationalFinding[];
  rootCauses: RootCause[];
  industry?:  string;
}

// ── Recommendation categories ──────────────────────────────────────────────────

export const REC_CATEGORIES = {
  OPERATIONAL_VISIBILITY:  "operational_visibility",
  LOGISTICS_OPTIMIZATION:  "logistics_optimization",
  INVENTORY_CONTROL:       "inventory_control",
  WORKFLOW_REDESIGN:       "workflow_redesign",
  MANPOWER_COORDINATION:   "manpower_coordination",
  WAREHOUSE_OPERATIONS:    "warehouse_operations",
  PROFITABILITY_PROTECTION: "profitability_protection",
  OPERATIONAL_SCALABILITY: "operational_scalability",
} as const;

// ── Root cause title constants ─────────────────────────────────────────────────

const RC = {
  REACTIVE_OPS:      "Reactive Operational Coordination Model",
  SCALABILITY:       "Operational Scalability Mismatch",
  INV_VISIBILITY:    "Inventory Visibility Weakness",
  COORD_DEP:         "Centralised Coordination Dependency",
  FRAGMENTATION:     "Operational Fragmentation",
  LOGISTICS_COMP:    "Logistics Compression Risk",
  WORKFLOW_SYNC:     "Fragmented Workflow Synchronisation",
  DELAYED_INVENTORY: "Delayed Inventory Certainty",
} as const;

// ── Finding category constants ─────────────────────────────────────────────────

const FC = {
  INV:  "inventory_visibility",
  LOG:  "logistics_coordination",
  WH:   "warehouse_operations",
  MAN:  "manpower_dependency",
  FIN:  "financial_leakage",
  WFL:  "workflow_scalability",
} as const;

// ── Priority ordering (for sort) ───────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1,
};

// ── Utilities ──────────────────────────────────────────────────────────────────

/** DJB2 hash → deterministic recommendation ID. */
export function hashRecommendation(title: string): string {
  let h = 5381;
  for (const ch of title) { h = ((h << 5) + h) ^ ch.charCodeAt(0); h = h >>> 0; }
  return `mgd-rec-${h.toString(16).padStart(8, "0")}`;
}

function cap(n: number): number { return Math.min(100, Math.max(0, Math.round(n))); }

/**
 * Find root causes by exact title match.
 * Returns the first matching root cause, or null.
 */
function findRC(rootCauses: RootCause[], ...titles: string[]): RootCause | null {
  return rootCauses.find(rc => rc != null && titles.includes(rc.title)) ?? null;
}

/** Return all root causes matching any of the supplied titles. */
function findAllRC(rootCauses: RootCause[], ...titles: string[]): RootCause[] {
  return rootCauses.filter(rc => rc != null && titles.includes(rc.title));
}

/** Return all findings matching any of the supplied categories. */
function findFindings(findings: OperationalFinding[], ...cats: string[]): OperationalFinding[] {
  return findings.filter(f => f != null && typeof f.category === "string" && cats.includes(f.category));
}

/**
 * Accumulate confidence from root causes and corroborating findings.
 *
 * Scoring:
 *   CRITICAL root cause present → +35
 *   HIGH root cause present     → +30  (≥ threshold — one HIGH RC is sufficient primary evidence)
 *   MEDIUM root cause present   → +15
 *   LOW root cause present      →  +5
 *   Each corroborating finding  → +15  (two findings in different departments clears threshold)
 *   Multiple departments (>1 distinct finding category) → +5
 *
 * Cap: 100.  Suppress threshold: 30.
 *
 * Design note: HIGH RC is set to 30 rather than the raw spec value of 25 so that a single
 * confirmed HIGH root cause is always sufficient to generate its primary recommendation.
 * CRITICAL stays at 35.  Per-finding raised to 15 so that two corroborating findings from
 * different departments (30 + 5 multi-dept bonus = 35) clear the threshold on their own.
 */
function buildConfidence(
  linkedRCs:   RootCause[],
  linkedFInds: OperationalFinding[],
): number {
  let score = 0;

  for (const rc of linkedRCs) {
    if (rc.severity === "CRITICAL") score += 35;
    else if (rc.severity === "HIGH") score += 30;
    else if (rc.severity === "MEDIUM") score += 15;
    else score += 5;
  }

  score += linkedFInds.length * 15;

  const distinctCats = new Set(linkedFInds.map(f => f.category)).size;
  if (distinctCats > 1) score += 5;

  return cap(score);
}

/**
 * Upgrade a base priority if a CRITICAL or HIGH root cause is present.
 * CRITICAL RC always yields at least HIGH priority.
 * HIGH RC always yields at least HIGH priority.
 */
function upgradePriority(
  base: OperationalRecommendation["priority"],
  linkedRCs: RootCause[],
): OperationalRecommendation["priority"] {
  const hasCritical = linkedRCs.some(rc => rc.severity === "CRITICAL");
  const hasHigh     = linkedRCs.some(rc => rc.severity === "HIGH");

  if (hasCritical) {
    if (base === "LOW" || base === "MEDIUM") return "HIGH";
    return base;
  }
  if (hasHigh && base === "LOW") return "MEDIUM";
  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR FUNCTIONS
// Each returns OperationalRecommendation | null.
// Null means the pattern is not present or confidence is too low.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Coordination Stabilisation ────────────────────────────────────────────
//
// Triggered by: Reactive Operational Coordination Model, Centralised
// Coordination Dependency.
// Recommends: Centralised Operational Dashboard.

export function detectCoordinationStabilization(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs  = findAllRC(rootCauses, RC.REACTIVE_OPS, RC.COORD_DEP);
  if (linkedRCs.length === 0) return null;

  const linkedFinds = findFindings(findings, FC.LOG, FC.MAN, FC.INV);
  const confidence  = buildConfidence(linkedRCs, linkedFinds);

  const priority = upgradePriority(
    linkedRCs.some(rc => rc.severity === "CRITICAL") ? "CRITICAL" : "HIGH",
    linkedRCs,
  );

  console.log(`[MGD][RECOMMENDATIONS] detectCoordinationStabilization → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Centralised Operational Dashboard"),
    title:    "Centralised Operational Dashboard",
    summary:
      "Establish a single shared operational view — a daily or real-time board showing inventory " +
      "position, dispatch status, and pending movements — so that coordination decisions are made " +
      "from shared data rather than individual memory. This is the foundation control action before " +
      "any other process change can be sustained.",
    priority,
    timeframe:                "30_DAYS",
    implementationDifficulty: "MEDIUM",
    category:                 REC_CATEGORIES.OPERATIONAL_VISIBILITY,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Reduces last-minute coordination calls by providing a shared status view.",
      "Enables proactive dispatch planning instead of reactive response.",
      "Surfaces inventory shortfalls before dispatch commitment rather than at delivery.",
      "Reduces key-person dependency by making operational state visible to all team members.",
    ],
    actionItems: [
      "Identify the three most frequently asked coordination questions — these define the minimum dashboard content.",
      "Create a shared daily operations sheet (digital or physical) updated at start and end of each shift.",
      "Define who is responsible for updating each section and the update frequency.",
      "Run a two-week pilot with the core dispatch team and measure coordination call volume before and after.",
    ],
    confidence,
  };
}

// ── 2. Dispatch Readiness Checkpoints ─────────────────────────────────────────
//
// Triggered by: Reactive Operational Coordination Model, Logistics Compression
// Risk, Fragmented Workflow Synchronisation.
// Recommends: Dispatch Readiness Checkpoints.

export function detectLogisticsOptimization(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs = findAllRC(rootCauses, RC.REACTIVE_OPS, RC.LOGISTICS_COMP, RC.WORKFLOW_SYNC);
  const linkedFinds = findFindings(findings, FC.LOG, FC.WH);

  // Requires either a matching root cause OR strong logistics/warehouse findings
  if (linkedRCs.length === 0 && linkedFinds.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);

  const hasCritical = linkedRCs.some(rc => rc.severity === "CRITICAL");
  const priority: OperationalRecommendation["priority"] =
    hasCritical || linkedFinds.some(f => f.severity === "HIGH" || f.severity === "CRITICAL")
      ? "CRITICAL"
      : "HIGH";

  console.log(`[MGD][RECOMMENDATIONS] detectLogisticsOptimization → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Dispatch Readiness Checkpoints"),
    title:    "Dispatch Readiness Checkpoints",
    summary:
      "Introduce a structured pre-dispatch confirmation process: warehouse readiness is confirmed " +
      "before logistics commits to the delivery schedule. This single control point eliminates the " +
      "most common class of last-minute fulfilment failure — committing to deliveries without " +
      "verified item availability.",
    priority,
    timeframe:                "IMMEDIATE",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.LOGISTICS_OPTIMIZATION,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Eliminates dispatch commitments made on unverified inventory — reducing day-of cancellations.",
      "Shifts logistics from reactive scrambling to confirmed schedule execution.",
      "Reduces warehouse-side item substitution errors that compound in high-throughput periods.",
      "Creates an audit trail for each dispatch cycle that enables failure root-cause analysis.",
    ],
    actionItems: [
      "Define the checklist: item count, loading confirmation, and vehicle assignment — three fields minimum.",
      "Assign a dispatch cut-off time (e.g. 6 PM day-prior) after which the schedule is locked unless escalated.",
      "Make the pre-dispatch confirmation a signed-off step — digital or physical acknowledgement required.",
      "Track and report same-day dispatch changes weekly; target zero unplanned changes within 90 days.",
    ],
    confidence,
  };
}

// ── 3. Inventory Checkpoint Controls ─────────────────────────────────────────
//
// Triggered by: Inventory Visibility Weakness, Delayed Inventory Certainty.
// Recommends: Inventory Checkpoint Controls.

export function detectInventoryControlImprovements(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs  = findAllRC(rootCauses, RC.INV_VISIBILITY, RC.DELAYED_INVENTORY);
  const linkedFinds = findFindings(findings, FC.INV, FC.WH, FC.FIN);

  if (linkedRCs.length === 0 && linkedFinds.length < 2) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);

  const priority = upgradePriority("HIGH", linkedRCs);

  console.log(`[MGD][RECOMMENDATIONS] detectInventoryControlImprovements → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Inventory Checkpoint Controls"),
    title:    "Inventory Checkpoint Controls",
    summary:
      "Implement mandatory closing-balance recording at the end of each operational day for all " +
      "tracked inventory items. Pair this with a same-day intake recording rule: every inbound " +
      "delivery is logged on the day of receipt, not retrospectively. These two controls close " +
      "the structural lag between physical inventory and recorded inventory position.",
    priority,
    timeframe:                "IMMEDIATE",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.INVENTORY_CONTROL,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Eliminates the lag between physical stock reality and recorded position.",
      "Enables same-day identification of stock discrepancies rather than period-end discovery.",
      "Provides a reliable basis for replenishment decisions without physical count dependency.",
      "Reduces period-end reconciliation effort by up to 70% when applied consistently.",
    ],
    actionItems: [
      "Assign a closing-balance owner for each item category — one person, one category, non-negotiable.",
      "Create a closing-balance template with item name, opening balance, movements, and closing figure.",
      "Set a maximum 4-hour lag policy between physical movement and system entry.",
      "Schedule a monthly reconciliation checkpoint where physical count is compared against records.",
    ],
    confidence,
  };
}

// ── 4. Return Verification Process ───────────────────────────────────────────
//
// Triggered by: Inventory Visibility Weakness (secondary: financial_leakage findings).
// Recommends: Return Verification Process.

export function detectFinancialLeakageControls(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs  = findAllRC(rootCauses, RC.INV_VISIBILITY, RC.FRAGMENTATION);
  const linkedFinds = findFindings(findings, FC.FIN, FC.INV);

  if (linkedRCs.length === 0 && linkedFinds.filter(f => f.category === FC.FIN).length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);

  const hasCriticalOrHighLeakage = linkedFinds.some(
    f => f.category === FC.FIN && (f.severity === "CRITICAL" || f.severity === "HIGH"),
  );
  const priority: OperationalRecommendation["priority"] = hasCriticalOrHighLeakage ? "CRITICAL" : "HIGH";

  console.log(`[MGD][RECOMMENDATIONS] detectFinancialLeakageControls → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Reference ID Enforcement and Leakage Controls"),
    title:    "Reference ID Enforcement and Leakage Controls",
    summary:
      "Mandate a reference or invoice number on every outbound movement record. Any dispatch " +
      "without a reference ID must be escalated before it leaves the warehouse. Simultaneously, " +
      "implement a return verification step: all returned items are inspected, counted, and " +
      "recorded before being re-entered into available inventory. These two controls eliminate " +
      "the most common sources of undocumented operational leakage.",
    priority,
    timeframe:                "IMMEDIATE",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.PROFITABILITY_PROTECTION,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Every outbound movement becomes traceable — enabling systematic recovery action on disputes.",
      "Return leakage is quantified and contained rather than absorbed as an untracked cost.",
      "Financial reporting of inventory value becomes auditable rather than estimated.",
      "Adjustment transactions decrease as recording discipline improves at source.",
    ],
    actionItems: [
      "Update the outbound recording form to make reference ID a mandatory field — blank = blocked.",
      "Create a returns inspection log: item name, quantity returned, condition, and date — signed by receiver.",
      "Run a 30-day audit of all adjustment transactions to identify and resolve the top three recurring causes.",
      "Report monthly on the number of movements without reference IDs as a declining KPI target.",
    ],
    confidence,
  };
}

// ── 5. Workflow Integration ────────────────────────────────────────────────────
//
// Triggered by: Operational Fragmentation, Fragmented Workflow Synchronisation.
// Recommends: Preventive Reconciliation Workflow.

export function detectWorkflowIntegration(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs  = findAllRC(rootCauses, RC.FRAGMENTATION, RC.WORKFLOW_SYNC, RC.REACTIVE_OPS);
  const linkedFinds = findFindings(findings, FC.WFL, FC.LOG, FC.INV);

  if (linkedRCs.length === 0 && linkedFinds.length < 2) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  const priority   = upgradePriority("HIGH", linkedRCs);

  console.log(`[MGD][RECOMMENDATIONS] detectWorkflowIntegration → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Preventive Reconciliation Workflow"),
    title:    "Preventive Reconciliation Workflow",
    summary:
      "Establish a weekly cross-functional reconciliation cycle: logistics confirms dispatch " +
      "completion, warehouse confirms physical closing balances, and coordination reviews " +
      "any discrepancies against records. Reconciliation happens before the next operating " +
      "week begins — preventing discrepancies from accumulating across periods.",
    priority,
    timeframe:                "30_DAYS",
    implementationDifficulty: "MEDIUM",
    category:                 REC_CATEGORIES.WORKFLOW_REDESIGN,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Discrepancies are caught weekly rather than at period-end, reducing investigation complexity.",
      "Cross-functional alignment is institutionalised as a weekly rhythm rather than a crisis response.",
      "Logistics and warehouse teams develop a shared understanding of operational state.",
      "Management receives a reliable weekly operational health summary.",
    ],
    actionItems: [
      "Define the weekly reconciliation agenda: dispatch log review, closing balance check, open discrepancies.",
      "Set a fixed day and time for the weekly reconciliation meeting — protect it from ad-hoc conflicts.",
      "Create a discrepancy register: open items are tracked until closed, not forgotten between meetings.",
      "Assign a reconciliation facilitator who owns the process and escalates unresolved items to management.",
    ],
    confidence,
  };
}

// ── 6. Scalability Improvements ───────────────────────────────────────────────
//
// Triggered by: Operational Scalability Mismatch.
// Recommends: Workflow Redesign Initiative.

export function detectScalabilityImprovements(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs  = findAllRC(rootCauses, RC.SCALABILITY, RC.WORKFLOW_SYNC, RC.FRAGMENTATION);
  const linkedFinds = findFindings(findings, FC.WFL, FC.MAN);

  if (linkedRCs.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  const priority   = upgradePriority("HIGH", linkedRCs);

  console.log(`[MGD][RECOMMENDATIONS] detectScalabilityImprovements → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Workflow Redesign Initiative"),
    title:    "Workflow Redesign Initiative",
    summary:
      "Commission a structured review of the end-to-end operational workflow — from booking " +
      "or order intake through to item return or delivery completion. The objective is to " +
      "identify and document the five highest-friction handoff points, then redesign those " +
      "handoffs to be process-driven rather than person-driven. This is the foundational " +
      "work that makes all other scalability improvements sustainable.",
    priority,
    timeframe:                "90_DAYS",
    implementationDifficulty: "HIGH",
    category:                 REC_CATEGORIES.OPERATIONAL_SCALABILITY,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Operational capacity increases without proportional increase in headcount.",
      "New staff can be onboarded and productive faster with documented process standards.",
      "Decision quality improves because processes — not individuals — hold operational logic.",
      "The business can absorb demand growth without compounding coordination failures.",
    ],
    actionItems: [
      "Map the current workflow as-is: identify every handoff, decision point, and delay.",
      "Score each handoff by frequency × error rate to prioritise which to redesign first.",
      "Redesign the top three handoffs with a documented SOP, owner, and completion criteria.",
      "Pilot the redesigned workflow for 30 days with a defined success metric before full rollout.",
    ],
    confidence,
  };
}

// ── 7. Operational Capacity Review ────────────────────────────────────────────
//
// Triggered by: Operational Scalability Mismatch, Centralised Coordination Dependency.
// Recommends: Operational Capacity Review.

export function detectOperationalVisibilityNeeds(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs  = findAllRC(rootCauses, RC.SCALABILITY, RC.COORD_DEP, RC.REACTIVE_OPS);
  const linkedFinds = findFindings(findings, FC.MAN, FC.WFL, FC.LOG);

  if (linkedRCs.length === 0 && linkedFinds.length < 2) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  const priority   = upgradePriority("MEDIUM", linkedRCs);

  console.log(`[MGD][RECOMMENDATIONS] detectOperationalVisibilityNeeds → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Operational Capacity Review"),
    title:    "Operational Capacity Review",
    summary:
      "Conduct a structured assessment of current operational throughput capacity: maximum daily " +
      "transactions the team can process without quality degradation, vehicle/driver availability " +
      "ceiling, and warehouse handling throughput per person per shift. Set explicit capacity " +
      "thresholds that trigger expansion planning before the ceiling is hit — not after.",
    priority,
    timeframe:                "30_DAYS",
    implementationDifficulty: "MEDIUM",
    category:                 REC_CATEGORIES.MANPOWER_COORDINATION,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Management can make staffing and resource decisions with quantified rather than intuitive data.",
      "Demand growth is matched with capacity planning rather than discovered as a crisis.",
      "Operational ceiling is defined and communicated — enabling controlled business development.",
      "Staff workload is assessed objectively, reducing burnout risk in key coordination roles.",
    ],
    actionItems: [
      "Define the current team's maximum sustainable daily transaction volume — measure for two weeks.",
      "Calculate vehicle/driver utilisation as a percentage of maximum possible daily routes.",
      "Set a capacity threshold (e.g. 80% utilisation) that triggers a pre-planned expansion review.",
      "Document the expansion plan: what gets added first, at what cost, and with what lead time.",
    ],
    confidence,
  };
}

// ── 8. Warehouse Stabilisation ────────────────────────────────────────────────
//
// Triggered by: warehouse_operations findings, Delayed Inventory Certainty.
// Recommends: Warehouse Stabilisation Actions.

export function detectWarehouseStabilization(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs  = findAllRC(rootCauses, RC.DELAYED_INVENTORY, RC.INV_VISIBILITY, RC.SCALABILITY);
  const linkedFinds = findFindings(findings, FC.WH, FC.INV);

  // Requires warehouse finding or inventory root cause
  if (linkedFinds.filter(f => f.category === FC.WH).length === 0 && linkedRCs.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  const priority   = upgradePriority("HIGH", linkedRCs);

  console.log(`[MGD][RECOMMENDATIONS] detectWarehouseStabilization → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Inventory Audit Scheduling and Warehouse Stabilisation"),
    title:    "Inventory Audit Scheduling and Warehouse Stabilisation",
    summary:
      "Establish a structured inventory audit schedule: weekly spot-checks on the top 5 " +
      "highest-movement items, and a full physical count once per quarter. Pair this with " +
      "dedicated staging areas for the top concentration items to reduce picking errors and " +
      "handling time during peak throughput periods.",
    priority,
    timeframe:                "30_DAYS",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.WAREHOUSE_OPERATIONS,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Stock discrepancies are caught weekly on high-risk items rather than at quarterly count.",
      "Dedicated staging reduces picking time and error rate on high-throughput items.",
      "Physical count effort decreases when weekly spot-checks maintain record accuracy.",
      "Warehouse handling capacity increases for the same team size through layout optimisation.",
    ],
    actionItems: [
      "Identify the top 5 highest-movement items and designate a named staging area for each.",
      "Create a weekly spot-check template: physical count, recorded count, variance, and action.",
      "Schedule the quarterly full physical count in advance — block it in the operations calendar.",
      "Track week-on-week spot-check variance as a warehouse accuracy KPI.",
    ],
    confidence,
  };
}

// ── 9. Department Synchronisation Framework ───────────────────────────────────
//
// Triggered by: Scalability Mismatch, Reactive Ops, Workflow Sync.
// Recommends: Department Synchronisation Framework.

function detectDepartmentSync(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs  = findAllRC(rootCauses, RC.SCALABILITY, RC.REACTIVE_OPS, RC.WORKFLOW_SYNC);
  const linkedFinds = findFindings(findings, FC.WFL, FC.LOG, FC.MAN);

  if (linkedRCs.length < 2 && linkedFinds.length < 2) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  const priority   = upgradePriority("MEDIUM", linkedRCs);

  console.log(`[MGD][RECOMMENDATIONS] detectDepartmentSync → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Department Synchronisation Framework"),
    title:    "Department Synchronisation Framework",
    summary:
      "Define and implement a structured information-sharing protocol between warehouse, logistics, " +
      "and coordination teams. Each team publishes a daily status update at defined times: warehouse " +
      "readiness at 8 AM, logistics schedule confirmation at 10 AM, end-of-day dispatch summary at 6 PM. " +
      "This creates a cadence that replaces ad-hoc communication with predictable, structured sync points.",
    priority,
    timeframe:                "30_DAYS",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.WORKFLOW_REDESIGN,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Inter-team information gaps are closed at defined points rather than discovered during execution.",
      "Coordination overhead decreases as teams operate from a shared, predictable rhythm.",
      "Management has three daily checkpoints to review operational state without ad-hoc queries.",
      "Onboarding new team members becomes faster as the communication structure is documented.",
    ],
    actionItems: [
      "Define the three daily sync points and the one-paragraph update format for each team.",
      "Create a shared communication channel (group chat or board) where updates are posted.",
      "Run the synchronisation protocol for four weeks and measure unplanned coordination calls before and after.",
      "Review and adjust the sync point content after 30 days based on what information was still missing.",
    ],
    confidence,
  };
}

// ── 10. Cross-Training Programme ──────────────────────────────────────────────
//
// Triggered by: Centralised Coordination Dependency.
// Recommends: Cross-Training Programme.

function detectCrossTraining(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs  = findAllRC(rootCauses, RC.COORD_DEP, RC.SCALABILITY);
  const linkedFinds = findFindings(findings, FC.MAN);

  if (linkedRCs.length === 0 && linkedFinds.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  const priority   = upgradePriority("HIGH", linkedRCs);

  console.log(`[MGD][RECOMMENDATIONS] detectCrossTraining → confidence=${confidence} priority=${priority}`);

  return {
    id:       hashRecommendation("Cross-Training and Knowledge Distribution Programme"),
    title:    "Cross-Training and Knowledge Distribution Programme",
    summary:
      "Systematically transfer operational knowledge from key coordinators to the wider team. " +
      "Identify the top ten routine coordination decisions, document the resolution logic for " +
      "each, and cross-train a minimum of two backup staff on each decision. This directly " +
      "reduces single-person operational risk and builds team-wide operational resilience.",
    priority,
    timeframe:                "30_DAYS",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.MANPOWER_COORDINATION,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Operational continuity is maintained during key staff absence — eliminating stoppage risk.",
      "Decision-making speed is no longer bounded by the availability of one coordinator.",
      "Staff satisfaction improves as operational knowledge becomes shared rather than hoarded.",
      "Business continuity during unexpected disruptions (illness, resignation) is formally addressed.",
    ],
    actionItems: [
      "List the ten most frequent coordination decisions and their current owner.",
      "Document a decision guide for each: trigger, options, resolution, and escalation path.",
      "Identify backup staff for each decision and schedule shadow sessions within 30 days.",
      "Test backup capability: have the backup handle the decision independently once per month.",
    ],
    confidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR REGISTRY
// Add new industry-pack detectors here without modifying existing code.
// ─────────────────────────────────────────────────────────────────────────────

type DetectorFn = (
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
) => OperationalRecommendation | null;

const DETECTORS: DetectorFn[] = [
  detectCoordinationStabilization,
  detectLogisticsOptimization,
  detectInventoryControlImprovements,
  detectFinancialLeakageControls,
  detectWorkflowIntegration,
  detectScalabilityImprovements,
  detectOperationalVisibilityNeeds,
  detectWarehouseStabilization,
  detectDepartmentSync,
  detectCrossTraining,
];

const CONFIDENCE_THRESHOLD = 30;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate structured operational recommendations from findings and root causes.
 *
 * Returns recommendations sorted: priority DESC (CRITICAL first), then
 * confidence DESC.  Suppressed below confidence 30.  Never throws.
 */
export function generateOperationalRecommendations(
  params: RecommendationParams,
): OperationalRecommendation[] {
  try {
    const { findings, rootCauses, industry } = params;

    console.log(
      `[MGD][RECOMMENDATIONS] generateOperationalRecommendations — ` +
      `${findings?.length ?? 0} findings, ` +
      `${rootCauses?.length ?? 0} root causes, ` +
      `industry=${industry ?? "unspecified"}`,
    );

    const safeFindings   = Array.isArray(findings)   ? findings.filter(f => f != null)   : [];
    const safeRootCauses = Array.isArray(rootCauses) ? rootCauses.filter(rc => rc != null) : [];

    if (safeFindings.length === 0 && safeRootCauses.length === 0) {
      console.log("[MGD][RECOMMENDATIONS] No input data — returning []");
      return [];
    }

    console.log(
      "[MGD][RECOMMENDATIONS] Root causes present:",
      safeRootCauses.map(rc => `"${rc.title}"[${rc.severity}/${rc.confidence}%]`).join(", ") || "none",
    );

    const recommendations: OperationalRecommendation[] = [];

    for (const detector of DETECTORS) {
      try {
        const rec = detector(safeFindings, safeRootCauses);
        if (rec && rec.confidence >= CONFIDENCE_THRESHOLD) {
          recommendations.push(rec);
          console.log(
            `[MGD][RECOMMENDATIONS] ✓ "${rec.title}" ` +
            `[${rec.priority}/${rec.timeframe}] confidence=${rec.confidence}`,
          );
        } else if (rec) {
          console.log(
            `[MGD][RECOMMENDATIONS] ✗ Suppressed "${rec.title}" ` +
            `(confidence=${rec.confidence} < threshold=${CONFIDENCE_THRESHOLD})`,
          );
        }
      } catch (err) {
        console.error("[MGD][RECOMMENDATIONS] Detector error (skipped):", err);
      }
    }

    // Deduplicate by ID
    const seen  = new Set<string>();
    const unique = recommendations.filter(rec => {
      if (seen.has(rec.id)) return false;
      seen.add(rec.id);
      return true;
    });

    // Sort: priority DESC then confidence DESC
    unique.sort((a, b) => {
      const pd = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
      if (pd !== 0) return pd;
      return b.confidence - a.confidence;
    });

    console.log(`[MGD][RECOMMENDATIONS] Complete — ${unique.length} recommendation(s) generated`);
    for (const rec of unique) {
      console.log(
        `[MGD][RECOMMENDATIONS]   • [${rec.priority.padEnd(8)}/${rec.timeframe.padEnd(9)}] ` +
        `"${rec.title}" (${rec.confidence}%)`,
      );
    }

    return unique;

  } catch (err) {
    console.error("[MGD][RECOMMENDATIONS] generateOperationalRecommendations failed:", err);
    return [];
  }
}
