import { describe, it, expect } from "vitest";
import { buildDiagnosticScope } from "../diagnostic-scope.js";

describe("buildDiagnosticScope — unit", () => {
  it("returns [] when there are no business concerns", () => {
    expect(buildDiagnosticScope([], "SUFFICIENT")).toEqual([]);
    expect(buildDiagnosticScope(undefined, "SUFFICIENT")).toEqual([]);
  });

  it("status is INSUFFICIENT_EVIDENCE when evidence level is NONE", () => {
    const scope = buildDiagnosticScope(["Client is concerned about delivery delays."], "NONE");
    expect(scope).toHaveLength(1);
    expect(scope[0].status).toBe("INSUFFICIENT_EVIDENCE");
    expect(scope[0].concernText).toBe("Client is concerned about delivery delays.");
    expect(scope[0].origin).toBe("BUSINESS_CONCERN");
  });

  it("status is UNVALIDATED when evidence level is PARTIAL — a concern is never auto-correlated to specific evidence", () => {
    const scope = buildDiagnosticScope(["Management is concerned about inventory shrinkage."], "PARTIAL");
    expect(scope[0].status).toBe("UNVALIDATED");
  });

  it("status is UNVALIDATED when evidence level is SUFFICIENT — evidence existing elsewhere does not make this specific concern 'supported'", () => {
    const scope = buildDiagnosticScope(["Management is concerned about inventory shrinkage."], "SUFFICIENT");
    expect(scope[0].status).toBe("UNVALIDATED");
  });

  it("never produces SUPPORTED or NOT_SUPPORTED — those are reserved for a future correlation mechanism this milestone does not implement", () => {
    for (const level of ["NONE", "PARTIAL", "SUFFICIENT"] as const) {
      const scope = buildDiagnosticScope(["some concern"], level);
      expect(scope[0].status).not.toBe("SUPPORTED");
      expect(scope[0].status).not.toBe("NOT_SUPPORTED");
    }
  });

  it("preserves concern text verbatim (trimmed) and filters blank entries", () => {
    const scope = buildDiagnosticScope(["  Inventory losses  ", "", "   ", "Margin erosion"], "SUFFICIENT");
    expect(scope.map(s => s.concernText)).toEqual(["Inventory losses", "Margin erosion"]);
  });

  it("ids are deterministic for a given input", () => {
    const a = buildDiagnosticScope(["Concern A", "Concern B"], "SUFFICIENT");
    const b = buildDiagnosticScope(["Concern A", "Concern B"], "SUFFICIENT");
    expect(a).toEqual(b);
    expect(a.map(s => s.id)).toEqual(["scope-0", "scope-1"]);
  });

  it("never throws on malformed input", () => {
    expect(() => buildDiagnosticScope(null as any, undefined)).not.toThrow();
    expect(buildDiagnosticScope(null as any, undefined)).toEqual([]);
    expect(buildDiagnosticScope([123 as any, null as any, "real concern"], "SUFFICIENT").map(s => s.concernText)).toEqual(["real concern"]);
  });
});
