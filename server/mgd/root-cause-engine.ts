// ─────────────────────────────────────────────────────────────────────────────
// MGD ROOT CAUSE ENGINE
//
// Converts operational findings (from findings-engine.ts) into higher-level
// executive root causes by analysing multi-finding patterns.
//
// Design principles:
//   • Root causes emerge from combinations of findings, NOT isolated signals.
//   • No AI/LLM — all logic is deterministic and rule-based.
//   • Confidence is accumulated from: count of corroborating findings,
//     individual finding severities, and individual finding confidence scores.
//   • Never throws — each detector is wrapped; failures are logged and skipped.
//   • Sorted by confidence descending, suppressed below confidence 25.
//
// Root cause pattern library (in detectory order):
//   1. Reactive Operational Coordination Model
//      — logistics_coordination + inventory_visibility + manpower_dependency
//   2. Operational Scalability Mismatch
//      — workflow_scalability + warehouse_operations + manpower_dependency
//   3. Inventory Visibility Weakness
//      — inventory_visibility (+ financial_leakage bonus)
//   4. Centralised Coordination Dependency
//      — manpower_dependency (+ logistics_coordination bonus)
//   5. Operational Fragmentation
//      — workflow_scalability + financial_leakage + logistics_coordination
//   6. Logistics Compression Risk
//      — logistics_coordination (+ warehouse_operations bonus)
//   7. Fragmented Workflow Synchronisation
//      — workflow_scalability + logistics_coordination + warehouse_operations
//   8. Delayed Inventory Certainty
//      — inventory_visibility + warehouse_operations (+ financial_leakage bonus)
// ─────────────────────────────────────────────────────────────────────────────

import type { OperationalFinding } from "./findings-engine";
import { FINDING_CATEGORIES } from "./finding-categories";
import { TRACE_STEPS, type DetectorExecutionRecord } from "./pipeline-trace";

// ── Exported interfaces ───────────────────────────────────────────────────────

// ── Root cause priority ───────────────────────────────────────────────────────

export const RootCausePriority = {
  EVENT_PACK: 100,
  GENERIC:     50,
} as const;

export type RootCausePriorityValue = typeof RootCausePriority[keyof typeof RootCausePriority];

/** Event Pack root cause titles — always surface above generic root causes. */
export const EVENT_PACK_RC_TITLES = new Set([
  "Inventory Governance Deficiency",
  "Event Readiness Control Failure",
  "Asset Accountability Weakness",
  "Dispatch Planning Immaturity",
  "Inventory Control Breakdown",
  "Dispatch Planning Dependency",
]);

export interface RootCause {
  id:                    string;
  title:                 string;
  summary:               string;
  severity:              "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence:            number;           // 0–100
  rootCausePriority:     RootCausePriorityValue;
  contributingFindings:  string[];         // finding IDs that triggered this root cause
  operationalImpact:     string[];
  recommendations?:      string[];
}

export interface RootCauseParams {
  findings:  OperationalFinding[];
  industry?: string;
}

// ── Finding category constants ─────────────────────────────────────────────────

// Short local aliases into the one authoritative Finding Category vocabulary
// (server/mgd/findings-engine.ts's FINDING_CATEGORIES) — kept for this
// file's own dense byCategory(findings, CAT.XXX) call sites; no longer an
// independent re-declaration of the category strings themselves.
const CAT = {
  INV:         FINDING_CATEGORIES.INVENTORY_VISIBILITY,
  LOG:         FINDING_CATEGORIES.LOGISTICS_COORDINATION,
  WH:          FINDING_CATEGORIES.WAREHOUSE_OPERATIONS,
  MAN:         FINDING_CATEGORIES.MANPOWER_DEPENDENCY,
  FIN:         FINDING_CATEGORIES.FINANCIAL_LEAKAGE,
  WFL:         FINDING_CATEGORIES.WORKFLOW_SCALABILITY,
  // Event Management categories
  EM_READINESS: FINDING_CATEGORIES.EVENT_READINESS,
  EM_DISPATCH:  FINDING_CATEGORIES.DISPATCH_OPERATIONS,
  EM_ASSET:     FINDING_CATEGORIES.ASSET_MANAGEMENT,
} as const;

// ── Utilities ──────────────────────────────────────────────────────────────────

/** DJB2 hash → deterministic ID. */
function makeId(title: string): string {
  let h = 5381;
  for (const ch of title) { h = ((h << 5) + h) ^ ch.charCodeAt(0); h = h >>> 0; }
  return `mgd-rc-${h.toString(16).padStart(8, "0")}`;
}

const SEVERITY_SCORE: Record<string, number> = {
  CRITICAL: 20, HIGH: 15, MEDIUM: 10, LOW: 5,
};

/**
 * Root cause severity thresholds.
 * Deliberately set slightly higher than finding thresholds (70/50/30) because
 * root causes are corroborated patterns — they require stronger evidence.
 */
function severityFrom(confidence: number): RootCause["severity"] {
  if (confidence >= 80) return "CRITICAL";
  if (confidence >= 60) return "HIGH";
  if (confidence >= 40) return "MEDIUM";
  return "LOW";
}

function cap(n: number): number { return Math.min(100, Math.max(0, Math.round(n))); }

/**
 * Look up findings by category.
 * Returns all findings whose category matches any of the supplied strings.
 */
