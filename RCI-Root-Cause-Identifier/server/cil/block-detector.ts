// ─────────────────────────────────────────────────────────────────────────────
// CIL BLOCK DETECTOR
//
// Handles multi-block Excel sheets where a single sheet contains multiple
// product/item sections, each with its own header row and movement rows.
//
// Supported layouts (both detected automatically):
//
//   Pattern A — product name on its own row, stock on the next row:
//     BANQUET CHAIR                ← product row    (1 cell)
//     UNIT IN STOCK   200          ← stock row      (optional, 2 cells)
//     DATE  OUT  IN  BALANCE  …    ← header row
//     2025-01-01  10  5  190  …   ← data rows
//
//   Pattern B — product name + stock count on the same row:
//     BANQUET CHAIR   200          ← product + inline stock  (2 cells)
//     DATE  OUT  IN  BALANCE  …    ← header row
//
// Block boundary rule:
//   Any row recognised as a PRODUCT ROW closes the previous block and starts
//   a new one.  Product rows are identified by two independent signals (either
//   one is sufficient to trigger):
//     1. PRODUCT_KEYWORDS — the row's first text cell contains a known product
//        word.  This check takes priority over column-keyword heuristics and
//        prevents false negatives like "LINEN" (which contains "in") or
//        "ARM CHAIR" (which contains "rm").
//     2. SINGLE_CELL_TEXT — the row has exactly one non-empty cell that is
//        ≥ 3 chars, not numeric/date, not a column header keyword, and not a
//        company name.  This is the original heuristic kept for catch-all.
//
// Non-product rows that are skipped:
//   - Empty rows
//   - Column header rows  (≥ 2 column keyword cells)
//   - UNIT IN STOCK rows  (handled as metadata, not a new block)
//   - Company / organisation name rows
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemBlock {
  itemName:    string;
  unitInStock: number | null;
  headers:     string[];
  rows:        string[][];
}

// ── Column header keywords ─────────────────────────────────────────────────────
// Used to identify header rows and to EXCLUDE them from product-row detection
// (only applies when product-keyword check does NOT override).

const COLUMN_KEYWORDS = new Set([
  "date", "out", "in", "outgoing", "incoming", "balance", "stock",
  "issued", "returned", "received", "dispatch", "delivery", "qty",
  "quantity", "amount", "value", "rm", "ref", "customer", "name",
  "item", "description", "return", "remarks", "driver", "vehicle",
  "invoice", "refund", "total", "lorry", "truck",
]);

// ── Product keywords ───────────────────────────────────────────────────────────
// Checked with word-boundary regex. A row whose first text cell contains ANY of
// these words is ALWAYS treated as a product row, regardless of column-keyword
// overlap.  This list intentionally covers both the examples in the spec and
// common Malaysian SME inventory terms.

const PRODUCT_KEYWORDS: string[] = [
  // Explicitly requested
  "chair", "table", "linen", "arm", "round", "banquet", "plywood", "hdpe",
  // Furniture & event hire
  "sofa", "cushion", "carpet", "stool", "bench", "podium", "stage",
  "canopy", "tent", "backdrop", "curtain", "drape",
  // Structural / material
  "frame", "panel", "sheet", "board", "beam", "rod", "pipe",
  "rack", "shelf", "cabinet", "drawer", "locker",
  // Packaging / logistics
  "pallet", "crate", "drum", "barrel", "box", "bag", "bin",
  // Equipment / industrial
  "pump", "motor", "valve", "cable", "hose", "trolley", "cart",
];

// ── Company / organisation name signals ────────────────────────────────────────
// A row whose single cell contains these phrases is skipped — it is a repeated
// company header, not a product.

const COMPANY_NAME_SIGNALS: string[] = [
  "sdn bhd", "sdn. bhd.", "sendirian berhad", "berhad", "enterprise",
  "trading", "industries", "holdings", "corporation", "corp", "pvt ltd",
  "private limited", "resources", "management",
];

// ── UNIT IN STOCK patterns ─────────────────────────────────────────────────────

