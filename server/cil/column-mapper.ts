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
  // Manufacturing Evidence Contract (E.2) — production quantity, kept fully
  // independent of quantityOut/quantityIn (movement events, not production
  // events). Populated only from an explicit, narrowly-qualified header —
  // see SYNONYM_TABLE below — never derived from quantityOut/quantityIn.
  plannedQuantity?:         number;
  actualQuantity?:          number;
  balance?:                 number;
  value?:                   number;
  refund?:                  number;
  date?:                    number;
  // Manufacturing Evidence Contract (E.2) — promised/actual date pair, kept
  // fully independent of the generic `date` key so both can coexist on the
  // same row. Populated only from an explicit, narrowly-qualified header;
  // never derived from one another or from `date`.
  promisedDate?:            number;
  actualDate?:              number;
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
  // ── Manufacturing Evidence Contract (E.2) ──────────────────────────────────
  // Deliberately narrow: exactly the approved explicit header form, nothing
  // broader. "Orders Planned"/"Orders Dispatched" (dispatch_log vocabulary)
  // and bare "Qty"/"Quantity"/"Qty Out"/"Qty In" must never match — only the
  // literal phrase below does, via an exact (score 100) match.
  ["plannedQuantity", [
    "planned production",
  ]],
  ["actualQuantity", [
    "actual qty produced",
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
  // ── Manufacturing Evidence Contract (E.2) ──────────────────────────────────
  // Exact-match-only synonyms. A header like "Promised Date" scores 100
  // against "promised date" here, which always outscores `date`'s 60-point
  // substring match on the same header (`date` is a whole word inside
  // "promised date") — so this key wins and `date` is never assigned to it,
  // with no ordering dependency on where this entry sits in the table.
  // "Delivery Date" / "Dispatch Date" / bare "Date" are NOT listed here and
  // continue to map to `date` exactly as before.
  ["promisedDate", [
    "promised date",
  ]],
  ["actualDate", [
    "actual date",
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

// ── Manufacturing Evidence Contract (E.2) — exact-match-only keys ─────────────
// Regression-discovered: matchesSynonym()'s reverse-match tier (score 40)
// let the disapproved bare header "Actual Qty" claim `actualQuantity` because
// "actual qty" is a whitespace-bounded prefix of the approved synonym
// "actual qty produced". The shared matchesSynonym() tiering is correct and
// intentional for every pre-existing key (e.g. "qty" matching "qty out") and
// is left untouched here. Instead, for exactly these four newly introduced
// keys, any score below 100 (exact) is treated as no match at all — so only
// their one approved literal synonym can ever claim a column, and no other
// existing key's matching behaviour changes.
const EXACT_MATCH_ONLY_KEYS: ReadonlySet<StandardKey> = new Set<StandardKey>([
  "promisedDate", "actualDate", "plannedQuantity", "actualQuantity",
]);

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
        let score = matchesSynonym(norm, syn);
        if (EXACT_MATCH_ONLY_KEYS.has(key) && score !== 100) score = 0;
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