function byCategory(findings: OperationalFinding[], ...cats: string[]): OperationalFinding[] {
  return findings.filter(f => f != null && typeof f.category === "string" && cats.includes(f.category));
}

/**
 * Accumulate confidence from a list of corroborating findings.
 *
 * Formula (severity-weighted confidence):
 *   Each finding contributes: SEVERITY_SCORE[severity] × (confidence / 100)
 *     CRITICAL finding at 80%  → 20 × 0.80 = 16.0
 *     HIGH finding at 70%      → 15 × 0.70 = 10.5
 *     MEDIUM finding at 50%    → 10 × 0.50 =  5.0
 *     LOW finding at 30%       →  5 × 0.30 =  1.5
 *
 *   Raw score is scaled × 3.5 so that two HIGH findings at ~70% ≈ 74 (HIGH root cause).
 *
 *   Diversity bonus: +2 per finding beyond the first, capped at +6.
 *   This rewards corroboration from multiple independent signals without
 *   letting a large pile of LOW findings fake high confidence.
 *
 *   Result is capped at 100.
 *
 * Why this replaces the old formula:
 *   The old `base = n × 20` formula reached 100 with just 5 findings regardless
 *   of their quality, making root cause confidence misleadingly high when all
 *   contributing findings were LOW severity with weak confidence.
 */
function accumulateConfidence(contributing: OperationalFinding[]): number {
  if (contributing.length === 0) return 0;

  let raw = 0;
  for (const f of contributing) {
    const sw = SEVERITY_SCORE[f.severity] ?? 5;
    raw += sw * (f.confidence / 100);
  }

  // Diversity bonus: extra evidence sources strengthen the pattern
  const diversityBonus = Math.min(contributing.length - 1, 3) * 2;

  return cap(Math.round(raw * 3.5 + diversityBonus));
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR FUNCTIONS
// Each receives the full findings array and returns RootCause | null.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Reactive Operational Coordination Model ────────────────────────────────
//
// Pattern: logistics_coordination + inventory_visibility + manpower_dependency
//
// These three categories together indicate that the business reacts to
// operational events rather than managing them proactively.  Logistics,
// inventory, and staffing are each individually fragile; when all three are
// strained simultaneously the entire operational model is reactive.

export function detectReactiveOperations(
  findings: OperationalFinding[],
): RootCause | null {
  const log = byCategory(findings, CAT.LOG);
  const inv = byCategory(findings, CAT.INV);
  const man = byCategory(findings, CAT.MAN);

  // Requires at least one finding in each of the three categories
  if (!log.length || !inv.length || !man.length) return null;

  const contributing = [...log, ...inv, ...man];
  const confidence   = accumulateConfidence(contributing);

  console.log(
    `[MGD][ROOT_CAUSE] detectReactiveOperations → confidence=${confidence} ` +
    `(log=${log.length}, inv=${inv.length}, man=${man.length})`,
  );

  return {
    id:    makeId("Reactive Operational Coordination Model"),
    title: "Reactive Operational Coordination Model",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "The operational structure exhibits a reactive pattern: inventory visibility gaps trigger " +
      "ad-hoc replenishment decisions, logistics coordination is driven by immediate demand rather " +
      "than forward planning, and manual dependency means that coordination speed is limited by " +
      "individual bandwidth. These three dysfunctions reinforce each other — no single fix resolves " +
      "the underlying coordination model.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Reactive logistics scheduling creates recurring last-minute dispatch pressure and elevated error rates.",
      "Inventory decisions made without reliable stock visibility risk both overstock and stockout simultaneously.",
      "Key-person dependency means operational continuity is fragile during staff absence or turnover.",
      "Customer-facing service quality fluctuates in proportion to demand volume rather than improving with it.",
    ],
    recommendations: [
      "Implement a daily closing-balance snapshot routine before any other process improvement.",
      "Introduce a 48-hour advance dispatch schedule to shift logistics from reactive to planned mode.",
      "Create a cross-trained operations backup roster to reduce single-person dependencies.",
      "Define a minimum reorder trigger point per inventory category based on average weekly outflow.",
    ],
  };
}

// ── 2. Operational Scalability Mismatch ──────────────────────────────────────
//
// Pattern: workflow_scalability + warehouse_operations + manpower_dependency
//
// When catalogue complexity, warehouse throughput pressure, and manual
// dependency occur together, the operation has outgrown its processes.
// Adding volume makes the situation worse, not better.

export function detectScalabilityMismatch(
  findings: OperationalFinding[],
): RootCause | null {
  const wfl = byCategory(findings, CAT.WFL);
  const wh  = byCategory(findings, CAT.WH);
  const man = byCategory(findings, CAT.MAN);

  if (!wfl.length || !man.length) return null;  // warehouse optional but adds signal

  const contributing = [...wfl, ...wh, ...man];
  let confidence = accumulateConfidence(contributing);

  // Extra penalty when warehouse is also under pressure (complete mismatch)
  if (wh.length > 0) confidence = cap(confidence + 10);

  console.log(
    `[MGD][ROOT_CAUSE] detectScalabilityMismatch → confidence=${confidence} ` +
    `(wfl=${wfl.length}, wh=${wh.length}, man=${man.length})`,
  );

  return {
    id:    makeId("Operational Scalability Mismatch"),
    title: "Operational Scalability Mismatch",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "The breadth of the inventory catalogue, the volume of warehouse movement, and the reliance " +
      "on manual coordination have collectively exceeded what the current operational design can " +
      "absorb without compounding errors. Scaling revenue or demand under these conditions will " +
      "amplify coordination failures faster than staff capacity can compensate.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Each additional item or transaction adds disproportionate coordination overhead in a manual system.",
      "Warehouse throughput concentration creates a bottleneck that grows with demand but cannot be resolved by effort alone.",
      "Onboarding new staff provides diminishing returns when the process itself is not documented.",
      "Customer fulfilment speed will not improve — and may decline — as order volume increases.",
    ],
    recommendations: [
      "Conduct a catalogue rationalisation: identify the top 20% of items by movement volume and standardise their handling first.",
      "Define and document a warehouse dispatch SOP with checklist before expanding throughput capacity.",
      "Pilot a basic digital stock ledger (even a shared spreadsheet) before investing in WMS software.",
      "Set a transaction volume threshold at which the current process will be formally reviewed.",
    ],
  };
}