const UNIT_IN_STOCK_PATTERNS = [
  /unit\s*in\s*stock/i,
  /units?\s*in\s*stock/i,
  /opening\s*stock/i,
  /stok\s*semasa/i,
  /current\s*stock/i,
  /stok\s*awal/i,
];

// ── Safe string helper ────────────────────────────────────────────────────────

function safeString(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase().trim();
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

function norm(v: any): string {
  return String(v ?? "").trim();
}

function nonEmptyCells(row: any[]): string[] {
  return row.map(norm).filter(c => c !== "");
}

function isNumericOrDate(s: string): boolean {
  if (/^[\d,.\s]+$/.test(s)) return true;
  const n = parseFloat(s);
  if (!isNaN(n) && n > 30000 && n < 60000) return true;   // Excel serial date
  if (/^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(s)) return true;
  return false;
}

/** True if `s` contains any COLUMN_KEYWORD as a whole-word substring. */
function isColumnKeyword(s: any): boolean {
  const lower = safeString(s).replace(/[^a-z0-9 ]/g, " ").trim();
  if (!lower) return false;
  // Exact match first
  if (COLUMN_KEYWORDS.has(lower)) return true;
  // Whole-word substring match (avoid "in" matching "linen", "incoming" etc.)
  for (const kw of COLUMN_KEYWORDS) {
    const pattern = new RegExp(`(?:^|\\s)${kw}(?:\\s|$)`);
    if (pattern.test(lower)) return true;
  }
  return false;
}

/** True if `text` contains any product keyword as a whole word. */
function hasProductKeyword(text: any): boolean {
  const lower = safeString(text);
  for (const kw of PRODUCT_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(lower)) return true;
  }
  return false;
}

/** True if `text` looks like a repeated company / organisation header. */
function isCompanyName(text: any): boolean {
  const lower = safeString(text);
  return COMPANY_NAME_SIGNALS.some(sig => lower.includes(sig));
}

/**
 * A row is a COLUMN HEADER ROW if:
 * - ≥ 2 non-empty cells
 * - At least 2 cells are whole-word column keywords
 * - Not mostly numeric (would be a data row)
 */
function isHeaderRow(row: any[]): boolean {
  const cells = nonEmptyCells(row);
  if (cells.length < 2) return false;

  let matchCount  = 0;
  let numericCount = 0;

  for (const c of cells) {
    if (isColumnKeyword(c)) matchCount++;
    if (isNumericOrDate(c))  numericCount++;
  }

  if (numericCount >= cells.length - 1) return false;   // mostly numeric → data row
  return matchCount >= 2;
}

/**
 * Returns the stock quantity if the row is a UNIT IN STOCK row, null otherwise.
 */
