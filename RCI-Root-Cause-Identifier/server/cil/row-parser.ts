// ─────────────────────────────────────────────────────────────────────────────
// CIL ROW PARSER
//
// Converts a single spreadsheet row into one or more CilTransaction objects.
//
// A single row can produce MULTIPLE transactions:
//   - A row with Outgoing=50 AND Incoming=40 → 2 transactions
//   - A row with Sale amount and Refund → 2 transactions
//
// Tolerant to missing data — any field that cannot be resolved is null.
// ─────────────────────────────────────────────────────────────────────────────

import type { ColumnMap } from "./column-mapper";
import type { CilEntityType, CilTxType, CilDocClass } from "@shared/schema";

export interface ParsedTransaction {
  entityType:           CilEntityType;
  entityName:           string | null;
  transactionType:      CilTxType;
  quantity:             number | null;
  value:                number | null;
  date:                 string | null;
  referenceId:          string | null;
  rawText:              string;
  netQuantity:          number | null;
  netValue:             number | null;
  documentClassification: CilDocClass;
  debugTrace: {
    originalRow:    Record<string, string>;
    mappedFields:   Record<string, string | number | null>;
    txCount:        number;
  };
}

function toNum(val: string | undefined | null): number | null {
  if (val === undefined || val === null || val === "") return null;
  const cleaned = String(val).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function toStr(val: string | undefined | null): string | null {
  if (!val || String(val).trim() === "") return null;
  return String(val).trim();
}

function detectEntityType(name: string | null, colMap: ColumnMap, hasDriver: boolean, hasVehicle: boolean): CilEntityType {
  if (hasDriver) return "staff";
  if (hasVehicle) return "vehicle";
  if (!name) return "unknown";
  const lower = name.toLowerCase();
  if (/^[a-z\s]+$/.test(lower) && lower.split(" ").length <= 3) {
    // Likely a person's name
    if (/sdn|bhd|trading|enterprise|holdings|corp|pvt|ltd/.test(lower)) return "customer";
  }
  return "item";
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  // Handle Excel serial date numbers (e.g. 45771)
  const asNum = parseFloat(String(raw).trim());
  if (!isNaN(asNum) && asNum > 30000 && asNum < 60000) {
    // Excel date serial: days since Jan 1, 1900 (with leap year bug offset)
    const date = new Date((asNum - 25569) * 86400 * 1000);
    return date.toISOString().slice(0, 10);
  }
  // Try various date string formats
  const cleaned = String(raw).trim();
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return cleaned;
}

function autoRef(entityName: string | null, date: string | null, docClass: CilDocClass): string {
  const parts = [
    entityName?.slice(0, 20).replace(/\s+/g, "_") ?? "UNK",
    date ?? "NODATE",
    docClass.slice(0, 4).toUpperCase(),
  ].filter(Boolean);
  return parts.join("-");
}

export function parseRow(
  row: string[],
  headers: string[],
  colMap: ColumnMap,
  docClass: CilDocClass,
): ParsedTransaction[] {

  const cell = (idx: number | undefined): string | null =>
    idx !== undefined ? toStr(row[idx]) : null;

  const entityName   = cell(colMap.entityName);
  const customer     = cell(colMap.customer);
  const rawDate      = cell(colMap.date);
  const date         = parseDate(rawDate);
  const rawRef       = cell(colMap.referenceId);
  const hasDriver    = colMap.driver !== undefined && !!cell(colMap.driver);
  const hasVehicle   = colMap.vehicle !== undefined && !!cell(colMap.vehicle);

  const qtyOut   = toNum(cell(colMap.quantityOut));
  const qtyIn    = toNum(cell(colMap.quantityIn));
  const balance  = toNum(cell(colMap.balance));
  const value    = toNum(cell(colMap.value));
  const refund   = toNum(cell(colMap.refund));

  const resolvedName  = entityName ?? customer ?? null;
  const entityType    = detectEntityType(resolvedName, colMap, hasDriver, hasVehicle);

  // Auto-generate reference if none found
  const referenceId = rawRef ?? autoRef(resolvedName, date, docClass);

  // Build original row as header:value map for debug
  const originalRow: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    if (row[i] !== undefined && row[i] !== "") {
      originalRow[headers[i]] = row[i];
    }
  }

  const mappedFields: Record<string, string | number | null> = {
    entityName: resolvedName,
    entityType,
    date,
    referenceId,
    qtyOut,
    qtyIn,
    balance,
    value,
    refund,
  };

  const rawText = Object.entries(originalRow)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");

  const transactions: ParsedTransaction[] = [];

  // ── Outgoing transaction ────────────────────────────────────────────────────
  if (qtyOut !== null && qtyOut > 0) {
    const txType: CilTxType = docClass === "loss_record" ? "loss"
      : docClass === "sales_sheet" ? "sale"
      : "outgoing";
    transactions.push({
      entityType, entityName: resolvedName, transactionType: txType,
      quantity: qtyOut, value, date, referenceId,
      rawText, documentClassification: docClass,
      netQuantity: qtyOut - (qtyIn ?? 0),
      netValue:    (value ?? 0) - (refund ?? 0) || null,
      debugTrace: { originalRow, mappedFields, txCount: 0 },
    });
  }

  // ── Incoming transaction ────────────────────────────────────────────────────
  if (qtyIn !== null && qtyIn > 0) {
    transactions.push({
      entityType, entityName: resolvedName, transactionType: "incoming",
      quantity: qtyIn, value: null, date, referenceId,
      rawText, documentClassification: docClass,
      netQuantity: (qtyOut ?? 0) - qtyIn,
      netValue: null,
      debugTrace: { originalRow, mappedFields, txCount: 0 },
    });
  }

  // ── Refund transaction ──────────────────────────────────────────────────────
  if (refund !== null && refund > 0) {
    transactions.push({
      entityType, entityName: resolvedName, transactionType: "refund",
      quantity: null, value: refund, date, referenceId,
      rawText, documentClassification: docClass,
      netQuantity: null,
      netValue: (value ?? 0) - refund || null,
      debugTrace: { originalRow, mappedFields, txCount: 0 },
    });
  }

  // ── If nothing matched but there IS a value (e.g. invoice row) ─────────────
  if (transactions.length === 0 && (value !== null || balance !== null)) {
    const txType: CilTxType =
      docClass === "invoice"    ? "sale" :
      docClass === "loss_record" ? "loss" :
      docClass === "quotation"  ? "adjustment" :
                                   "adjustment";
    transactions.push({
      entityType, entityName: resolvedName, transactionType: txType,
      quantity: balance, value, date, referenceId,
      rawText, documentClassification: docClass,
      netQuantity: null,
      netValue: (value ?? 0) - (refund ?? 0) || null,
      debugTrace: { originalRow, mappedFields, txCount: 0 },
    });
  }

  // ── Tag txCount on debugTrace now we know ───────────────────────────────────
  for (const tx of transactions) {
    tx.debugTrace.txCount = transactions.length;
  }

  return transactions;
}
