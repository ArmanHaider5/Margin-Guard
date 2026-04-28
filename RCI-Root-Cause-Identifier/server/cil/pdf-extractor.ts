// ─────────────────────────────────────────────────────────────────────────────
// CIL PDF EXTRACTOR
//
// Converts PDF raw text into a pseudo-table structure that the CIL pipeline
// can process identically to an Excel sheet.
//
// Approach — line-by-line scan:
//   1. Extract invoice metadata (ref no, date, customer)
//   2. Detect line-item lines — lines with a text description + 1–4 numbers
//   3. Skip summary/total lines (Subtotal, GST, Tax, Total, etc.)
//   4. Return a pseudo-table: headers + rows matching CIL column mapper keys
//
// The pseudo-table uses standard headers that map directly through the
// existing column-mapper without any changes:
//   ["description", "qty", "unit price", "amount", "date", "invoice no"]
//
// Rules:
//   - Does NOT alter any existing document parser
//   - Tolerant to messy PDF whitespace and encoding artifacts
//   - Works for invoices, quotations, and generic line-item documents
//   - Returns null if no line items could be extracted
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfExtractionResult {
  invoiceRef:   string | null;
  invoiceDate:  string | null;
  customer:     string | null;
  pseudoTable:  { name: string; headers: string[]; rows: string[][] } | null;
  lineCount:    number;
  parsedItems:  number;
}

// ── Patterns ──────────────────────────────────────────────────────────────────

