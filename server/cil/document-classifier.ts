// ─────────────────────────────────────────────────────────────────────────────
// CIL DOCUMENT CLASSIFIER
//
// Three-tier scoring — highest total score wins:
//
//   Tier 1 — Structural column signals  (weight 8 per matching header)
//     Specific column header patterns that strongly indicate a doc type.
//     e.g. "TOTAL INV" / "NETT INV" → sales_sheet
//          "OUTGOING"  / "INCOMING" → movement_log
//          "AMOUNT"    / "UNIT PRICE" → invoice
//
//   Tier 2 — Keyword scan               (weight 2–3 × occurrence count)
//     Text & header keyword matching, same as before.
//
//   Tier 3 — Numeric column density     (bonus 20 if ≥ 4 money headers)
//     If there are ≥ 4 distinct money-type column headers, it is most
//     likely a sales summary/sales_sheet.
//
//   Tier 1 weight >> Tier 2 weight so structure always beats keyword noise.
// ─────────────────────────────────────────────────────────────────────────────

import type { CilDocClass } from "@shared/schema";

// ── Safe string helper ────────────────────────────────────────────────────────
// Converts any value to a lowercase trimmed string. Never throws on null/undefined.
function safeString(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase().trim();
}

// ── Tier 2: keyword rules (unchanged logic) ───────────────────────────────────

interface ClassifierRule {
  docClass: CilDocClass;
  keywords: string[];
  weight:   number;
}

const KEYWORD_RULES: ClassifierRule[] = [
  {
    docClass: "movement_log",
    weight: 3,
    keywords: [
      "outgoing", "incoming", "balance", "movement", "issue", "issued",
      "dispatch", "dispatched", "return", "returned", "transfer",
      "stock movement", "quantity out", "quantity in", "qty out", "qty in",
      "out stock", "in stock", "loaded", "unloaded",
    ],
  },
  {
    docClass: "inventory_record",
    weight: 2,
    keywords: [
      "inventory", "stock", "balance", "on hand", "available", "warehouse",
      "sku", "item code", "item no", "part no", "part number", "bin",
      "stock count", "physical count", "book quantity", "reorder",
    ],
  },
  {
    docClass: "invoice",
    weight: 3,
    keywords: [
      "invoice", "invoice no", "inv no", "tax invoice", "bill to",
      "amount due", "total amount", "subtotal", "gst", "sst", "tax",
      "payment terms", "due date", "remit to", "invoice date",
    ],
  },
  {
    docClass: "quotation",
    weight: 3,
    keywords: [
      "quotation", "quote", "proposal", "quotation no", "validity",
      "quoted price", "unit price", "price list", "price per",
      "terms and conditions", "po number", "purchase order",
    ],
  },
  {
    docClass: "sales_sheet",
    weight: 2,
    keywords: [
      "sales", "total inv", "refund", "nett", "net sales", "gross sales",
      "revenue", "receipt", "transaction", "pos", "daily sales",
      "monthly sales", "commission", "rebate", "discount",
    ],
  },
  {
    docClass: "logistics_schedule",
    weight: 3,
    keywords: [
      "driver", "lorry", "truck", "vehicle", "delivery", "route",
      "trip", "shipment", "consignment", "cargo", "manifest",
      "loading", "unloading", "eta", "arrival", "departure",
      "waybill", "tracking",
    ],
  },
  {
    docClass: "loss_record",
    weight: 3,
    keywords: [
      "loss", "damage", "damaged", "write off", "write-off", "scrap",
      "stolen", "missing", "shortage", "variance", "discrepancy",
      "claim", "insurance", "spoilage", "expired", "shrinkage",
    ],
  },
];

// ── Tier 1: structural column signals ────────────────────────────────────────
// Each pattern is tested against every individual header (normalised).
// Every match adds `score` to the corresponding docClass.
// Weight is intentionally 8 — much larger than keyword weight (2–3) so that
// the presence of a structural column overrides keyword co-incidences.

interface StructuralSignal {
  docClass: CilDocClass;
  patterns: RegExp[];
  score:    number;
}

