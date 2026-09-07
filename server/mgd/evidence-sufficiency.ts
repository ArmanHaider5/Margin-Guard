// ─────────────────────────────────────────────────────────────────────────────
// MGD EVIDENCE SUFFICIENCY
//
// Answers exactly one question, deterministically, from data the pipeline
// already has: "what evidence did this diagnostic actually have available?"
//
// This is NOT a diagnostic-quality or confidence score. 100 transactions from
// one narrow document type is a large amount of data but may still provide
// insufficient coverage for certain conclusions — that judgement belongs to
// each analytical engine (via its own `confidence` fields), not here. This
// module only answers the narrower, prior question of whether there was
// meaningfully more than nothing to analyze in the first place.
//
// Design principles (see docs/MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md for the
// full rationale):
//   • Deterministic — no AI, no heuristics beyond simple counting/thresholds.
//   • Computed once per pipeline run, from `transactions`/`documents`/`metrics`
//     that runMGDPipeline already receives — no new route-level bookkeeping.
//   • Two independent axes, not one blended "quality" score:
//       - transactional/document evidence (drives findings/root
//         causes/recommendations/event diagnostics/health score)
//       - KPI metrics evidence (drives benchmarks only — a structurally
//         separate input stream with its own separate sufficiency question)
//   • Never throws — returns the NONE/no-evidence state on bad input.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How much transactional/document evidence was actually available.
 *
 * NONE       — zero usable transactions. Findings/root causes/recommendations/
 *              event diagnostics/health score cannot be meaningfully computed
 *              and must say so, not default to a confident-sounding value.
 * PARTIAL    — some transactions exist, but either (a) below the minimum
 *              floor considered a real transaction set, or (b) one or more
 *              supplied documents contributed nothing at all (see
 *              `documentStatus`). Analysis proceeds, but narrative must
 *              communicate the limitation rather than assert unqualified
 *              conclusions.
 * SUFFICIENT — enough transactions, from documents that all contributed,
 *              to run the normal diagnostic narrative unqualified.
 */
export type EvidenceLevel = "NONE" | "PARTIAL" | "SUFFICIENT";

/**
 * What happened to the documents that were actually handed to the pipeline
 * (i.e. successfully retrieved — a document that failed retrieval at the
 * route layer never reaches `runMGDPipeline`'s `documents` array at all, and
 * is out of scope for this module; see the ADR's "Scope of 'documents
 * supplied'" section).
 *
 * NONE_SUPPLIED     — no documents were passed to the pipeline at all.
 * ALL_PARSED        — every supplied document contributed at least one
 *                      transaction.
 * PARTIALLY_PARSED  — some supplied documents contributed transactions,
 *                      others did not.
 * ALL_UNPARSEABLE   — documents were supplied but none of them contributed
 *                      any transaction at all.
 */
export type DocumentStatus =
  | "NONE_SUPPLIED"
  | "ALL_PARSED"
  | "PARTIALLY_PARSED"
  | "ALL_UNPARSEABLE";

export interface EvidenceSufficiency {
  level: EvidenceLevel;

  // Transactional/document evidence detail
  transactionCount:     number;
  documentsSupplied:    number;
  documentsParsed:      number;
  documentsUnparseable: number;
  documentStatus:       DocumentStatus;

  // KPI/metrics evidence — a separate stream, feeds benchmarks only.
  metricsSupplied:     number;
  benchmarksAvailable: boolean;

  // Deterministic, human-readable explanation of how `level` was reached —
  // intended for logs/traces/debugging, not for direct display as narrative
  // prose (narrative sections compose their own wording per evidence level).
  reasons: string[];
}

// The minimum transaction count treated as a genuine transaction set rather
// than a handful of stray rows. Deliberately small and conservative — this
// is a provisional threshold, explicitly called out as adjustable in the ADR,
// not a scientifically derived cutoff. Its only job is to stop 1-2 incidental
// rows from reading as "sufficient evidence for a full diagnostic."
const MIN_SUFFICIENT_TRANSACTIONS = 5;

