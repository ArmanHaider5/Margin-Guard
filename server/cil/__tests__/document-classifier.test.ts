import { describe, it, expect } from "vitest";
import { classifyDocument } from "../document-classifier";
import { parseRow } from "../row-parser";
import type { ColumnMap } from "../column-mapper";

// ─────────────────────────────────────────────────────────────────────────────
// First dedicated test suite for server/cil/document-classifier.ts.
//
// Covers the controlled 4-sheet workbook used in the dispatch_log
// classification investigation, plus regression coverage for the classifier's
// own documented examples (see the file header comment in
// document-classifier.ts) so a future rule change can't silently break an
// existing class without a test failing.
// ─────────────────────────────────────────────────────────────────────────────

describe("classifyDocument — controlled workbook (dispatch_log fix)", () => {
  it("Delivery Performance -> logistics_schedule", () => {
    const headers = [
      "Order ID", "Order Date", "Customer", "Promised Delivery", "Actual Delivery",
      "On Time", "Delay Days", "Order Value (RM)", "Product", "Dispatch Route",
      "Delay Reason", "Notes",
    ];
    const result = classifyDocument("", headers);
    expect(result.docClass).toBe("logistics_schedule");
  });

  it("Dispatch Log -> dispatch_log (not logistics_schedule, not movement_log)", () => {
    const headers = [
      "Dispatch Date", "Route", "Driver", "Vehicle", "Planned Departure",
      "Actual Departure", "Orders Planned", "Orders Dispatched",
      "Capacity Utilization", "Scheduling Method", "Exception", "Supervisor Note",
    ];
    const result = classifyDocument("", headers);
    expect(result.docClass).toBe("dispatch_log");
    expect(result.docClass).not.toBe("logistics_schedule");
    expect(result.docClass).not.toBe("movement_log");
    // dispatch_log must genuinely outscore both competing classes, not just
    // win a tie — guards against a future rule change eroding the margin.
    expect(result.scores.dispatch_log).toBeGreaterThan(result.scores.logistics_schedule ?? 0);
    expect(result.scores.dispatch_log).toBeGreaterThan(result.scores.movement_log ?? 0);
  });

  it("Inventory Exceptions -> inventory_record", () => {
    const headers = [
      "Date", "Product", "Required Qty", "Available Qty", "Shortfall Qty",
      "Order ID", "Production Status", "Pick Status", "Release Delay (Hours)",
      "Exception Reason",
    ];
    const result = classifyDocument("", headers);
    expect(result.docClass).toBe("inventory_record");
  });

  it("Management Summary -> unknown (no rule currently matches this vocabulary)", () => {
    const headers = ["Metric", "Value", "Management Note"];
    const result = classifyDocument("", headers);
    expect(result.docClass).toBe("unknown");
  });
});

describe("classifyDocument — existing documented examples remain unchanged", () => {
  // These mirror the exact examples in document-classifier.ts's own header
  // comment (Tier 1/Tier 2 doc block) — regression coverage that a future
  // rule addition (like this one) doesn't erode an already-correct class.
  it('"TOTAL INV" / "NETT INV" -> sales_sheet', () => {
    const result = classifyDocument("", ["Item", "TOTAL INV", "NETT INV"]);
    expect(result.docClass).toBe("sales_sheet");
  });

  it('"OUTGOING" / "INCOMING" -> movement_log', () => {
    const result = classifyDocument("", ["Item", "OUTGOING", "INCOMING"]);
    expect(result.docClass).toBe("movement_log");
  });

  it('"AMOUNT" / "UNIT PRICE" -> invoice', () => {
    const result = classifyDocument("", ["Item", "AMOUNT", "UNIT PRICE", "Invoice No"]);
    expect(result.docClass).toBe("invoice");
  });

  it("quotation-specific headers -> quotation", () => {
    const result = classifyDocument("", ["Item", "Quotation No", "Quoted Price", "Validity"]);
    expect(result.docClass).toBe("quotation");
  });

  it("loss/damage headers -> loss_record", () => {
    const result = classifyDocument("", ["Item", "Loss", "Damaged", "Write Off", "Shrinkage"]);
    expect(result.docClass).toBe("loss_record");
  });

  it("driver/vehicle/waybill headers -> logistics_schedule (unaffected by the new dispatch_log rule)", () => {
    const result = classifyDocument("", ["Driver Name", "Vehicle No", "Waybill", "Consignment"]);
    expect(result.docClass).toBe("logistics_schedule");
  });
});