function parseUnitInStockRow(row: any[]): number | null {
  const joined = row.map(norm).join(" ");
  if (!UNIT_IN_STOCK_PATTERNS.some(p => p.test(joined))) return null;

  const m = joined.match(/(\d[\d,]*)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
}

// ── Product-row detection (the key function) ──────────────────────────────────
//
// Returns { itemName, unitInStock } when the row represents a new product block
// boundary.  Returns null for everything else.
//
// Detection precedence:
//   1. PRODUCT_KEYWORDS match on first text cell        → always a product row
//   2. Single-cell text that is not a column header     → original heuristic
//
// In both cases:
//   - Company name → skip
//   - Header row   → skip
//   - Numeric/date first cell → skip
//   - If second cell is a number → treat as inline unit-in-stock

interface ProductRowResult {
  itemName:    string;
  unitInStock: number | null;
}

function detectProductRow(row: any[]): ProductRowResult | null {
  const cells = nonEmptyCells(row);

  // Never more than 3 cells (beyond that it is almost certainly a data row)
  if (cells.length === 0 || cells.length > 3) return null;

  // First cell must start with text
  const firstCell = cells[0];
  if (!firstCell || isNumericOrDate(firstCell)) return null;
  if (!/[a-zA-Z]/.test(firstCell))              return null;

  // Skip company / organisation name repetitions
  if (isCompanyName(firstCell)) return null;

  // Skip column header rows (they have ≥ 2 header keywords across all cells)
  if (isHeaderRow(row)) return null;

  // ── Signal 1: product keyword match ─────────────────────────────────────
  const matchesProduct = hasProductKeyword(firstCell);

  // ── Signal 2: single-cell text that is not a column header keyword ───────
  const isSingleTextOnly =
    cells.length === 1 &&
    firstCell.length >= 3 &&
    !isColumnKeyword(firstCell);

  if (!matchesProduct && !isSingleTextOnly) return null;

  // ── Extract inline unit-in-stock (e.g. "BANQUET CHAIR  200") ────────────
  let unitInStock: number | null = null;
  if (cells.length >= 2) {
    const secondCell = cells[1];
    if (isNumericOrDate(secondCell) && !/[a-zA-Z]/.test(secondCell)) {
      const n = parseFloat(secondCell.replace(/[^0-9.]/g, ""));
      if (!isNaN(n) && n >= 0) unitInStock = n;
    }
  }

  return { itemName: firstCell, unitInStock };
}

// ── Main detector ─────────────────────────────────────────────────────────────

export interface BlockDetectionResult {
  blocks:       ItemBlock[];
  mode:         "block" | "flat";
  blockCount:   number;
  totalDataRows: number;
}

export function detectBlocks(rawRows: any[][]): BlockDetectionResult {
  const blocks: ItemBlock[] = [];

  let currentItemName:    string | null = null;
  let currentUnitInStock: number | null = null;
  let currentHeaders:     string[]      = [];
  let currentDataRows:    string[][]    = [];
  let inDataSection = false;

  function flushBlock() {
    if (currentItemName && currentHeaders.length > 0 && currentDataRows.length > 0) {
      blocks.push({
        itemName:    currentItemName,
        unitInStock: currentUnitInStock,
        headers:     currentHeaders,
        rows:        currentDataRows,
      });
    }
  }

  for (const rawRow of rawRows) {
    const row   = rawRow.map(v => norm(v));
    const cells = nonEmptyCells(row);

    // ── Empty row: skip silently ─────────────────────────────────────────────
    if (cells.length === 0) continue;

    // ── UNIT IN STOCK row (Pattern A: stock on its own row) ──────────────────
    // Check BEFORE product-row detection so "UNIT IN STOCK 200" is never
    // mistakenly treated as a new product block.
    const stockQty = parseUnitInStockRow(row);
    if (stockQty !== null) {
      if (currentItemName) currentUnitInStock = stockQty;
      inDataSection = false;   // header row follows
      continue;
    }

    // ── Product row → close previous block, open new one ─────────────────────
    const productRow = detectProductRow(row);
    if (productRow) {
      flushBlock();
      currentItemName    = productRow.itemName;
      // Inline stock (Pattern B) overrides — Pattern A stock row may still follow
      currentUnitInStock = productRow.unitInStock;
      currentHeaders     = [];
      currentDataRows    = [];
      inDataSection      = false;
      continue;
    }

    // ── Column header row (first header after product row) ────────────────────
    if (currentItemName && !inDataSection && isHeaderRow(row)) {
      currentHeaders = row;
      inDataSection  = true;
      continue;
    }

    // ── Data row ──────────────────────────────────────────────────────────────
    if (currentItemName && inDataSection) {
      // Skip repeated header rows inside data section (some sheets repeat them)
      if (cells.length >= 2 && isHeaderRow(row)) continue;
      currentDataRows.push(row);
    }
  }

  // Flush last block
  flushBlock();

  const totalDataRows = blocks.reduce((sum, b) => sum + b.rows.length, 0);

  if (blocks.length === 0) {
    return { blocks: [], mode: "flat", blockCount: 0, totalDataRows: 0 };
  }

  return {
    blocks,
    mode:         "block",
    blockCount:   blocks.length,
    totalDataRows,
  };
}
