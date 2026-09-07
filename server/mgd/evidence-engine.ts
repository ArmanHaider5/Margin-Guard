// ─────────────────────────────────────────────────────────────────────────────
// MGD EVIDENCE ENGINE
//
// Deterministic, pattern-based evidence builder for MGD operational findings.
// Detects signals in transaction and document arrays and attaches structured
// FindingEvidence objects to findings by category.
//
// Design principles:
//   • No AI/LLM — pure signal detection against known patterns.
//   • Never throws — top-level try/catch + per-detector try/catch.
//   • Empty array on any failure path.
//   • Confidence range: 50–95 (never 0 or 100 — always a measured estimate).
//   • Identical observation strings deduplicated before return.
//   • attachEvidenceToFindings() spreads existing finding fields — never mutates.
//   • [MGD][EVIDENCE] prefix on all log lines.
// ─────────────────────────────────────────────────────────────────────────────

import { FINDING_CATEGORIES } from "./finding-categories";

// ── Exported interfaces ───────────────────────────────────────────────────────

export interface FindingEvidence {
  documentId?:   string;
  documentName?: string;
  observation:   string;
  source?:       string;
  confidence?:   number;
}

export interface EvidenceBundle {
  findingCategory: string;
  evidences:       FindingEvidence[];
}

// ── Internal types ────────────────────────────────────────────────────────────

interface NormTx {
  type:        string;   // inbound | outbound | adjustment | balance | return | unknown
  description: string;
  source:      string;
  ref:         string;
  qty:         number;
  value:       number;
  entityName:  string;
  hasDebugBlock: boolean;
  blockType:   string;
}

