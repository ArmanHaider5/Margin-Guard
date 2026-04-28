// ─────────────────────────────────────────────────────────────────────────────
// CIL COLUMN MAPPER
//
// Identifies what each column means even when names vary between documents.
// No hardcoding for specific company formats.
//
// Returns a ColumnMap: an object that maps standardised keys to the actual
// column index found in this document.
// ─────────────────────────────────────────────────────────────────────────────

export interface ColumnMap {
  entityName?:    number;
  customer?:      number;
  quantityOut?:   number;
  quantityIn?:    number;
  balance?:       number;
  value?:         number;
  refund?:        number;
  date?:          number;
  referenceId?:   number;
  remarks?:       number;
  driver?:        number;
  vehicle?:       number;
}

type StandardKey = keyof ColumnMap;

// Each entry is: [standardKey, synonyms[]]
const SYNONYM_TABLE: [StandardKey, string[]][] = [
  ["entityName", [
    "item", "item name", "description", "product", "goods", "material",
    "name", "particulars", "article", "asset", "equipment", "sku", "part",
  ]],
  ["customer", [
    "customer", "client", "debtor", "buyer", "company", "account",
    "sold to", "bill to", "customer name", "cust",
  ]],
  ["quantityOut", [
    "outgoing", "out", "issued", "dispatch", "dispatched", "delivery",
    "sold", "qty out", "quantity out", "out qty", "loaded", "debit",
  ]],
  ["quantityIn", [
    "incoming", "in", "return", "returned", "received", "receipt",
    "qty in", "quantity in", "in qty", "unloaded", "credit", "balance in",
  ]],
  ["balance", [
    "balance", "stock", "closing", "on hand", "available", "closing bal",
    "closing balance", "balance qty", "net stock",
  ]],
  ["value", [
    "amount", "total", "value", "price", "cost", "rm", "ringgit",
    "total amount", "total value", "nett", "net", "subtotal", "invoice amount",
    "sale amount", "selling price",
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
    "remarks", "note", "notes", "comment", "description", "remark",
    "memo", "narrative",
  ]],
  ["driver", [
    "driver", "driver name", "operator", "pic", "person in charge",
  ]],
  ["vehicle", [
    "vehicle", "lorry", "truck", "plate", "plate no", "registration",
    "vehicle no",
  ]],
];

function normaliseHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function mapColumns(headers: string[]): {
  columnMap: ColumnMap;
  mappingTrace: Record<string, string | null>;
} {
  const columnMap: ColumnMap = {};
  const mappingTrace: Record<string, string | null> = {};

  for (let i = 0; i < headers.length; i++) {
    const norm = normaliseHeader(headers[i]);
    if (!norm) continue;

    let bestKey: StandardKey | null = null;
    let bestScore = 0;

    for (const [key, synonyms] of SYNONYM_TABLE) {
      // Already assigned to this key
      if (columnMap[key] !== undefined) continue;

      for (const syn of synonyms) {
        if (norm === syn) {
          // Exact match — highest priority
          bestKey = key;
          bestScore = 100;
          break;
        }
        if (norm.includes(syn) || syn.includes(norm)) {
          const score = syn.length + norm.length - Math.abs(syn.length - norm.length);
          if (score > bestScore) {
            bestScore = score;
            bestKey = key;
          }
        }
      }
      if (bestScore === 100) break;
    }

    if (bestKey && bestScore > 0) {
      (columnMap as any)[bestKey] = i;
      mappingTrace[headers[i]] = `→ ${bestKey} (col ${i}, score ${bestScore})`;
    } else {
      mappingTrace[headers[i]] = null;
    }
  }

  return { columnMap, mappingTrace };
}