describe("dispatch_log — same downstream transactionType fallback as logistics_schedule (documented, not changed)", () => {
  // row-parser.ts is intentionally NOT modified by this fix. This test
  // documents the current, pre-existing behavior: dispatch_log and
  // logistics_schedule are not among row-parser's 5 specially-branched
  // classes (loss_record, sales_sheet, invoice, damage_record, quotation),
  // so both fall through to the identical default transactionType. If a
  // future change to row-parser.ts special-cases one of them differently,
  // this test will catch the divergence.
  it("parseRow() produces the same transactionType for dispatch_log and logistics_schedule on an identical row", () => {
    const headers = ["Item", "Qty Out"];
    const colMap: ColumnMap = { entityName: 0, quantityOut: 1 };
    const row = ["Widget", "10"];

    const dispatchLogResult      = parseRow(row, headers, colMap, "dispatch_log");
    const logisticsScheduleResult = parseRow(row, headers, colMap, "logistics_schedule");

    expect(dispatchLogResult.length).toBeGreaterThan(0);
    expect(logisticsScheduleResult.length).toBeGreaterThan(0);
    expect(dispatchLogResult[0].transactionType).toBe(logisticsScheduleResult[0].transactionType);
    expect(dispatchLogResult[0].transactionType).toBe("outgoing");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Model 2: mode-aware Tier 2 scoring (structuredEvidence option).
//
// Structured/tabular evidence: Tier 2 keyword occurrence counting is capped
// at 1 per keyword (min(count, 1) * weight) — repetition of the same word
// across many rows no longer inflates a class's score, but a keyword's mere
// PRESENCE still counts at full weight, so classes with no Tier 1 signal
// (loss_record) keep their only source of evidence.
//
// Free-text/document evidence (the default — option omitted): completely
// unbounded, byte-identical to production behavior before this change.
//
// Fixtures below reconstruct the controlled workbook's realistic row-level
// repetition (this environment has no access to the literal uploaded
// workbook, so exact scores are not claimed to reproduce the original 293
// figure — only the same failure/fix mechanism, verified against the real,
// unmodified classifyDocument() export).
// ─────────────────────────────────────────────────────────────────────────────

function buildDispatchLogRawText(): { headers: string[]; rawText: string } {
  const headers = [
    "Dispatch Date", "Route", "Driver", "Vehicle", "Planned Departure",
    "Actual Departure", "Orders Planned", "Orders Dispatched",
    "Capacity Utilization", "Scheduling Method", "Exception", "Supervisor Note",
  ];
  const routes = ["North Route", "South Route", "East Route", "West Route"];
  const drivers = ["Driver A", "Driver B", "Driver C", "Driver D"];
  const vehicles = ["VAN-01", "VAN-02", "TRUCK-01", "TRUCK-02"];
  const methods = ["Manual", "Automatic"];
  const rows: string[] = [];
  for (let i = 0; i < 20; i++) {
    rows.push([
      46237 + i, routes[i % 4], drivers[i % 4], vehicles[i % 4],
      "08:00", "08:10", 8, 8, "82%", methods[i % 2],
      i % 7 === 0 ? "Late departure" : "", i % 5 === 0 ? "Checked by supervisor" : "",
    ].join(" "));
  }
  return { headers, rawText: rows.join(" ") };
}

describe("classifyDocument — structuredEvidence: Dispatch Log (critical regression)", () => {
  it("realistic 20-row Dispatch Log rawText -> dispatch_log, NOT logistics_schedule", () => {
    const { headers, rawText } = buildDispatchLogRawText();
    const result = classifyDocument(rawText, headers, { structuredEvidence: true });
    expect(result.docClass).toBe("dispatch_log");
    expect(result.docClass).not.toBe("logistics_schedule");
    expect(result.scores.dispatch_log).toBeGreaterThan(result.scores.logistics_schedule ?? 0);
  });

  it("the same rawText WITHOUT structuredEvidence still shows the pre-fix inflation (documents why the option is necessary)", () => {
    const { headers, rawText } = buildDispatchLogRawText();
    const result = classifyDocument(rawText, headers);
    expect(result.scores.logistics_schedule).toBeGreaterThan(result.scores.dispatch_log ?? 0);
  });
});

describe("classifyDocument — structuredEvidence: realistic multi-row fixtures", () => {
  it("Delivery Performance realistic rawText -> logistics_schedule", () => {
    const headers = ["Order ID","Order Date","Customer","Promised Delivery","Actual Delivery","On Time","Delay Days","Order Value (RM)","Product","Dispatch Route","Delay Reason","Notes"];
    const customers = ["Acme Sdn Bhd","Beta Trading","Gamma Holdings","Delta Enterprise"];
    const products = ["Widget A","Widget B","Gadget C","Gadget D"];
    const reasons = ["Traffic","Weather","None","Vehicle issue"];
    const rows: string[] = [];
    for (let i = 0; i < 20; i++) {
      rows.push([`ORD-${1000+i}`, 46200+i, customers[i%4], 46200+i, 46200+i+(i%3), i%3===0?"No":"Yes", i%3, 500+i*10, products[i%4], "Dispatch Route "+(i%2), reasons[i%4], ""].join(" "));
    }
    const result = classifyDocument(rows.join(" "), headers, { structuredEvidence: true });
    expect(result.docClass).toBe("logistics_schedule");
  });

  it("Inventory Exceptions realistic rawText -> inventory_record", () => {
    const headers = ["Date","Product","Required Qty","Available Qty","Shortfall Qty","Order ID","Production Status","Pick Status","Release Delay (Hours)","Exception Reason"];
    const products = ["Widget A","Widget B","Gadget C","Gadget D"];
    const statuses = ["Complete","Pending","In Progress"];
    const reasons = ["Supplier delay","Quality hold","None","Machine downtime"];
    const rows: string[] = [];
    for (let i = 0; i < 20; i++) rows.push([46200+i, products[i%4], 100, 100-(i%10), i%10, `ORD-${2000+i}`, statuses[i%3], statuses[(i+1)%3], i%6, reasons[i%4]].join(" "));
    const result = classifyDocument(rows.join(" "), headers, { structuredEvidence: true });
    expect(result.docClass).toBe("inventory_record");
  });

  // Management Summary: recording the ACTUAL, honest post-fix behavior —
  // this fixture's KPI notes legitimately mention several DISTINCT
  // cross-domain keywords (driver, dispatch, vehicle, delivery, capacity,
  // departure), and a presence-based cap (CAP=1) cannot remove distinct-
  // keyword evidence, only repetition of the same keyword. So this remains
  // logistics_schedule, not unknown — a known, separately-scoped residual
  // limitation of Model 2, not an assertion that the architecture fixes it.
  // (Reconstructed fixture — the literal uploaded workbook text is not
  // available in this environment.)
  it("Management Summary realistic rawText -> logistics_schedule (documented residual limitation, NOT unknown)", () => {
    const headers = ["Metric", "Value", "Management Note"];
    const rawText = [
      "On-Time Delivery Rate 92% Improved from last month due to better route planning",
      "Driver Utilization 88% Two drivers on leave this period",
      "Dispatch Accuracy 97% Minor exceptions in vehicle scheduling",
      "Inventory Shortfall Rate 4% Related to supplier delays",
      "Vehicle Capacity Utilization 82% Consistent with planned departure targets",
    ].join(" ");
    const result = classifyDocument(rawText, headers, { structuredEvidence: true });
    // Honest expectation, not an artificial one: Model 2 reduces this
    // anomaly (uncapped this fixture scores logistics_schedule=27; capped
    // it scores 15) but does not eliminate it, because the false signal
    // here comes from keyword BREADTH, not repetition, which a per-keyword
    // occurrence cap does not address by design.
    expect(result.docClass).toBe("logistics_schedule");
    expect(result.scores.logistics_schedule).toBe(15);
  });

  it("loss_record with GENERIC headers (Date/Item/Reason/Qty) and varied loss vocabulary in row values -> loss_record (critical regression case)", () => {
    const headers = ["Date", "Item", "Reason", "Qty"];
    const reasons = ["Damaged", "Missing", "Stolen", "Expired", "Shortage", "Write-off", "Scrap", "Spoilage"];
    const rows: string[] = [];
    for (let i = 0; i < 20; i++) rows.push(`46200 Item-${i} ${reasons[i % 8]} 1`);
    const result = classifyDocument(rows.join(" "), headers, { structuredEvidence: true });
    expect(result.docClass).toBe("loss_record");
  });

  it("loss_record with GENERIC headers and DEGENERATE (single repeated word) loss vocabulary -> loss_record", () => {
    const headers = ["Date", "Item", "Reason", "Qty"];
    const rows: string[] = [];
    for (let i = 0; i < 20; i++) rows.push(`46200 Item-${i} Damaged 1`);
    const result = classifyDocument(rows.join(" "), headers, { structuredEvidence: true });
    expect(result.docClass).toBe("loss_record");
  });

  it("movement_log with realistic repeated type-column values -> movement_log", () => {
    const headers = ["Date", "Item", "Type", "Qty"];
    const types = ["Outgoing", "Incoming", "Issued", "Dispatched"];
    const rows: string[] = [];
    for (let i = 0; i < 20; i++) rows.push(`46200 Item-${i} ${types[i % 4]} 10`);
    const result = classifyDocument(rows.join(" "), headers, { structuredEvidence: true });
    expect(result.docClass).toBe("movement_log");
  });
});

describe("classifyDocument — free-text callers are unaffected by structuredEvidence", () => {
  const invoiceRawText = `TAX INVOICE
Invoice No: INV-2026-0451
Invoice Date: 12 September 2026
Bill To: Acme Sdn Bhd
Description: Consulting services rendered for Q3 2026.
Subtotal: RM 12,500.00
GST (6%): RM 750.00
Total Amount Due: RM 13,250.00
Payment Terms: 30 days from invoice date.
Please remit to the bank account stated below.`;

  const quotationRawText = `QUOTATION
Quotation No: QT-2026-0091
Validity: 30 days from date of issue
Dear Sir/Madam, please find our quoted price below for your review.
Item: Office renovation works
Unit Price: RM 45,000.00
Terms and Conditions apply as per our standard proposal.
This quotation is subject to confirmation of purchase order.`;

  it("PDF/Word-style invoice free text, no structuredEvidence option -> invoice (unchanged production behavior)", () => {
    const result = classifyDocument(invoiceRawText, []);
    expect(result.docClass).toBe("invoice");
  });

  it("PDF/Word-style quotation free text, no structuredEvidence option -> quotation (unchanged production behavior)", () => {
    const result = classifyDocument(quotationRawText, []);
    expect(result.docClass).toBe("quotation");
  });

  it("backward compatibility: classifyDocument(rawText, headers) with no third argument produces the exact same result as explicitly passing structuredEvidence: false", () => {
    const withNoThirdArg   = classifyDocument(invoiceRawText, []);
    const withExplicitFalse = classifyDocument(invoiceRawText, [], { structuredEvidence: false });
    expect(withNoThirdArg.docClass).toBe(withExplicitFalse.docClass);
    expect(withNoThirdArg.scores).toEqual(withExplicitFalse.scores);
  });

  it("structuredEvidence option omitted does not change free-text scores at all (identical to today's production output)", () => {
    const result = classifyDocument(invoiceRawText, []);
    // Fixed, known-correct score for this exact fixture — protects against
    // any future accidental change to Tier 2's default (unbounded) path.
    expect(result.scores.invoice).toBe(48);
  });
});

describe("classifyDocument — Tier 1 structural scoring is completely unaffected by structuredEvidence", () => {
  it("a header-only fixture with no repeated keywords produces identical Tier 1 scores with and without structuredEvidence", () => {
    const headers = ["Driver Name", "Vehicle No", "Waybill", "Consignment"];
    const withoutOption = classifyDocument("", headers);
    const withOption    = classifyDocument("", headers, { structuredEvidence: true });
    expect(withoutOption.scores).toEqual(withOption.scores);
    expect(withoutOption.docClass).toBe(withOption.docClass);
  });
});