// Invoice / document reference number
const REF_PATTERNS = [
  /invoice\s*(?:no|number|#)[.:\s]*([A-Z0-9][\w\-\/]{1,30})/i,
  /inv[.:\s]*([A-Z0-9][\w\-\/]{1,30})/i,
  /quotation\s*(?:no|number|#)[.:\s]*([A-Z0-9][\w\-\/]{1,30})/i,
  /quote\s*(?:no|#)[.:\s]*([A-Z0-9][\w\-\/]{1,30})/i,
  /receipt\s*(?:no|#)[.:\s]*([A-Z0-9][\w\-\/]{1,30})/i,
  /doc(?:ument)?\s*(?:no|#)[.:\s]*([A-Z0-9][\w\-\/]{1,30})/i,
  /ref(?:erence)?\s*(?:no|#)?[.:\s]*([A-Z0-9][\w\-\/]{1,30})/i,
  /\b(INV[-\/][\w\-\/]{2,20})\b/i,
  /\b(QT[-\/][\w\-\/]{2,20})\b/i,
];

// Date patterns
const DATE_PATTERNS = [
  /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/,
  /\b(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/,
  /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i,
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i,
];

// Customer patterns
const CUSTOMER_PATTERNS = [
  /(?:bill\s*to|to|customer|sold\s*to|client)[.:\s]+([A-Za-z][\w\s,.()'&-]{3,60})/i,
  /(?:attn|attention)[.:\s]+([A-Za-z][\w\s,.()'&-]{3,40})/i,
];

// Lines to SKIP — summary / footer / non-item lines
const SKIP_PATTERNS = [
  /^\s*(?:sub)?total/i,
  /^\s*(?:grand\s*total)/i,
  /^\s*(?:gst|sst|tax|vat|service\s*charge)/i,
  /^\s*(?:discount|less\s*disc)/i,
  /^\s*(?:balance\s*due|amount\s*due|due)/i,
  /^\s*(?:deposit|downpayment)/i,
  /^\s*(?:page|invoice|quotation|receipt|bill|date|no\.|ref)/i,
  /^\s*(?:thank\s*you|terms|payment|bank|account|note|remark)/i,
  /^\s*[-=_*]{3,}/,         // separator lines
  /^\s*$/,                  // empty
];

// Headers / column title rows to skip
const HEADER_ROW_PATTERNS = [
  /description.*(?:qty|quantity).*(?:price|amount)/i,
  /item.*(?:qty|quantity).*(?:price|amount)/i,
  /(?:no|#)\s+(?:description|item)/i,
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanNum(s: string): number | null {
  const c = s.replace(/[^0-9.]/g, "");
  const n = parseFloat(c);
  return isNaN(n) ? null : n;
}

/** Extract all numeric tokens from a string. Returns [value, originalToken][] */
function extractNumbers(line: string): Array<{ val: number; raw: string; idx: number }> {
  const results: Array<{ val: number; raw: string; idx: number }> = [];
  // Match: optional RM/$ prefix, digits with optional comma separators, optional decimal
  const rx = /(?:RM\s?|MYR\s?|\$\s?)?(\d[\d,]*(?:\.\d+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(line)) !== null) {
    // Skip numbers immediately followed by a letter — these are embedded in
    // descriptions (e.g. "6ft", "2pcs", "A4", "1st", "M1"). They are not
    // prices or quantities.
    const charAfter = line[m.index + m[0].length];
    if (charAfter && /[a-zA-Z]/.test(charAfter)) continue;

    const val = cleanNum(m[1]);
    if (val !== null) {
      results.push({ val, raw: m[0], idx: m.index });
    }
  }
  return results;
}

/** Strip leading line-number / bullet: "1.", "1)", "(1)", "#1" */
function stripLeadingIndex(s: string): string {
  return s.replace(/^\s*(?:\d+[.)]\s*|[#*•]\s*)/, "").trim();
}

/** True if string looks like just a number (possibly with RM/,) */
function isNumericOnly(s: string): boolean {
  return /^\s*(?:RM\s?|MYR\s?|\$\s?)?[\d,]+(?:\.\d+)?\s*$/.test(s);
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1]?.trim() ?? null;
  }
  return null;
}

// ── Line item extractor ───────────────────────────────────────────────────────

interface LineItem {
  description: string;
  qty:         string;
  unitPrice:   string;
  amount:      string;
  rawLine:     string;
}

/**
 * Parse a single text line into a line item.
 * Returns null if the line doesn't look like a product/service entry.
 *
 * Layout heuristic:
 *   Leading text = description
 *   Numbers at end (right-to-left): amount, unit_price, qty
 *   If only 2 numbers: amount + (could be qty or unit_price)
 *   If only 1 number: treat as amount
 */
function parseLineItem(line: string): LineItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Skip known non-item lines
  for (const p of SKIP_PATTERNS) if (p.test(trimmed)) return null;
  for (const p of HEADER_ROW_PATTERNS) if (p.test(trimmed)) return null;

  const nums = extractNumbers(trimmed);
  if (nums.length === 0) return null;

  // Need at least 1 meaningful number (the amount)
  // The amount is always the LAST number
  const amount = nums[nums.length - 1];

  // Very small "amounts" (< 0.01) are likely row-indexes — skip
  if (amount.val < 0.01) return null;

  // Extract the description: text BEFORE the first number
  const firstNumIdx = nums[0].idx;
  let descRaw = trimmed.slice(0, firstNumIdx).trim();
  descRaw = stripLeadingIndex(descRaw);

  // If description is empty or purely numeric, skip
  if (!descRaw || isNumericOnly(descRaw) || descRaw.length < 2) return null;

  // Description should have at least one letter
  if (!/[a-zA-Z]/.test(descRaw)) return null;

  let qty       = "";
  let unitPrice = "";

  if (nums.length === 1) {
    // Only amount
    qty = "";
    unitPrice = "";
  } else if (nums.length === 2) {
    // Likely: qty + amount  OR  unit_price + amount
    const first = nums[0];
    // If first value is a small integer (≤ 9999), treat as qty
    if (Number.isInteger(first.val) && first.val > 0 && first.val <= 9999) {
      qty = String(first.val);
    } else {
      unitPrice = String(first.val);
    }
  } else if (nums.length >= 3) {
    // qty  unit_price  amount
    qty       = String(nums[nums.length - 3].val);
    unitPrice = String(nums[nums.length - 2].val);
  }

  return {
    description: descRaw,
    qty,
    unitPrice,
    amount: String(amount.val),
    rawLine: trimmed,
  };
}

// ── Main extractor ────────────────────────────────────────────────────────────

export function extractPdfLineItems(rawText: string): PdfExtractionResult {
  const lines = rawText.split(/\r?\n/);

  // ── Step 1: Extract document metadata ────────────────────────────────────
  const invoiceRef  = firstMatch(rawText, REF_PATTERNS);
  const invoiceDate = firstMatch(rawText, DATE_PATTERNS);
  const customer    = firstMatch(rawText, CUSTOMER_PATTERNS);

  console.log(`[CIL:PDF] Ref: ${invoiceRef}, Date: ${invoiceDate}, Customer: ${customer}`);

  // ── Step 2: Parse line items ──────────────────────────────────────────────
  const items: LineItem[] = [];

  for (const line of lines) {
    const item = parseLineItem(line);
    if (item) items.push(item);
  }

  console.log(`[CIL:PDF] Extracted ${items.length} line items from ${lines.length} lines`);

  if (items.length === 0) {
    return { invoiceRef, invoiceDate, customer, pseudoTable: null, lineCount: lines.length, parsedItems: 0 };
  }

  // ── Step 3: Build pseudo-table ────────────────────────────────────────────
  // IMPORTANT: column order determines mapping priority.
  // "amount" must come before "unit price" so the column-mapper assigns
  // "amount" → value (score 100) before "unit price" can claim it (score 10).
  //
  //   "description" → entityName      (exact match, score 100)
  //   "qty"         → quantityOut     (partial match via "qty out")
  //   "amount"      → value           (exact match, score 100)
  //   "unit price"  → unmapped        (value already taken — informational only)
  //   "date"        → date            (exact match, score 100)
  //   "invoice no"  → referenceId     (exact match, score 100)
  const headers = ["description", "qty", "amount", "unit price", "date", "invoice no"];

  const rows = items.map(item => [
    item.description,
    item.qty,
    item.amount,      // column 2 = amount (maps to value)
    item.unitPrice,   // column 3 = unit price (informational, likely unmapped)
    invoiceDate ?? "",
    invoiceRef  ?? "",
  ]);

  const pseudoTable = {
    name: "PDF Line Items",
    headers,
    rows,
  };

  return {
    invoiceRef,
    invoiceDate,
    customer,
    pseudoTable,
    lineCount:   lines.length,
    parsedItems: items.length,
  };
}
