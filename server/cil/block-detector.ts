// ─────────────────────────────────────────────────────────────────────────────
// CIL BLOCK DETECTOR  (v2)
//
// Detects repeating operational blocks inside complex Excel sheets.
//
// Supported layouts:
//   - Repeating inventory sections (multi-product movement sheets)
//   - Merged-layout spreadsheets (e.g. warehouse movement cards)
//   - Operational forms with sub-tables per item
//   - Visually separated operational blocks with headings
//   - Malay-language entity names (KHEMAH, STALL ATAP, KERUSI, etc.)
//
// Output:
//   detectBlocks(rows) → DetectedBlock[]
//
//   Each DetectedBlock carries:
//     - blockType   : inferred operational category
//     - entityName  : detected item / product / entity name
//     - headerRow   : absolute index of the column-header row in `rows`
//     - startRow    : first data-row index (inclusive)
//     - endRow      : last data-row index (inclusive)
//     - headers     : normalised column-header strings
//     - unitInStock : opening stock quantity (when present)
//
// Block boundary rules:
//   • A new entity row closes the previous block and opens a new one.
//   • 5 consecutive blank rows inside a data section close the current block.
//
// Entity-row signals (any one is sufficient):
//   1. First cell contains a known PRODUCT_KEYWORD (word-boundary match)
//   2. Row is SINGLE-CELL UPPERCASE TEXT ≥ 3 chars, not a column keyword,
//      not a company name, and not numeric/date
//
// Exported helpers (for use in tests and the pipeline):
//   safeCell(value): string
//   isLikelyEntityRow(row): boolean
//   isOperationalHeaderRow(row): boolean
// ─────────────────────────────────────────────────────────────────────────────

// ── Exported interface ─────────────────────────────────────────────────────────

export interface DetectedBlock {
  blockType:    string;          // "inventory_movement" | "logistics_schedule" | "sales_summary" | "inventory_audit"
  entityName?:  string;          // "BANQUET CHAIR", "ROUND TABLE", "KHEMAH", …
  headerRow:    number;          // 0-based index of the column-header row in the original rows array
  startRow:     number;          // 0-based index of the first data row (inclusive)
  endRow:       number;          // 0-based index of the last data row (inclusive)
  headers:      string[];        // normalised column-header strings
  unitInStock?: number | null;   // opening/current stock quantity, when detected
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Number of consecutive blank rows that close an open data section. */
const EMPTY_ROW_FLUSH_THRESHOLD = 5;

/**
 * Operational column keywords.
 * Used to identify column-header rows and to EXCLUDE them from entity detection
 * (unless a PRODUCT_KEYWORD fires first — that always wins).
 */
const OPERATIONAL_KEYWORDS = new Set([
  // Movement / quantity
  "out", "outgoing", "issued", "dispatch", "dispatched", "delivery", "debit", "loaded",
  "in", "incoming", "received", "returned", "return", "receipt", "credit", "unloaded",
  "qty", "quantity", "qty out", "qty in", "quantity out", "quantity in",
  // Balance / stock
  "balance", "stock", "closing", "closing bal", "closing balance", "on hand",
  "opening", "opening stock", "in stock", "net stock",
  "shortfall", "variance", "difference",
  // Date / reference
  "date", "transaction date", "doc date", "delivery date", "movement date", "period",
  "ref", "reference", "invoice no", "invoice number", "inv no", "do no", "doc no",
  // People / vehicle
  "driver", "operator", "vehicle", "lorry", "truck", "plate", "plate no",
  // Financial
  "amount", "value", "price", "total", "rm", "cost", "nett", "net",
  // Description
  "name", "item", "description", "particulars", "sku", "product",
  // General
  "remarks", "notes", "note", "comment", "customer", "client",
]);

/**
 * Product / entity keywords — word-boundary matched.
 * A row whose first non-empty cell contains any of these is ALWAYS an entity row,
 * even if it also contains column-keyword substrings.
 */
const PRODUCT_KEYWORDS: string[] = [
  // Explicitly requested examples
  "chair", "table", "linen", "arm", "round", "banquet", "stall", "atap", "khemah",
  // Furniture & event hire
  "sofa", "cushion", "carpet", "stool", "bench", "podium", "stage",
  "canopy", "tent", "backdrop", "curtain", "drape", "cloth", "fabric",
  "umbrella", "parasol", "awning",
  // Structural / material
  "frame", "panel", "sheet", "board", "beam", "rod", "pipe",
  "rack", "shelf", "cabinet", "drawer", "locker", "plywood", "hdpe",
  // Packaging / logistics
  "pallet", "crate", "drum", "barrel", "box", "bag", "bin",
  // Equipment / industrial
  "pump", "motor", "valve", "cable", "hose", "trolley", "cart",
  // Malay general items
  "kerusi", "meja", "almari", "rak", "baldi", "tong", "bekas",
  "tapak", "gerai", "kaunter",
];

/** Phrases that flag a row as a repeated company/organisation header — skip it. */
const COMPANY_NAME_SIGNALS: string[] = [
  "sdn bhd", "sdn. bhd.", "sendirian berhad", "berhad", "enterprise",
  "trading", "industries", "holdings", "corporation", "corp",
  "pvt ltd", "private limited", "resources", "management",
];

/** Patterns that identify a UNIT IN STOCK / opening stock row. */
const UNIT_IN_STOCK_PATTERNS: RegExp[] = [
  /unit\s*in\s*stock/i,
  /units?\s*in\s*stock/i,
  /opening\s*stock/i,
  /stok\s*semasa/i,
  /current\s*stock/i,
  /stok\s*awal/i,
  /stok\s*pembukaan/i,
];

// ── Exported helper: safeCell ──────────────────────────────────────────────────

/**
 * Safely convert any raw cell value (number, string, null, undefined, boolean)
 * to a plain trimmed string.  Never throws.
 */
export function safeCell(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/** safeCell + lowercase — for comparisons only, never returned to callers. */
function lower(value: any): string {
  return safeCell(value).toLowerCase();
}

/** Non-empty stringified cells from a row. */
function nonEmpty(row: any[]): string[] {
  if (!Array.isArray(row)) return [];
  return row.map(safeCell).filter(c => c !== "");
}

/** True if `s` looks numeric or like an Excel date serial. */
function isNumericOrDate(s: string): boolean {
  if (/^[\d,.\s]+$/.test(s)) return true;
  const n = parseFloat(s);
  if (!isNaN(n) && n > 30000 && n < 60000) return true;   // Excel serial date
  if (/^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(s)) return true;
  return false;
}

/** True if `text` (lower-cased) contains a column keyword as a whole word. */
function isColKw(text: any): boolean {
  const l = lower(text).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!l) return false;
  if (OPERATIONAL_KEYWORDS.has(l)) return true;
  for (const kw of OPERATIONAL_KEYWORDS) {
    if (new RegExp(`(?:^|\\s)${kw}(?:\\s|$)`).test(l)) return true;
  }
  return false;
}

/** True if `text` contains a product keyword as a whole word. */
function hasProdKw(text: any): boolean {
  const l = lower(text);
  for (const kw of PRODUCT_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(l)) return true;
  }
  return false;
}