// ── 3. Inventory Visibility Weakness ─────────────────────────────────────────
//
// Pattern: inventory_visibility (required), financial_leakage (amplifier)
//
// When inventory visibility is impaired and financial leakage is also present,
// the business cannot reliably know what stock it holds or what it is worth.

export function detectInventoryVisibilityWeakness(
  findings: OperationalFinding[],
): RootCause | null {
  const inv = byCategory(findings, CAT.INV);
  if (!inv.length) return null;

  const fin = byCategory(findings, CAT.FIN);
  const contributing = [...inv, ...fin];
  let confidence = accumulateConfidence(contributing);

  // Require minimum signal: needs at least HIGH inventory finding or two findings
  const highInv = inv.filter(f => f.severity === "HIGH" || f.severity === "CRITICAL");
  if (!highInv.length && contributing.length < 2) return null;

  // Leakage amplifies: uncertain stock + unknown value loss = double blindspot
  if (fin.length > 0) confidence = cap(confidence + 8);

  console.log(
    `[MGD][ROOT_CAUSE] detectInventoryVisibilityWeakness → confidence=${confidence} ` +
    `(inv=${inv.length}, fin=${fin.length})`,
  );

  return {
    id:    makeId("Inventory Visibility Weakness"),
    title: "Inventory Visibility Weakness",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "The business lacks reliable, real-time inventory position data. Outbound movements are " +
      "not consistently matched against documented intake, closing balances are not systematically " +
      "recorded, and the financial value of stock on hand cannot be independently verified. " +
      "This creates a structural blind spot in operational and financial decision-making.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Stock shortfalls are discovered at the point of dispatch rather than in advance, causing fulfilment failures.",
      "Replenishment decisions are made on intuition rather than data, leading to over-ordering or stockouts.",
      "Financial reporting of inventory value carries unquantified uncertainty.",
      "Physical count discrepancies cannot be traced to source because movement records are incomplete.",
    ],
    recommendations: [
      "Mandate a closing-balance entry for every item at end of each operating day.",
      "Match every outbound movement to a documented intake within the same reporting period.",
      "Conduct a physical count within 30 days and reconcile against available records to establish a baseline.",
      "Assign one owner per item category responsible for weekly stock position verification.",
    ],
  };
}

// ── 4. Centralised Coordination Dependency ────────────────────────────────────
//
// Pattern: manpower_dependency (required), logistics_coordination (amplifier)
//
// When operational coordination depends heavily on specific individuals AND
// logistics is already under pressure, the business has a single human
// point-of-failure in its most time-critical process.

export function detectCoordinationDependency(
  findings: OperationalFinding[],
): RootCause | null {
  const man = byCategory(findings, CAT.MAN);
  if (!man.length) return null;

  const log = byCategory(findings, CAT.LOG);
  const contributing = [...man, ...log];
  let confidence = accumulateConfidence(contributing);

  // Needs meaningful manpower signal (HIGH/CRITICAL) or logistics presence
  const highMan = man.filter(f => f.severity === "HIGH" || f.severity === "CRITICAL");
  if (!highMan.length && !log.length) return null;

  // Logistics compound: time pressure + person dependency = highest operational risk
  if (log.length > 0) confidence = cap(confidence + 8);

  console.log(
    `[MGD][ROOT_CAUSE] detectCoordinationDependency → confidence=${confidence} ` +
    `(man=${man.length}, log=${log.length})`,
  );

  return {
    id:    makeId("Centralised Coordination Dependency"),
    title: "Centralised Coordination Dependency",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "Operational coordination — including dispatch sequencing, inventory allocation, and " +
      "customer-facing fulfilment — is concentrated in a small number of individuals. This " +
      "creates a knowledge and decision bottleneck: when those individuals are unavailable, " +
      "operation throughput slows or stops. Logistics pressure makes this dependency time-critical.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Staff absence during peak periods creates direct operational stoppage risk.",
      "Tacit knowledge about inventory positions and customer preferences is not systemically captured.",
      "Decision-making speed is bounded by the availability of one or two key coordinators.",
      "Business continuity during unexpected disruption (illness, resignation) is not assured.",
    ],
    recommendations: [
      "Document the top 10 most frequent coordination decisions and their resolution steps.",
      "Cross-train a minimum of two staff members on dispatch and inventory allocation processes.",
      "Create a daily operations handover note so context is not held in individuals' memory alone.",
      "Define escalation rules so non-key staff can make routine decisions independently.",
    ],
  };
}

