// ─────────────────────────────────────────────────────────────────────────────
// MGD FINDINGS ENGINE
//
// Converts structured CIL transaction data + document metadata into
// deterministic operational intelligence findings.
//
// Design principles:
//   • No AI/LLM — all logic is rule-based and deterministic.
//   • Signal accumulation: each boolean signal adds weighted points.
//     Confidence = accumulated points, capped at 100.
//   • Never throws — every detector is wrapped; returns [] on bad input.
//   • Modular: each detector is a standalone exported function so future
//     industry overlays can call them individually or override thresholds.
//   • Extensible: add new detectors and register them in DETECTORS at the bottom.
//
// Transaction shape (from CIL pipeline / cil_transactions table):
//   { entityName, entityType, transactionType, quantity, value, date,
//     documentClassification, referenceId, rawText, netQuantity, netValue,
//     debugTrace, sourceFile, clientId, documentId }
//
// transactionType values: "inbound" | "outbound" | "adjustment" | "balance" | "unknown"
// ─────────────────────────────────────────────────────────────────────────────

import { FindingEvidence, attachEvidenceToFindings } from "./evidence-engine";
import { type EventSignals } from "./event-signals";
import { TRACE_STEPS, type DetectorExecutionRecord } from "./pipeline-trace";

// ── Exported interface ─────────────────────────────────────────────────────────

// ── Finding priority ──────────────────────────────────────────────────────────

export const FindingPriority = {
  EVENT_SPECIFIC:      100,
  INVENTORY_SPECIFIC:   80,
  GENERIC_OPERATIONAL:  50,
} as const;

export type FindingPriorityValue = typeof FindingPriority[keyof typeof FindingPriority];

// ── Event severity multiplier ─────────────────────────────────────────────────

export const EVENT_WEIGHT   = 3;
export const GENERIC_WEIGHT = 1;

/**
 * Findings that carry the EVENT_WEIGHT multiplier.
 * A single dispatch failure must outweigh hundreds of generic inventory rows.
 */
export const EVENT_WEIGHTED_TITLES = new Set([
  "Dispatch Reliability Risk",
  "Inventory Shortage Pattern",
  "Event Readiness Exposure",
  "Asset Damage Recovery Leakage",
]);

/** Maps finding category → priority value. Defaults to GENERIC_OPERATIONAL. */
export const CATEGORY_PRIORITY: Record<string, FindingPriorityValue> = {
  // Event-specific (highest priority — surface before generic findings)
  event_readiness:    FindingPriority.EVENT_SPECIFIC,
  dispatch_operations: FindingPriority.EVENT_SPECIFIC,
  asset_management:   FindingPriority.EVENT_SPECIFIC,
  // Inventory-specific
  inventory_visibility: FindingPriority.INVENTORY_SPECIFIC,
  // Generic operational (warehouse / logistics)
  logistics_coordination: FindingPriority.GENERIC_OPERATIONAL,
  warehouse_operations:   FindingPriority.GENERIC_OPERATIONAL,
  manpower_dependency:    FindingPriority.GENERIC_OPERATIONAL,
  financial_leakage:      FindingPriority.GENERIC_OPERATIONAL,
  workflow_scalability:   FindingPriority.GENERIC_OPERATIONAL,
};

export interface OperationalFinding {
  id:                string;
  title:             string;
  severity:          "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category:          string;
  findingPriority:   FindingPriorityValue;
  department?:       string;
  summary:           string;
  signals:           string[];
  evidence?:         FindingEvidence[];
  operationalImpact?: string;
  confidence:        number;  // 0–100
}

export interface FindingsParams {
  transactions:  any[];
  documents:     any[];
  industry?:     string;
  eventSignals?: EventSignals;   // pre-computed EM metrics — passed in by the pipeline
}

// ── Finding categories ─────────────────────────────────────────────────────────
//
// The authoritative declaration lives in ./finding-categories.ts, a leaf
// module with zero imports — this file imports it (for its own 17 internal
// usages below) and re-exports it so `import { FINDING_CATEGORIES } from
// "./findings-engine"` keeps working for existing/external consumers.
// Declaring the vocabulary directly in this file was tried and reverted: this
// module imports evidence-engine.ts (below), and evidence-engine.ts also
// needs these category values — declaring them here would create a circular
// import between the two.
import { FINDING_CATEGORIES, type FindingCategory } from "./finding-categories";
export { FINDING_CATEGORIES, type FindingCategory };

// ── Thresholds ─────────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 20;   // minimum confidence to emit a finding
const CONSECUTIVE_EMPTY_FLUSH = 5; // mirrors block-detector constant

// ── Utilities ──────────────────────────────────────────────────────────────────

/** Deterministic ID from title + category (DJB2 hash). */
function makeId(title: string, category: string): string {
  let h = 5381;
  for (const ch of `${title}|${category}`) {
    h = ((h << 5) + h) ^ ch.charCodeAt(0);
    h = h >>> 0;
  }
  return `mgd-${category.slice(0, 4)}-${h.toString(16).padStart(8, "0")}`;
}

/** Safe numeric parse — returns NaN on empty / null / non-numeric strings. */
function safeNum(v: any): number {
  if (v === null || v === undefined || v === "") return NaN;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? NaN : n;
}

/**
 * Map a confidence score (0–100) to a finding severity.
 *
 * Thresholds are set so that a detector firing on moderate evidence (score 30–49)
 * produces MEDIUM rather than LOW.  Previous thresholds (40/65/85) caused most
 * findings to land at LOW when quantity-based signals were weak, which then
 * cascaded into misleadingly low health scores and confusing reports.
 *
 * Revised scale:
 *   CRITICAL  ≥ 70  — strong multi-signal evidence, high certainty
 *   HIGH      ≥ 50  — clear evidence from multiple signals
 *   MEDIUM    ≥ 30  — partial evidence, warrants monitoring
 *   LOW       < 30  — weak or single-signal evidence
 */
function severityFrom(confidence: number): OperationalFinding["severity"] {
  if (confidence >= 70) return "CRITICAL";
  if (confidence >= 50) return "HIGH";
  if (confidence >= 30) return "MEDIUM";
  return "LOW";
}

/** Cap a score between 0 and 100. */
function cap(n: number): number { return Math.min(100, Math.max(0, Math.round(n))); }

/**
 * Group an array by a key-extraction function.
 * Returns a plain Map<string, T[]>.
 */
function groupBy<T>(arr: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(item);
  }
  return m;
}

/** Coefficient of variation (stdDev / mean) for a number array. */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

// ── Pre-processing: build a normalised view of the transaction array ───────────

interface TxStats {
  total:              number;
  inbound:            number;
  outbound:           number;
  adjustments:        number;
  balance:            number;
  unknown:            number;
  uniqueEntities:     Set<string>;
  uniqueDates:        Set<string>;
  uniqueDocClasses:   Set<string>;
  uniqueSources:      Set<string>;
  missingDate:        number;
  missingRef:         number;
  missingValue:       number;
  totalQtyIn:         number;
  totalQtyOut:        number;
  totalValueIn:       number;
  totalValueOut:      number;
  byEntity:           Map<string, { in: number; out: number; adj: number; txCount: number }>;
  byDate:             Map<string, number>;   // date → tx count on that day
  hasLogisticsBlock:    boolean;              // any tx debugTrace.blockType === "logistics_schedule"
  hasReturns:           boolean;              // rawText contains return/refund signals
  hasCustomerRefs:      boolean;              // rawText/remarks contain customer names
  isCustomerFrequency:  boolean;              // all/most transactions from a customer_frequency document
}