const STRUCTURAL_SIGNALS: StructuralSignal[] = [
  // ── sales_sheet ─────────────────────────────────────────────────────────
  {
    docClass: "sales_sheet",
    score: 8,
    patterns: [
      /\btotal\s*inv\b/i,        // "TOTAL INV", "Total Inv Amount"
      /\bnett?\s*inv\b/i,        // "NETT INV", "NET INV"
      /\bnett?\s*(amount|sales|total|value)?\b/i, // "NETT", "NETT AMOUNT"
      /\bgross\s*(amount|sales|total|value)?\b/i, // "GROSS", "GROSS SALES"
      /\btotal\s*(sales|revenue|collection)\b/i,  // "TOTAL SALES"
      /\bdaily\s*(total|sales)\b/i,               // "DAILY TOTAL"
      /\bweekly\s*(total|sales)\b/i,
      /\bmonthly\s*(total|sales)\b/i,
    ],
  },

  // ── movement_log ────────────────────────────────────────────────────────
  {
    docClass: "movement_log",
    score: 8,
    patterns: [
      /^outgoing$/i,              // exact "OUTGOING" header
      /^incoming$/i,              // exact "INCOMING" header
      /\boutgoing\b/i,            // "OUTGOING QTY", "TOTAL OUTGOING"
      /\bincoming\b/i,            // "INCOMING QTY"
      /\bqty\s*(out|in)\b/i,     // "QTY OUT", "QTY IN"
      /\bquantity\s*(out|in)\b/i, // "QUANTITY OUT", "QUANTITY IN"
      /\bstock\s*(out|in)\b/i,    // "STOCK OUT", "STOCK IN"
      /\bissued\s*(qty|quantity)?\b/i, // "ISSUED", "ISSUED QTY"
      /\bdispatched?\b/i,         // "DISPATCH", "DISPATCHED"
    ],
  },

  // ── invoice ─────────────────────────────────────────────────────────────
  {
    docClass: "invoice",
    score: 8,
    patterns: [
      /^amount$/i,                          // standalone "AMOUNT" column
      /\btotal\s*amount\b/i,               // "TOTAL AMOUNT"
      /\bunit\s*price\b/i,                 // "UNIT PRICE"
      /\bunit\s*cost\b/i,                  // "UNIT COST"
      /\bsubtotal\b/i,                     // "SUBTOTAL"
      /\b(gst|sst|tax)\b/i,               // tax columns
      /\binvoice\s*(no|date|amount)?\b/i,  // "INVOICE NO", "INVOICE DATE"
    ],
  },

  // ── quotation ───────────────────────────────────────────────────────────
  {
    docClass: "quotation",
    score: 8,
    patterns: [
      /\bquote\s*(no|price|amount)?\b/i,  // "QUOTE NO", "QUOTE PRICE"
      /\bquotation\b/i,                   // "QUOTATION"
      /\bunit\s*price\b/i,                // "UNIT PRICE" (shared with invoice, lower confidence)
      /\bprice\s*per\b/i,                 // "PRICE PER UNIT"
    ],
  },

  // ── inventory_record ────────────────────────────────────────────────────
  {
    docClass: "inventory_record",
    score: 8,
    patterns: [
      /\bunit\s*(in\s*stock|on\s*hand)\b/i, // "UNIT IN STOCK", "UNIT ON HAND"
      /\bstock\s*(level|count|balance|qty|quantity)\b/i,
      /\bbalance\s*(qty|on\s*hand|stock)?\b/i, // "BALANCE", "BALANCE QTY"
      /\breorder\s*(level|point|qty)?\b/i,
      /\bopening\s*(stock|balance|qty)\b/i,
      /\bclosing\s*(stock|balance|qty)\b/i,
    ],
  },

  // ── logistics_schedule ──────────────────────────────────────────────────
  {
    docClass: "logistics_schedule",
    score: 8,
    patterns: [
      /\bdriver\s*(name|id|no)?\b/i,
      /\b(vehicle|truck|lorry)\s*(no|plate|id)?\b/i,
      /\b(eta|etd)\b/i,
      /\bwaybill\b/i,
      /\bconsignment\b/i,
      /\btrip\s*(no|id|date)?\b/i,
    ],
  },
];