// ── 5. Operational Fragmentation ─────────────────────────────────────────────
//
// Pattern: workflow_scalability + financial_leakage + logistics_coordination
//
// When the workflow is complex, value is leaking, and logistics is under
// pressure, the operation is pulling in multiple directions simultaneously
// without a unifying control layer.

export function detectOperationalFragmentation(
  findings: OperationalFinding[],
): RootCause | null {
  const wfl = byCategory(findings, CAT.WFL);
  const fin = byCategory(findings, CAT.FIN);
  const log = byCategory(findings, CAT.LOG);

  // Requires at least two of the three categories
  const presentCats = [wfl.length, fin.length, log.length].filter(c => c > 0).length;
  if (presentCats < 2) return null;

  const contributing = [...wfl, ...fin, ...log];
  const confidence   = accumulateConfidence(contributing);

  console.log(
    `[MGD][ROOT_CAUSE] detectOperationalFragmentation → confidence=${confidence} ` +
    `(wfl=${wfl.length}, fin=${fin.length}, log=${log.length})`,
  );

  return {
    id:    makeId("Operational Fragmentation"),
    title: "Operational Fragmentation",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "Operational records reveal three concurrent stress patterns: workflow complexity that " +
      "exceeds current process capacity, financial control gaps that allow value to leak " +
      "unchecked, and logistics coordination under active pressure. These are not independent " +
      "problems — they are symptoms of an operation that has grown without a corresponding " +
      "investment in process integration.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Financial leakage compounds when logistics and workflow complexity are high — losses are harder to trace.",
      "Process fragmentation means improvements in one area (e.g., dispatch) do not flow through to others (e.g., stock records).",
      "Management attention is divided across multiple simultaneous operational fires.",
      "Audit and compliance exposure increases as financial records diverge from physical reality.",
    ],
    recommendations: [
      "Map the end-to-end operational workflow from customer booking to item return — identify the three biggest handoff failures.",
      "Implement reference ID discipline on all outbound movements as the first financial control action.",
      "Consolidate logistics scheduling and inventory allocation into a single daily planning meeting.",
      "Set a monthly financial reconciliation checkpoint to surface and investigate leakage before it accumulates.",
    ],
  };
}

// ── 6. Logistics Compression Risk ────────────────────────────────────────────
//
// Pattern: logistics_coordination (required, HIGH or CRITICAL), warehouse_operations (amplifier)

export function detectLogisticsCompressionRisk(
  findings: OperationalFinding[],
): RootCause | null {
  const log = byCategory(findings, CAT.LOG);
  if (!log.length) return null;

  const highLog = log.filter(f => f.severity === "HIGH" || f.severity === "CRITICAL");
  const wh      = byCategory(findings, CAT.WH);

  // Needs HIGH/CRITICAL logistics, or logistics + warehouse together
  if (!highLog.length && !wh.length) return null;

  const contributing = [...log, ...wh];
  let confidence = accumulateConfidence(contributing);
  if (wh.length > 0) confidence = cap(confidence + 8);

  console.log(
    `[MGD][ROOT_CAUSE] detectLogisticsCompressionRisk → confidence=${confidence} ` +
    `(log=${log.length} [high=${highLog.length}], wh=${wh.length})`,
  );

  return {
    id:    makeId("Logistics Compression Risk"),
    title: "Logistics Compression Risk",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "Logistics scheduling patterns show movement surges concentrated on peak days, outbound-dominant " +
      "flow, and irregular cadence — compounded by warehouse throughput pressure on a concentrated " +
      "item set. The logistics chain is operating near its coordination ceiling. A moderate increase " +
      "in demand or a scheduling failure could trigger fulfilment breakdown.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Peak-day movement surges create dispatch errors that are costly to recover from post-delivery.",
      "Irregular scheduling prevents vehicle and driver utilisation from being optimised.",
      "Warehouse throughput concentration means delays on key items cascade into full-order holds.",
      "Customer experience is tied to logistical peak capacity rather than average capacity.",
    ],
    recommendations: [
      "Introduce a dispatch cut-off time to enforce advance scheduling and reduce same-day pressure.",
      "Review the top 3 high-throughput items and establish dedicated staging areas to reduce picking time.",
      "Track peak-day delivery failure rate separately from average as a leading indicator.",
      "Model maximum daily throughput based on current team and vehicle capacity to set a demand ceiling.",
    ],
  };
}

// ── 7. Fragmented Workflow Synchronisation ────────────────────────────────────
//
// Pattern: workflow_scalability + logistics_coordination + warehouse_operations

