import { describe, it, expect } from "vitest";
import { computeEventSignals } from "../event-signals.js";

describe("computeEventSignals — assessed flag (zero events must not read as perfect measured performance)", () => {
  it("empty transactions — assessed: false, alongside the pre-existing neutral 100/0% defaults", () => {
    const signals = computeEventSignals([]);
    expect(signals.assessed).toBe(false);
    // The neutral numeric defaults are unchanged (backward compatible for any
    // consumer still reading them directly) — what changed is that
    // `assessed` now exists so a consumer CAN tell these apart from a real
    // measurement. See report-composer.ts, which gates on this.
    expect(signals.eventReadinessScore).toBe(100);
    expect(signals.dispatchReliabilityScore).toBe(100);
    expect(signals.assetAccountabilityScore).toBe(100);
    expect(signals.totalDispatches).toBe(0);
  });

  it("non-empty transactions with zero dispatch-shaped rows — still assessed: false (same 'nothing to measure' outcome via the computed path, not just the early-return)", () => {
    const signals = computeEventSignals([
      { transactionType: "adjustment", quantity: 5 },
      { transactionType: "inbound", quantity: 10 },
    ]);
    expect(signals.assessed).toBe(false);
    expect(signals.totalDispatches).toBe(0);
    expect(signals.eventReadinessScore).toBe(100);
  });

  it("real dispatch-shaped transactions — assessed: true, and a real failure shows up as a real rate, not a suppressed default", () => {
    const signals = computeEventSignals([
      { transactionType: "dispatch_event", rawText: "Dispatch Complete?: No", quantity: 10 },
      { transactionType: "dispatch_event", rawText: "Dispatch Complete?: Yes", quantity: 10 },
    ]);
    expect(signals.assessed).toBe(true);
    expect(signals.totalDispatches).toBe(2);
    expect(signals.dispatchFailureRate).toBeCloseTo(0.5, 5);
    // A real, measured failure rate correctly pulls the readiness score below
    // the "nothing measured" 100 — proving the fix didn't disable real
    // scoring, only the false-positive "perfect" case.
    expect(signals.eventReadinessScore).toBeLessThan(100);
  });
});