function buildStats(transactions: any[]): TxStats {
  const stats: TxStats = {
    total: 0, inbound: 0, outbound: 0, adjustments: 0, balance: 0, unknown: 0,
    uniqueEntities: new Set(), uniqueDates: new Set(), uniqueDocClasses: new Set(),
    uniqueSources: new Set(), missingDate: 0, missingRef: 0, missingValue: 0,
    totalQtyIn: 0, totalQtyOut: 0, totalValueIn: 0, totalValueOut: 0,
    byEntity: new Map(), byDate: new Map(), hasLogisticsBlock: false,
    hasReturns: false, hasCustomerRefs: false, isCustomerFrequency: false,
  };

  for (const tx of transactions) {
    if (!tx || typeof tx !== "object") continue;

    stats.total++;

    const type  = String(tx.transactionType ?? "unknown").toLowerCase();
    const qty   = safeNum(tx.quantity);
    const val   = safeNum(tx.value);
    const date  = String(tx.date ?? "").trim();
    const eName = String(tx.entityName ?? "unknown").trim().toLowerCase();
    const raw   = String(tx.rawText ?? "").toLowerCase();
    const trace = tx.debugTrace ?? {};

    // Transaction type counts
    // CIL uses "incoming"/"outgoing"/"sale"/"loss"/"dispatch_event"/"inventory_loss"
    // which must be mapped to the stat buckets.
    const isInbound  = type === "inbound"  || type === "incoming" || type === "refund";
    const isOutbound = type === "outbound" || type === "outgoing" || type === "sale"
                    || type === "loss"     || type === "dispatch_event" || type === "inventory_loss";

    if      (isInbound)          stats.inbound++;
    else if (isOutbound)         stats.outbound++;
    else if (type === "adjustment") stats.adjustments++;
    else if (type === "balance")    stats.balance++;
    else                            stats.unknown++;

    // Quantity / value aggregation
    if (!isNaN(qty)) {
      if (isInbound)  stats.totalQtyIn  += qty;
      if (isOutbound) stats.totalQtyOut += qty;
    }
    if (!isNaN(val)) {
      if (isInbound)  stats.totalValueIn  += val;
      if (isOutbound) stats.totalValueOut += val;
    }

    // Cardinality
    if (eName && eName !== "unknown") stats.uniqueEntities.add(eName);
    if (date) stats.uniqueDates.add(date);
    if (tx.documentClassification) stats.uniqueDocClasses.add(String(tx.documentClassification));
    if (tx.sourceFile)              stats.uniqueSources.add(String(tx.sourceFile));

    // Missing fields
    if (!date)              stats.missingDate++;
    if (!tx.referenceId)    stats.missingRef++;
    if (isNaN(val))         stats.missingValue++;

    // Per-entity aggregation
    if (!stats.byEntity.has(eName)) stats.byEntity.set(eName, { in: 0, out: 0, adj: 0, txCount: 0 });
    const ent = stats.byEntity.get(eName)!;
    ent.txCount++;
    if (isInbound)               ent.in++;
    if (isOutbound)              ent.out++;
    if (type === "adjustment")   ent.adj++;

    // Per-date count
    if (date) {
      const day = date.slice(0, 10); // normalise to YYYY-MM-DD prefix
      stats.byDate.set(day, (stats.byDate.get(day) ?? 0) + 1);
    }

    // Logistics block signal
    if (String(trace.blockType ?? "") === "logistics_schedule") stats.hasLogisticsBlock = true;

    // Return / refund signal
    if (/refund|return|balik|retur|credit note|cn /i.test(raw)) stats.hasReturns = true;

    // Customer reference in raw text
    if (tx.remarks || (raw.length > 0 && /customer|client|pelngan|pelanggan/i.test(raw))) {
      stats.hasCustomerRefs = true;
    }
  }

  // Customer frequency document: all transactions tagged by the flat-table extractor
  stats.isCustomerFrequency = stats.uniqueDocClasses.has("customer_frequency");

  return stats;
}

// ── Detector: Manpower Dependency ─────────────────────────────────────────────
//
// Fires when the volume, variety, or pattern of transactions indicates that
// operations are held together by manual tracking and human coordination
// rather than systematic process automation.

export function detectManualDependency(
  stats: TxStats,
  _transactions: any[],
): OperationalFinding | null {
  const evidence: string[]  = [];
  let score = 0;

  const entCount    = stats.uniqueEntities.size;
  const maxEntityTx = stats.byEntity.size > 0
    ? Math.max(...Array.from(stats.byEntity.values()).map(e => e.txCount))
    : 0;

  if (stats.isCustomerFrequency) {
    // ── Customer-frequency data: use client-appropriate signals ────────────
    // Treat each transaction as a service event, not an inventory movement.
    if (stats.total > 50)  { score += 20; evidence.push(`${stats.total} client service records detected — client portfolio coordination requires systematic management`); }
    if (stats.total > 100) { score += 10; evidence.push(`Client base exceeds 100 service records — manual coordination per client creates scalability constraints`); }
    if (stats.hasCustomerRefs) { score += 15; evidence.push("Each client is tracked individually — service coordination is client-specific and manually managed without a centralised CRM"); }
    if (stats.uniqueSources.size > 1) { score += 10; evidence.push(`Client data spread across ${stats.uniqueSources.size} source files — no centralised client management system`); }
  } else {
    // ── Standard inventory / operational data ──────────────────────────────
    // Signal: high entity variety (each needs individual manual tracking)
    if (entCount > 5)  { score += 20; evidence.push(`${entCount} distinct inventory items tracked — each requiring individual manual ledger entries`); }
    if (entCount > 15) { score += 15; evidence.push(`Entity count exceeds 15 — manual reconciliation complexity is high`); }

    // Signal: high transaction volume per entity
    if (maxEntityTx > 30) { score += 15; evidence.push(`Highest movement volume per item: ${maxEntityTx} transactions — indicates heavy manual throughput`); }
    if (stats.total > 100) { score += 10; evidence.push(`${stats.total} total movement records detected across documents`); }

    // Signal: outbound-only entities (no paired returns/inbound)
    let outboundOnlyCount = 0;
    for (const [, e] of stats.byEntity) {
      if (e.out > 0 && e.in === 0) outboundOnlyCount++;
    }
    if (outboundOnlyCount > 0) {
      const pct = Math.round((outboundOnlyCount / Math.max(stats.byEntity.size, 1)) * 100);
      if (pct > 25) { score += 15; evidence.push(`${outboundOnlyCount} items (${pct}%) show outbound-only movement — no systematic return/intake records`); }
    }

    // Signal: customer-named references tracked manually in remarks
    if (stats.hasCustomerRefs) { score += 10; evidence.push("Customer names embedded in movement remarks — coordination managed manually per customer request"); }

    // Signal: multiple source files (fragmented record-keeping)
    if (stats.uniqueSources.size > 1) { score += 10; evidence.push(`Movement data spread across ${stats.uniqueSources.size} separate files — no centralised tracking`); }

    // Signal: high missing reference IDs on outbound
    if (stats.outbound > 0) {
      const missingRefPct = Math.round((stats.missingRef / stats.total) * 100);
      if (missingRefPct > 40) { score += 10; evidence.push(`${missingRefPct}% of transactions lack a reference ID — manual dispatch without documentation`); }
    }
  }

  const confidence = cap(score);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectManualDependency → score=${confidence} signals=${evidence.length}`);

  const summaryText = stats.isCustomerFrequency
    ? `Service records for ${stats.total} client engagements are managed without a centralised tracking system. ` +
      `Each client relationship is coordinated individually, creating manual bottlenecks that become ` +
      `increasingly difficult to manage as the client base grows.`
    : `The volume and variety of inventory movements across ${entCount} distinct items ` +
      `and ${stats.total} transactions indicates that operational tracking relies heavily ` +
      `on manual ledger entries and person-to-person coordination. This creates ` +
      `human single-points-of-failure that scale poorly under demand growth.`;

  return {
    id:               makeId("High Manual Coordination Dependency", FINDING_CATEGORIES.MANPOWER_DEPENDENCY),
    title:            "High Manual Coordination Dependency",
    severity:         severityFrom(confidence),
    category:         FINDING_CATEGORIES.MANPOWER_DEPENDENCY,
    department:       stats.isCustomerFrequency ? "Sales / Client Management" : "Operations / Warehouse",
    summary:          summaryText,
    signals:          evidence,
    operationalImpact:
      stats.isCustomerFrequency
        ? "Manual client coordination increases response delays and error rates during peak event periods, " +
          "and creates knowledge concentration risk when key account managers are unavailable."
        : "Manual dependency increases error probability during peak periods, delays response to stock discrepancies, " +
          "and creates knowledge concentration risk when key personnel are unavailable.",
    confidence,
  };
}

// ── Detector: Inventory Strain ────────────────────────────────────────────────
//
// Fires when transaction patterns suggest inventory visibility gaps:
// net drawdown without replenishment records, unreconciled movement,
// or high movement complexity without systematic balance tracking.

export function detectInventoryStrain(
  stats: TxStats,
  _transactions: any[],
): OperationalFinding | null {
  // Customer frequency data is a sales report, not an inventory log.
  // "No inbound replenishment" is meaningless here — suppress the detector.
  if (stats.isCustomerFrequency) {
    console.log("[MGD][FINDINGS] detectInventoryStrain — SKIP (customer_frequency data — not applicable)");
    return null;
  }

  const evidence: string[] = [];
  let score = 0;

  const netQty = stats.totalQtyOut - stats.totalQtyIn;

  // Signal: net outbound > inbound (drawdown without replenishment)
  if (stats.totalQtyIn > 0 && netQty > 0) {
    const ratio = Math.round((netQty / stats.totalQtyIn) * 100);
    if (ratio > 20) { score += 25; evidence.push(`Net outbound quantity exceeds inbound by ${netQty.toFixed(0)} units (${ratio}% more out than in)`); }
  } else if (stats.totalQtyIn === 0 && stats.totalQtyOut > 0) {
    score += 25; evidence.push("No inbound/replenishment transactions found — only outbound movement recorded");
  }

  // Signal: entities with no inbound records at all
  let noInboundCount = 0;
  for (const [, e] of stats.byEntity) {
    if (e.in === 0 && e.out > 0) noInboundCount++;
  }
  if (noInboundCount > 0) {
    const pct = Math.round((noInboundCount / Math.max(stats.byEntity.size, 1)) * 100);
    score += 20;
    evidence.push(`${noInboundCount} item(s) (${pct}%) have no intake records — opening stock assumed but unverified`);
  }

  // Signal: high entity count without balance tracking
  const hasBalanceTx = stats.balance > 0;
  if (stats.uniqueEntities.size > 10 && !hasBalanceTx) {
    score += 15;
    evidence.push(`${stats.uniqueEntities.size} items tracked with no closing-balance records — reconciliation state unknown`);
  }

  // Signal: missing dates obscure movement timeline
  if (stats.total > 0) {
    const missingDatePct = Math.round((stats.missingDate / stats.total) * 100);
    if (missingDatePct > 20) {
      score += 15;
      evidence.push(`${missingDatePct}% of transactions have no date — timeline reconstruction is incomplete`);
    }
  }

  // Signal: adjustment transactions present (corrections to existing records)
  if (stats.adjustments > 0) {
    score += 10;
    evidence.push(`${stats.adjustments} adjustment transaction(s) detected — indicates post-hoc corrections to inventory records`);
  }

  const confidence = cap(score);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectInventoryStrain → score=${confidence} signals=${evidence.length}`);

  return {
    id:               makeId("Delayed Inventory Reconciliation", FINDING_CATEGORIES.INVENTORY_VISIBILITY),
    title:            "Delayed Inventory Reconciliation",
    severity:         severityFrom(confidence),
    category:         FINDING_CATEGORIES.INVENTORY_VISIBILITY,
    department:       "Warehouse / Inventory",
    summary:
      `Movement records show systematic gaps in inventory intake documentation and ` +
      `balance tracking. Across ${stats.uniqueEntities.size} items and ${stats.total} ` +
      `transaction records, outbound movements outpace documented replenishment, ` +
      `and no consistent closing-balance verification is recorded.`,
    signals: evidence,
    operationalImpact:
      "Without closing-balance snapshots and matched intake records, stock discrepancies accumulate silently. " +
      "Shortfalls surface only at physical count — by which point the loss window may span weeks.",
    confidence,
  };
}

