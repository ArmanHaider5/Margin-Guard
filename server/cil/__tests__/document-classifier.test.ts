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
