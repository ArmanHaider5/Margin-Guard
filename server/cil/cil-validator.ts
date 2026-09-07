// ─────────────────────────────────────────────────────────────────────────────
// CIL VALIDATOR
//
// Produces a structured quality report for any document that has been run
// through the Core Intelligence Layer pipeline.
//
// validateCIL(documentId) returns a CilValidationReport with:
//   - 7 independent checks
//   - per-check flags (PASS / WARNING / FAIL)
//   - overall healthScore 0–100
//   - overall status: "PASS" | "WARNING" | "FAIL"
//   - 5 random sample debugTrace entries
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "../system/db";
import { cilTransactions } from "@shared/schema";
import type { CilTransaction, CilTxType } from "@shared/schema";
import { eq } from "drizzle-orm";
import { classifyDocument } from "./document-classifier";
import { mapColumns } from "./column-mapper";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckStatus = "PASS" | "WARNING" | "FAIL";

export interface ValidationCheck {
  name:    string;
  status:  CheckStatus;
  score:   number;        // points kept (0 or 20)
  detail:  string;
  data:    Record<string, any>;
}

export interface CilValidationReport {
  documentId:   string;
  fileName:     string;
  documentType: string;
  healthScore:  number;
  status:       "PASS" | "WARNING" | "FAIL";
  issues:       string[];
  summary:      string;
  checks:       ValidationCheck[];
  stats:        Record<string, any>;
  samples:      any[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function sampleN<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const result: T[] = [];
  const used = new Set<number>();
  while (result.length < n) {
    const i = Math.floor(Math.random() * arr.length);
    if (!used.has(i)) { used.add(i); result.push(arr[i]); }
  }
  return result;
}

function toStatus(score: number): CheckStatus {
  return score === 20 ? "PASS" : score === 10 ? "WARNING" : "FAIL";
}

// ── Main validator ────────────────────────────────────────────────────────────

export async function validateCIL(
  documentId: string,
  docMeta: { fileName: string; extractedData: any },
): Promise<CilValidationReport> {

  const extractedData = docMeta.extractedData ?? {};
  const rawText       = (extractedData.rawText as string) ?? "";
  const tables        = (extractedData.tables as any[]) ?? [];
  const allHeaders    = tables.flatMap((t: any) => t.headers as string[]);

  // ── Fetch existing CIL transactions for this document ─────────────────────
  const txRows: CilTransaction[] = await db
    .select()
    .from(cilTransactions)
    .where(eq(cilTransactions.documentId, documentId));

  const totalTx = txRows.length;

  // ── CHECK 1: Document Classification ──────────────────────────────────────
  const classResult = classifyDocument(rawText, allHeaders);
  const confPct     = classResult.confidence;          // already 0–100
  const topKeywords = Object.entries(classResult.scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}(${v})`);

  const lowConfidence = confPct < 60;
  const check1: ValidationCheck = {
    name:   "Document Classification",
    status: lowConfidence ? "WARNING" : "PASS",
    score:  lowConfidence ? 0 : 20,
    detail: lowConfidence
      ? `Low confidence (${confPct}%) — document type uncertain`
      : `Classified as "${classResult.docClass}" with ${confPct}% confidence`,
    data: {
      detected_type:    classResult.docClass,
      confidence_score: confPct,
      matched_keywords: topKeywords,
      all_scores:       classResult.scores,
    },
  };

  // ── CHECK 2: Column Mapping Quality ───────────────────────────────────────
  let mappedCount   = 0;
  let unmappedCols: string[] = [];
  let totalHeaders  = 0;
  let mapCoverage   = 0;

  for (const table of tables) {
    const hdrs: string[] = table.headers ?? [];
    if (hdrs.length === 0) continue;
    const { columnMap, mappingTrace } = mapColumns(hdrs);
    totalHeaders += hdrs.length;
    for (const [header, result] of Object.entries(mappingTrace)) {
      if (result !== null) mappedCount++;
      else unmappedCols.push(header);
    }
  }

  mapCoverage = pct(mappedCount, totalHeaders);
  const poorMapping = totalHeaders > 0 && mapCoverage < 70;

  const check2: ValidationCheck = {
    name:   "Column Mapping Quality",
    status: totalHeaders === 0 ? "WARNING" : poorMapping ? "WARNING" : "PASS",
    score:  totalHeaders === 0 ? 10 : poorMapping ? 0 : 20,
    detail: totalHeaders === 0
      ? "No tabular columns found — document may be text-only"
      : `${mappedCount}/${totalHeaders} columns mapped (${mapCoverage}%)`,
    data: {
      total_columns:     totalHeaders,
      mapped_columns:    mappedCount,
      coverage_pct:      mapCoverage,
      unmapped_columns:  unmappedCols.slice(0, 20),
    },
  };

  // ── CHECK 3: Transaction Extraction ───────────────────────────────────────
  const totalDataRows = tables.reduce((sum: number, t: any) => sum + (t.rows?.length ?? 0), 0);
  const avgTxPerRow   = totalDataRows === 0 ? 0 : parseFloat((totalTx / totalDataRows).toFixed(2));
  const badRatio      = totalDataRows > 0 && (avgTxPerRow < 0.8 || avgTxPerRow > 3);

  const check3: ValidationCheck = {
    name:   "Transaction Extraction",
    status: totalTx === 0 ? "FAIL" : badRatio ? "WARNING" : "PASS",
    score:  totalTx === 0 ? 0 : badRatio ? 10 : 20,
    detail: totalTx === 0
      ? "No transactions extracted from document"
      : `${totalTx} transactions from ${totalDataRows} rows (avg ${avgTxPerRow}/row)`,
    data: {
      total_rows:              totalDataRows,
      total_transactions:      totalTx,
      avg_transactions_per_row: avgTxPerRow,
    },
  };

  // ── CHECK 4: Missing Critical Fields ──────────────────────────────────────
  const missingName  = txRows.filter(tx => !tx.entityName).length;
  const missingType  = txRows.filter(tx => !tx.transactionType).length;
  const missingQtyVal = txRows.filter(tx => tx.quantity === null && tx.value === null).length;

  const missingNamePct  = pct(missingName,   totalTx);
  const missingTypePct  = pct(missingType,   totalTx);
  const missingQVPct    = pct(missingQtyVal, totalTx);

  const hasMissingIssue = totalTx > 0 && (missingNamePct > 20 || missingTypePct > 20 || missingQVPct > 20);

  const check4: ValidationCheck = {
    name:   "Missing Critical Fields",
    status: totalTx === 0 ? "FAIL" : hasMissingIssue ? "WARNING" : "PASS",
    score:  totalTx === 0 ? 0 : hasMissingIssue ? 0 : 20,
    detail: totalTx === 0
      ? "No transactions to inspect"
      : hasMissingIssue
        ? `Missing entity_name: ${missingNamePct}%, qty/value: ${missingQVPct}%`
        : `Field coverage is acceptable`,
    data: {
      missing_entity_name_pct:  missingNamePct,
      missing_tx_type_pct:      missingTypePct,
      missing_qty_or_value_pct: missingQVPct,
    },
  };

  // ── CHECK 5: Transaction Type Distribution ─────────────────────────────────
  const txTypeCounts: Record<string, number> = {
    outgoing: 0, incoming: 0, sale: 0, refund: 0, loss: 0, adjustment: 0,
  };
  for (const tx of txRows) {
    const t = tx.transactionType as CilTxType;
    if (t in txTypeCounts) txTypeCounts[t]++;
    else txTypeCounts[t] = (txTypeCounts[t] ?? 0) + 1;
  }

  const nonZeroTypes = Object.values(txTypeCounts).filter(v => v > 0).length;
  const singleType   = totalTx > 5 && nonZeroTypes <= 1;

  const check5: ValidationCheck = {
    name:   "Transaction Type Distribution",
    status: totalTx === 0 ? "FAIL" : singleType ? "WARNING" : "PASS",
    score:  totalTx === 0 ? 0 : singleType ? 10 : 20,
    detail: totalTx === 0
      ? "No transactions to inspect"
      : singleType
        ? `Only 1 transaction type detected — may indicate a parsing issue`
        : `${nonZeroTypes} transaction types present`,
    data: { type_distribution: txTypeCounts, distinct_types: nonZeroTypes },
  };

  // ── CHECK 6: Reference Linking ─────────────────────────────────────────────
  const withRef   = txRows.filter(tx => !!tx.referenceId).length;
  const refPct    = pct(withRef, totalTx);
  const poorRef   = totalTx > 0 && refPct < 50;

  const check6: ValidationCheck = {
    name:   "Reference Linking",
    status: totalTx === 0 ? "FAIL" : poorRef ? "WARNING" : "PASS",
    score:  totalTx === 0 ? 0 : poorRef ? 0 : 20,
    detail: totalTx === 0
      ? "No transactions to inspect"
      : `${withRef}/${totalTx} transactions have a reference ID (${refPct}%)`,
    data: {
      with_reference_id: withRef,
      total_transactions: totalTx,
      reference_pct: refPct,
    },
  };

  // ── CHECK 7: Sample Debug Output ──────────────────────────────────────────
  // (not scored — informational only)
  const samples = sampleN(txRows, 5).map(tx => ({
    id:             tx.id,
    entityName:     tx.entityName,
    transactionType: tx.transactionType,
    quantity:       tx.quantity,
    value:          tx.value,
    date:           tx.date,
    referenceId:    tx.referenceId,
    documentClassification: tx.documentClassification,
    debugTrace:     tx.debugTrace,
  }));

  // ── Health Score ───────────────────────────────────────────────────────────
  const checks = [check1, check2, check3, check4, check5, check6];
  const healthScore = checks.reduce((sum, c) => sum + c.score, 0); // max 120 → scale to 100
  const scaledHealth = Math.min(100, Math.round((healthScore / 120) * 100));

  const issues = checks
    .filter(c => c.status !== "PASS")
    .map(c => `[${c.status}] ${c.name}: ${c.detail}`);

  const overallStatus: "PASS" | "WARNING" | "FAIL" =
    checks.some(c => c.status === "FAIL")    ? "FAIL"    :
    checks.some(c => c.status === "WARNING") ? "WARNING" : "PASS";

  const summaryParts: string[] = [
    `Classified as "${classResult.docClass}" (${confPct}% confidence).`,
    totalTx > 0
      ? `${totalTx} transactions extracted from ${totalDataRows} rows.`
      : "No transactions extracted.",
    issues.length === 0
      ? "All checks passed."
      : `${issues.length} issue(s) flagged.`,
  ];

  return {
    documentId,
    fileName:     docMeta.fileName,
    documentType: classResult.docClass,
    healthScore:  scaledHealth,
    status:       overallStatus,
    issues,
    summary:      summaryParts.join(" "),
    checks,
    stats: {
      totalTransactions:    totalTx,
      totalRows:            totalDataRows,
      avgTxPerRow,
      mapCoverage,
      refPct,
      typeDistribution:     txTypeCounts,
    },
    samples,
  };
}