// ── Detector: Logistics Pressure ──────────────────────────────────────────────
//
// Fires when logistics scheduling patterns suggest coordination strain:
// date clustering, high-throughput single days, logistics block types,
// or outbound-dominant flow without return/receipt pairing.

export function detectLogisticsPressure(
  stats: TxStats,
  _transactions: any[],
): OperationalFinding | null {
  const evidence: string[] = [];
  let score = 0;

  const dateVolumes = Array.from(stats.byDate.values());
  const avgDaily    = dateVolumes.length > 0
    ? dateVolumes.reduce((s, v) => s + v, 0) / dateVolumes.length
    : 0;
  const peakDaily   = dateVolumes.length > 0 ? Math.max(...dateVolumes) : 0;

  // Signal: logistics block type detected in transaction debug trace
  if (stats.hasLogisticsBlock) {
    score += 20;
    evidence.push("Logistics schedule blocks detected in uploaded documents — structured delivery routing data present");
  }

  // Signal: peak day more than 3× average (date clustering / surge)
  if (avgDaily > 0 && peakDaily > 3 * avgDaily) {
    const peakDate = Array.from(stats.byDate.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
    score += 20;
    evidence.push(
      `Peak single-day movement of ${peakDaily} transactions (${(peakDaily / avgDaily).toFixed(1)}× daily average) ` +
      `— detected on ${peakDate}`,
    );
  }

  // Signal: outbound-dominant without paired inbound (one-way flow = delivery-only operations)
  if (stats.outbound > 0 && stats.inbound === 0) {
    score += 20;
    evidence.push("All recorded movements are outbound — no inbound/return records, consistent with delivery-only operations");
  } else if (stats.outbound > 0) {
    const outRatio = stats.outbound / (stats.outbound + stats.inbound);
    if (outRatio > 0.75) {
      score += 15;
      evidence.push(
        `${Math.round(outRatio * 100)}% of recorded movements are outbound ` +
        `(${stats.outbound} out vs ${stats.inbound} in) — suggests logistics-heavy operations`,
      );
    }
  }

  // Signal: high spread of unique dates (frequent scheduling activity)
  if (stats.uniqueDates.size > 20) {
    score += 15;
    evidence.push(`${stats.uniqueDates.size} distinct movement dates — sustained high-frequency scheduling activity`);
  }

  // Signal: multiple source documents (fragmented logistics records)
  if (stats.uniqueSources.size > 2) {
    score += 10;
    evidence.push(`Logistics data spread across ${stats.uniqueSources.size} source files — cross-document coordination required`);
  }

  // Signal: high coefficient of variation in daily volumes (erratic scheduling)
  const cv = coefficientOfVariation(dateVolumes);
  if (cv > 0.8 && dateVolumes.length >= 5) {
    score += 10;
    evidence.push(`High day-to-day variability in movement volumes (CV: ${cv.toFixed(2)}) — logistics scheduling is irregular`);
  }

  const confidence = cap(score);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectLogisticsPressure → score=${confidence} signals=${evidence.length}`);

  return {
    id:               makeId("Logistics Coordination Strain", FINDING_CATEGORIES.LOGISTICS_COORDINATION),
    title:            "Logistics Coordination Strain",
    severity:         severityFrom(confidence),
    category:         FINDING_CATEGORIES.LOGISTICS_COORDINATION,
    department:       "Logistics / Dispatch",
    summary:
      `Transaction patterns reveal concentrated movement surges, outbound-dominant flow, ` +
      `and irregular scheduling across ${stats.uniqueDates.size} active dates. ` +
      `Logistics coordination is under pressure: volume spikes and fragmented records ` +
      `indicate reactive rather than planned dispatch management.`,
    signals: evidence,
    operationalImpact:
      "Reactive logistics scheduling increases last-minute coordination effort, raises delivery failure risk during peak days, " +
      "and limits the ability to optimise vehicle/driver utilisation across routes.",
    confidence,
  };
}

// ── Detector: Financial Leakage ───────────────────────────────────────────────
//
// Fires when transaction patterns suggest unrecovered financial exposure:
// adjustments without documentation, missing value records, return/refund
// activity, or a net value imbalance between outbound and inbound flows.

export function detectFinancialLeakage(
  stats: TxStats,
  _transactions: any[],
): OperationalFinding | null {
  const evidence: string[] = [];
  let score = 0;

  // Signal: adjustment transactions (after-the-fact corrections = control gaps)
  if (stats.adjustments > 0) {
    const adjPct = Math.round((stats.adjustments / stats.total) * 100);
    score += 20;
    evidence.push(`${stats.adjustments} adjustment transaction(s) (${adjPct}% of total) — post-hoc corrections imply upstream recording errors`);
  }

  // Signal: net value imbalance (outbound value > inbound value)
  if (stats.totalValueOut > 0 && stats.totalValueIn > 0) {
    const netVal = stats.totalValueOut - stats.totalValueIn;
    if (netVal > 0) {
      score += 20;
      evidence.push(
        `Outbound value (${stats.totalValueOut.toFixed(2)}) exceeds inbound value ` +
        `(${stats.totalValueIn.toFixed(2)}) by ${netVal.toFixed(2)} — ` +
        `unrecovered value exposure in movement records`,
      );
    }
  }

  // Signal: return / refund transactions present
  if (stats.hasReturns) {
    score += 15;
    evidence.push("Return or refund-related transactions detected — indicates operational leakage through asset returns");
  }

  // Signal: outbound transactions with no reference ID (undocumented dispatch)
  if (stats.outbound > 0) {
    const missingRefOnOutbound = stats.missingRef;  // proxy: same population
    const pct = Math.round((missingRefOnOutbound / Math.max(stats.outbound, 1)) * 100);
    if (pct > 30) {
      score += 15;
      evidence.push(`~${pct}% of outbound movements lack a reference/invoice number — dispatch without documented authorisation`);
    }
  }

  // Signal: high missing-value rate (financial exposure not quantified)
  if (stats.total > 0) {
    const missingValPct = Math.round((stats.missingValue / stats.total) * 100);
    if (missingValPct > 50) {
      score += 10;
      evidence.push(`${missingValPct}% of transactions carry no monetary value — financial leakage cannot be fully quantified`);
    }
  }

  const confidence = cap(score);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectFinancialLeakage → score=${confidence} signals=${evidence.length}`);

  return {
    id:               makeId("Elevated Operational Leakage Exposure", FINDING_CATEGORIES.FINANCIAL_LEAKAGE),
    title:            "Elevated Operational Leakage Exposure",
    severity:         severityFrom(confidence),
    category:         FINDING_CATEGORIES.FINANCIAL_LEAKAGE,
    department:       "Finance / Operations",
    summary:
      `Financial control signals in the transaction records show ${stats.adjustments} ` +
      `post-hoc adjustments, missing reference documentation on outbound movements, ` +
      `and unmatched value flows. These patterns indicate unquantified operational ` +
      `leakage that is not currently captured in formal financial reporting.`,
    signals: evidence,
    operationalImpact:
      "Undocumented dispatch, unrecovered returns, and value imbalances accumulate into chronic margin erosion. " +
      "Without reference tracking on every outbound movement, recovery actions cannot be initiated systematically.",
    confidence,
  };
}

