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
import { detectBlocks } from "./block-detector";
import { extractPdfLineItems } from "./pdf-extractor";

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

  // Working copy — may be augmented by PDF extraction below
  const workingTables: Array<{ name?: string; headers: string[]; rows: string[][] }> =
    [...(extractedData.tables ?? [])];
  const rawText = extractedData.rawText ?? "";

  // ── Step 1: Classify the document ─────────────────────────────────────────
  const allHeaders = workingTables.flatMap(t => t.headers);
  const { docClass, confidence: classifierScore, scores: classifierScores } =
    classifyDocument(rawText, allHeaders);

  console.log(`[CIL] Document: ${sourceFile}`);
  console.log(`[CIL] Classified as: ${docClass} (confidence: ${classifierScore}%)`);
  console.log(`[CIL] Scores:`, classifierScores);

  // ── Step 1b: PDF extraction — runs when tables are empty (PDF/Word) ────────
  // Converts raw text into a pseudo-table of line items so the rest of the
  // pipeline can process it identically to structured Excel data.
  if (workingTables.length === 0 && rawText.length > 100) {
    console.log(`[CIL] No structured tables — attempting PDF line-item extraction`);
    const pdfResult = extractPdfLineItems(rawText);

    if (pdfResult.pseudoTable) {
      console.log(
        `[CIL:PDF] Extracted ${pdfResult.parsedItems} line items ` +
        `(ref: ${pdfResult.invoiceRef ?? "none"}, ` +
        `date: ${pdfResult.invoiceDate ?? "none"})`,
      );
      workingTables.push(pdfResult.pseudoTable);
    } else {
      console.log(
        `[CIL:PDF] No line items found (${pdfResult.lineCount} lines scanned)`,
      );
    }
  }

  const allTransactions: any[] = [];
  let totalRows = 0;
  let skippedRows = 0;

  // ── Step 2–4: For each table sheet, map columns + parse rows ───────────────
  // Per-sheet, attempt block detection first. If the sheet has ≥1 item block,
  // use block mode (each block gets its own column map + entity name override).
  // Otherwise fall back to flat mode (existing behaviour, unchanged).

  for (const table of workingTables) {
    const sheetName = table.name ?? "unnamed";
    const headers   = table.headers;
    if (headers.length === 0) continue;

    // ── Try block detection ─────────────────────────────────────────────────
    // Pass ALL rows (including the header row as index 0 — the detector ignores
    // rows that look like header rows within a block, so passing the sheet
    // header first is harmless).
    const allSheetRows: string[][] = [headers, ...table.rows];
    const blockResult = detectBlocks(allSheetRows);

    if (blockResult.mode === "block" && blockResult.blocks.length > 0) {
      // ── BLOCK MODE ────────────────────────────────────────────────────────
      console.log(
        `[CIL] Sheet "${sheetName}" → BLOCK MODE: ` +
        `${blockResult.blockCount} blocks, ${blockResult.totalDataRows} data rows`,
      );

      for (const block of blockResult.blocks) {
        const { columnMap, mappingTrace } = mapColumns(block.headers);

        console.log(
          `[CIL]   Block "${block.itemName}" ` +
          `(stock:${block.unitInStock ?? "?"}, rows:${block.rows.length})`,
          mappingTrace,
        );

        // If block headers have no meaningful columns, skip block
        const hasMeaningful =
          columnMap.quantityOut !== undefined ||
          columnMap.quantityIn  !== undefined ||
          columnMap.value       !== undefined ||
          columnMap.balance     !== undefined;

        if (!hasMeaningful) {
          skippedRows += block.rows.length;
          continue;
        }

        for (const row of block.rows) {
          totalRows++;

          const nonEmpty = row.filter(c => c !== null && String(c).trim() !== "");
          if (nonEmpty.length === 0) { skippedRows++; continue; }

          const parsedTxs = parseRow(
            row, block.headers, columnMap, docClass,
            block.itemName,   // ← override entity name from block header
          );

          if (parsedTxs.length === 0) { skippedRows++; continue; }

          for (const tx of parsedTxs) {
            allTransactions.push({
              clientId, documentId,
              entityType:             "item" as const,
              entityName:             block.itemName,
              transactionType:        tx.transactionType,
              quantity:               tx.quantity        ?? null,
              value:                  tx.value           ?? null,
              date:                   tx.date            ?? null,
              documentClassification: tx.documentClassification,
              referenceId:            tx.referenceId     ?? null,
              sourceFile,
              rawText:                tx.rawText,
              netQuantity:            tx.netQuantity     ?? null,
              netValue:               tx.netValue        ?? null,
              debugTrace: {
                ...tx.debugTrace,
                blockItemName:    block.itemName,
                blockUnitInStock: block.unitInStock,
                blockHeaders:     block.headers,
              },
            });
          }
        }
      }

    } else {
      // ── FLAT MODE (existing behaviour) ────────────────────────────────────
      const { columnMap, mappingTrace } = mapColumns(headers);

      console.log(`[CIL] Sheet "${sheetName}" → FLAT MODE — column mapping:`, mappingTrace);

      const hasMeaningfulColumns =
        columnMap.entityName  !== undefined ||
        columnMap.quantityOut !== undefined ||
        columnMap.quantityIn  !== undefined ||
        columnMap.value       !== undefined ||
        columnMap.balance     !== undefined;

      if (!hasMeaningfulColumns) {
        console.log(`[CIL] Sheet "${sheetName}" — no meaningful columns found, skipping`);
        skippedRows += table.rows.length;
        continue;
      }

      for (const row of table.rows) {
        totalRows++;

        const nonEmpty = row.filter(cell => cell !== null && String(cell).trim() !== "");
        if (nonEmpty.length === 0) { skippedRows++; continue; }

        const parsedTxs = parseRow(row, headers, columnMap, docClass);

        if (parsedTxs.length === 0) { skippedRows++; continue; }

        for (const tx of parsedTxs) {
          allTransactions.push({
            clientId, documentId,
            entityType:             tx.entityType,
            entityName:             tx.entityName ?? null,
            transactionType:        tx.transactionType,
            quantity:               tx.quantity        ?? null,
            value:                  tx.value           ?? null,
            date:                   tx.date            ?? null,
            documentClassification: tx.documentClassification,
            referenceId:            tx.referenceId     ?? null,
            sourceFile,
            rawText:                tx.rawText,
            netQuantity:            tx.netQuantity     ?? null,
            netValue:               tx.netValue        ?? null,
            debugTrace:             tx.debugTrace,
          });
        }
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
