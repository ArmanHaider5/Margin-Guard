// ─────────────────────────────────────────────────────────────────────────────
// CIL COLUMN MAPPER
//
// Identifies what each column means even when names vary between documents.
// No hardcoding for specific company formats.
//
// Returns a ColumnMap: an object that maps standardised keys to the actual
// column index found in this document.
//
// Matching strategy (word-boundary):
//   1. Exact      — normalised header === synonym           → score 100
//   2. Fwd        — synonym appears as whole word(s) in header → score 60
//   3. Rev        — header appears as whole word(s) in synonym → score 40
//
// Word-boundary matching prevents short tokens such as "out", "in", "stock"
// from firing on unrelated headers like "amount", "invoice", "outstanding".
// ─────────────────────────────────────────────────────────────────────────────

// ── Safe string helper ────────────────────────────────────────────────────────
// Converts any value to a lowercase trimmed string. Never throws on null/undefined.
function safeString(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase().trim();
}

export interface ColumnMap {
  entityName?:              number;
  customer?:                number;
  quantityOut?:             number;
  quantityIn?:              number;
  balance?:                 number;
  value?:                   number;
  refund?:                  number;
  date?:                    number;
  referenceId?:             number;
  remarks?:                 number;
  driver?:                  number;
  vehicle?:                 number;
  // Event Management operational signals
  operationalDelay?:        number;
  dispatchStatus?:          number;
  recoveryStatus?:          number;
  operationalSubstitution?: number;
}

type StandardKey = keyof ColumnMap;

// Each entry is: [standardKey, synonyms[]]
// Order matters only as a tiebreaker when two keys score equally —
// earlier entries win.  Within a key, exact matches always score 100
// regardless of order.
const SYNONYM_TABLE: [StandardKey, string[]][] = [
  ["entityName", [
    "item", "item name", "description", "product", "goods", "material",
    "name", "particulars", "article", "asset", "equipment", "sku", "part",
  ]],
  // Note: bare "customer" is intentionally absent here — it maps to
  // `remarks` below so that movement-log "Customer" columns (containing
  // free-text notes) are not confused with a debtor/buyer entity.
  // Compound forms like "customer name" still match via the fwd/rev rules.
  ["customer", [
    "client", "debtor", "buyer", "company", "account",
    "sold to", "bill to", "customer name", "cust",
  ]],
  ["quantityOut", [
    // Explicit keyword list (user-specified)
    "outgoing", "out", "dispatch", "qty out",
    // Extended synonyms
    "issued", "dispatched",
    "sold", "quantity out", "out qty", "loaded", "debit",
    // Event Management — missing / lost items
    "missing items", "missing item", "lost items", "items missing",
  ]],
  ["quantityIn", [
    // Explicit keyword list (user-specified)
    "incoming", "in", "return", "received",
    // Extended synonyms
    "returned", "receipt",
    "qty in", "quantity in", "in qty", "unloaded", "credit", "balance in",
  ]],
  ["balance", [
    // Explicit keyword list (user-specified)
    "balance", "stock",
    // Compound forms that must win over "in" → quantityIn
    "in stock", "opening stock", "closing stock",
    // Extended synonyms
    "closing", "on hand", "available", "closing bal",
    "closing balance", "balance qty", "net stock",
  ]],
  ["value", [
    "amount", "total", "value", "price", "cost", "rm", "ringgit",
    "total amount", "total value", "nett", "net", "subtotal", "invoice amount",
    "sale amount", "selling price",
    // Event Management — damage / recovery amounts
    "recovery amount", "recovered amount", "damage cost", "damage value",
    "loss amount", "charge amount",
  ]],
  ["refund", [
    "refund", "deduction", "rebate", "discount", "credit note",
    "adjustment", "cr", "deduct",
  ]],
  ["date", [
    "date", "transaction date", "invoice date", "doc date", "delivery date",
    "movement date", "period", "posting date", "created",
  ]],
  ["referenceId", [
    "invoice no", "invoice number", "inv no", "ref", "reference",
    "job no", "job id", "order no", "po no", "do no", "delivery order",
    "receipt no", "doc no", "document no",
  ]],
  ["remarks", [
    // Explicit keyword list (user-specified)
    "remarks", "customer", "notes",
    // Extended synonyms
    "note", "comment", "remark", "memo", "narrative",
  ]],
  ["driver", [
    "driver", "driver name", "operator", "pic", "person in charge",
  ]],
  ["vehicle", [
    "vehicle", "lorry", "truck", "plate", "plate no", "registration",
    "vehicle no",
  ]],
  // ── Event Management operational signals ──────────────────────────────────
  ["operationalDelay", [
    "delay mins", "delay minutes", "delay min", "delay time",
    "late mins", "late minutes", "delay duration",
  ]],
  ["dispatchStatus", [
    "dispatch complete", "dispatch complete?", "dispatch status",
    "dispatch ok", "dispatched?", "completed?",
  ]],
  ["recoveryStatus", [
    "charge recovered", "charge recovered?", "recovery status",
    "recovered?", "payment recovered", "cost recovered",
  ]],
  ["operationalSubstitution", [
    "substitutions", "substitution", "substitute", "substituted",
    "replacements", "replacement",
  ]],
];

