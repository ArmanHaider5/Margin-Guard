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

// ── Recommendation priority ───────────────────────────────────────────────────

export const RecommendationPriority = {
  EVENT_PACK: 100,
  GENERIC:     50,
} as const;

export type RecommendationPriorityValue =
  typeof RecommendationPriority[keyof typeof RecommendationPriority];

/** Event Pack recommendation titles — always surface above generic recommendations. */
export const EVENT_PACK_REC_TITLES = new Set([
  // V2 extended chain recommendations
  "Missing Item Prevention Workflow",
  "Dispatch Control Tower",
  "Damage Recovery Programme",
  // V2 core event pack recommendations
  "Pre-Event Inventory Verification Workflow",
  "Dispatch Readiness Checklist",
  "Asset Damage Recovery Register",
  "Live Inventory Dashboard",
  "Warehouse Cycle Count Programme",
  "Inventory Accountability Matrix",
  "Event Readiness Control Gate",
]);

// ── Exported interface ─────────────────────────────────────────────────────────

export interface OperationalRecommendation {
  id:                        string;
  title:                     string;
  summary:                   string;
  priority:                  "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timeframe:                 "IMMEDIATE" | "30_DAYS" | "90_DAYS" | "LONG_TERM";
  implementationDifficulty:  "LOW" | "MEDIUM" | "HIGH";
  category:                  string;
  recommendationPriority:    RecommendationPriorityValue;
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
  OPERATIONAL_VISIBILITY:   "operational_visibility",
  LOGISTICS_OPTIMIZATION:   "logistics_optimization",
  INVENTORY_CONTROL:        "inventory_control",
  WORKFLOW_REDESIGN:        "workflow_redesign",
  MANPOWER_COORDINATION:    "manpower_coordination",
  WAREHOUSE_OPERATIONS:     "warehouse_operations",
  PROFITABILITY_PROTECTION: "profitability_protection",
  OPERATIONAL_SCALABILITY:  "operational_scalability",
  // Event Management recommendation categories
  EVENT_READINESS_CONTROL:  "event_readiness_control",
  ASSET_RECOVERY:           "asset_recovery",
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

// ── Event Management root cause title constants ────────────────────────────────

const RC_EM = {
  INV_GOV:       "Inventory Governance Deficiency",
  ER_CONTROL:    "Event Readiness Control Failure",
  ASSET_ACCOUNT: "Asset Accountability Weakness",
  DISPATCH_PLAN: "Dispatch Planning Immaturity",
  // Extended V2
  INV_BREAKDOWN: "Inventory Control Breakdown",
  DISPATCH_DEP:  "Dispatch Planning Dependency",
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

// ── Event Management finding category constants ────────────────────────────────

const FC_EM = {
  READINESS: "event_readiness",
  DISPATCH:  "dispatch_operations",
  ASSET:     "asset_management",
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
// EVENT MANAGEMENT RECOMMENDATION DETECTORS (Pack V2)
// ─────────────────────────────────────────────────────────────────────────────

// ── EM 1: Pre-Event Inventory Verification Workflow ───────────────────────────

export function detectPreEventInventoryVerification(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs   = findAllRC(rootCauses, RC_EM.INV_GOV, RC_EM.ER_CONTROL);
  const linkedFinds = findFindings(findings, FC.INV, FC_EM.DISPATCH, FC_EM.READINESS);
  if (linkedRCs.length === 0 && linkedFinds.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const priority = linkedRCs.some(rc => rc.severity === "CRITICAL") ? "CRITICAL" : "HIGH";

  console.log(
    `[MGD][RECOMMENDATIONS] detectPreEventInventoryVerification → ` +
    `confidence=${confidence} priority=${priority}`,
  );

  return {
    id:      hashRecommendation("Pre-Event Inventory Verification Workflow"),
    title:   "Pre-Event Inventory Verification Workflow",
    summary:
      "Implement a mandatory inventory verification step 24–48 hours before each event deployment. " +
      "No event commitment may be confirmed unless all line items on the order manifest have been " +
      "physically located and counted in the warehouse. Any shortage identified at this stage triggers " +
      "a substitution decision process before event day — not on the day.",
    priority,
    timeframe:                "IMMEDIATE",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.INVENTORY_CONTROL,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Eliminates on-site item shortages by catching gaps during the planning window.",
      "Provides 24–48 hours to source substitutions or notify clients before event day.",
      "Creates a documented inventory commitment trail for each event.",
      "Reduces substitution pressure on dispatch and setup teams on the day.",
    ],
    actionItems: [
      "Create a per-event inventory manifest template derived from the order confirmation.",
      "Assign warehouse staff to physically verify each manifest item at T-48 before event day.",
      "Record any variances with reason codes: damaged, not returned, missing from prior event.",
      "Escalate unresolved shortages to the event manager for substitution approval before T-24.",
    ],
    confidence,
  };
}

// ── EM 2: Dispatch Readiness Checklist ────────────────────────────────────────

export function detectDispatchReadinessChecklist(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs   = findAllRC(rootCauses, RC_EM.DISPATCH_PLAN, RC_EM.ER_CONTROL);
  const linkedFinds = findFindings(findings, FC_EM.DISPATCH, FC.LOG);
  if (linkedRCs.length === 0 && linkedFinds.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const priority = linkedRCs.some(rc => rc.severity === "CRITICAL") ? "CRITICAL" : "HIGH";

  console.log(
    `[MGD][RECOMMENDATIONS] detectDispatchReadinessChecklist → ` +
    `confidence=${confidence} priority=${priority}`,
  );

  return {
    id:      hashRecommendation("Dispatch Readiness Checklist"),
    title:   "Dispatch Readiness Checklist",
    summary:
      "Implement a standardised dispatch readiness checklist that must be completed and signed off " +
      "before any event vehicle is loaded. The checklist covers: item manifest confirmation, loading " +
      "sequence, departure time, ETA, driver assignment, and on-site contact. No truck departs without confirmed sign-off.",
    priority,
    timeframe:                "IMMEDIATE",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.LOGISTICS_OPTIMIZATION,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Prevents incomplete dispatches by making each item's loading explicit and verified.",
      "Creates a dispatch record that links to the event for post-event pattern analysis.",
      "Reduces on-site surprises by confirming ETAs and contacts before departure.",
      "Provides evidence for client disputes about what was dispatched and when.",
    ],
    actionItems: [
      "Design a one-page dispatch checklist: order ref, items, loader, driver, departure time, ETA, sign-off.",
      "Require the warehouse supervisor to countersign before any vehicle departure.",
      "File completed checklists by event date — review any incomplete events at weekly operations meeting.",
      "Measure dispatch completion rate weekly; target ≥98% complete dispatches within 90 days.",
    ],
    confidence,
  };
}

// ── EM 3: Asset Damage Recovery Register ──────────────────────────────────────

export function detectAssetDamageRecoveryRegister(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs   = findAllRC(rootCauses, RC_EM.ASSET_ACCOUNT);
  const linkedFinds = findFindings(findings, FC_EM.ASSET);
  if (linkedRCs.length === 0 && linkedFinds.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(
    `[MGD][RECOMMENDATIONS] detectAssetDamageRecoveryRegister → confidence=${confidence}`,
  );

  return {
    id:      hashRecommendation("Asset Damage Recovery Register"),
    title:   "Asset Damage Recovery Register",
    summary:
      "Create a structured asset damage register that tracks every damage incident from detection " +
      "through to financial resolution. Each entry records: asset, event, damage type, estimated cost, " +
      "responsible party, recovery status, and resolution date. Monthly review ensures no case ages without action.",
    priority:                 "HIGH",
    timeframe:                "30_DAYS",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.PROFITABILITY_PROTECTION,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Converts damage write-offs into documented recovery opportunities with assigned ownership.",
      "Increases recovery rate by creating accountability and follow-through discipline.",
      "Provides data to identify which event types or clients have higher damage rates.",
      "Supports insurance claims and client dispute resolution with documented evidence.",
    ],
    actionItems: [
      "Create a damage register with fields: date, asset, event, type, cost, client, status, resolution.",
      "Require on-site photo evidence of any damage at collection — uploaded before equipment leaves the venue.",
      "Assign one finance team member as damage recovery owner — they own every open case.",
      "Set monthly target: no open damage case older than 45 days without a decision (charge or write-off).",
    ],
    confidence,
  };
}

// ── EM 4: Live Inventory Dashboard ────────────────────────────────────────────

export function detectLiveInventoryDashboard(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs   = findAllRC(rootCauses, RC_EM.INV_GOV);
  const linkedFinds = findFindings(findings, FC.INV, FC_EM.READINESS);
  if (linkedRCs.length === 0 && linkedFinds.length < 2) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(
    `[MGD][RECOMMENDATIONS] detectLiveInventoryDashboard → confidence=${confidence}`,
  );

  return {
    id:      hashRecommendation("Live Inventory Dashboard"),
    title:   "Live Inventory Dashboard",
    summary:
      "Deploy a live inventory dashboard — even a shared spreadsheet updated in real time — " +
      "that shows current stock availability for every item category. The dashboard must be updated " +
      "at three points: on return from event, after damage write-off, and before any new event " +
      "commitment is confirmed.",
    priority:                 "HIGH",
    timeframe:                "30_DAYS",
    implementationDifficulty: "MEDIUM",
    category:                 REC_CATEGORIES.OPERATIONAL_VISIBILITY,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Sales and operations teams can confirm availability in real time without manual warehouse queries.",
      "Eliminates double-booking of items across overlapping events.",
      "Provides early warning of stock gaps before the event window — not at dispatch.",
      "Reduces substitution frequency by catching shortfalls during booking, not on event day.",
    ],
    actionItems: [
      "Start with a shared spreadsheet: columns for item, total stock, committed, available, last-updated.",
      "Define three mandatory update triggers: post-event return, damage write-off, new booking confirmed.",
      "Assign one warehouse owner per update trigger with a maximum 2-hour update window.",
      "Review dashboard accuracy weekly against physical counts for the first 8 weeks.",
    ],
    confidence,
  };
}

// ── EM 5: Warehouse Cycle Count Programme ─────────────────────────────────────

export function detectWarehouseCycleCountProgramme(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs   = findAllRC(rootCauses, RC_EM.INV_GOV);
  const linkedFinds = findFindings(findings, FC.INV, FC.WH);
  if (linkedRCs.length === 0 && linkedFinds.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(
    `[MGD][RECOMMENDATIONS] detectWarehouseCycleCountProgramme → confidence=${confidence}`,
  );

  return {
    id:      hashRecommendation("Warehouse Cycle Count Programme"),
    title:   "Warehouse Cycle Count Programme",
    summary:
      "Implement a structured cycle count programme — counting a rotation of item categories each " +
      "week so that every item is physically counted at least once per month. Cycle counts are more " +
      "sustainable than full stock-takes and create continuous reconciliation discipline that prevents " +
      "variance accumulation.",
    priority:                 "HIGH",
    timeframe:                "30_DAYS",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.WAREHOUSE_OPERATIONS,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Keeps inventory records accurate without disruptive full stock-takes.",
      "Identifies shrinkage and damage trends early, before they accumulate into significant variance.",
      "Creates a culture of inventory accuracy accountability in the warehouse team.",
      "Reduces reconciliation effort at period-end because variances are caught continuously.",
    ],
    actionItems: [
      "Divide inventory into 4 groups — count one group per week so all items are counted monthly.",
      "Assign specific warehouse staff to cycle count ownership, with supervisor sign-off.",
      "Record count results against system records: any variance above 2% requires immediate investigation.",
      "Review cycle count results at monthly operations review — track variance trend over time.",
    ],
    confidence,
  };
}

// ── EM 6: Inventory Accountability Matrix ─────────────────────────────────────

export function detectInventoryAccountabilityMatrix(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs   = findAllRC(rootCauses, RC_EM.ER_CONTROL, RC_EM.INV_GOV);
  const linkedFinds = findFindings(findings, FC.INV, FC_EM.DISPATCH);
  if (linkedRCs.length === 0 && linkedFinds.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(
    `[MGD][RECOMMENDATIONS] detectInventoryAccountabilityMatrix → confidence=${confidence}`,
  );

  return {
    id:      hashRecommendation("Inventory Accountability Matrix"),
    title:   "Inventory Accountability Matrix",
    summary:
      "Define explicit ownership for every inventory control action: who records outbound movements, " +
      "who confirms returns, who approves substitutions, and who investigates shortages. Shared " +
      "responsibility means no responsibility — the matrix assigns one named owner per control action.",
    priority:                 "MEDIUM",
    timeframe:                "30_DAYS",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.MANPOWER_COORDINATION,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Eliminates ambiguity about who is responsible when inventory discrepancies occur.",
      "Creates clear escalation paths when a control action cannot be completed on time.",
      "Enables performance accountability — control failures can be traced to specific owners.",
      "Supports training and backup planning because all control actions are documented.",
    ],
    actionItems: [
      "List every inventory control action: dispatch recording, return confirmation, damage logging, shortage escalation.",
      "Assign one primary owner and one backup per control action.",
      "Communicate the matrix to all involved staff and confirm understanding.",
      "Review and update the matrix quarterly or when team structure changes.",
    ],
    confidence,
  };
}

// ── EM 7: Event Readiness Control Gate ────────────────────────────────────────

export function detectEventReadinessControlGate(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  const linkedRCs   = findAllRC(rootCauses, RC_EM.ER_CONTROL, RC_EM.DISPATCH_PLAN);
  const linkedFinds = findFindings(findings, FC_EM.READINESS, FC_EM.DISPATCH);
  if (linkedRCs.length === 0 && linkedFinds.length === 0) return null;

  const confidence = buildConfidence(linkedRCs, linkedFinds);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const priority: OperationalRecommendation["priority"] =
    linkedFinds.some(f => f.severity === "CRITICAL") ||
    linkedRCs.some(rc => rc.severity === "CRITICAL") ? "CRITICAL" : "HIGH";

  console.log(
    `[MGD][RECOMMENDATIONS] detectEventReadinessControlGate → ` +
    `confidence=${confidence} priority=${priority}`,
  );

  return {
    id:      hashRecommendation("Event Readiness Control Gate"),
    title:   "Event Readiness Control Gate",
    summary:
      "Establish a formal Event Readiness Control Gate — a T-24 hour checkpoint where all event " +
      "delivery elements are confirmed: inventory verified, truck assigned, route confirmed, driver " +
      "briefed, on-site contact notified. If any element is unresolved at T-24, a defined escalation " +
      "path is triggered. No element may be left unresolved past T-12.",
    priority,
    timeframe:                "IMMEDIATE",
    implementationDifficulty: "LOW",
    category:                 REC_CATEGORIES.OPERATIONAL_VISIBILITY,
    relatedRootCauses:        linkedRCs.map(rc => rc.id),
    relatedFindings:          linkedFinds.map(f => f.id),
    expectedOperationalImpact: [
      "Creates a structured final review before every event — catching gaps while remediation is still possible.",
      "Prevents on-site surprises by making incomplete elements visible 24 hours before the event.",
      "Provides an audit trail confirming that all pre-event controls were executed.",
      "Converts last-minute panic decisions into managed escalations with defined resolution paths.",
    ],
    actionItems: [
      "Define the T-24 gate checklist: inventory confirmed, vehicle confirmed, route confirmed, ETA confirmed, client notified.",
      "Assign the event manager as T-24 gate owner — they must sign off the gate form for every event.",
      "Define escalation: if any item is unresolved at T-24, the operations director is automatically notified.",
      "Track gate completion rate per event — target 100% of events with confirmed T-24 sign-off within 60 days.",
    ],
    confidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT PACK V2 — EXTENDED RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── Recommendation: Missing Item Prevention Workflow ──────────────────────────
//
// Deterministic chain:
//   Inventory Shortage Pattern (finding)
//     → Inventory Control Breakdown (root cause)
//       → Missing Item Prevention Workflow (recommendation)
//
// Primary trigger: "Inventory Shortage Pattern" finding present.
// Secondary trigger: "Inventory Control Breakdown" root cause present.
// Either is sufficient; both together maximise confidence.

export function detectMissingItemPreventionWorkflow(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  // Title-specific chain triggers
  const triggerFindings = findings.filter(f => f.title === "Inventory Shortage Pattern");
  const triggerRCs = rootCauses.filter(rc => rc.title === RC_EM.INV_BREAKDOWN);

  if (triggerFindings.length === 0 && triggerRCs.length === 0) return null;

  const topFinding = [...triggerFindings].sort((a, b) => b.confidence - a.confidence)[0];
  const topRC      = [...triggerRCs].sort((a, b) => b.confidence - a.confidence)[0];
  const confidence = cap(
    Math.max(
      topFinding?.confidence ?? 0,
      topRC?.confidence       ?? 0,
    ) - 5,
  );

  if (confidence < 30) return null;

  return {
    id:       hashRecommendation("Missing Item Prevention Workflow"),
    title:    "Missing Item Prevention Workflow",
    category: REC_CATEGORIES.EVENT_READINESS_CONTROL,
    priority: topRC?.severity === "CRITICAL" || topFinding?.severity === "CRITICAL"
              ? "CRITICAL" : "HIGH",
    timeframe: "30 days",
    confidence,
    summary:
      "Implement a structured pre-dispatch verification workflow that confirms every item on the " +
      "event manifest is physically present and loaded before departure — eliminating missing items " +
      "as a category of operational failure.",
    rationale:
      "Missing items are a leading cause of on-site disruptions and client dissatisfaction. " +
      "The pattern of recurring shortages indicates that the current process has no mandatory " +
      "verification step between inventory and dispatch. A structured workflow closes this gap.",
    actionItems: [
      "Create an event manifest template listing every item required per event type.",
      "Require a two-person verification check (one calls items, one confirms load) before vehicle departure.",
      "Record any item that cannot be verified as a pre-dispatch shortfall — triggering an immediate substitute or client notification.",
      "After each event, log which items were missing and trace back to inventory record — close the loop within 24 hours.",
      "Review missing item frequency weekly for the first 30 days to identify chronically short SKUs.",
    ],
    triggeringFindings:   triggerFindings.map(f => f.id),
    triggeringRootCauses: triggerRCs.map(rc => rc.id),
  };
}

// ── Recommendation: Damage Recovery Programme ─────────────────────────────────
//
// Deterministic chain:
//   Asset Damage Recovery Leakage (finding)
//     → Asset Accountability Weakness (root cause)
//       → Damage Recovery Programme (recommendation)
//
// Primary trigger: "Asset Damage Recovery Leakage" finding present.
// Secondary trigger: "Asset Accountability Weakness" root cause present.
// Either is sufficient; both together maximise confidence.

export function detectDamageRecoveryProgramme(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  // Title-specific chain triggers
  const triggerFindings = findings.filter(f => f.title === "Asset Damage Recovery Leakage");
  const triggerRCs = rootCauses.filter(rc => rc.title === RC_EM.ASSET_ACCOUNT);

  if (triggerFindings.length === 0 && triggerRCs.length === 0) return null;

  const topFinding = [...triggerFindings].sort((a, b) => b.confidence - a.confidence)[0];
  const topRC      = [...triggerRCs].sort((a, b) => b.confidence - a.confidence)[0];
  const confidence = cap(
    Math.max(
      topFinding?.confidence ?? 0,
      topRC?.confidence       ?? 0,
    ) - 5,
  );

  if (confidence < 30) return null;

  return {
    id:       hashRecommendation("Damage Recovery Programme"),
    title:    "Damage Recovery Programme",
    category: REC_CATEGORIES.ASSET_RECOVERY,
    priority: topRC?.severity === "CRITICAL" || topFinding?.severity === "CRITICAL"
              ? "CRITICAL" : "HIGH",
    timeframe: "60 days",
    confidence,
    summary:
      "Establish a formal Damage Recovery Programme that ensures every recorded asset damage " +
      "event results in a documented recovery outcome — whether charge recovery from the responsible " +
      "party, insurance claim, or a written-off decision with approval.",
    rationale:
      "Unrecovered damage charges represent a direct financial loss that compounds over time. " +
      "The current absence of a structured programme means damaged assets are either written off " +
      "informally or recovery is forgotten, with no audit trail or accountability.",
    actionItems: [
      "Create a Damage Incident Register: asset, event date, damage description, estimated cost, responsible party.",
      "Assign a recovery owner for each damage event — responsible for obtaining charge or escalating within 7 days.",
      "Set a 30-day close-out deadline per incident: either recovered, formally waived, or insurance-claimed.",
      "Track Recovery Amount separately from Damage Cost — report recovery rate monthly.",
      "Review open incidents weekly until recovery rate exceeds 80%.",
    ],
    triggeringFindings:   triggerFindings.map(f => f.id),
    triggeringRootCauses: triggerRCs.map(rc => rc.id),
  };
}

// ── Recommendation: Dispatch Control Tower ────────────────────────────────────
//
// Deterministic chain:
//   Dispatch Reliability Risk (finding)
//     → Dispatch Planning Dependency (root cause)
//       → Dispatch Control Tower (recommendation)
//
// Primary trigger: "Dispatch Reliability Risk" finding present.
// Secondary trigger: "Dispatch Planning Dependency" root cause present.
// Either is sufficient; both together maximise confidence.

export function detectDispatchControlTower(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
): OperationalRecommendation | null {
  // Title-specific chain triggers
  const triggerFindings = findings.filter(f => f.title === "Dispatch Reliability Risk");
  const triggerRCs = rootCauses.filter(rc => rc.title === RC_EM.DISPATCH_DEP);

  if (triggerFindings.length === 0 && triggerRCs.length === 0) return null;

  const topFinding = [...triggerFindings].sort((a, b) => b.confidence - a.confidence)[0];
  const topRC      = [...triggerRCs].sort((a, b) => b.confidence - a.confidence)[0];
  const confidence = cap(
    Math.max(
      topFinding?.confidence ?? 0,
      topRC?.confidence       ?? 0,
    ) - 5,
  );

  if (confidence < 30) return null;

  return {
    id:       hashRecommendation("Dispatch Control Tower"),
    title:    "Dispatch Control Tower",
    category: REC_CATEGORIES.LOGISTICS_OPTIMIZATION,
    priority: topRC?.severity === "CRITICAL" || topFinding?.severity === "CRITICAL"
              ? "CRITICAL" : "HIGH",
    timeframe: "60 days",
    confidence,
    summary:
      "Establish a Dispatch Control Tower — a single coordination role or function with real-time " +
      "visibility of all active dispatches, their status, ETAs, and any exceptions — so that delays " +
      "and failures are identified and escalated before they become client-facing events.",
    rationale:
      "Recurring dispatch failures and delays indicate that no one has live visibility of what is " +
      "happening across all active dispatches simultaneously. A control tower model centralises " +
      "this visibility, enabling proactive intervention rather than reactive problem-solving.",
    actionItems: [
      "Designate a Dispatch Controller for each event day — responsible for all active dispatch tracking.",
      "Require drivers to confirm departure time, checkpoint 1 (halfway), and arrival — via phone or messaging channel.",
      "Build a simple dispatch dashboard: driver name, destination, planned ETA, actual ETA, status (on time / delayed / issue).",
      "Define escalation triggers: >15 min delay → controller contacts driver; >30 min → client notified.",
      "Log all dispatch outcomes per event to generate a weekly Dispatch Reliability Rate metric.",
    ],
    triggeringFindings:   triggerFindings.map(f => f.id),
    triggeringRootCauses: triggerRCs.map(rc => rc.id),
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
  // ── Event Management Pack V2 ──────────────────────────────────────────────
  detectPreEventInventoryVerification,
  detectDispatchReadinessChecklist,
  detectAssetDamageRecoveryRegister,
  detectLiveInventoryDashboard,
  detectWarehouseCycleCountProgramme,
  detectInventoryAccountabilityMatrix,
  detectEventReadinessControlGate,
  // ── Event Management Pack V2 — Extended ──────────────────────────────────
  detectMissingItemPreventionWorkflow,
  detectDamageRecoveryProgramme,
  detectDispatchControlTower,
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

    // Stamp recommendationPriority from title membership
    for (const rec of unique) {
      (rec as any).recommendationPriority = EVENT_PACK_REC_TITLES.has(rec.title)
        ? RecommendationPriority.EVENT_PACK
        : RecommendationPriority.GENERIC;
    }

    // Sort: Event Pack first (recommendationPriority DESC), then severity (PRIORITY_ORDER DESC), then confidence DESC
    unique.sort((a, b) => {
      const rp = (b.recommendationPriority ?? 0) - (a.recommendationPriority ?? 0);
      if (rp !== 0) return rp;
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