// ── Tier 3: numeric column density check ──────────────────────────────────────
// Headers that strongly indicate a money / numeric column.
// If ≥ 4 distinct money headers are present, the document is almost certainly
// a financial summary / sales_sheet, not a simple invoice.

const MONEY_HEADER_PATTERNS: RegExp[] = [
  /\bamount\b/i,
  /\bprice\b/i,
  /\btotal\b/i,
  /\bnett?\b/i,
  /\bgross\b/i,
  /\bvalue\b/i,
  /\bcost\b/i,
  /\brev(?:enue)?\b/i,
  /\bsales\b/i,
  /\binv\b/i,
  /\bsubtotal\b/i,
  /\brm\b/i,
  /\bdiscount\b/i,
  /\bcommission\b/i,
  /\brebate\b/i,
  /\bcollection\b/i,
];

const MONEY_DENSITY_BONUS     = 20;
const MONEY_DENSITY_THRESHOLD = 4;

function countMoneyHeaders(headers: string[]): number {
  return headers.filter(h =>
    MONEY_HEADER_PATTERNS.some(p => p.test(h)),
  ).length;
}

// ── Normalise ─────────────────────────────────────────────────────────────────

function normalizeHeader(h: any): string {
  return safeString(h).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

// ── Main export ───────────────────────────────────────────────────────────────

export function classifyDocument(
  rawText: string,
  headers: string[],
): {
  docClass:   CilDocClass;
  confidence: number;
  scores:     Record<string, number>;
} {
  const scores: Record<string, number> = {};

  const add = (cls: string, pts: number) => {
    scores[cls] = (scores[cls] ?? 0) + pts;
  };

  // ── Tier 1: structural column signals ──────────────────────────────────
  const normHeaders = headers.map(normalizeHeader);

  for (const signal of STRUCTURAL_SIGNALS) {
    for (const header of normHeaders) {
      if (signal.patterns.some(p => p.test(header))) {
        add(signal.docClass, signal.score);
        // Only count each header once per signal group to avoid double-boosting
        // when a single header matches multiple patterns in the same signal.
        break;
      }
    }
  }

  // ── Tier 2: keyword scan ───────────────────────────────────────────────
  // Probe = first 8 000 chars of rawText + all headers joined
  const probe = [
    safeString(rawText).slice(0, 8000),
    ...normHeaders,
  ].join(" ");

  for (const rule of KEYWORD_RULES) {
    let kwScore = 0;
    for (const kw of rule.keywords) {
      const count = (probe.match(new RegExp(kw, "g")) ?? []).length;
      kwScore += count * rule.weight;
    }
    if (kwScore > 0) add(rule.docClass, kwScore);
  }

  // ── Tier 3: numeric column density ────────────────────────────────────
  const moneyCount = countMoneyHeaders(normHeaders);
  if (moneyCount >= MONEY_DENSITY_THRESHOLD) {
    add("sales_sheet", MONEY_DENSITY_BONUS);
    console.log(
      `[Classifier] Money-column density: ${moneyCount} headers → +${MONEY_DENSITY_BONUS} to sales_sheet`,
    );
  }

  // ── Final scoring ──────────────────────────────────────────────────────
  console.log(`[Classifier] Tier breakdown — headers: ${normHeaders.join(", ")}`);
  console.log(`[Classifier] Raw scores:`, scores);

  if (Object.keys(scores).length === 0) {
    return { docClass: "unknown", confidence: 0, scores };
  }

  const sorted     = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topClass, topScore] = sorted[0];
  const total      = sorted.reduce((sum, [, v]) => sum + v, 0);
  const confidence = total > 0 ? Math.round((topScore / total) * 100) : 0;

  return {
    docClass:   topClass as CilDocClass,
    confidence,
    scores,
  };
}