function normaliseHeader(h: any): string {
  return safeString(h).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

// ── Word-boundary matcher ─────────────────────────────────────────────────────
// Prevents partial-string false positives:
//   "out"  must not match "amount", "account", "outstanding"
//   "in"   must not match "invoice", "incoming" (only exact "in")
//   "stock" must not match "in stock" as quantityIn
//
// Returns a score: 100 = exact, 60 = syn as whole words in header,
//                  40 = header as whole words in syn, 0 = no match.
function matchesSynonym(norm: string, syn: string): number {
  // 1. Exact match — unambiguous, highest priority
  if (norm === syn) return 100;

  // 2. Synonym appears as whole word(s) inside the normalised header
  //    e.g. syn "dispatch" inside "dispatch qty"
  const escapedSyn  = syn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexFwd    = new RegExp(`(?:^|\\s)${escapedSyn}(?:\\s|$)`);
  if (regexFwd.test(norm)) return 60;

  // 3. Header appears as whole word(s) inside the synonym
  //    e.g. norm "qty" inside syn "qty out"
  const escapedNorm = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexRev    = new RegExp(`(?:^|\\s)${escapedNorm}(?:\\s|$)`);
  if (regexRev.test(syn)) return 40;

  return 0;
}

export function mapColumns(headers: string[]): {
  columnMap:    ColumnMap;
  mappingTrace: Record<string, string | null>;
} {
  const columnMap:    ColumnMap                     = {};
  const mappingTrace: Record<string, string | null> = {};

  for (let i = 0; i < headers.length; i++) {
    const norm = normaliseHeader(headers[i]);
    if (!norm) continue;

    let bestKey:   StandardKey | null = null;
    let bestScore: number             = 0;

    for (const [key, synonyms] of SYNONYM_TABLE) {
      // Skip keys already filled by an earlier (higher-priority) column
      if (columnMap[key] !== undefined) continue;

      for (const syn of synonyms) {
        const score = matchesSynonym(norm, syn);
        if (score > bestScore) {
          bestScore = score;
          bestKey   = key;
        }
        if (bestScore === 100) break;   // can't do better — stop early
      }
      if (bestScore === 100) break;
    }

    // safeString guarantees the trace key is never null/undefined
    const headerLabel = safeString(headers[i]) || `col_${i}`;
    if (bestKey && bestScore > 0) {
      (columnMap as any)[bestKey] = i;
      mappingTrace[headerLabel]   = `→ ${bestKey} (col ${i}, score ${bestScore})`;
    } else {
      mappingTrace[headerLabel] = null;
    }
  }

  return { columnMap, mappingTrace };
}
