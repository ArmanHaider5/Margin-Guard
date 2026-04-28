// ─────────────────────────────────────────────────────────────────────────────
// CORE INTELLIGENCE LAYER — MAIN PIPELINE
//
// Orchestrates: classify → map columns → parse rows → store transactions
//
// Called AFTER the existing document parser has run. It receives
// ExtractedDocumentData and produces CilTransaction records in the DB.
//
// Rules:
//   - Does NOT modify any existing data (documents, analyses)
//   - Tolerant to missing fields — partial rows still produce output
//   - Works for any business document format
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "../system/db";
import { cilTransactions } from "@shared/schema";
import type { ExtractedDocumentData } from "@shared/schema";
import { classifyDocument } from "./document-classifier";
import { mapColumns } from "./column-mapper";
import { parseRow } from "./row-parser";

export interface CilPipelineResult {
  documentId:     string;
  clientId:       string;
  sourceFile:     string;
  docClass:       string;
  classifierScore: number;
  totalRows:      number;
  parsedTxCount:  number;
  skippedRows:    number;
  storedTxCount:  number;
  transactions:   any[];
}

export async function runCilPipeline(
  documentId:    string,
  clientId:      string,
  sourceFile:    string,
  extractedData: ExtractedDocumentData,
): Promise<CilPipelineResult> {

  const tables = extractedData.tables ?? [];
  const rawText = extractedData.rawText ?? "";

  // ── Step 1: Classify the document ─────────────────────────────────────────
  const allHeaders = tables.flatMap(t => t.headers);
  const { docClass, confidence: classifierScore, scores: classifierScores } =
    classifyDocument(rawText, allHeaders);

  console.log(`[CIL] Document: ${sourceFile}`);
  console.log(`[CIL] Classified as: ${docClass} (confidence: ${classifierScore}%)`);
  console.log(`[CIL] Scores:`, classifierScores);

  const allTransactions: any[] = [];
  let totalRows = 0;
  let skippedRows = 0;

  // ── Step 2–4: For each table sheet, map columns + parse rows ───────────────
  for (const table of tables) {
    const headers = table.headers;
    if (headers.length === 0) continue;

    const { columnMap, mappingTrace } = mapColumns(headers);

    console.log(`[CIL] Sheet "${table.name ?? "unnamed"}" — column mapping:`, mappingTrace);

    const hasMeaningfulColumns =
      columnMap.entityName !== undefined ||
      columnMap.quantityOut !== undefined ||
      columnMap.quantityIn !== undefined ||
      columnMap.value !== undefined ||
      columnMap.balance !== undefined;

    if (!hasMeaningfulColumns) {
      console.log(`[CIL] Sheet "${table.name}" — no meaningful columns found, skipping`);
      skippedRows += table.rows.length;
      continue;
    }

    for (const row of table.rows) {
      totalRows++;

      // Skip completely empty rows
      const nonEmpty = row.filter(cell => cell !== null && String(cell).trim() !== "");
      if (nonEmpty.length === 0) {
        skippedRows++;
        continue;
      }

      const parsedTxs = parseRow(row, headers, columnMap, docClass);

      if (parsedTxs.length === 0) {
        skippedRows++;
        continue;
      }

      for (const tx of parsedTxs) {
        allTransactions.push({
          clientId,
          documentId,
          entityType:             tx.entityType,
          entityName:             tx.entityName ?? null,
          transactionType:        tx.transactionType,
          quantity:               tx.quantity ?? null,
          value:                  tx.value ?? null,
          date:                   tx.date ?? null,
          documentClassification: tx.documentClassification,
          referenceId:            tx.referenceId ?? null,
          sourceFile,
          rawText:                tx.rawText,
          netQuantity:            tx.netQuantity ?? null,
          netValue:               tx.netValue ?? null,
          debugTrace:             tx.debugTrace,
        });
      }
    }
  }

  if (allTransactions.length === 0) {
    console.log(`[CIL] No transactions produced from ${sourceFile}`);
    return {
      documentId, clientId, sourceFile,
      docClass, classifierScore,
      totalRows, parsedTxCount: 0, skippedRows,
      storedTxCount: 0, transactions: [],
    };
  }

  // ── Step 5: Store all transactions in DB (batch insert) ────────────────────
  let storedTxCount = 0;
  try {
    const BATCH = 200;
    for (let i = 0; i < allTransactions.length; i += BATCH) {
      const chunk = allTransactions.slice(i, i + BATCH);
      await db.insert(cilTransactions).values(chunk);
      storedTxCount += chunk.length;
    }
    console.log(`[CIL] Stored ${storedTxCount} transactions for ${sourceFile}`);
  } catch (err) {
    console.error("[CIL] DB insert error:", err);
    // Return what we parsed even if storage failed
  }

  return {
    documentId, clientId, sourceFile,
    docClass, classifierScore,
    totalRows,
    parsedTxCount: allTransactions.length,
    skippedRows,
    storedTxCount,
    transactions: allTransactions,
  };
}