export function detectWorkflowSyncFailure(
  findings: OperationalFinding[],
): RootCause | null {
  const wfl = byCategory(findings, CAT.WFL);
  const log = byCategory(findings, CAT.LOG);
  const wh  = byCategory(findings, CAT.WH);

  if (!wfl.length || !log.length) return null;  // wh optional but weighted

  const contributing = [...wfl, ...log, ...wh];
  const confidence   = accumulateConfidence(contributing);

  console.log(
    `[MGD][ROOT_CAUSE] detectWorkflowSyncFailure → confidence=${confidence} ` +
    `(wfl=${wfl.length}, log=${log.length}, wh=${wh.length})`,
  );

  return {
    id:    makeId("Fragmented Workflow Synchronisation"),
    title: "Fragmented Workflow Synchronisation",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "Workflow complexity, logistics scheduling pressure, and warehouse throughput are operating " +
      "as disconnected subsystems. Information about what has been dispatched, what is in the " +
      "warehouse, and what is scheduled for delivery is not flowing between these three functions " +
      "in a coordinated way. Each function compensates by improvising — which introduces compounding " +
      "synchronisation gaps.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Dispatch decisions are made without confirmed warehouse readiness, causing last-minute item substitutions.",
      "Scheduling changes in logistics are not reflected in warehouse picking priorities.",
      "Errors discovered at the warehouse stage cannot be resolved in time for committed delivery windows.",
      "Cross-functional visibility requires manual checking rather than shared system state.",
    ],
    recommendations: [
      "Establish a single source-of-truth for the daily dispatch list, accessible to both warehouse and logistics teams.",
      "Introduce a pre-dispatch confirmation step: warehouse confirms item readiness before logistics commits to schedule.",
      "Define what information must flow between warehouse, logistics, and coordination at each stage of an order cycle.",
      "Review the top 5 most recent fulfilment failures and identify which synchronisation gap each originated from.",
    ],
  };
}

// ── 8. Delayed Inventory Certainty ───────────────────────────────────────────
//
// Pattern: inventory_visibility + warehouse_operations (required), financial_leakage (amplifier)

export function detectDelayedInventoryCertainty(
  findings: OperationalFinding[],
): RootCause | null {
  const inv = byCategory(findings, CAT.INV);
  const wh  = byCategory(findings, CAT.WH);

  if (!inv.length || !wh.length) return null;

  const fin = byCategory(findings, CAT.FIN);
  const contributing = [...inv, ...wh, ...fin];
  let confidence = accumulateConfidence(contributing);
  if (fin.length > 0) confidence = cap(confidence + 8);

  console.log(
    `[MGD][ROOT_CAUSE] detectDelayedInventoryCertainty → confidence=${confidence} ` +
    `(inv=${inv.length}, wh=${wh.length}, fin=${fin.length})`,
  );

  return {
    id:    makeId("Delayed Inventory Certainty"),
    title: "Delayed Inventory Certainty",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "The business operates with a persistent lag between physical inventory reality and " +
      "recorded inventory position. Warehouse movement is active and concentrated, but " +
      "closing-balance records and matched intake documentation lag behind. Decisions about " +
      "what to order, what to commit, and what to dispatch are made against an inventory " +
      "picture that is already hours or days out of date.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Commitment of items to orders that are no longer physically available leads to fulfilment failure.",
      "Reorder decisions are delayed until physical shortage is observable rather than predictable.",
      "Reconciliation effort at period-end is high because the gap between physical and recorded has grown.",
      "Financial reporting of stock value is unreliable until a physical count is conducted.",
    ],
    recommendations: [
      "Implement a real-time outbound recording step at the point of dispatch — not retrospectively.",
      "Close the intake-to-record gap: every delivery of new stock must be recorded on the same day.",
      "Define a maximum acceptable lag between physical movement and system entry (e.g. 4 hours).",
      "Schedule weekly spot-checks on the 5 highest-movement items to catch discrepancies before month-end.",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT ROOT CAUSE DETECTORS (Pack V2)
// ─────────────────────────────────────────────────────────────────────────────

// ── EM 1: Inventory Governance Deficiency ─────────────────────────────────────

export function detectInventoryGovernanceDeficiency(
  findings: OperationalFinding[],
): RootCause | null {
  const invFinds = byCategory(findings, CAT.INV);
  if (invFinds.length === 0) return null;

  const contributing = [...invFinds];
  const confidence   = accumulateConfidence(contributing);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(
    `[MGD][ROOT_CAUSE] detectInventoryGovernanceDeficiency → ` +
    `confidence=${confidence} (inv=${invFinds.length})`,
  );

  return {
    id:       makeId("Inventory Governance Deficiency"),
    title:    "Inventory Governance Deficiency",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "Inventory records cannot be trusted in real time. The absence of systematic stock " +
      "verification, combined with visible shortage signals in dispatch data, indicates that " +
      "inventory governance controls — cycle counts, real-time recording, and balance audits — " +
      "are either absent or inconsistently enforced.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Inventory decisions are made against stale or inaccurate records, creating fulfilment uncertainty.",
      "Stock shortages are discovered at dispatch time rather than during planning — too late to remediate.",
      "Financial reporting of asset values is unreliable without verified inventory positions.",
      "Clients experience item shortages and substitutions that could be prevented with proactive control.",
    ],
    recommendations: [
      "Implement a pre-event inventory check 24 hours before each event deployment.",
      "Introduce a weekly cycle count for high-turnover items.",
      "Require real-time recording of every item dispatched and returned.",
    ],
  };
}

// ── EM 2: Event Readiness Control Failure ─────────────────────────────────────

export function detectEventReadinessControlFailure(
  findings: OperationalFinding[],
): RootCause | null {
  const erFinds   = byCategory(findings, CAT.EM_READINESS);
  const dispFinds = byCategory(findings, CAT.EM_DISPATCH);

  if (erFinds.length === 0 && dispFinds.length === 0) return null;

  const contributing = [...erFinds, ...dispFinds];
  const confidence   = accumulateConfidence(contributing);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const hasCriticalFinding = erFinds.some(f => f.severity === "CRITICAL");

  console.log(
    `[MGD][ROOT_CAUSE] detectEventReadinessControlFailure → ` +
    `confidence=${confidence} (er=${erFinds.length}, disp=${dispFinds.length})`,
  );

  return {
    id:       makeId("Event Readiness Control Failure"),
    title:    "Event Readiness Control Failure",
    severity: hasCriticalFinding ? "CRITICAL" : severityFrom(confidence),
    confidence,
    summary:
      "Pre-event validation controls are insufficient to prevent operational failures at event sites. " +
      "Dispatch records show incomplete deliveries, inventory shortages, and logistics delays that " +
      "would be preventable with structured pre-event checklists, inventory confirmation gates, " +
      "and readiness sign-off protocols.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Events are launched without verified inventory, creating on-site gaps visible to clients.",
      "No structured gate exists to halt deployment if dispatch is incomplete — failures proceed to the event.",
      "Substitution decisions are made ad-hoc under time pressure rather than from pre-approved alternates.",
      "Recurring failures indicate the absence of a learning loop — past failures are not embedded into future checklists.",
    ],
    recommendations: [
      "Create a mandatory pre-event readiness gate: no truck leaves without confirmed checklist sign-off.",
      "Define a substitution approval list for each product category so field teams have pre-authorised alternatives.",
      "Implement a post-event debrief form that feeds into the next event's preparation checklist.",
    ],
  };
}

