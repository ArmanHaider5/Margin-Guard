// ─────────────────────────────────────────────────────────────────────────────
// CIL DOCUMENT CLASSIFIER
//
// Classifies extracted document text into a standardised document type using
// keyword scoring. Works on rawText + table headers — no hardcoding for any
// specific company format.
//
// Classification order (highest score wins):
//   movement_log → inventory_record → invoice → quotation →
//   sales_sheet → logistics_schedule → loss_record → unknown
// ─────────────────────────────────────────────────────────────────────────────

import type { CilDocClass } from "@shared/schema";

interface ClassifierRule {
  docClass: CilDocClass;
  keywords: string[];
  weight: number;
}

const RULES: ClassifierRule[] = [
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

export function classifyDocument(
  rawText: string,
  headers: string[],
): {
  docClass: CilDocClass;
  confidence: number;
  scores: Record<string, number>;
} {
  const probe = [rawText.toLowerCase().slice(0, 8000), ...headers.map(h => h.toLowerCase())].join(" ");

  const scores: Record<string, number> = {};

  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const count = (probe.match(new RegExp(kw, "g")) || []).length;
      score += count * rule.weight;
    }
    if (score > 0) scores[rule.docClass] = score;
  }

  if (Object.keys(scores).length === 0) {
    return { docClass: "unknown", confidence: 0, scores };
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const total = sorted.reduce((sum, [, v]) => sum + v, 0);
  const confidence = total > 0 ? Math.round((top[1] / total) * 100) : 0;

  return {
    docClass: top[0] as CilDocClass,
    confidence,
    scores,
  };
}