/** True if the row looks like a repeated company/organisation header. */
function isCompanyRow(row: any[]): boolean {
  const cells = nonEmpty(row);
  if (cells.length !== 1) return false;
  const l = lower(cells[0]);
  return COMPANY_NAME_SIGNALS.some(sig => l.includes(sig));
}

/** True if joined row text matches a UNIT IN STOCK pattern. */
function isUnitInStockRow(row: any[]): boolean {
  const joined = row.map(safeCell).join(" ");
  return UNIT_IN_STOCK_PATTERNS.some(p => p.test(joined));
}

/** Parse stock quantity from a UIS row (returns 0 if pattern matches but no number). */
function parseStockQty(row: any[]): number {
  const joined = row.map(safeCell).join(" ");
  const m = joined.match(/(\d[\d,]*)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
}

// ── Exported helper: isOperationalHeaderRow ────────────────────────────────────

/**
 * True when the row looks like an operational column-header row.
 * Requires:
 *   • ≥ 2 non-empty cells
 *   • At least 2 cells match a whole-word operational keyword
 *   • Not mostly numeric (would be a data row)
 */
export function isOperationalHeaderRow(row: any[]): boolean {
  if (!Array.isArray(row)) return false;
  const cells = nonEmpty(row);
  if (cells.length < 2) return false;

  let kwCount  = 0;
  let numCount = 0;

  for (const c of cells) {
    if (isColKw(c))          kwCount++;
    if (isNumericOrDate(c))  numCount++;
  }

  // If most cells are numeric → data row, not a header
  if (numCount >= cells.length - 1) return false;
  return kwCount >= 2;
}

// ── Exported helper: isLikelyEntityRow ────────────────────────────────────────

/**
 * True when the row is likely a product / section / entity heading.
 *
 * Signals checked (in priority order):
 *   1. First cell contains a product keyword (word-boundary) → always entity
 *   2. Row is SINGLE-CELL UPPERCASE text ≥ 3 chars, not a column keyword,
 *      not numeric/date, not a company name
 *
 * False when:
 *   - Row is empty
 *   - Row has > 3 non-empty cells (almost certainly a data row)
 *   - First cell is numeric or date-like
 *   - Row is an operational header row
 *   - Row is a company/organisation name
 */
export function isLikelyEntityRow(row: any[]): boolean {
  if (!Array.isArray(row)) return false;
  const cells = nonEmpty(row);

  if (cells.length === 0 || cells.length > 3) return false;

  const first = cells[0];
  if (!first || isNumericOrDate(first)) return false;
  if (!/[a-zA-Z]/.test(first))         return false;
  if (isCompanyRow(row))                return false;
  if (isOperationalHeaderRow(row))      return false;

  // Signal 1: product keyword match → highest priority
  if (hasProdKw(first)) return true;

  // Signal 2: single-cell, uppercase-dominant, not a column keyword
  const upperRatio = (first.match(/[A-Z]/g) ?? []).length / first.length;
  if (
    cells.length === 1 &&
    first.length >= 3 &&
    upperRatio >= 0.5 &&
    !isColKw(first)
  ) return true;

  return false;
}

// ── Block-type inference ───────────────────────────────────────────────────────

/**
 * Infer the operational category of a block from its column headers.
 *
 * Categories:
 *   inventory_movement  — movement in/out of stock (most common)
 *   logistics_schedule  — delivery/transport schedule
 *   sales_summary       — revenue / invoice summary
 *   inventory_audit     — variance / closing-stock audit
 */
function inferBlockType(headers: string[]): string {
  const joined = headers.map(lower).join(" ");

  const hasMovement  = /\b(out|outgoing|in|incoming|issued|received|dispatch)\b/.test(joined);
  const hasBalance   = /\b(balance|stock|closing|opening|on hand)\b/.test(joined);
  const hasShortfall = /\b(shortfall|variance|difference)\b/.test(joined);
  const hasLogistic  = /\b(driver|lorry|truck|vehicle|delivery|destination)\b/.test(joined);
  const hasFinancial = /\b(amount|value|price|total|rm|nett)\b/.test(joined);
  const hasInvoice   = /\b(invoice|inv|do no|doc no)\b/.test(joined);

  if (hasShortfall || (hasBalance && !hasMovement)) return "inventory_audit";
  if (hasLogistic)                                  return "logistics_schedule";
  if (hasFinancial && hasInvoice)                   return "sales_summary";
  if (hasMovement || hasBalance)                    return "inventory_movement";

  return "inventory_movement";  // default
}

// ── Main detector ─────────────────────────────────────────────────────────────

/**
 * Scan a raw 2-D array (one worksheet) and return a list of detected operational
 * blocks.  Each block has absolute row-index references into `rows`.
 *
 * Returns an empty array when no block structure is found (flat sheet).
 */
export function detectBlocks(rows: any[][]): DetectedBlock[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("[CIL][BLOCK] Input is empty — returning no blocks");
    return [];
  }

  const blocks: DetectedBlock[] = [];

  // ── Per-block state ────────────────────────────────────────────────────────
  let entityName:   string | null = null;
  let unitInStock:  number | null = null;
  let headerRowIdx: number        = -1;
  let headers:      string[]      = [];
  let startRowIdx:  number        = -1;
  let endRowIdx:    number        = -1;
  let inData        = false;
  let emptyStreak   = 0;           // consecutive empty rows in data section

  function flushBlock(): void {
    if (
      entityName !== null &&
      headerRowIdx >= 0 &&
      startRowIdx >= 0 &&
      endRowIdx   >= startRowIdx
    ) {
      const blockType = inferBlockType(headers);
      const block: DetectedBlock = {
        blockType,
        entityName,
        headerRow: headerRowIdx,
        startRow:  startRowIdx,
        endRow:    endRowIdx,
        headers,
        unitInStock,
      };
      blocks.push(block);

      console.log(
        `[CIL][BLOCK] Flushed block: entity="${entityName}" ` +
        `type=${blockType} ` +
        `headerRow=${headerRowIdx} rows=${startRowIdx}-${endRowIdx} ` +
        `stock=${unitInStock ?? "?"} ` +
        `headers=[${headers.join(", ")}]`,
      );
    }

    // Reset state
    entityName   = null;
    unitInStock  = null;
    headerRowIdx = -1;
    headers      = [];
    startRowIdx  = -1;
    endRowIdx    = -1;
    inData       = false;
    emptyStreak  = 0;
  }

  // ── Row scan ───────────────────────────────────────────────────────────────
  console.log(`[CIL][BLOCK] Scanning ${rows.length} rows for block structure`);

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];

    // Defensive: treat non-array rows as empty
    const row   = Array.isArray(rawRow) ? rawRow : [];
    const cells = nonEmpty(row);

    // ── Empty row ────────────────────────────────────────────────────────────
    if (cells.length === 0) {
      if (inData) {
        emptyStreak++;
        if (emptyStreak >= EMPTY_ROW_FLUSH_THRESHOLD) {
          console.log(
            `[CIL][BLOCK] Row ${i}: ${EMPTY_ROW_FLUSH_THRESHOLD} consecutive empty rows — ` +
            `flushing block "${entityName}"`,
          );
          flushBlock();
        }
      }
      continue;
    }

    emptyStreak = 0;  // reset streak on non-empty row

    // ── UNIT IN STOCK row ─────────────────────────────────────────────────────
    // Must be checked BEFORE entity-row detection: "UNIT IN STOCK  200" must not
    // trigger a new entity block.
    if (isUnitInStockRow(row)) {
      const qty = parseStockQty(row);
      if (entityName !== null) {
        unitInStock = qty;
        console.log(`[CIL][BLOCK] Row ${i}: UIS row — stock=${qty} for "${entityName}"`);
      }
      inData = false;   // column-header row expected next
      continue;
    }

    // ── Company / repeated header row ─────────────────────────────────────────
    if (isCompanyRow(row)) {
      console.log(`[CIL][BLOCK] Row ${i}: Company name row — skipping`);
      continue;
    }

    // ── Entity / product row ──────────────────────────────────────────────────
    if (isLikelyEntityRow(row)) {
      const name = safeCell(row[0] ?? cells[0]);

      // Flush whatever block was in progress
      if (entityName !== null) flushBlock();

      entityName  = name;
      unitInStock = null;
      inData      = false;

      // Pattern B: inline stock count on the same row ("BANQUET CHAIR  200")
      if (cells.length >= 2) {
        const second = safeCell(cells[1]);
        if (isNumericOrDate(second) && !/[a-zA-Z]/.test(second)) {
          const n = parseFloat(second.replace(/[^0-9.]/g, ""));
          if (!isNaN(n) && n >= 0) {
            unitInStock = n;
            console.log(
              `[CIL][BLOCK] Row ${i}: Entity row (inline stock) — ` +
              `entity="${name}" stock=${n}`,
            );
          }
        }
      }

      if (unitInStock === null) {
        console.log(`[CIL][BLOCK] Row ${i}: Entity row — entity="${name}"`);
      }
      continue;
    }

    // ── Operational column-header row ─────────────────────────────────────────
    if (entityName !== null && !inData && isOperationalHeaderRow(row)) {
      headerRowIdx = i;
      headers      = row.map(safeCell);
      inData       = true;
      startRowIdx  = -1;
      endRowIdx    = -1;
      emptyStreak  = 0;

      console.log(
        `[CIL][BLOCK] Row ${i}: Operational header for "${entityName}" — ` +
        `headers=[${headers.filter(h => h !== "").join(", ")}]`,
      );
      continue;
    }

    // ── Data row ──────────────────────────────────────────────────────────────
    if (entityName !== null && inData) {
      // Skip repeated header rows embedded inside data sections
      if (cells.length >= 2 && isOperationalHeaderRow(row)) {
        console.log(`[CIL][BLOCK] Row ${i}: Repeated header inside data section — skipping`);
        continue;
      }

      if (startRowIdx < 0) startRowIdx = i;
      endRowIdx = i;
      continue;
    }

    // ── Unclassified row ──────────────────────────────────────────────────────
    // (Before any entity is found, or between blocks — ignore silently)
  }

  // Flush the final block
  flushBlock();

  // ── Summary log ─────────────────────────────────────────────────────────────
  if (blocks.length === 0) {
    console.log("[CIL][BLOCK] No blocks detected — sheet will be processed in FLAT MODE");
  } else {
    console.log(
      `[CIL][BLOCK] Detection complete: ${blocks.length} block(s), ` +
      `${blocks.reduce((s, b) => s + (b.endRow - b.startRow + 1), 0)} total data rows`,
    );
    for (const b of blocks) {
      console.log(
        `[CIL][BLOCK]   • "${b.entityName}" [${b.blockType}] ` +
        `rows ${b.startRow}–${b.endRow} (${b.endRow - b.startRow + 1} rows) ` +
        `stock=${b.unitInStock ?? "?"}`,
      );
    }
  }

  return blocks;
}