function computeDocumentStatus(
  documentsSupplied: number,
  documentsUnparseable: number,
): DocumentStatus {
  if (documentsSupplied === 0) return "NONE_SUPPLIED";
  if (documentsUnparseable === 0) return "ALL_PARSED";
  if (documentsUnparseable === documentsSupplied) return "ALL_UNPARSEABLE";
  return "PARTIALLY_PARSED";
}

/**
 * Compute evidence sufficiency from the same `transactions`, `documents`, and
 * `metrics` runMGDPipeline already receives. Never throws.
 */
export function computeEvidenceSufficiency(params: {
  transactions: any[];
  documents:    any[];
  metrics:      Record<string, unknown>;
}): EvidenceSufficiency {
  try {
    const transactions = Array.isArray(params.transactions) ? params.transactions.filter(t => t != null) : [];
    const documents     = Array.isArray(params.documents)    ? params.documents.filter(d => d != null)    : [];
    const metrics       = params.metrics && typeof params.metrics === "object" ? params.metrics : {};

    const transactionCount = transactions.length;
    const documentsSupplied = documents.length;

    // A document "contributed" if at least one transaction carries its id —
    // derived entirely from data the pipeline already has (no new
    // route-level bookkeeping; see the module header comment).
    const documentIdsWithTransactions = new Set(
      transactions.map((t: any) => t?.documentId).filter(Boolean),
    );
    const documentsParsed = documents.filter((d: any) => d?.id && documentIdsWithTransactions.has(d.id)).length;
    const documentsUnparseable = Math.max(0, documentsSupplied - documentsParsed);
    const documentStatus = computeDocumentStatus(documentsSupplied, documentsUnparseable);

    const metricsSupplied = Object.values(metrics).filter(
      v => v != null && typeof v === "number" && isFinite(v as number),
    ).length;

    const reasons: string[] = [];
    let level: EvidenceLevel;

    if (transactionCount === 0) {
      level = "NONE";
      if (documentsSupplied === 0) {
        reasons.push("No documents or transactions were supplied.");
      } else {
        reasons.push(
          `${documentsSupplied} document(s) were supplied but none could be parsed into usable transaction data.`,
        );
      }
    } else if (documentsUnparseable > 0 || transactionCount < MIN_SUFFICIENT_TRANSACTIONS) {
      level = "PARTIAL";
      if (transactionCount < MIN_SUFFICIENT_TRANSACTIONS) {
        reasons.push(`Only ${transactionCount} transaction(s) were extracted — below the minimum considered a full evidence set.`);
      }
      if (documentsUnparseable > 0) {
        reasons.push(`${documentsUnparseable} of ${documentsSupplied} supplied document(s) contributed no usable data.`);
      }
    } else {
      level = "SUFFICIENT";
      reasons.push(`${transactionCount} transaction(s) extracted from ${documentsSupplied} document(s), all contributing.`);
    }

    if (metricsSupplied === 0) {
      reasons.push("No KPI metrics were supplied — benchmark comparison is not available.");
    }

    return {
      level,
      transactionCount,
      documentsSupplied,
      documentsParsed,
      documentsUnparseable,
      documentStatus,
      metricsSupplied,
      benchmarksAvailable: metricsSupplied > 0,
      reasons,
    };
  } catch (err) {
    console.error("[MGD][EVIDENCE] computeEvidenceSufficiency failed — treating as NONE:", err);
    return {
      level: "NONE",
      transactionCount: 0,
      documentsSupplied: 0,
      documentsParsed: 0,
      documentsUnparseable: 0,
      documentStatus: "NONE_SUPPLIED",
      metricsSupplied: 0,
      benchmarksAvailable: false,
      reasons: ["Evidence sufficiency could not be determined; treated as no evidence."],
    };
  }
}