// ── Detector: Workflow Scalability Risk ───────────────────────────────────────
//
// Fires when the complexity profile of the document set (entity variety,
// transaction density, temporal irregularity) suggests that current
// operational processes will not scale without structural changes.

export function detectWorkflowScalabilityRisk(
  stats: TxStats,
  _transactions: any[],
): OperationalFinding | null {
  const evidence: string[] = [];
  let score = 0;

  const entCount = stats.uniqueEntities.size;

  // Signal: very high entity variety
  if (entCount > 20) {
    score += 25;
    evidence.push(`${entCount} distinct inventory entities across documents — high operational catalogue complexity`);
  } else if (entCount > 10) {
    score += 15;
    evidence.push(`${entCount} distinct inventory entities tracked — moderate catalogue complexity`);
  }

  // Signal: high overall transaction volume
  if (stats.total > 200) {
    score += 15;
    evidence.push(`${stats.total} total transaction records — high operational throughput with manual coordination overhead`);
  } else if (stats.total > 80) {
    score += 10;
    evidence.push(`${stats.total} transaction records — growing volume that will strain existing manual workflows`);
  }

  // Signal: multiple document classifications (process fragmentation)
  if (stats.uniqueDocClasses.size > 1) {
    score += 15;
    evidence.push(
      `${stats.uniqueDocClasses.size} document types detected (${Array.from(stats.uniqueDocClasses).join(", ")}) — ` +
      `heterogeneous data entry points increase process fragmentation`,
    );
  }

  // Signal: high unique-date spread (sustained operational activity)
  if (stats.uniqueDates.size > 60) {
    score += 15;
    evidence.push(`${stats.uniqueDates.size} distinct movement dates — over 2 months of continuous operations tracked in uploaded records`);
  }

  // Signal: irregular daily volume pattern (inconsistent workflow rhythm)
  const dateVolumes = Array.from(stats.byDate.values());
  const cv = coefficientOfVariation(dateVolumes);
  if (cv > 0.9 && dateVolumes.length >= 5) {
    score += 15;
    evidence.push(`High variability in daily transaction volumes (CV: ${cv.toFixed(2)}) — workflow cadence is irregular and reactive`);
  }

  // Signal: many entities with only 1–2 transactions (fragmented catalogue)
  let singletonEntities = 0;
  for (const [, e] of stats.byEntity) {
    if (e.txCount <= 2) singletonEntities++;
  }
  const singletonPct = Math.round((singletonEntities / Math.max(stats.byEntity.size, 1)) * 100);
  if (singletonPct > 30 && stats.byEntity.size > 5) {
    score += 10;
    evidence.push(`${singletonPct}% of items appear in only 1–2 transactions — highly fragmented item catalogue with long tail of low-frequency items`);
  }

  const confidence = cap(score);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectWorkflowScalabilityRisk → score=${confidence} signals=${evidence.length}`);

  return {
    id:               makeId("High Inventory Movement Complexity", FINDING_CATEGORIES.WORKFLOW_SCALABILITY),
    title:            "High Inventory Movement Complexity",
    severity:         severityFrom(confidence),
    category:         FINDING_CATEGORIES.WORKFLOW_SCALABILITY,
    department:       "Operations / Management",
    summary:
      `The breadth of ${entCount} tracked entities, ${stats.total} transactions across ` +
      `${stats.uniqueDocClasses.size} document type(s), and irregular movement cadence ` +
      `indicate that current operational workflows are approaching a complexity ceiling. ` +
      `Scaling activity without process formalisation will amplify coordination failures.`,
    signals: evidence,
    operationalImpact:
      "Operational complexity at current levels requires experienced staff to maintain context across many items and document sources. " +
      "Staff turnover or demand increases will expose latent process fragility.",
    confidence,
  };
}

// ── Detector: Warehouse Operations ────────────────────────────────────────────
//
// Fires when the movement pattern suggests concentrated warehouse-side pressure:
// specific high-movement entities, repeated large batch movements,
// or evidence of items moving in and out rapidly (low dwell time).

export function detectWarehouseOperations(
  stats: TxStats,
  _transactions: any[],
): OperationalFinding | null {
  const evidence: string[] = [];
  let score = 0;

  // Signal: a small number of entities dominate movement volume (concentration)
  const entityTxCounts = Array.from(stats.byEntity.values()).map(e => e.txCount).sort((a, b) => b - a);
  if (entityTxCounts.length >= 3) {
    const top3Share = entityTxCounts.slice(0, 3).reduce((s, v) => s + v, 0) / stats.total;
    if (top3Share > 0.6) {
      score += 25;
      evidence.push(
        `Top 3 items account for ${Math.round(top3Share * 100)}% of all movements — ` +
        `warehouse throughput is highly concentrated on a small product subset`,
      );
    }
  }

  // Signal: many entities with both inbound AND outbound on same dates = rapid turn
  let rapidTurnEntities = 0;
  for (const [, e] of stats.byEntity) {
    if (e.in > 0 && e.out > 0 && (e.in + e.out) > 10) rapidTurnEntities++;
  }
  if (rapidTurnEntities > 0) {
    score += 20;
    evidence.push(`${rapidTurnEntities} item(s) show both inbound and outbound activity at high frequency — rapid inventory turnover detected`);
  }

  // Signal: high total movement with no balance/audit records
  if (stats.total > 50 && stats.balance === 0) {
    score += 20;
    evidence.push(`${stats.total} movement records with no closing-balance audit entries — physical counts cannot be system-verified`);
  }

  // Signal: adjustment records present (physical handling errors)
  if (stats.adjustments > 0) {
    score += 15;
    evidence.push(`${stats.adjustments} warehouse adjustment record(s) — physical handling discrepancies corrected post-movement`);
  }

  const confidence = cap(score);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectWarehouseOperations → score=${confidence} signals=${evidence.length}`);

  return {
    id:               makeId("Concentrated Warehouse Throughput Pressure", FINDING_CATEGORIES.WAREHOUSE_OPERATIONS),
    title:            "Concentrated Warehouse Throughput Pressure",
    severity:         severityFrom(confidence),
    category:         FINDING_CATEGORIES.WAREHOUSE_OPERATIONS,
    department:       "Warehouse",
    summary:
      `Movement records show that a small set of high-turnover items drives the majority ` +
      `of warehouse activity. Without automated balance verification, handling errors and ` +
      `adjustment records indicate that warehouse operations are absorbing correction ` +
      `effort that displaces productive throughput time.`,
    signals: evidence,
    operationalImpact:
      "Concentrated throughput on a few items creates bottleneck risk at the packing/dispatch stage. " +
      "Physical handling adjustments without digital audit trails prevent root-cause analysis of recurring discrepancies.",
    confidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT DETECTORS (Pack V2)
// All receive (stats, transactions, params) and read params.eventSignals.
// ─────────────────────────────────────────────────────────────────────────────

// ── EM 1: Inventory Visibility Weakness ──────────────────────────────────────

function detectEMInventoryVisibilityWeakness(
  _stats: TxStats,
  _transactions: any[],
  params: FindingsParams,
): OperationalFinding | null {
  const signals = params.eventSignals;
  if (!signals) return null;
  if (signals.inventoryVisibilityScore >= 70) return null;

  const score      = signals.inventoryVisibilityScore;
  const confidence = cap(100 - score);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const evidence: string[] = [
    `Inventory Visibility Score: ${score}/100 (threshold: 70)`,
  ];
  if (signals.totalMissingItems > 0)
    evidence.push(`${signals.totalMissingItems} missing items recorded across dispatch events`);
  if (signals.incompleteDispatches > 0)
    evidence.push(`${signals.incompleteDispatches} of ${signals.totalDispatches} dispatches incomplete`);

  console.log(
    `[MGD][FINDINGS] detectEMInventoryVisibilityWeakness → ` +
    `score=${score} confidence=${confidence}`,
  );

  return {
    id:         makeId("Inventory Visibility Weakness", FINDING_CATEGORIES.INVENTORY_VISIBILITY),
    title:      "Inventory Visibility Weakness",
    severity:   "HIGH",
    category:   FINDING_CATEGORIES.INVENTORY_VISIBILITY,
    department: "Warehouse / Operations",
    summary:
      `Inventory visibility scored ${score}/100 — below the 70-point operational threshold. ` +
      `Gaps in real-time stock position are creating downstream dispatch failures and substitution ` +
      `requirements, indicating that the physical inventory state is not accurately known before ` +
      `commitments are made to clients.`,
    signals: evidence,
    operationalImpact:
      "Poor inventory visibility forces dispatchers to commit items that may not be physically " +
      "available, leading to last-minute substitutions and incomplete deliveries that erode client confidence.",
    confidence,
  };
}

// ── EM 2: Recurring Dispatch Failure Pattern ──────────────────────────────────

function detectRecurringDispatchFailure(
  _stats: TxStats,
  _transactions: any[],
  params: FindingsParams,
): OperationalFinding | null {
  const signals = params.eventSignals;
  if (!signals || signals.totalDispatches === 0) return null;
  if (signals.dispatchFailureRate <= 0.05) return null;

  const rate       = signals.dispatchFailureRate;
  const confidence = cap(Math.round(rate * 200));
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const evidence: string[] = [
    `${(rate * 100).toFixed(1)}% dispatch incomplete rate ` +
    `(${signals.incompleteDispatches}/${signals.totalDispatches} events)`,
  ];
  if (signals.totalMissingItems > 0)
    evidence.push(`${signals.totalMissingItems} total missing items across dispatch records`);
  if (signals.totalSubstitutions > 0)
    evidence.push(`${signals.totalSubstitutions} substitutions required to cover shortfalls`);

  const severity: OperationalFinding["severity"] = confidence >= 65 ? "HIGH" : "MEDIUM";

  console.log(
    `[MGD][FINDINGS] detectRecurringDispatchFailure → ` +
    `rate=${(rate * 100).toFixed(1)}% confidence=${confidence}`,
  );

  return {
    id:         makeId("Recurring Dispatch Failure Pattern", FINDING_CATEGORIES.DISPATCH_OPERATIONS),
    title:      "Recurring Dispatch Failure Pattern",
    severity,
    category:   FINDING_CATEGORIES.DISPATCH_OPERATIONS,
    department: "Logistics / Dispatch",
    summary:
      `${(rate * 100).toFixed(1)}% of event dispatches recorded as incomplete — ` +
      `exceeding the 5% operational reliability threshold. ` +
      `Recurring incomplete dispatches indicate a systemic failure in pre-event preparation and ` +
      `checklist discipline, not isolated incidents.`,
    signals: evidence,
    operationalImpact:
      "Incomplete dispatches create client-facing failures at events — missing items require on-site " +
      "substitutions or result in service gaps, directly impacting event quality and client satisfaction.",
    confidence,
  };
}

// ── EM 3: Inventory Shortage Exposure ────────────────────────────────────────

function detectInventoryShortageExposure(
  _stats: TxStats,
  _transactions: any[],
  params: FindingsParams,
): OperationalFinding | null {
  const signals = params.eventSignals;
  if (!signals || signals.totalDispatchedItems === 0) return null;
  if (signals.inventoryShortageRate <= 0.03) return null;

  const rate       = signals.inventoryShortageRate;
  const confidence = cap(Math.round(rate * 300));
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const evidence: string[] = [
    `${(rate * 100).toFixed(1)}% inventory shortage rate ` +
    `(${signals.totalMissingItems} missing / ${signals.totalDispatchedItems} dispatched items)`,
  ];
  if (signals.substitutionRate > 0)
    evidence.push(`Substitution rate: ${(signals.substitutionRate * 100).toFixed(1)}%`);

  console.log(
    `[MGD][FINDINGS] detectInventoryShortageExposure → ` +
    `rate=${(rate * 100).toFixed(1)}% confidence=${confidence}`,
  );

  return {
    id:         makeId("Inventory Shortage Exposure", FINDING_CATEGORIES.INVENTORY_VISIBILITY),
    title:      "Inventory Shortage Exposure",
    severity:   "HIGH",
    category:   FINDING_CATEGORIES.INVENTORY_VISIBILITY,
    department: "Warehouse / Event Operations",
    summary:
      `${(rate * 100).toFixed(1)}% of dispatched items recorded as missing — ` +
      `exceeding the 3% operational safe threshold. ` +
      `This level of shortage exposure indicates that inventory commitments are made against ` +
      `unverified stock levels, creating predictable fulfilment failures at event sites.`,
    signals: evidence,
    operationalImpact:
      "Inventory shortages at event sites force last-minute substitutions or client-visible service gaps. " +
      "Repeated shortage patterns erode client confidence and create reputational risk for contracted events.",
    confidence,
  };
}

// ── EM 4: Asset Damage Recovery Leakage ──────────────────────────────────────

function detectAssetDamageRecoveryLeakage(
  _stats: TxStats,
  _transactions: any[],
  params: FindingsParams,
): OperationalFinding | null {
  const signals = params.eventSignals;
  if (!signals || signals.totalDamageEvents === 0) return null;
  if (signals.damageRecoveryRate >= 0.80) return null;

  const recoveryRate = signals.damageRecoveryRate;
  const leakage      = 1 - recoveryRate;
  const confidence   = cap(Math.round(leakage * 120));
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const evidence: string[] = [
    `Damage recovery rate: ${(recoveryRate * 100).toFixed(0)}% (minimum threshold: 80%)`,
    `${signals.totalDamageEvents} damage events, ${signals.recoveredDamageEvents} charges recovered`,
  ];
  if (signals.unrecoveredDamageValue > 0)
    evidence.push(`Estimated unrecovered damage value: RM ${signals.unrecoveredDamageValue.toFixed(0)}`);

  console.log(
    `[MGD][FINDINGS] detectAssetDamageRecoveryLeakage → ` +
    `recoveryRate=${(recoveryRate * 100).toFixed(0)}% confidence=${confidence}`,
  );

  return {
    id:         makeId("Asset Damage Recovery Leakage", FINDING_CATEGORIES.ASSET_MANAGEMENT),
    title:      "Asset Damage Recovery Leakage",
    severity:   "HIGH",
    category:   FINDING_CATEGORIES.ASSET_MANAGEMENT,
    department: "Finance / Asset Management",
    summary:
      `Only ${(recoveryRate * 100).toFixed(0)}% of asset damage charges are being recovered — ` +
      `below the 80% minimum for financial viability. ` +
      `Asset damage at events is occurring and being recorded, but recovery processes are not ` +
      `consistently pursued, resulting in direct write-off of client-chargeable costs.`,
    signals: evidence,
    operationalImpact:
      "Unrecovered damage charges represent direct revenue loss. Repeated non-recovery removes " +
      "the financial deterrent against client mishandling of hired assets, increasing future damage rates.",
    confidence,
  };
}

// ── EM 5: Event Readiness Risk ────────────────────────────────────────────────

function detectEventReadinessRisk(
  _stats: TxStats,
  _transactions: any[],
  params: FindingsParams,
): OperationalFinding | null {
  const signals = params.eventSignals;
  if (!signals) return null;
  if (signals.eventReadinessScore >= 75) return null;

  const score      = signals.eventReadinessScore;
  const confidence = cap(100 - score);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const evidence: string[] = [
    `Event Readiness Score: ${score}/100 (threshold: 75)`,
  ];
  if (signals.dispatchFailureRate > 0)
    evidence.push(`Dispatch failure rate: ${(signals.dispatchFailureRate * 100).toFixed(1)}%`);
  if (signals.inventoryShortageRate > 0)
    evidence.push(`Inventory shortage rate: ${(signals.inventoryShortageRate * 100).toFixed(1)}%`);
  if (signals.deliveryDelayRate > 0)
    evidence.push(`Delivery delay rate: ${(signals.deliveryDelayRate * 100).toFixed(1)}%`);

  console.log(
    `[MGD][FINDINGS] detectEventReadinessRisk → score=${score} confidence=${confidence}`,
  );

  return {
    id:         makeId("Event Readiness Risk", FINDING_CATEGORIES.EVENT_READINESS),
    title:      "Event Readiness Risk",
    severity:   "CRITICAL",
    category:   FINDING_CATEGORIES.EVENT_READINESS,
    department: "Operations / Event Management",
    summary:
      `Overall Event Readiness scored ${score}/100 — below the 75-point threshold for reliable ` +
      `event delivery. This composite indicator reflects simultaneous failures across dispatch ` +
      `completion, inventory availability, and logistics timing. The business is consistently ` +
      `reaching event day with unresolved operational gaps.`,
    signals: evidence,
    operationalImpact:
      "Low event readiness translates directly to client-facing failures. Every event with a readiness " +
      "gap is an event where the client experiences service below the contracted standard, regardless of root cause.",
    confidence,
  };
}

// ── EM 6: Logistics Reliability Degradation ───────────────────────────────────

function detectLogisticsReliabilityDegradation(
  _stats: TxStats,
  _transactions: any[],
  params: FindingsParams,
): OperationalFinding | null {
  const signals = params.eventSignals;
  if (!signals || signals.totalDispatches === 0) return null;
  if (signals.deliveryDelayRate <= 0.10) return null;

  const rate       = signals.deliveryDelayRate;
  const confidence = cap(Math.round(rate * 150));
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const evidence: string[] = [
    `${(rate * 100).toFixed(1)}% of dispatches recorded delayed ` +
    `(${signals.delayedDispatches}/${signals.totalDispatches})`,
  ];
  if (signals.averageDelayMinutes > 0)
    evidence.push(`Average delay: ${signals.averageDelayMinutes.toFixed(0)} minutes per delayed dispatch`);

  const severity: OperationalFinding["severity"] = rate >= 0.25 ? "HIGH" : "MEDIUM";

  console.log(
    `[MGD][FINDINGS] detectLogisticsReliabilityDegradation → ` +
    `rate=${(rate * 100).toFixed(1)}% confidence=${confidence}`,
  );

  return {
    id:         makeId("Logistics Reliability Degradation", FINDING_CATEGORIES.DISPATCH_OPERATIONS),
    title:      "Logistics Reliability Degradation",
    severity,
    category:   FINDING_CATEGORIES.DISPATCH_OPERATIONS,
    department: "Logistics",
    summary:
      `${(rate * 100).toFixed(1)}% of event dispatches recorded with delays — ` +
      `exceeding the 10% threshold for reliable logistics performance. ` +
      (signals.averageDelayMinutes > 0
        ? `Average delay of ${signals.averageDelayMinutes.toFixed(0)} minutes per event. `
        : "") +
      `This indicates that route planning, loading schedules, or last-mile coordination are ` +
      `systematically under-performing.`,
    signals: evidence,
    operationalImpact:
      "Logistics delays create setup-time pressure at event venues, increasing the risk of incomplete " +
      "assembly. Repeated delays damage the business's reputation for reliable event-day delivery.",
    confidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT PACK V2 — EXTENDED DETECTORS
// ─────────────────────────────────────────────────────────────────────────────

// ── Detector: Dispatch Reliability Risk ───────────────────────────────────────
//
// Composite finding that combines dispatch failure rate AND delay rate into a
// single reliability score.  Surfaces when either dimension exceeds threshold,
// giving consultants one clear signal for overall dispatch reliability.
// Evidence extracted from: Dispatch Complete?, Delay Mins, Missing Items,
// Substitutions — matching the EM Pack V2 evidence field specification.

export function detectDispatchReliabilityRisk(
  _stats: TxStats,
  _transactions: any[],
  params: FindingsParams,
): OperationalFinding | null {
  const em = params.eventSignals;
  if (!em) return null;

  const { dispatchFailureRate, dispatchDelayRate, averageDelayMinutes,
          substitutionRate, totalDispatches, incompleteDispatches,
          delayedDispatches } = em;

  if (dispatchFailureRate <= 0.05 && dispatchDelayRate <= 0.10) return null;

  const evidence: string[] = [];

  if (incompleteDispatches > 0) {
    const pct = Math.round(dispatchFailureRate * 100);
    evidence.push(
      `${incompleteDispatches} of ${totalDispatches} dispatches incomplete ` +
      `(Dispatch Complete?: No) — ${pct}% failure rate`,
    );
  }
  if (delayedDispatches > 0) {
    const pct = Math.round(dispatchDelayRate * 100);
    evidence.push(
      `${delayedDispatches} delayed dispatches across ${totalDispatches} events ` +
      `— ${pct}% delay rate`,
    );
  }
  if (averageDelayMinutes > 0) {
    evidence.push(`Average Delay Mins: ${Math.round(averageDelayMinutes)} min per delayed dispatch`);
  }
  if (substitutionRate > 0.05) {
    const pct = Math.round(substitutionRate * 100);
    evidence.push(
      `Substitution rate at ${pct}% — items routinely replaced at dispatch ` +
      `rather than correct items loaded at source`,
    );
  }

  // Rates are 0–1 fractions; scale to 0–100 confidence range
  const confidence = cap(
    Math.round(
      dispatchFailureRate * 45 +
      dispatchDelayRate   * 30 +
      substitutionRate    * 15 +
      (averageDelayMinutes > 30 ? 10 : averageDelayMinutes > 0 ? 5 : 0),
    ),
  );

  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectDispatchReliabilityRisk → confidence=${confidence}`);

  return {
    id:       makeId("Dispatch Reliability Risk", FINDING_CATEGORIES.DISPATCH_OPERATIONS),
    title:    "Dispatch Reliability Risk",
    severity: severityFrom(confidence),
    category: FINDING_CATEGORIES.DISPATCH_OPERATIONS,
    department: "Logistics / Operations",
    summary:
      `Dispatch operations show a systemic reliability gap — ` +
      `${Math.round(dispatchFailureRate * 100)}% incomplete and ` +
      `${Math.round(dispatchDelayRate * 100)}% delayed across ${totalDispatches} events. ` +
      `Substitution patterns and delay minutes confirm that the root issue is ` +
      `pre-dispatch planning and load verification, not execution alone.`,
    signals: evidence,
    operationalImpact:
      "Unreliable dispatch directly degrades the client experience at events. " +
      "Incomplete or delayed deliveries create on-site emergency sourcing, increase labour costs, " +
      "and erode client confidence in the business's operational capability.",
    confidence,
  };
}

// ── Detector: Event Readiness Exposure ────────────────────────────────────────
//
// Fires when a combination of missing items, substitutions, and delivery delays
// reveals that the business is routinely arriving at events under-prepared.
// Draws evidence from: Missing Items, Substitutions, Delay Mins, and the
// composite Event Readiness Score.

export function detectEventReadinessExposure(
  _stats: TxStats,
  _transactions: any[],
  params: FindingsParams,
): OperationalFinding | null {
  const em = params.eventSignals;
  if (!em) return null;

  const { missingItemRate, substitutionRate, eventReadinessScore,
          totalMissingItems, totalSubstitutions, averageDelayMinutes,
          totalDispatches } = em;

  if (eventReadinessScore >= 80) return null;

  const evidence: string[] = [];

  if (totalMissingItems > 0) {
    const pct = Math.round(missingItemRate * 100);
    evidence.push(
      `Missing Items: ${totalMissingItems} items undelivered across ` +
      `${totalDispatches} events (${pct}% missing item rate)`,
    );
  }
  if (totalSubstitutions > 0) {
    const pct = Math.round(substitutionRate * 100);
    evidence.push(
      `Substitutions: ${totalSubstitutions} item substitutions recorded ` +
      `— correct items not available at dispatch time (${pct}% rate)`,
    );
  }
  if (averageDelayMinutes > 0) {
    evidence.push(
      `Average Delay Mins: ${Math.round(averageDelayMinutes)} min — ` +
      `late arrivals compress event setup windows`,
    );
  }
  evidence.push(`Event Readiness Score: ${eventReadinessScore}/100 — below operational threshold`);

  // Confidence: readiness gap + missing item pressure + substitution rate
  const readinessGap  = Math.max(0, 80 - eventReadinessScore);
  const confidence = cap(
    Math.round(readinessGap * 0.8 + missingItemRate * 120 + substitutionRate * 60),
  );

  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectEventReadinessExposure → confidence=${confidence} (readinessScore=${eventReadinessScore})`);

  return {
    id:       makeId("Event Readiness Exposure", FINDING_CATEGORIES.EVENT_READINESS),
    title:    "Event Readiness Exposure",
    severity: severityFrom(confidence),
    category: FINDING_CATEGORIES.EVENT_READINESS,
    department: "Operations / Event Management",
    summary:
      `Evidence from ${totalDispatches} event dispatches shows the business routinely ` +
      `arrives at events with missing items, substitutions, and delivery delays. ` +
      `The Event Readiness Score of ${eventReadinessScore}/100 reflects a structural ` +
      `gap between what clients expect to be delivered and what actually arrives on site.`,
    signals: evidence,
    operationalImpact:
      "Under-readiness at events forces last-minute improvisation, increases on-site resolution labour, " +
      "and risks client dissatisfaction or claims. Repeated exposure damages the brand's reliability " +
      "reputation and can trigger contract penalties or non-renewals.",
    confidence,
  };
}

// ── Detector: Inventory Shortage Pattern ──────────────────────────────────────
//
// Fires when missing items are not isolated incidents but form a recurring
// pattern across multiple events — indicating a structural inventory problem
// rather than one-off errors.  Evidence from Missing Items column specifically.

export function detectInventoryShortagePattern(
  _stats: TxStats,
  _transactions: any[],
  params: FindingsParams,
): OperationalFinding | null {
  const em = params.eventSignals;
  if (!em) return null;

  const { missingItemRate, totalMissingItems, totalDispatches,
          inventoryShortageRate, inventoryVisibilityScore } = em;

  if (totalMissingItems === 0 || (missingItemRate <= 0.02 && totalDispatches < 2)) return null;

  const evidence: string[] = [];

  evidence.push(
    `Missing Items: ${totalMissingItems} total units missing across ` +
    `${totalDispatches} dispatch events`,
  );

  const pct = Math.round(inventoryShortageRate * 100);
  if (pct > 0) {
    evidence.push(
      `Shortage rate: ${pct}% of dispatched items recorded as missing — ` +
      `pattern indicates pre-existing stock shortfalls, not one-off errors`,
    );
  }

  if (inventoryVisibilityScore < 80) {
    evidence.push(
      `Inventory Visibility Score: ${inventoryVisibilityScore}/100 — ` +
      `poor visibility means shortages may only surface at the event, not during loading`,
    );
  }

  if (totalDispatches >= 3 && totalMissingItems > 0) {
    evidence.push(
      `Shortage pattern spans ${totalDispatches} separate dispatch events — ` +
      `consistent occurrence rules out isolated packing errors`,
    );
  }

  // Confidence: shortage rate + volume + multi-event pattern
  const patternBonus = totalDispatches >= 3 ? 15 : totalDispatches >= 2 ? 8 : 0;
  const confidence = cap(
    Math.round(missingItemRate * 250 + (totalMissingItems > 10 ? 20 : totalMissingItems > 3 ? 10 : 5) + patternBonus),
  );

  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectInventoryShortagePattern → confidence=${confidence} (missingItems=${totalMissingItems}, dispatches=${totalDispatches})`);

  return {
    id:       makeId("Inventory Shortage Pattern", FINDING_CATEGORIES.INVENTORY_VISIBILITY),
    title:    "Inventory Shortage Pattern",
    severity: severityFrom(confidence),
    category: FINDING_CATEGORIES.INVENTORY_VISIBILITY,
    department: "Warehouse / Inventory",
    summary:
      `${totalMissingItems} missing items across ${totalDispatches} dispatch events ` +
      `form a recurring shortage pattern that cannot be attributed to isolated packing errors. ` +
      `The pattern suggests that inventory availability is not confirmed against the ` +
      `event manifest before dispatch — creating predictable shortfalls on event day.`,
    signals: evidence,
    operationalImpact:
      "Recurring shortages force on-site improvisation, client substitution agreements, and emergency sourcing. " +
      "Each shortage event carries a client satisfaction cost and an untracked operational labour cost " +
      "to resolve the gap on event day.",
    confidence,
  };
}

// Add new detectors here — each receives (stats, transactions, params).
// Return null to suppress the finding.
// ─────────────────────────────────────────────────────────────────────────────

type DetectorFn = (stats: TxStats, transactions: any[], params: FindingsParams) => OperationalFinding | null;

// ── Detector: Client Concentration (customer frequency data only) ──────────────
//
// Fires when transactions come from a customer_frequency document.
// Analyses client portfolio distribution, repeat engagement, and concentration.

export function detectClientConcentration(
  stats: TxStats,
  transactions: any[],
): OperationalFinding | null {
  if (!stats.isCustomerFrequency) return null;

  const evidence: string[] = [];
  let score = 0;

  // Build client-level event counts from the remarks field
  const clientEvents = new Map<string, number>();
  for (const tx of transactions) {
    const client = String(tx.remarks ?? "").trim();
    if (!client) continue;
    clientEvents.set(client, (clientEvents.get(client) ?? 0) + safeNum(tx.quantity));
  }

  const totalClients = clientEvents.size;
  const totalEvents  = Array.from(clientEvents.values()).reduce((s, v) => s + v, 0);

  if (totalClients === 0) return null;

  const sorted      = Array.from(clientEvents.entries()).sort((a, b) => b[1] - a[1]);
  const top1Count   = sorted[0]?.[1] ?? 0;
  const top5Count   = sorted.slice(0, 5).reduce((s, [, v]) => s + v, 0);
  const top1Pct     = totalEvents > 0 ? Math.round((top1Count / totalEvents) * 100) : 0;
  const top5Pct     = totalEvents > 0 ? Math.round((top5Count / totalEvents) * 100) : 0;

  const repeatClients = sorted.filter(([, v]) => v > 1).length;
  const oneOffClients = totalClients - repeatClients;
  const oneOffPct     = Math.round((oneOffClients / totalClients) * 100);
  const repeatRate    = Math.round((repeatClients / totalClients) * 100);

  // Always emit a base finding for any client portfolio
  score += 25;
  evidence.push(`${totalClients} unique clients served across ${totalEvents} total service events`);

  if (top1Pct >= 15) {
    score += 20;
    evidence.push(`Top client "${sorted[0]?.[0]}" accounts for ${top1Pct}% of all service events — potential single-client dependency`);
  }
  if (totalClients >= 5 && top5Pct >= 50) {
    score += 15;
    evidence.push(`Top 5 clients represent ${top5Pct}% of all events — revenue concentration within a small group`);
  }
  if (oneOffPct >= 50) {
    score += 20;
    evidence.push(`${oneOffClients} clients (${oneOffPct}%) were served only once — high proportion of one-off engagements indicates low repeat retention`);
  } else if (repeatRate >= 30) {
    score += 10;
    evidence.push(`${repeatClients} clients (${repeatRate}%) are repeat customers — healthy base of recurring engagements`);
  }

  const confidence = cap(score);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  console.log(`[MGD][FINDINGS] detectClientConcentration → score=${confidence} clients=${totalClients} events=${totalEvents}`);

  const topList = sorted.slice(0, 3).map(([name, count]) => `${name} (${count})`).join(", ");

  return {
    id:       makeId("Client Portfolio Concentration", FINDING_CATEGORIES.WORKFLOW_SCALABILITY),
    title:    "Client Portfolio Concentration",
    severity: severityFrom(confidence),
    category: FINDING_CATEGORIES.WORKFLOW_SCALABILITY,
    department: "Sales / Client Management",
    summary:
      `Analysis of ${totalClients} clients across ${totalEvents} service engagements reveals concentration ` +
      `patterns in the client portfolio. Most active clients: ${topList}. ` +
      `${oneOffPct}% of clients engaged only once, indicating a high proportion of one-off business. ` +
      `Client concentration and retention strategy warrant review to ensure sustainable, diversified revenue.`,
    signals: evidence,
    operationalImpact:
      "High client concentration creates revenue dependency on a small number of accounts. " +
      "Low repeat engagement rates reduce revenue predictability and increase cost-per-acquisition over time. " +
      "A retention programme targeting high-frequency clients can significantly improve portfolio stability.",
    confidence,
  };
}

// Each entry pairs a stable detector name (used only for trace observability
// — see MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md) with its existing call
// wrapper. The wrappers themselves are unchanged from before this milestone;
// only the surrounding `{ name, run }` shape is new, because these are
// inline arrow functions (needed to normalise mixed 2-/3-arg detector
// signatures) whose own `.name` is not reliably the underlying detector's
// name at runtime.
// ── Industry isolation ────────────────────────────────────────────────────────
// Canonical Event Management value, matching the exact convention already
// used by server/mgd/industry-engine.ts's PACK_REGISTRY key and its own
// `industry.trim().toLowerCase()` normalisation — reused here, not
// reinvented, so both gates agree on what "Event Management" means.
// Fail-closed by construction: undefined/null/empty/unrecognised/future
// industries all normalise to something other than this exact value.
const EVENT_MANAGEMENT_INDUSTRY = "event_management";
function isEventManagementIndustry(industry: string | undefined): boolean {
  return typeof industry === "string" && industry.trim().toLowerCase() === EVENT_MANAGEMENT_INDUSTRY;
}

const GENERIC_DETECTORS: { name: string; run: DetectorFn }[] = [
  { name: "detectManualDependency",               run: (s, t) => detectManualDependency(s, t) },
  { name: "detectInventoryStrain",                run: (s, t) => detectInventoryStrain(s, t) },
  { name: "detectLogisticsPressure",              run: (s, t) => detectLogisticsPressure(s, t) },
  { name: "detectFinancialLeakage",               run: (s, t) => detectFinancialLeakage(s, t) },
  { name: "detectWorkflowScalabilityRisk",        run: (s, t) => detectWorkflowScalabilityRisk(s, t) },
  { name: "detectWarehouseOperations",            run: (s, t) => detectWarehouseOperations(s, t) },
  // ── Customer Frequency Analysis ──────────────────────────────────────────
  { name: "detectClientConcentration",            run: (s, t) => detectClientConcentration(s, t) },
];

const EVENT_MANAGEMENT_DETECTORS: { name: string; run: DetectorFn }[] = [
  // ── Event Management Pack V2 ────────────────────────────────────────────
  { name: "detectEMInventoryVisibilityWeakness",  run: (s, t, p) => detectEMInventoryVisibilityWeakness(s, t, p) },
  { name: "detectRecurringDispatchFailure",       run: (s, t, p) => detectRecurringDispatchFailure(s, t, p) },
  { name: "detectInventoryShortageExposure",      run: (s, t, p) => detectInventoryShortageExposure(s, t, p) },
  { name: "detectAssetDamageRecoveryLeakage",     run: (s, t, p) => detectAssetDamageRecoveryLeakage(s, t, p) },
  { name: "detectEventReadinessRisk",             run: (s, t, p) => detectEventReadinessRisk(s, t, p) },
  { name: "detectLogisticsReliabilityDegradation",run: (s, t, p) => detectLogisticsReliabilityDegradation(s, t, p) },
  // ── Event Management Pack V2 — Extended ─────────────────────────────────
  { name: "detectDispatchReliabilityRisk",        run: (s, t, p) => detectDispatchReliabilityRisk(s, t, p) },
  { name: "detectEventReadinessExposure",         run: (s, t, p) => detectEventReadinessExposure(s, t, p) },
  { name: "detectInventoryShortagePattern",       run: (s, t, p) => detectInventoryShortagePattern(s, t, p) },
];

// Full registry — used only for the event_management branch below. Kept as
// a single concatenation (not a second hand-maintained list) so the two
// group arrays above remain the one place detectors are registered.
const DETECTORS: { name: string; run: DetectorFn }[] = [...GENERIC_DETECTORS, ...EVENT_MANAGEMENT_DETECTORS];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared implementation: runs every registered detector against the built
 * stats, building both the final findings array (identical to this
 * function's historical behaviour) and, alongside it, a per-detector
 * execution ledger for trace-level observability (see pipeline-trace.ts's
 * DetectorExecutionRecord). Extracted so `generateOperationalFindings`
 * (unchanged signature, for every pre-existing caller) and
 * `generateOperationalFindingsWithExecutions` (new, used only by
 * mgd-pipeline.ts) run the exact same detector loop rather than two
 * diverging copies of it.
 */
function runFindingsDetectors(
  params: FindingsParams,
  // Test-only injection seam: defaults to the real, production DETECTORS
  // registry in every real call path (mgd-pipeline.ts never passes this).
  // Exists solely so regression tests can prove FAILED/SUCCESS execution
  // recording against a deliberately-throwing detector without ever
  // modifying a real production detector function — see
  // server/mgd/__tests__/detector-failure-observability.test.ts.
  detectorsOverride?: { name: string; run: DetectorFn }[],
): { findings: OperationalFinding[]; executions: DetectorExecutionRecord[] } {
  const executions: DetectorExecutionRecord[] = [];

  try {
    const { transactions, documents, industry } = params;

    console.log(`[MGD][FINDINGS] generateOperationalFindings — ` +
      `${transactions?.length ?? 0} transactions, ` +
      `${documents?.length ?? 0} documents, ` +
      `industry=${industry ?? "unspecified"}`);

    if (!Array.isArray(transactions) || transactions.length === 0) {
      console.log("[MGD][FINDINGS] No transactions supplied — returning empty findings");
      return { findings: [], executions };
    }

    // ── Pre-processing ───────────────────────────────────────────────────────
    const stats = buildStats(transactions);

    console.log("[MGD][FINDINGS] Stats summary:", {
      total:           stats.total,
      inbound:         stats.inbound,
      outbound:        stats.outbound,
      adjustments:     stats.adjustments,
      uniqueEntities:  stats.uniqueEntities.size,
      uniqueDates:     stats.uniqueDates.size,
      uniqueDocClasses: stats.uniqueDocClasses.size,
      uniqueSources:   stats.uniqueSources.size,
      missingDate:     stats.missingDate,
      missingRef:      stats.missingRef,
      totalQtyIn:      stats.totalQtyIn,
      totalQtyOut:     stats.totalQtyOut,
      hasLogisticsBlock: stats.hasLogisticsBlock,
      hasReturns:      stats.hasReturns,
    });

    // ── Run detectors ────────────────────────────────────────────────────────
    // Fail-closed industry gate: an explicit test override always wins
    // (unchanged test-seam behaviour, see comment above); otherwise the
    // Event Management Pack detectors run only when industry is exactly
    // "event_management" — every other value, including undefined, empty,
    // manufacturing, unknown, or a future industry, runs GENERIC_DETECTORS
    // only.
    const activeDetectors = detectorsOverride ?? (
      isEventManagementIndustry(industry) ? DETECTORS : GENERIC_DETECTORS
    );

    const findings: OperationalFinding[] = [];

    for (const { name: detectorName, run } of activeDetectors) {
      try {
        const finding = run(stats, transactions, params);
        if (finding) {
          findings.push(finding);
          console.log(
            `[MGD][FINDINGS] ✓ "${finding.title}" ` +
            `[${finding.category}] severity=${finding.severity} confidence=${finding.confidence}`,
          );
          executions.push({ detectorName, stage: TRACE_STEPS.FINDINGS_GENERATION, status: "SUCCESS", outputCount: 1 });
        } else {
          // Ran cleanly; returned null — a genuine "found nothing", not a failure.
          executions.push({ detectorName, stage: TRACE_STEPS.FINDINGS_GENERATION, status: "SUCCESS", outputCount: 0 });
        }
      } catch (detectorErr) {
        console.error("[MGD][FINDINGS] Detector error (skipped):", detectorErr);
        executions.push({
          detectorName,
          stage:  TRACE_STEPS.FINDINGS_GENERATION,
          status: "FAILED",
          error:  { name: (detectorErr as Error)?.name ?? "Error", message: (detectorErr as Error)?.message ?? String(detectorErr) },
        });
      }
    }

    // ── Stamp findingPriority + apply event severity multiplier ─────────────
    for (const f of findings) {
      (f as any).findingPriority =
        CATEGORY_PRIORITY[f.category] ?? FindingPriority.GENERIC_OPERATIONAL;

      if (EVENT_WEIGHTED_TITLES.has(f.title)) {
        const raw = f.confidence;
        f.confidence = Math.min(100, Math.round(raw * EVENT_WEIGHT));
        console.log(
          `[MGD][FINDINGS] ⚡ EVENT_WEIGHT ×${EVENT_WEIGHT} "${f.title}" ` +
          `confidence: ${raw} → ${f.confidence}`,
        );
      }
    }

    // ── Event finding override rules ─────────────────────────────────────────
    // Prefer operational consequence over generic symptom.
    {
      const triggered = new Set(findings.map(f => f.title));

      // Titles to remove entirely
      const suppress = new Set<string>();
      // Rule 1: specific dispatch failure overrides generic logistics symptom
      if (triggered.has("Dispatch Reliability Risk")) {
        suppress.add("Logistics Coordination Strain");
      }
      // Rule 3: planning dependency suppresses generic driver dependency
      // (ready for when DispatchPlanningDependency / DriverDependencyRisk detectors are added)
      if (triggered.has("Dispatch Planning Dependency")) {
        suppress.add("Driver Dependency Risk");
      }

      // Apply suppress
      for (let i = findings.length - 1; i >= 0; i--) {
        if (suppress.has(findings[i].title)) {
          console.log(
            `[MGD][FINDINGS] 🚫 SUPPRESS "${findings[i].title}" — overridden by event-specific finding`,
          );
          findings.splice(i, 1);
        }
      }
    }

    // ── Sort by priority DESC, then confidence DESC ───────────────────────────
    findings.sort((a, b) => {
      const pd = (b.findingPriority ?? 0) - (a.findingPriority ?? 0);
      if (pd !== 0) return pd;
      return b.confidence - a.confidence;
    });

    console.log(`[MGD][FINDINGS] Complete — ${findings.length} finding(s) generated`);
    for (const f of findings) {
      console.log(`[MGD][FINDINGS]   • [${f.severity.padEnd(8)}] ${f.title} (${f.confidence}%)`);
    }

    // ── Attach structured evidence from evidence-engine ──────────────────────
    const enrichedFindings = attachEvidenceToFindings({
      findings,
      transactions,
      documents,
    });

    return { findings: enrichedFindings as OperationalFinding[], executions };

  } catch (err) {
    console.error("[MGD][FINDINGS] generateOperationalFindings failed:", err);
    return { findings: [], executions };
  }
}

/**
 * Run all deterministic detectors against the CIL transaction array and
 * document metadata.  Returns findings sorted by confidence descending.
 *
 * Never throws — returns [] if transactions is empty or malformed.
 */
export function generateOperationalFindings(params: FindingsParams): OperationalFinding[] {
  return runFindingsDetectors(params).findings;
}

/**
 * Same as generateOperationalFindings, plus a per-detector execution ledger
 * for PipelineTrace observability (see MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md).
 * Used only by mgd-pipeline.ts — every pre-existing caller of
 * generateOperationalFindings is unaffected.
 */
export function generateOperationalFindingsWithExecutions(
  params: FindingsParams,
  /** Test-only — see runFindingsDetectors. Never passed by mgd-pipeline.ts. */
  __testDetectors?: { name: string; run: DetectorFn }[],
): { findings: OperationalFinding[]; executions: DetectorExecutionRecord[] } {
  return __testDetectors ? runFindingsDetectors(params, __testDetectors) : runFindingsDetectors(params);
}
