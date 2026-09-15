import { describe, it, expect } from "vitest";
import { mapColumns } from "../column-mapper";

// ─────────────────────────────────────────────────────────────────────────────
// Regression coverage for the E.2 "Actual Qty" defect: mapColumns()'s reverse-
// match tier (score 40) previously let the disapproved bare header "Actual
// Qty" claim `actualQuantity`, because "actual qty" is a whitespace-bounded
// prefix of the approved synonym "actual qty produced". Fixed by making the
// four new Manufacturing Evidence Contract (E.2) keys exact-match-only,
// without touching matchesSynonym() or any pre-existing key's behaviour.
// ─────────────────────────────────────────────────────────────────────────────

describe("mapColumns — Manufacturing Evidence Contract (E.2) boundary", () => {

  it("'Actual Qty Produced' maps to actualQuantity", () => {
    const { columnMap } = mapColumns(["Actual Qty Produced"]);
    expect(columnMap.actualQuantity).toBe(0);
  });

  it("'Actual Qty' (bare, disapproved) does NOT map to actualQuantity", () => {
    const { columnMap } = mapColumns(["Actual Qty"]);
    expect(columnMap.actualQuantity).toBeUndefined();
  });

  it("'Planned Production' maps to plannedQuantity", () => {
    const { columnMap } = mapColumns(["Planned Production"]);
    expect(columnMap.plannedQuantity).toBe(0);
  });

  it("'Planned Qty' (bare, disapproved) does NOT map to plannedQuantity", () => {
    const { columnMap } = mapColumns(["Planned Qty"]);
    expect(columnMap.plannedQuantity).toBeUndefined();
  });

  it("'Promised Date' maps to promisedDate", () => {
    const { columnMap } = mapColumns(["Promised Date"]);
    expect(columnMap.promisedDate).toBe(0);
  });

  it("'Actual Date' maps to actualDate", () => {
    const { columnMap } = mapColumns(["Actual Date"]);
    expect(columnMap.actualDate).toBe(0);
  });

  it("'Delivery Date' still maps to generic date, not promisedDate/actualDate", () => {
    const { columnMap } = mapColumns(["Delivery Date"]);
    expect(columnMap.date).toBe(0);
    expect(columnMap.promisedDate).toBeUndefined();
    expect(columnMap.actualDate).toBeUndefined();
  });

  it("'Actual Departure' does NOT map to actualDate", () => {
    const { columnMap } = mapColumns(["Actual Departure"]);
    expect(columnMap.actualDate).toBeUndefined();
  });

  it("'Orders Dispatched' still maps to quantityOut (pre-existing, unaffected)", () => {
    const { columnMap } = mapColumns(["Orders Dispatched"]);
    expect(columnMap.quantityOut).toBe(0);
  });

  it("'Orders Planned' does NOT map to plannedQuantity (or any E.2 field)", () => {
    const { columnMap } = mapColumns(["Orders Planned"]);
    expect(columnMap.plannedQuantity).toBeUndefined();
    expect(columnMap.actualQuantity).toBeUndefined();
    expect(columnMap.promisedDate).toBeUndefined();
    expect(columnMap.actualDate).toBeUndefined();
  });

  it("Promised Date and Actual Date coexist on the same header row without competing for `date`", () => {
    const { columnMap } = mapColumns(["Promised Date", "Actual Date", "Value"]);
    expect(columnMap.promisedDate).toBe(0);
    expect(columnMap.actualDate).toBe(1);
    expect(columnMap.date).toBeUndefined();
    expect(columnMap.value).toBe(2);
  });

  it("full Production Schedule header row: only the approved forms map, abbreviated forms stay unmapped", () => {
    const { columnMap, mappingTrace } = mapColumns([
      "Promised Date", "Actual Date", "Planned Qty", "Actual Qty", "Reference No", "Value",
    ]);
    expect(columnMap.promisedDate).toBe(0);
    expect(columnMap.actualDate).toBe(1);
    expect(columnMap.plannedQuantity).toBeUndefined();
    expect(columnMap.actualQuantity).toBeUndefined();
    expect(columnMap.referenceId).toBe(4);
    expect(columnMap.value).toBe(5);
    expect(mappingTrace["planned qty"]).toBeNull();
    expect(mappingTrace["actual qty"]).toBeNull();
  });

  it("full Production Quantity Boundary header row: approved full forms map correctly", () => {
    const { columnMap } = mapColumns([
      "Planned Production", "Actual Qty Produced", "Qty Out", "Qty In", "Date", "Reference",
    ]);
    expect(columnMap.plannedQuantity).toBe(0);
    expect(columnMap.actualQuantity).toBe(1);
    expect(columnMap.quantityOut).toBe(2);
    expect(columnMap.quantityIn).toBe(3);
    expect(columnMap.date).toBe(4);
    expect(columnMap.referenceId).toBe(5);
  });
});
