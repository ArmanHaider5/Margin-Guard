// ─────────────────────────────────────────────────────────────────────────────
// CORE INTELLIGENCE LAYER — MAIN PIPELINE
//
// Orchestrates: classify → block-detect → map columns → parse rows → store
//
// Processing priority:
//   1. extractedData.sheets  — structured Excel (raw rows, native XLSX types,
//                              no header/data pre-split).  Block detection runs
//                              on the full 2-D array.  Completely bypasses
//                              rawText.  Used whenever the document was parsed
//                              from an Excel/CSV file.
//   2. workingTables         — legacy tables path.  Used for PDF, Word, and
//                              any document without sheets.  May be augmented
//                              by the PDF line-item extractor.
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
  documentId:      string;
  clientId:        string;
  sourceFile:      string;
  docClass:        string;
  classifierScore: number;
  totalRows:       number;
  parsedTxCount:   number;
  skippedRows:     number;
  storedTxCount:   number;
  transactions:    any[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a raw XLSX cell value to a plain string. */
function cellStr(v: any): string { return String(v ?? ""); }

/** Build a push-ready transaction record. */
function makeTx(
  base: { clientId: string; documentId: string; sourceFile: string; documentClassification: string },
  tx: any,
  overrides: Record<string, any> = {},
): Record<string, any> {
  return {
    clientId:               base.clientId,
    documentId:             base.documentId,
    entityType:             tx.entityType   ?? "item",
    entityName:             tx.entityName   ?? null,
    transactionType:        tx.transactionType,
    quantity:               tx.quantity     ?? null,
    value:                  tx.value        ?? null,
    date:                   tx.date         ?? null,
    documentClassification: tx.documentClassification ?? base.documentClassification,
    referenceId:            tx.referenceId  ?? null,
    sourceFile:             base.sourceFile,
    rawText:                tx.rawText,
    netQuantity:            tx.netQuantity  ?? null,
    netValue:               tx.netValue     ?? null,
    debugTrace:             { ...tx.debugTrace, ...overrides },
  };
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runCilPipeline(
  documentId:    string,
  clientId:      string,
  sourceFile:    string,
  extractedData: ExtractedDocumentData,
): Promise<CilPipelineResult> {

  const rawText = extractedData.rawText ?? "";

  // ── Step 1: Classify the document ─────────────────────────────────────────
  // Use headers from tables (stringified, backward-compatible) for scoring.
  const allHeaders = (extractedData.tables ?? []).flatMap(t => t.headers);
  const { docClass, confidence: classifierScore, scores: classifierScores } =
    classifyDocument(rawText, allHeaders);

  console.log(`[CIL] Document: ${sourceFile}`);
  console.log(`[CIL] Classified as: ${docClass} (confidence: ${classifierScore}%)`);
  console.log(`[CIL] Scores:`, classifierScores);

  const base = { clientId, documentId, sourceFile, documentClassification: docClass };
  const allTransactions: any[] = [];
  let totalRows   = 0;
  let skippedRows = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // PATH A — Structured Excel sheets
  //   Present whenever the document was parsed from an Excel/CSV file.
  //   Each sheet contains the complete raw 2-D array from XLSX with no
  //   header/data pre-split and native cell types preserved.
  //   rawText is NOT used in this path.
  // ─────────────────────────────────────────────────────────────────────────
  const hasSheets = (extractedData.sheets?.length ?? 0) > 0;

  if (hasSheets) {
    console.log(`[CIL] Using structured Excel sheets path (${extractedData.sheets!.length} sheet(s))`);

    for (const sheet of extractedData.sheets!) {
      const sheetName = sheet.name;
      const rawRows: any[][] = sheet.rows;

      if (rawRows.length === 0) {
        console.log(`[CIL] Sheet "${sheetName}" — empty, skipping`);
        continue;
      }

      // ── Block detection on the full raw 2-D array ──────────────────────
      const blockResult = detectBlocks(rawRows);

      if (blockResult.mode === "block" && blockResult.blocks.length > 0) {
        // ── BLOCK MODE ─────────────────────────────────────────────────────
        console.log(
          `[CIL] Sheet "${sheetName}" → BLOCK MODE: ${blockResult.blockCount} blocks detected`,
        );

        let sheetTxCount = 0;

        for (const block of blockResult.blocks) {
          const { columnMap, mappingTrace } = mapColumns(block.headers);

          console.log(
            `[CIL]   Block "${block.itemName}" ` +
            `(stock: ${block.unitInStock ?? "?"}, rows: ${block.rows.length})`,
            mappingTrace,
          );

          const hasMeaningful =
            columnMap.quantityOut !== undefined ||
            columnMap.quantityIn  !== undefined ||
            columnMap.value       !== undefined ||
            columnMap.balance     !== undefined;

          if (!hasMeaningful) {
            console.log(`[CIL]   Block "${block.itemName}" — no meaningful columns, skipping`);
            skippedRows += block.rows.length;
            continue;
          }

          for (const row of block.rows) {
            totalRows++;

            const nonEmpty = row.filter(c => cellStr(c).trim() !== "");
            if (nonEmpty.length === 0) { skippedRows++; continue; }

            const parsedTxs = parseRow(
              row, block.headers, columnMap, docClass,
              block.itemName,  // entity name from block header
            );

            if (parsedTxs.length === 0) { skippedRows++; continue; }

            for (const tx of parsedTxs) {
              allTransactions.push(makeTx(base, tx, {
                blockItemName:    block.itemName,
                blockUnitInStock: block.unitInStock,
                blockHeaders:     block.headers,
              }));
              sheetTxCount++;
            }
          }
        }

        console.log(`[CIL] Sheet "${sheetName}" → Extracted ${sheetTxCount} transactions`);

      } else {
        // ── FLAT MODE ──────────────────────────────────────────────────────
        // Row 0 is the column-header row; rows 1+ are data rows.
        const headers  = rawRows[0].map(cellStr);
        const dataRows = rawRows.slice(1).map((r: any[]) => r.map(cellStr));

        const { columnMap, mappingTrace } = mapColumns(headers);

        console.log(
          `[CIL] Sheet "${sheetName}" → FLAT MODE — column mapping:`, mappingTrace,
        );

        const hasMeaningfulColumns =
          columnMap.entityName  !== undefined ||
          columnMap.quantityOut !== undefined ||
          columnMap.quantityIn  !== undefined ||
          columnMap.value       !== undefined ||
          columnMap.balance     !== undefined;

        if (!hasMeaningfulColumns) {
          console.log(`[CIL] Sheet "${sheetName}" — no meaningful columns, skipping`);
          skippedRows += dataRows.length;
          continue;
        }

        let sheetTxCount = 0;

        for (const row of dataRows) {
          totalRows++;

          const nonEmpty = row.filter(c => cellStr(c).trim() !== "");
          if (nonEmpty.length === 0) { skippedRows++; continue; }

          const parsedTxs = parseRow(row, headers, columnMap, docClass);
          if (parsedTxs.length === 0) { skippedRows++; continue; }

          for (const tx of parsedTxs) {
            allTransactions.push(makeTx(base, tx));
            sheetTxCount++;
          }
        }

        console.log(`[CIL] Sheet "${sheetName}" → Extracted ${sheetTxCount} transactions`);
      }
    }

  // ─────────────────────────────────────────────────────────────────────────
  // PATH B — Legacy tables / PDF / Word
  //   Used when no structured sheets are present (PDFs, Word docs, or
  //   documents uploaded before the sheets field was introduced).
  //   May invoke the PDF line-item extractor to build a pseudo-table.
  // ─────────────────────────────────────────────────────────────────────────
  } else {
    const workingTables: Array<{ name?: string; headers: string[]; rows: string[][], rawRows?: any[][] }> =
      [...(extractedData.tables ?? [])];

    // ── Step 1b: PDF extraction — runs when tables are empty ──────────────
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
        console.log(`[CIL:PDF] No line items found (${pdfResult.lineCount} lines scanned)`);
      }
    }

    for (const table of workingTables) {
      const sheetName = table.name ?? "unnamed";
      const headers   = table.headers;
      if (headers.length === 0) continue;

      // ── Block detection on rawRows (if present) or reconstructed array ──
      const allSheetRows: any[][] = table.rawRows ?? [headers, ...table.rows];
      const blockResult = detectBlocks(allSheetRows);

      if (blockResult.mode === "block" && blockResult.blocks.length > 0) {
        console.log(
          `[CIL] Sheet "${sheetName}" → BLOCK MODE: ` +
          `${blockResult.blockCount} blocks, ${blockResult.totalDataRows} data rows`,
        );

        let sheetTxCount = 0;

        for (const block of blockResult.blocks) {
          const { columnMap, mappingTrace } = mapColumns(block.headers);

          console.log(
            `[CIL]   Block "${block.itemName}" ` +
            `(stock: ${block.unitInStock ?? "?"}, rows: ${block.rows.length})`,
            mappingTrace,
          );

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

            const nonEmpty = row.filter(c => cellStr(c).trim() !== "");
            if (nonEmpty.length === 0) { skippedRows++; continue; }

            const parsedTxs = parseRow(
              row, block.headers, columnMap, docClass,
              block.itemName,
            );

            if (parsedTxs.length === 0) { skippedRows++; continue; }

            for (const tx of parsedTxs) {
              allTransactions.push(makeTx(base, tx, {
                blockItemName:    block.itemName,
                blockUnitInStock: block.unitInStock,
                blockHeaders:     block.headers,
              }));
              sheetTxCount++;
            }
          }
        }

        console.log(`[CIL] Sheet "${sheetName}" → Extracted ${sheetTxCount} transactions`);

      } else {
        // ── FLAT MODE ──────────────────────────────────────────────────────
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

        let sheetTxCount = 0;

        for (const row of table.rows) {
          totalRows++;

          const nonEmpty = row.filter(c => cellStr(c).trim() !== "");
          if (nonEmpty.length === 0) { skippedRows++; continue; }

          const parsedTxs = parseRow(row, headers, columnMap, docClass);
          if (parsedTxs.length === 0) { skippedRows++; continue; }

          for (const tx of parsedTxs) {
            allTransactions.push(makeTx(base, tx));
            sheetTxCount++;
          }
        }

        console.log(`[CIL] Sheet "${sheetName}" → Extracted ${sheetTxCount} transactions`);
      }
    }
  }

  // ── Return early if nothing produced ──────────────────────────────────────
  if (allTransactions.length === 0) {
    console.log(`[CIL] No transactions produced from ${sourceFile}`);
    return {
      documentId, clientId, sourceFile,
      docClass, classifierScore,
      totalRows, parsedTxCount: 0, skippedRows,
      storedTxCount: 0, transactions: [],
    };
  }

  // ── Step 5: Batch-insert all transactions ─────────────────────────────────
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
    // Return parsed results even if storage failed
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
