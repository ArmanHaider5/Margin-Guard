// ─────────────────────────────────────────────────────────────────────────────
// CIL BLOCK DETECTOR
//
// Handles multi-block Excel sheets where a single sheet contains multiple
// product/item sections, each with its own header row and movement rows.
//
// Typical layout:
//   BANQUET CHAIR                ← item name row  (single non-empty cell)
//   UNIT IN STOCK   200          ← stock row      (optional)
//   DATE  OUT  IN  BALANCE  …    ← header row
//   2025-01-01  10  5  190  …   ← data rows
//   …
//   ROUND TABLE                  ← next item name row → new block begins
//   …
//
// Returns:
//   null  → sheet looks flat (use existing pipeline)
//   ItemBlock[]  → use block mode (≥1 block found)
//
// Rules:
//   - Does NOT assume any specific company format
//   - Tolerant to blank rows between blocks
//   - Works alongside flat mode — falls back automatically when <1 block found
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemBlock {
  itemName:    string;
  unitInStock: number | null;
  headers:     string[];
  rows:        string[][];
}

// ── Keyword sets for detection ────────────────────────────────────────────────

const COLUMN_KEYWORDS = new Set([
  "date", "out", "in", "outgoing", "incoming", "balance", "stock",
  "issued", "returned", "received", "dispatch", "delivery", "qty",
  "quantity", "amount", "value", "rm", "ref", "customer", "name",
  "item", "description", "return", "remarks", "driver", "vehicle",
  "invoice", "refund", "total", "lorry", "truck",
]);

const UNIT_IN_STOCK_PATTERNS = [
  /unit\s*in\s*stock/i,
  /units\s*in\s*stock/i,
  /opening\s*stock/i,
  /stok\s*semasa/i,
  /current\s*stock/i,
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm(v: any): string {
  return String(v ?? "").trim();
}

function nonEmptyCells(row: any[]): string[] {
  return row.map(norm).filter(c => c !== "");
}

function isNumericOrDate(s: string): boolean {
  // Pure number
  if (/^[\d,.\s]+$/.test(s)) return true;
  // Excel serial date range
  const n = parseFloat(s);
  if (!isNaN(n) && n > 30000 && n < 60000) return true;
  // Date-like string
  if (/^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(s)) return true;
  return false;
}

function isKnownHeaderKeyword(s: string): boolean {
  const lower = s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  if (COLUMN_KEYWORDS.has(lower)) return true;
  for (const kw of COLUMN_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

/**
 * A row is an "item name row" if:
 * - Exactly 1 non-empty cell
 * - That cell is ≥ 3 chars
 * - Not purely numeric / date
 * - Not a known column header keyword
 * - Contains at least one letter
 */
function isItemNameRow(row: any[]): false | string {
  const cells = nonEmptyCells(row);
  if (cells.length !== 1) return false;

  const cell = cells[0];
  if (cell.length < 3) return false;
  if (isNumericOrDate(cell)) return false;
  if (isKnownHeaderKeyword(cell)) return false;
  if (!/[a-zA-Z]/.test(cell)) return false;

  return cell;
}

/**
 * A row is a "header row" if:
 * - ≥ 2 non-empty cells
 * - At least 2 cells match known column keywords
 * - Does NOT look like a data row (i.e. not mostly numbers/dates)
 */
function isHeaderRow(row: any[]): boolean {
  const cells = nonEmptyCells(row);
  if (cells.length < 2) return false;

  let matchCount = 0;
  let numericCount = 0;

  for (const c of cells) {
    if (isKnownHeaderKeyword(c)) matchCount++;
    if (isNumericOrDate(c)) numericCount++;
  }

  // Reject if row is mostly numeric (data row)
  if (numericCount >= cells.length - 1) return false;

  return matchCount >= 2;
}

/**
 * Returns true if row contains a "unit in stock" pattern.
 */
function isUnitInStockRow(row: any[]): number | null {
  const joined = row.map(norm).join(" ");
  const isMatch = UNIT_IN_STOCK_PATTERNS.some(p => p.test(joined));
  if (!isMatch) return null;

  // Try to extract number from the row
  const numMatch = joined.match(/(\d[\d,]*)/);
  if (numMatch) {
    return parseInt(numMatch[1].replace(/,/g, ""), 10);
  }
  return 0;
}

// ── Main detector ─────────────────────────────────────────────────────────────

export interface BlockDetectionResult {
  blocks:    ItemBlock[];
  mode:      "block" | "flat";
  blockCount: number;
  totalDataRows: number;
}

export function detectBlocks(rawRows: any[][]): BlockDetectionResult {
  const blocks: ItemBlock[] = [];

  let currentItemName: string | null = null;
  let currentUnitInStock: number | null = null;
  let currentHeaders: string[] = [];
  let currentDataRows: string[][] = [];
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
    const row = rawRow.map(v => norm(v));
    const cells = nonEmptyCells(row);

    // ── Empty row: separator, don't end block immediately ─────────────────────
    if (cells.length === 0) continue;

    // ── UNIT IN STOCK row ─────────────────────────────────────────────────────
    const stockQty = isUnitInStockRow(row);
    if (stockQty !== null) {
      if (currentItemName) currentUnitInStock = stockQty;
      inDataSection = false; // reset — header comes after
      continue;
    }

    // ── Item name row → start new block ───────────────────────────────────────
    const itemName = isItemNameRow(row);
    if (itemName) {
      flushBlock();
      currentItemName    = itemName;
      currentUnitInStock = null;
      currentHeaders     = [];
      currentDataRows    = [];
      inDataSection      = false;
      continue;
    }

    // ── Header row (within a block) ───────────────────────────────────────────
    if (currentItemName && !inDataSection && isHeaderRow(row)) {
      currentHeaders  = row;
      inDataSection   = true;
      continue;
    }

    // ── Data row ──────────────────────────────────────────────────────────────
    if (currentItemName && inDataSection) {
      // Skip rows that look like sub-headers / totals
      const looksLikeHeader = cells.length >= 2 && isHeaderRow(row);
      if (looksLikeHeader) continue;

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
    mode: "block",
    blockCount: blocks.length,
    totalDataRows,
  };
}