// ── EM 3: Asset Accountability Weakness ──────────────────────────────────────

export function detectAssetAccountabilityWeakness(
  findings: OperationalFinding[],
): RootCause | null {
  // Spec trigger: AssetDamageRecoveryLeakage finding must be present
  const assetFinds = findings.filter(
    f => f.title === "Asset Damage Recovery Leakage" || f.category === CAT.EM_ASSET,
  );
  if (assetFinds.length === 0) return null;

  const contributing = [...assetFinds];
  const confidence   = accumulateConfidence(contributing);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(
    `[MGD][ROOT_CAUSE] detectAssetAccountabilityWeakness → ` +
    `confidence=${confidence} (asset=${assetFinds.length})`,
  );

  return {
    id:       makeId("Asset Accountability Weakness"),
    title:    "Asset Accountability Weakness",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "Damaged assets are not consistently recovered from clients. Damage records show that " +
      "incidents are being logged, but charge recovery is below the minimum threshold for " +
      "financial viability. The absence of a structured damage-to-recovery workflow means that " +
      "write-offs are treated as unavoidable losses rather than controllable recoveries.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Unrecovered damage charges represent direct, avoidable revenue loss on each event.",
      "Clients who cause damage without consequence have no deterrent against future mishandling.",
      "Accumulated unrecovered write-offs reduce the capital available for asset replacement.",
      "Inconsistent recovery enforcement creates fairness disputes when recovery is selectively pursued.",
    ],
    recommendations: [
      "Implement a damage register tracking each incident from identification through to invoice or write-off.",
      "Require photo documentation of damage at collection as mandatory evidence for recovery claims.",
      "Set a recovery target of ≥85% of recorded damage value and review monthly.",
    ],
  };
}

// ── EM 4: Dispatch Planning Immaturity ───────────────────────────────────────