interface NormDoc {
  id:             string;
  name:           string;
  text:           string;
  classification: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONF = {
  HIGH:   88,
  MED_HI: 80,
  MED:    72,
  MED_LO: 64,
  LOW:    55,
} as const;

// Keywords per category used for observation generation
const MANUAL_KEYWORDS    = ["manual", "handwrit", "paper", "excel", "spreadsheet", "physical count", "hand-keyed", "typed", "fax"];
const LOGISTICS_KEYWORDS = ["dispatch", "delivery", "driver", "vehicle", "truck", "lorry", "logistics", "courier", "route", "shipment", "cargo"];
const RECONCIL_KEYWORDS  = ["reconcil", "recon", "write-off", "writeoff", "expired", "adjust", "correction", "variance", "discrepancy", "stocktake", "stock take"];

// ── Normalisation helpers ──────────────────────────────────────────────────────

function safeStr(v: unknown): string {
  return (v == null ? "" : String(v)).trim();
}

function safeNum(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function normaliseTx(tx: any): NormTx {
  const raw  = `${safeStr(tx.description)} ${safeStr(tx.rawText)} ${safeStr(tx.remarks)}`.toLowerCase();
  const trace = tx.debugTrace ?? {};
  return {
    type:           safeStr(tx.transactionType ?? tx.type).toLowerCase(),
    description:    raw,
    source:         safeStr(tx.source ?? tx.sourceFile).toLowerCase(),
    ref:            safeStr(tx.referenceId ?? tx.ref),
    qty:            safeNum(tx.quantity ?? tx.qty),
    value:          safeNum(tx.value ?? tx.amount),
    entityName:     safeStr(tx.entityName ?? tx.entity ?? "").toLowerCase(),
    hasDebugBlock:  !!trace.blockType,
    blockType:      safeStr(trace.blockType).toLowerCase(),
  };
}

function normaliseDoc(doc: any, idx: number): NormDoc {
  return {
    id:             safeStr(doc.id ?? doc.documentId ?? `doc-${idx}`),
    name:           safeStr(doc.name ?? doc.fileName ?? doc.documentName ?? `Document ${idx + 1}`),
    text:           safeStr(doc.text ?? doc.content ?? doc.rawText ?? doc.extractedText ?? "").toLowerCase(),
    classification: safeStr(doc.documentClassification ?? doc.classification ?? "").toLowerCase(),
  };
}

/** Deduplicate an array of evidence by observation string. */
function dedup(evidences: FindingEvidence[]): FindingEvidence[] {
  const seen = new Set<string>();
  return evidences.filter(e => {
    const key = e.observation.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Clamp a confidence value to the 50–95 range. */
function clamp(n: number): number {
  return Math.min(95, Math.max(50, Math.round(n)));
}

/** Count how many descriptions contain at least one keyword from the list. */
function countKeywordHits(txs: NormTx[], keywords: string[]): number {
  return txs.filter(tx => keywords.some(kw => tx.description.includes(kw))).length;
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

// ── Per-category detectors ─────────────────────────────────────────────────────

/**
 * inventory_visibility — detects imbalances in inventory movement coverage,
 * missing balance records, and outbound-heavy transaction patterns.
 */
function detectInventoryVisibility(txs: NormTx[], docs: NormDoc[]): FindingEvidence[] {
  const evidences: FindingEvidence[] = [];
  try {
    const total    = txs.length;
    const inbound  = txs.filter(t => t.type === "inbound").length;
    const outbound = txs.filter(t => t.type === "outbound").length;
    const balance  = txs.filter(t => t.type === "balance").length;
    const adj      = txs.filter(t => t.type === "adjustment").length;
    const missingRef = txs.filter(t => !t.ref).length;
    const missingQty = txs.filter(t => t.qty === 0).length;

    // Detector 1: outbound-heavy movement
    if (total > 0 && outbound > inbound && outbound >= 2) {
      const ratio = pct(outbound, total);
      evidences.push({
        observation: `Repeated outbound inventory movements were detected without corresponding balance verification records. ${outbound} outbound transactions represent ${ratio}% of total activity with only ${balance} balance record${balance !== 1 ? "s" : ""} present.`,
        source:      "inventory_movements",
        confidence:  clamp(60 + Math.min(35, outbound * 3)),
      });
    }

    // Detector 2: missing balance records
    if (total >= 4 && balance === 0) {
      evidences.push({
        observation: `No inventory balance verification records were detected across ${total} transactions. Inventory position cannot be confirmed at any point in the review period.`,
        source:      "inventory_movements",
        confidence:  clamp(CONF.MED_HI),
      });
    }

    // Detector 3: missing quantity data
    if (missingQty > 0 && total > 0 && pct(missingQty, total) >= 20) {
      evidences.push({
        observation: `${missingQty} of ${total} transactions (${pct(missingQty, total)}%) are missing quantity data, preventing accurate inventory balance calculation.`,
        source:      "inventory_movements",
        confidence:  clamp(CONF.MED),
      });
    }

    // Detector 4: missing reference IDs on movement transactions
    const moveTxs = txs.filter(t => t.type === "inbound" || t.type === "outbound");
    const missingMovRef = moveTxs.filter(t => !t.ref).length;
    if (missingMovRef > 0 && moveTxs.length > 0 && pct(missingMovRef, moveTxs.length) >= 30) {
      evidences.push({
        observation: `${missingMovRef} inventory movement transactions (${pct(missingMovRef, moveTxs.length)}%) lack reference identifiers, preventing cross-referencing with procurement or dispatch records.`,
        source:      "inventory_movements",
        confidence:  clamp(CONF.MED_LO),
      });
    }

    // Detector 5: document-level — inventory movement documents without balance docs
    try {
      const invDocs = docs.filter(d =>
        d.classification.includes("inventory") ||
        d.name.toLowerCase().includes("inventory") ||
        d.name.toLowerCase().includes("stock") ||
        d.text.includes("inventory") || d.text.includes("stock movement")
      );
      const balDocs = docs.filter(d =>
        d.text.includes("balance") || d.text.includes("closing stock") ||
        d.classification.includes("balance")
      );
      if (invDocs.length > 0 && balDocs.length === 0) {
        evidences.push({
          documentId:   invDocs[0].id,
          documentName: invDocs[0].name,
          observation:  `Inventory movement document${invDocs.length > 1 ? "s" : ""} detected (${invDocs.map(d => d.name).join(", ")}) with no corresponding closing balance or stocktake document. Inventory completeness cannot be verified.`,
          source:       invDocs[0].classification || "inventory_documents",
          confidence:   clamp(CONF.MED_HI),
        });
      }
    } catch { /* document detector non-fatal */ }

  } catch (err) {
    console.warn("[MGD][EVIDENCE] inventory_visibility detector error:", err);
  }
  return evidences;
}

/**
 * logistics_coordination — detects logistics block presence, driver/vehicle
 * references, and coordination fragmentation signals.
 */
function detectLogisticsCoordination(txs: NormTx[], docs: NormDoc[]): FindingEvidence[] {
  const evidences: FindingEvidence[] = [];
  try {
    const total = txs.length;
    const logisticsSrc   = txs.filter(t => t.source.includes("logistic") || t.source.includes("dispatch") || t.source.includes("transport"));
    const logisticsDesc  = txs.filter(t => LOGISTICS_KEYWORDS.some(kw => t.description.includes(kw)));
    const hasDebugBlock  = txs.some(t => t.hasDebugBlock && t.blockType === "logistics_schedule");
    const driverRefs     = txs.filter(t => t.description.includes("driver") || t.description.includes("vehicle") || t.description.includes("truck") || t.description.includes("lorry"));
    const missingRef     = logisticsSrc.filter(t => !t.ref).length;

    // Detector 1: logistics block present
    if (hasDebugBlock) {
      evidences.push({
        observation: "Structured logistics scheduling blocks were detected in transaction data, indicating formalised delivery scheduling activity. Coordination gaps within these blocks may indicate route or capacity planning weaknesses.",
        source:      "logistics_schedule",
        confidence:  clamp(CONF.HIGH),
      });
    }

    // Detector 2: multiple logistics sources
    const uniqueLogSources = new Set(logisticsSrc.map(t => t.source));
    if (uniqueLogSources.size >= 2) {
      evidences.push({
        observation: `Logistics activity was recorded across ${uniqueLogSources.size} distinct source systems (${Array.from(uniqueLogSources).join(", ")}), indicating potential coordination fragmentation between logistics units.`,
        source:      FINDING_CATEGORIES.LOGISTICS_COORDINATION,
        confidence:  clamp(CONF.MED_HI),
      });
    } else if (logisticsSrc.length >= 2) {
      evidences.push({
        observation: `${logisticsSrc.length} logistics dispatch records were detected in the transaction dataset, representing ${pct(logisticsSrc.length, total)}% of total operational activity.`,
        source:      FINDING_CATEGORIES.LOGISTICS_COORDINATION,
        confidence:  clamp(CONF.MED),
      });
    }

    // Detector 3: driver/vehicle assignment references
    if (driverRefs.length > 0) {
      evidences.push({
        observation: `Driver or vehicle assignment references were identified in ${driverRefs.length} transaction description${driverRefs.length !== 1 ? "s" : ""}, suggesting manual logistics assignment practices without automated route management.`,
        source:      "logistics_assignments",
        confidence:  clamp(CONF.MED_HI),
      });
    }

    // Detector 4: logistics keyword matches without source classification
    const unclassifiedLogistics = logisticsDesc.filter(t => !logisticsSrc.includes(t));
    if (unclassifiedLogistics.length > 0) {
      evidences.push({
        observation: `${unclassifiedLogistics.length} transaction${unclassifiedLogistics.length !== 1 ? "s" : ""} contain logistics activity keywords but are not classified under a logistics source — suggesting shadow logistics activity outside formal tracking systems.`,
        source:      FINDING_CATEGORIES.LOGISTICS_COORDINATION,
        confidence:  clamp(CONF.MED_LO),
      });
    }

    // Detector 5: missing reference IDs on logistics transactions
    if (missingRef > 0 && logisticsSrc.length > 0) {
      evidences.push({
        observation: `${missingRef} of ${logisticsSrc.length} logistics transactions (${pct(missingRef, logisticsSrc.length)}%) are missing reference identifiers, reducing end-to-end delivery traceability.`,
        source:      "logistics_traceability",
        confidence:  clamp(CONF.MED_LO),
      });
    }

    // Detector 6: document-level — logistics schedules without delivery confirmations
    try {
      const schedDocs   = docs.filter(d => d.text.includes("schedule") || d.text.includes("route") || d.name.toLowerCase().includes("schedule"));
      const confirmDocs = docs.filter(d => d.text.includes("proof of delivery") || d.text.includes("pod") || d.text.includes("delivery confirm") || d.name.toLowerCase().includes("delivery"));
      if (schedDocs.length > 0 && confirmDocs.length === 0) {
        evidences.push({
          documentId:   schedDocs[0].id,
          documentName: schedDocs[0].name,
          observation:  `Logistics schedule document detected (${schedDocs[0].name}) with no corresponding proof-of-delivery or delivery confirmation document. Delivery completion cannot be verified.`,
          source:       "logistics_documents",
          confidence:   clamp(CONF.MED),
        });
      }
    } catch { /* document detector non-fatal */ }

  } catch (err) {
    console.warn("[MGD][EVIDENCE] logistics_coordination detector error:", err);
  }
  return evidences;
}

/**
 * manpower_dependency — detects entity concentration, manual workflow indicators,
 * and single-point-of-failure signals in personnel distribution.
 */
function detectManpowerDependency(txs: NormTx[], docs: NormDoc[]): FindingEvidence[] {
  const evidences: FindingEvidence[] = [];
  try {
    const total = txs.length;
    const manualHits    = countKeywordHits(txs, MANUAL_KEYWORDS);
    const namedEntities = txs.filter(t => t.entityName && t.entityName !== "unknown" && t.entityName !== "");

    // Build entity → transaction type mapping
    const entityMap = new Map<string, Set<string>>();
    for (const tx of txs) {
      if (!tx.entityName || tx.entityName === "unknown") continue;
      if (!entityMap.has(tx.entityName)) entityMap.set(tx.entityName, new Set());
      entityMap.get(tx.entityName)!.add(tx.type);
    }

    // Detector 1: manual workflow keywords in descriptions
    if (manualHits > 0 && total > 0) {
      const pctManual = pct(manualHits, total);
      evidences.push({
        observation: `Manual workflow indicators were detected in ${manualHits} transaction description${manualHits !== 1 ? "s" : ""} (${pctManual}% of records). Keywords associated with paper-based or spreadsheet-driven processes suggest high manual execution dependency.`,
        source:      "transaction_descriptions",
        confidence:  clamp(55 + Math.min(40, pctManual * 0.8)),
      });
    }

    // Detector 2: entity concentration — one entity handles most transactions
    if (namedEntities.length > 0 && entityMap.size > 0) {
      const sortedEntities = Array.from(entityMap.entries())
        .map(([name, types]) => ({ name, txCount: txs.filter(t => t.entityName === name).length, types }))
        .sort((a, b) => b.txCount - a.txCount);

      const topEntity = sortedEntities[0];
      const topPct    = pct(topEntity.txCount, total);

      if (topPct >= 40 && topEntity.txCount >= 2) {
        evidences.push({
          observation: `Entity "${topEntity.name}" is referenced in ${topEntity.txCount} of ${total} transactions (${topPct}%), indicating high operational concentration in a single individual or unit.`,
          source:      "entity_distribution",
          confidence:  clamp(60 + Math.min(35, topPct * 0.5)),
        });
      }
    }

    // Detector 3: single entity handling both inbound and outbound (concentration risk)
    for (const [name, types] of entityMap.entries()) {
      if (types.has("inbound") && types.has("outbound")) {
        const entityTxCount = txs.filter(t => t.entityName === name).length;
        evidences.push({
          observation: `Entity "${name}" is responsible for both inbound and outbound operations (${entityTxCount} total transactions). This dual-role concentration creates a single-point-of-failure risk for inventory handoff integrity.`,
          source:      "entity_distribution",
          confidence:  clamp(CONF.MED_HI),
        });
        break; // Report the first occurrence only
      }
    }

    // Detector 4: low entity diversity — few unique operators across many transactions
    if (entityMap.size > 0 && entityMap.size <= 2 && total >= 6) {
      evidences.push({
        observation: `Only ${entityMap.size} unique operator${entityMap.size !== 1 ? "s" : ""} identified across ${total} transactions. Low workforce distribution amplifies key-person dependency and continuity risk.`,
        source:      "entity_distribution",
        confidence:  clamp(CONF.MED),
      });
    }

    // Detector 5: document-level — manual indicators in document content
    try {
      const manualDocs = docs.filter(d =>
        MANUAL_KEYWORDS.some(kw => d.text.includes(kw)) ||
        d.name.toLowerCase().includes("excel") ||
        d.name.toLowerCase().includes("spreadsheet")
      );
      if (manualDocs.length > 0) {
        evidences.push({
          documentId:   manualDocs[0].id,
          documentName: manualDocs[0].name,
          observation:  `Document "${manualDocs[0].name}" contains indicators of manual or spreadsheet-driven workflows. Reliance on non-automated document processes contributes to manpower dependency and error exposure.`,
          source:       "document_analysis",
          confidence:   clamp(CONF.MED_LO),
        });
      }
    } catch { /* document detector non-fatal */ }

  } catch (err) {
    console.warn("[MGD][EVIDENCE] manpower_dependency detector error:", err);
  }
  return evidences;
}

/**
 * warehouse_operations — detects reconciliation activity, write-offs,
 * adjustment patterns, and inbound/outbound imbalances.
 */
function detectWarehouseOperations(txs: NormTx[], docs: NormDoc[]): FindingEvidence[] {
  const evidences: FindingEvidence[] = [];
  try {
    const total      = txs.length;
    const adjustments = txs.filter(t => t.type === "adjustment");
    const inbound    = txs.filter(t => t.type === "inbound");
    const outbound   = txs.filter(t => t.type === "outbound");
    const missingRef = txs.filter(t => !t.ref).length;

    // Detector 1: adjustment transactions present
    if (adjustments.length > 0) {
      const writeoffs = adjustments.filter(t =>
        RECONCIL_KEYWORDS.some(kw => t.description.includes(kw)) ||
        t.description.includes("write") || t.description.includes("expired")
      );
      if (writeoffs.length > 0) {
        evidences.push({
          observation: `${writeoffs.length} adjustment transaction${writeoffs.length !== 1 ? "s" : ""} contain write-off or expired-materials references, indicating uncontrolled inventory shrinkage with active stock disposal activity.`,
          source:      "inventory_adjustments",
          confidence:  clamp(CONF.HIGH),
        });
      } else {
        evidences.push({
          observation: `${adjustments.length} inventory adjustment transaction${adjustments.length !== 1 ? "s" : ""} recorded (${pct(adjustments.length, total)}% of total activity), indicating active reconciliation work to correct discrepancies between physical and system stock positions.`,
          source:      "inventory_adjustments",
          confidence:  clamp(CONF.MED_HI),
        });
      }
    }

    // Detector 2: reconciliation activity in descriptions
    const reconHits = countKeywordHits(txs, RECONCIL_KEYWORDS);
    if (reconHits > 0 && adjustments.length === 0) {
      // Reconciliation language present outside formal adjustment types
      evidences.push({
        observation: `Reconciliation or discrepancy language was detected in ${reconHits} transaction description${reconHits !== 1 ? "s" : ""} outside formal adjustment records, suggesting unlogged stock correction activity.`,
        source:      "transaction_descriptions",
        confidence:  clamp(CONF.MED),
      });
    }

    // Detector 3: quantity imbalance between inbound and outbound
    const qtyIn  = inbound.reduce((s, t)  => s + t.qty, 0);
    const qtyOut = outbound.reduce((s, t) => s + t.qty, 0);
    if (qtyIn > 0 && qtyOut > 0) {
      const imbalance    = Math.abs(qtyIn - qtyOut);
      const imbalancePct = pct(imbalance, Math.max(qtyIn, qtyOut));
      if (imbalancePct >= 10) {
        evidences.push({
          observation: `Inbound quantity total (${Math.round(qtyIn)} units) differs from outbound total (${Math.round(qtyOut)} units) by ${imbalancePct}%, indicating an unresolved inventory imbalance across the review period.`,
          source:      "quantity_reconciliation",
          confidence:  clamp(60 + Math.min(35, imbalancePct * 0.7)),
        });
      }
    }

    // Detector 4: missing reference IDs — warehouse traceability
    if (missingRef > 0 && total > 0 && pct(missingRef, total) >= 25) {
      evidences.push({
        observation: `${missingRef} of ${total} warehouse transactions (${pct(missingRef, total)}%) are missing reference identifiers. Without reference traceability, stock discrepancies cannot be attributed or audited.`,
        source:      "warehouse_traceability",
        confidence:  clamp(CONF.MED_LO),
      });
    }

    // Detector 5: adjustment value is negative (value erosion)
    const negAdj = adjustments.filter(t => t.value < 0);
    if (negAdj.length > 0) {
      const totalAdj = negAdj.reduce((s, t) => s + Math.abs(t.value), 0);
      evidences.push({
        observation: `${negAdj.length} negative-value adjustment${negAdj.length !== 1 ? "s" : ""} detected with a combined value impact of ${totalAdj.toLocaleString("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 })}. Negative adjustments represent direct inventory value erosion.`,
        source:      "inventory_adjustments",
        confidence:  clamp(CONF.MED_HI),
      });
    }

    // Detector 6: document-level — adjustment/reconciliation documents
    try {
      const reconDocs = docs.filter(d =>
        RECONCIL_KEYWORDS.some(kw => d.text.includes(kw)) ||
        d.name.toLowerCase().includes("reconcil") ||
        d.name.toLowerCase().includes("adjustment") ||
        d.classification.includes("adjustment")
      );
      if (reconDocs.length > 0) {
        evidences.push({
          documentId:   reconDocs[0].id,
          documentName: reconDocs[0].name,
          observation:  `Reconciliation or adjustment document detected (${reconDocs[0].name}). The presence of correction documentation indicates recurring discrepancies that require manual intervention to resolve.`,
          source:       "reconciliation_documents",
          confidence:   clamp(CONF.MED),
        });
      }
    } catch { /* document detector non-fatal */ }

  } catch (err) {
    console.warn("[MGD][EVIDENCE] warehouse_operations detector error:", err);
  }
  return evidences;
}

// ── Category router ────────────────────────────────────────────────────────────

// Keys are computed from the one authoritative Finding Category vocabulary
// (findings-engine.ts's FINDING_CATEGORIES) rather than freehand string
// literals. Only 4 of the 9 categories have a detector here — that gap is
// pre-existing and unchanged; see docs/MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md.
const DETECTORS: Record<string, (txs: NormTx[], docs: NormDoc[]) => FindingEvidence[]> = {
  [FINDING_CATEGORIES.INVENTORY_VISIBILITY]:   detectInventoryVisibility,
  [FINDING_CATEGORIES.LOGISTICS_COORDINATION]: detectLogisticsCoordination,
  [FINDING_CATEGORIES.MANPOWER_DEPENDENCY]:    detectManpowerDependency,
  [FINDING_CATEGORIES.WAREHOUSE_OPERATIONS]:   detectWarehouseOperations,
};

// ── Exported functions ────────────────────────────────────────────────────────

/**
 * Build FindingEvidence[] for a given finding category.
 * Returns empty array on any failure.
 */
export function buildFindingEvidence(params: {
  findingCategory: string;
  transactions?:   any[];
  documents?:      any[];
}): FindingEvidence[] {
  try {
    const { findingCategory, transactions = [], documents = [] } = params;

    const category = safeStr(findingCategory).toLowerCase();
    const detector = DETECTORS[category];

    if (!detector) {
      console.log(`[MGD][EVIDENCE] buildFindingEvidence — no detector for category "${category}", returning []`);
      return [];
    }

    const txs  = (Array.isArray(transactions) ? transactions : []).filter(Boolean).map(normaliseTx);
    const docs = (Array.isArray(documents)    ? documents    : []).filter(Boolean).map(normaliseDoc);

    const raw       = detector(txs, docs);
    const deduped   = dedup(raw.filter(e => e && e.observation && e.observation.length > 0));

    console.log(
      `[MGD][EVIDENCE] buildFindingEvidence — category="${category}" ` +
      `raw=${raw.length} deduped=${deduped.length} ` +
      `txs=${txs.length} docs=${docs.length}`,
    );

    return deduped;
  } catch (err) {
    console.error("[MGD][EVIDENCE] buildFindingEvidence — top-level error:", err);
    return [];
  }
}

/**
 * Attach evidence to each finding in the findings array, keyed by finding.category.
 * Returns a new array of findings — each with an injected `evidence` field.
 * Existing finding fields are preserved unchanged.
 * Returns empty array on any failure.
 */
export function attachEvidenceToFindings(params: {
  findings:      any[];
  transactions?: any[];
  documents?:    any[];
}): any[] {
  try {
    const { findings, transactions = [], documents = [] } = params;

    if (!Array.isArray(findings) || findings.length === 0) return [];

    // Pre-normalise transactions and documents once — shared across all categories
    const txs  = (Array.isArray(transactions) ? transactions : []).filter(Boolean).map(normaliseTx);
    const docs = (Array.isArray(documents)    ? documents    : []).filter(Boolean).map(normaliseDoc);

    // Cache evidence by category to avoid re-running detectors for shared categories
    const evidenceCache = new Map<string, FindingEvidence[]>();

    const result = findings.map((finding, idx) => {
      try {
        if (!finding || typeof finding !== "object") return finding;

        const category = safeStr(finding.category ?? finding.findingCategory ?? "").toLowerCase();
        if (!category) return { ...finding };

        if (!evidenceCache.has(category)) {
          const detector = DETECTORS[category];
          if (detector) {
            const raw     = detector(txs, docs);
            const deduped = dedup(raw.filter(e => e && e.observation && e.observation.length > 0));
            evidenceCache.set(category, deduped);
          } else {
            evidenceCache.set(category, []);
          }
        }

        const evidence = evidenceCache.get(category) ?? [];
        return { ...finding, evidence };
      } catch (findingErr) {
        console.warn(`[MGD][EVIDENCE] attachEvidenceToFindings — error on finding index ${idx}:`, findingErr);
        return finding; // return unmodified on per-finding error
      }
    });

    const totalEvidence = result.reduce((s, f) => s + (f?.evidence?.length ?? 0), 0);
    console.log(
      `[MGD][EVIDENCE] attachEvidenceToFindings — ` +
      `findings=${findings.length} enriched=${result.filter(f => (f?.evidence?.length ?? 0) > 0).length} ` +
      `totalEvidence=${totalEvidence} txs=${txs.length} docs=${docs.length}`,
    );

    return result;
  } catch (err) {
    console.error("[MGD][EVIDENCE] attachEvidenceToFindings — top-level error:", err);
    return [];
  }
}