export function detectDispatchPlanningImmaturity(
  findings: OperationalFinding[],
): RootCause | null {
  const dispFinds = byCategory(findings, CAT.EM_DISPATCH);
  const logFinds  = byCategory(findings, CAT.LOG);

  if (dispFinds.length === 0) return null;

  const contributing = [...dispFinds, ...logFinds];
  const confidence   = accumulateConfidence(contributing);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(
    `[MGD][ROOT_CAUSE] detectDispatchPlanningImmaturity → ` +
    `confidence=${confidence} (disp=${dispFinds.length}, log=${logFinds.length})`,
  );

  return {
    id:       makeId("Dispatch Planning Immaturity"),
    title:    "Dispatch Planning Immaturity",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "Delivery planning depends on manual coordination and reactive decision-making rather than " +
      "structured dispatch management. Recurring dispatch failures, delivery delays, and substitution " +
      "patterns indicate that the business does not have formalised dispatch planning processes — " +
      "including pre-load checklists, route confirmation, and timing buffers before event setup deadlines.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Manual dispatch coordination creates single-points-of-failure when key staff are unavailable.",
      "Route and timing decisions made reactively on event day leave no buffer for problem resolution.",
      "Recurring delays erode the setup-time window at venues, increasing on-site assembly pressure.",
      "Absence of structured dispatch records prevents analysis of recurring failure patterns.",
    ],
    recommendations: [
      "Create a standard dispatch planning template: item manifest, loading sequence, route, departure time, ETA.",
      "Require all dispatch plans to be confirmed 24 hours before event day.",
      "Build a 30-minute setup buffer into all delivery ETAs to absorb routine delays.",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT PACK V2 — EXTENDED ROOT CAUSE DETECTORS
// ─────────────────────────────────────────────────────────────────────────────

// ── Root Cause: Inventory Control Breakdown ───────────────────────────────────
//
// Fires when inventory visibility findings combine with shortage or readiness
// findings to indicate a systemic breakdown in inventory control — not just a
// governance process gap, but an active control failure.
// Distinct from "Inventory Governance Deficiency" (process/policy gap) in that
// it specifically requires evidence of observable shortages or readiness failure.

export function detectInventoryControlBreakdown(
  findings: OperationalFinding[],
): RootCause | null {
  // Spec trigger: InventoryVisibilityWeakness AND InventoryShortagePattern
  const hasVisibility = findings.some(f => f.title === "Inventory Visibility Weakness");
  const hasShortage   = findings.some(f => f.title === "Inventory Shortage Pattern");
  if (!hasVisibility || !hasShortage) return null;

  // Contributing: all inventory + any EM corroboration
  const invFinds       = byCategory(findings, CAT.INV);
  const emCorroboration = [
    ...byCategory(findings, CAT.EM_READINESS),
    ...byCategory(findings, CAT.EM_DISPATCH),
  ];
  const contributing = [...invFinds, ...emCorroboration];
  const confidence   = accumulateConfidence(contributing);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(
    `[MGD][ROOT_CAUSE] detectInventoryControlBreakdown → ` +
    `confidence=${confidence} (inv=${invFinds.length}, em=${emCorroboration.length})`,
  );

  return {
    id:       makeId("Inventory Control Breakdown"),
    title:    "Inventory Control Breakdown",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "Inventory management has broken down at the operational level — not merely a process gap " +
      "but an active control failure visible in missing items, event shortages, and dispatch discrepancies. " +
      "Stock availability is not systematically verified against event manifests before dispatch, " +
      "and there is no automated alert when inventory falls below event requirements.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Shortages discovered on event day rather than pre-dispatch leave no time for corrective action.",
      "Substitutions and missing items generate untracked client resolution costs.",
      "Repeated shortfalls erode client trust and increase the risk of contract non-renewal.",
      "Without visibility into real-time stock, procurement decisions are reactive and over-stocked.",
    ],
    recommendations: [
      "Implement event-manifest-to-inventory matching check 48 hours before each event.",
      "Set minimum stock level alerts on all high-usage event items.",
      "Track missing items and substitutions per event to identify chronically short SKUs.",
    ],
  };
}

// ── Root Cause: Dispatch Planning Dependency ──────────────────────────────────
//
// Fires when dispatch operations findings are present, pointing specifically to
// the DEPENDENCY on manual, person-driven planning rather than systematised
// dispatch control.  Distinct from "Dispatch Planning Immaturity" (which covers
// broader maturity) — this root cause names the dependency risk: the business
// cannot dispatch reliably without specific people making specific decisions.

export function detectDispatchPlanningDependency(
  findings: OperationalFinding[],
): RootCause | null {
  const dispFinds = byCategory(findings, CAT.EM_DISPATCH);
  const logFinds  = byCategory(findings, CAT.LOG);

  // Spec trigger: DispatchReliabilityRisk OR 2+ dispatch-related findings
  const hasDispatchRisk = findings.some(f => f.title === "Dispatch Reliability Risk");
  const dispatchCount   = dispFinds.length + logFinds.filter(
    f => f.title.toLowerCase().includes("dispatch") ||
         f.title.toLowerCase().includes("logistics"),
  ).length;

  if (!hasDispatchRisk && dispatchCount < 2) return null;

  const contributing = [...dispFinds, ...logFinds];
  const confidence   = accumulateConfidence(contributing);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(
    `[MGD][ROOT_CAUSE] detectDispatchPlanningDependency → ` +
    `confidence=${confidence} (dispatch=${dispFinds.length}, log=${logFinds.length})`,
  );

  return {
    id:       makeId("Dispatch Planning Dependency"),
    title:    "Dispatch Planning Dependency",
    severity: severityFrom(confidence),
    confidence,
    summary:
      "The business depends on key individuals making real-time dispatch decisions rather than " +
      "following a systematic, documented dispatch plan. This creates fragility: when those individuals " +
      "are unavailable, dispatch quality degrades significantly. Recurring failures and delays confirm " +
      "that current dispatch relies on personal coordination rather than a repeatable control system.",
    contributingFindings: contributing.map(f => f.id),
    operationalImpact: [
      "Dispatch quality is tied to the availability and judgment of specific staff members.",
      "No structured dispatch plan means no standard to audit failures against.",
      "Manual coordination breaks down under simultaneous multi-event scheduling.",
      "Clients bear the consequences of planning gaps as incomplete or delayed deliveries.",
    ],
    recommendations: [
      "Create a standard dispatch manifest: item list, load sequence, route, departure time, contact.",
      "Require dispatch plans to be completed and approved 24 hours before each event.",
      "Build and maintain a dispatch log so each completed event generates a performance record.",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

type RootCauseDetector = (findings: OperationalFinding[]) => RootCause | null;

const DETECTORS: RootCauseDetector[] = [
  detectReactiveOperations,
  detectScalabilityMismatch,
  detectInventoryVisibilityWeakness,
  detectCoordinationDependency,
  detectOperationalFragmentation,
  detectLogisticsCompressionRisk,
  detectWorkflowSyncFailure,
  detectDelayedInventoryCertainty,
  // ── Event Management Pack V2 ──────────────────────────────────────────────
  detectInventoryGovernanceDeficiency,
  detectEventReadinessControlFailure,
  detectAssetAccountabilityWeakness,
  detectDispatchPlanningImmaturity,
  // ── Event Management Pack V2 — Extended ──────────────────────────────────
  detectInventoryControlBreakdown,
  detectDispatchPlanningDependency,
];

const CONFIDENCE_THRESHOLD = 25;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared implementation: runs every registered detector against `findings`,
 * building both the final root-cause array (identical to this function's
 * historical behaviour) and, alongside it, a per-detector execution ledger
 * for trace-level observability (see pipeline-trace.ts's
 * DetectorExecutionRecord). Extracted so `generateRootCauses` (unchanged
 * signature, for every pre-existing caller) and
 * `generateRootCausesWithExecutions` (new, used only by mgd-pipeline.ts) run
 * the exact same detector loop rather than two diverging copies of it.
 */
function runRootCauseDetectors(
  params: RootCauseParams,
  // Test-only injection seam: defaults to the real, production DETECTORS
  // registry in every real call path (mgd-pipeline.ts never passes this).
  // Exists solely so regression tests can prove FAILED/SUCCESS execution
  // recording against a deliberately-throwing detector without ever
  // modifying a real production detector function — see
  // server/mgd/__tests__/detector-failure-observability.test.ts.
  detectorsOverride: RootCauseDetector[] = DETECTORS,
): { rootCauses: RootCause[]; executions: DetectorExecutionRecord[] } {
  const executions: DetectorExecutionRecord[] = [];

  try {
    const { findings, industry } = params;

    console.log(
      `[MGD][ROOT_CAUSE] generateRootCauses — ` +
      `${findings?.length ?? 0} findings, industry=${industry ?? "unspecified"}`,
    );

    if (!Array.isArray(findings) || findings.length === 0) {
      console.log("[MGD][ROOT_CAUSE] No findings supplied — returning []");
      return { rootCauses: [], executions };
    }

    console.log(
      "[MGD][ROOT_CAUSE] Input findings:",
      findings.map(f => `${f.category}[${f.severity}/${f.confidence}%]`).join(", "),
    );

    const rootCauses: RootCause[] = [];

    for (const detector of detectorsOverride) {
      const detectorName = detector.name || "anonymousRootCauseDetector";
      try {
        const rc = detector(findings);
        if (rc && rc.confidence >= CONFIDENCE_THRESHOLD) {
          rootCauses.push(rc);
          console.log(
            `[MGD][ROOT_CAUSE] ✓ "${rc.title}" ` +
            `[${rc.severity}] confidence=${rc.confidence} ` +
            `contributing=${rc.contributingFindings.length} findings`,
          );
          executions.push({ detectorName, stage: TRACE_STEPS.ROOT_CAUSE_GENERATION, status: "SUCCESS", outputCount: 1 });
        } else {
          // Ran cleanly; returned null or was suppressed below threshold —
          // a genuine "found nothing (yet)" result, not a failure.
          executions.push({ detectorName, stage: TRACE_STEPS.ROOT_CAUSE_GENERATION, status: "SUCCESS", outputCount: 0 });
        }
      } catch (err) {
        console.error("[MGD][ROOT_CAUSE] Detector error (skipped):", err);
        executions.push({
          detectorName,
          stage:  TRACE_STEPS.ROOT_CAUSE_GENERATION,
          status: "FAILED",
          error:  { name: (err as Error)?.name ?? "Error", message: (err as Error)?.message ?? String(err) },
        });
      }
    }

    // Deduplicate by ID (a pattern may be detected by more than one heuristic path)
    const seen = new Set<string>();
    const unique = rootCauses.filter(rc => {
      if (seen.has(rc.id)) return false;
      seen.add(rc.id);
      return true;
    });

    // Stamp rootCausePriority from title membership
    for (const rc of unique) {
      (rc as any).rootCausePriority = EVENT_PACK_RC_TITLES.has(rc.title)
        ? RootCausePriority.EVENT_PACK
        : RootCausePriority.GENERIC;
    }

    // Sort: Event Pack first (priority DESC), then confidence DESC
    unique.sort((a, b) => {
      const pd = (b.rootCausePriority ?? 0) - (a.rootCausePriority ?? 0);
      if (pd !== 0) return pd;
      return b.confidence - a.confidence;
    });

    console.log(`[MGD][ROOT_CAUSE] Complete — ${unique.length} root cause(s) generated`);
    for (const rc of unique) {
      console.log(`[MGD][ROOT_CAUSE]   • [${rc.severity.padEnd(8)}] "${rc.title}" (${rc.confidence}%)`);
    }

    return { rootCauses: unique, executions };

  } catch (err) {
    console.error("[MGD][ROOT_CAUSE] generateRootCauses failed:", err);
    return { rootCauses: [], executions };
  }
}

/**
 * Analyse the operational findings array and generate executive-level root
 * causes from multi-finding patterns.
 *
 * Returns root causes sorted by confidence descending, suppressed below 25.
 * Never throws.
 */
export function generateRootCauses(params: RootCauseParams): RootCause[] {
  return runRootCauseDetectors(params).rootCauses;
}

/**
 * Same as generateRootCauses, plus a per-detector execution ledger for
 * PipelineTrace observability (see MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md).
 * Used only by mgd-pipeline.ts — every pre-existing caller of
 * generateRootCauses is unaffected.
 */
export function generateRootCausesWithExecutions(
  params: RootCauseParams,
  /** Test-only — see runRootCauseDetectors. Never passed by mgd-pipeline.ts. */
  __testDetectors?: RootCauseDetector[],
): { rootCauses: RootCause[]; executions: DetectorExecutionRecord[] } {
  return __testDetectors ? runRootCauseDetectors(params, __testDetectors) : runRootCauseDetectors(params);
}
