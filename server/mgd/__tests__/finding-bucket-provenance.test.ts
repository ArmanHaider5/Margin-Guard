import { describe, it, expect } from "vitest";
import { generateOperationalFindings } from "../findings-engine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Regression + correctness coverage for the Milestone D-series bucket-level
// finding provenance layer (server/mgd/findings-engine.ts).
//
// This is a DIFFERENT concept from server/mgd/__tests__/finding-evidence-
// provenance.test.ts, which covers evidence-engine.ts's category-level
// FindingEvidence[]. Deliberately named differently to avoid confusion
// between the two.
//
// `buildStats()` itself is not exported — its bucket-population correctness
// (byEntity/byDate sourceFiles/documentClasses, and that pre-existing scalar
// counting is unperturbed) is proven here indirectly, through the detectors
// that consume it, via generateOperationalFindings(). Every test below
// therefore serves double duty: it proves the specific detector's provenance
// is bucket-scoped and correctly isolated from unrelated documents, AND
// (via the exact confidence/severity assertions) that buildStats' underlying
// numeric counting is unchanged.
//
// All fixtures use industry: "manufacturing" so only GENERIC_DETECTORS run —
// no Event Management detector, EVENT_WEIGHT multiplier, or event-title
// suppression logic applies to any finding here.
// ─────────────────────────────────────────────────────────────────────────────

function tx(overrides: Record<string, unknown> = {}) {
  return {
    entityName: "Item",
    transactionType: "outbound",
    quantity: 1,
    value: 10,
    date: "2026-01-01",
    referenceId: "REF-1",
    documentClassification: "movement_log",
    sourceFile: "Sheet.xlsx",
    ...overrides,
  };
}

function findByTitle(findings: ReturnType<typeof generateOperationalFindings>, title: string) {
  return findings.find(f => f.title === title);
}

function signalIndexOf(signals: string[], pattern: RegExp): number {
  const idx = signals.findIndex(s => pattern.test(s));
  expect(idx).toBeGreaterThanOrEqual(0); // fail loudly if the expected signal never fired
  return idx;
}

describe("Finding bucket provenance — server/mgd/findings-engine.ts", () => {

  // ── B. Logistics peak-day provenance ─────────────────────────────────────
  it("B — detectLogisticsPressure: peak-day provenance is scoped to the peak day's own bucket", () => {
    const peakDayTxs = Array.from({ length: 20 }, (_, i) => tx({
      entityName: `Dispatch Item ${i}`,
      date: "2026-04-10",
      sourceFile: "Dispatch_Log.xlsx",
      documentClassification: "dispatch_log",
    }));
    const nonPeakDayTxs = [
      tx({ date: "2026-04-01", sourceFile: "Inventory_Other.xlsx", documentClassification: "movement_log" }),
      tx({ date: "2026-04-02", sourceFile: "Inventory_Other.xlsx", documentClassification: "movement_log" }),
      tx({ date: "2026-04-03", sourceFile: "Inventory_Other.xlsx", documentClassification: "movement_log" }),
      tx({ date: "2026-04-04", sourceFile: "Inventory_Other.xlsx", documentClassification: "movement_log" }),
      tx({ date: "2026-04-05", sourceFile: "Inventory_Other.xlsx", documentClassification: "movement_log" }),
    ];

    const findings = generateOperationalFindings({
      transactions: [...peakDayTxs, ...nonPeakDayTxs],
      documents: [],
      industry: "manufacturing",
    });

    const finding = findByTitle(findings, "Logistics Coordination Strain");
    expect(finding).toBeTruthy();
    // Numeric regression: deterministic hand-computed score (peak-day +20,
    // outbound-dominant +20, CV +10 = 50) — proves buildStats' underlying
    // counts (byDate.count, stats.outbound/inbound) are unperturbed.
    expect(finding!.confidence).toBe(50);
    expect(finding!.severity).toBe("HIGH");

    const idx = signalIndexOf(finding!.signals, /Peak single-day movement/);
    const entry = finding!.provenance?.find(p => p.signalIndex === idx);
    expect(entry).toBeTruthy();
    expect(entry!.sourceFiles).toEqual(["Dispatch_Log.xlsx"]);
    expect(entry!.documentClasses).toEqual(["dispatch_log"]);
    // The unrelated inventory document on other dates must NOT leak in.
    expect(entry!.sourceFiles).not.toContain("Inventory_Other.xlsx");
    expect(entry!.documentClasses).not.toContain("movement_log");
  });

  // ── C. Logistics-block provenance ────────────────────────────────────────
  it("C — detectLogisticsPressure: logistics-block provenance only includes transactions that set hasLogisticsBlock", () => {
    const blockTxs = [
      tx({ date: "2026-02-01", sourceFile: "BlockSource.xlsx", documentClassification: "logistics_schedule", debugTrace: { blockType: "logistics_schedule" } }),
      tx({ date: "2026-02-01", sourceFile: "BlockSource.xlsx", documentClassification: "logistics_schedule", debugTrace: { blockType: "logistics_schedule" } }),
      tx({ date: "2026-02-01", sourceFile: "BlockSource.xlsx", documentClassification: "logistics_schedule", debugTrace: { blockType: "logistics_schedule" } }),
    ];
    const nonBlockTxs = [
      tx({ date: "2026-02-02", sourceFile: "NoBlockSource.xlsx", documentClassification: "movement_log", transactionType: "inbound" }),
      tx({ date: "2026-02-02", sourceFile: "NoBlockSource.xlsx", documentClassification: "movement_log", transactionType: "inbound" }),
    ];

    const findings = generateOperationalFindings({
      transactions: [...blockTxs, ...nonBlockTxs],
      documents: [],
      industry: "manufacturing",
    });

    const finding = findByTitle(findings, "Logistics Coordination Strain");
    expect(finding).toBeTruthy();
    expect(finding!.confidence).toBe(20); // logistics-block signal only
    expect(finding!.severity).toBe("LOW");

    const idx = signalIndexOf(finding!.signals, /Logistics schedule blocks detected/);
    const entry = finding!.provenance?.find(p => p.signalIndex === idx);
    expect(entry).toBeTruthy();
    expect(entry!.sourceFiles).toEqual(["BlockSource.xlsx"]);
    expect(entry!.sourceFiles).not.toContain("NoBlockSource.xlsx");
  });

  // ── D. Warehouse top-3 provenance ────────────────────────────────────────
  it("D — detectWarehouseOperations: top-3 concentration provenance excludes the unrelated 4th entity", () => {
    const a = Array.from({ length: 10 }, (_, i) => tx({ entityName: "Widget A", referenceId: `A-${i}`, sourceFile: "Movement_A.xlsx", documentClassification: "movement_log" }));
    const b = Array.from({ length: 9 },  (_, i) => tx({ entityName: "Widget B", referenceId: `B-${i}`, sourceFile: "Movement_B.xlsx", documentClassification: "movement_log" }));
    const c = Array.from({ length: 8 },  (_, i) => tx({ entityName: "Widget C", referenceId: `C-${i}`, sourceFile: "Movement_C.xlsx", documentClassification: "movement_log" }));
    const d = [tx({ entityName: "Gadget D", referenceId: "D-1", sourceFile: "Dispatch_D.xlsx", documentClassification: "dispatch_log" })];

    const findings = generateOperationalFindings({
      transactions: [...a, ...b, ...c, ...d],
      documents: [],
      industry: "manufacturing",
    });

    const finding = findByTitle(findings, "Concentrated Warehouse Throughput Pressure");
    expect(finding).toBeTruthy();
    expect(finding!.confidence).toBe(25); // top-3 signal only
    expect(finding!.severity).toBe("LOW");

    const idx = signalIndexOf(finding!.signals, /Top 3 items account for/);
    const entry = finding!.provenance?.find(p => p.signalIndex === idx);
    expect(entry).toBeTruthy();
    expect(new Set(entry!.sourceFiles)).toEqual(new Set(["Movement_A.xlsx", "Movement_B.xlsx", "Movement_C.xlsx"]));
    expect(entry!.sourceFiles).not.toContain("Dispatch_D.xlsx");
    expect(entry!.documentClasses).toEqual(["movement_log"]);
    expect(entry!.documentClasses).not.toContain("dispatch_log");
  });

  // ── E. Warehouse rapid-turn provenance ───────────────────────────────────
  it("E — detectWarehouseOperations: rapid-turn provenance only includes the qualifying entity", () => {
    const rapid = [
      ...Array.from({ length: 6 }, (_, i) => tx({ entityName: "Widget E", referenceId: `E-in-${i}`,  transactionType: "inbound",  sourceFile: "Rapid_E.xlsx", documentClassification: "movement_log" })),
      ...Array.from({ length: 6 }, (_, i) => tx({ entityName: "Widget E", referenceId: `E-out-${i}`, transactionType: "outbound", sourceFile: "Rapid_E.xlsx", documentClassification: "movement_log" })),
    ];
    const unrelated = Array.from({ length: 3 }, (_, i) => tx({ entityName: "Widget F", referenceId: `F-${i}`, sourceFile: "Other_F.xlsx", documentClassification: "sales_sheet" }));

    const findings = generateOperationalFindings({
      transactions: [...rapid, ...unrelated],
      documents: [],
      industry: "manufacturing",
    });

    const finding = findByTitle(findings, "Concentrated Warehouse Throughput Pressure");
    expect(finding).toBeTruthy();
    expect(finding!.confidence).toBe(20); // rapid-turn signal only (only 2 entities, top-3 needs >=3)
    expect(finding!.severity).toBe("LOW");

    const idx = signalIndexOf(finding!.signals, /rapid inventory turnover detected/);
    const entry = finding!.provenance?.find(p => p.signalIndex === idx);
    expect(entry).toBeTruthy();
    expect(entry!.sourceFiles).toEqual(["Rapid_E.xlsx"]);
    expect(entry!.documentClasses).toEqual(["movement_log"]);
    expect(entry!.sourceFiles).not.toContain("Other_F.xlsx");
  });

  // ── F. Manual Dependency max-entity provenance ───────────────────────────
  it("F — detectManualDependency: max-entity provenance excludes the unrelated small entity", () => {
    const big   = Array.from({ length: 35 }, (_, i) => tx({ entityName: "Big Item",   referenceId: `BIG-${i}`,   sourceFile: "BigMovement.xlsx",   documentClassification: "movement_log" }));
    const small = Array.from({ length: 2 },  (_, i) => tx({ entityName: "Small Item", referenceId: `SMALL-${i}`, sourceFile: "SmallMovement.xlsx", documentClassification: "inventory_record" }));

    const findings = generateOperationalFindings({
      transactions: [...big, ...small],
      documents: [],
      industry: "manufacturing",
    });

    const finding = findByTitle(findings, "High Manual Coordination Dependency");
    expect(finding).toBeTruthy();
    // maxEntityTx (+15) + outbound-only 100% (+15) + spread across 2 sources (+10) = 40
    expect(finding!.confidence).toBe(40);
    expect(finding!.severity).toBe("MEDIUM");

    const idx = signalIndexOf(finding!.signals, /Highest movement volume per item/);
    const entry = finding!.provenance?.find(p => p.signalIndex === idx);
    expect(entry).toBeTruthy();
    expect(entry!.sourceFiles).toEqual(["BigMovement.xlsx"]);
    expect(entry!.documentClasses).toEqual(["movement_log"]);
    expect(entry!.sourceFiles).not.toContain("SmallMovement.xlsx");
    expect(entry!.documentClasses).not.toContain("inventory_record");
  });

  // ── G. Financial adjustment/returns provenance ───────────────────────────
  it("G — detectFinancialLeakage: adjustmentSourceFiles and returnsSourceFiles are correctly isolated", () => {
    const transactions = [
      tx({ transactionType: "adjustment", referenceId: "REF-ADJ", value: 100, sourceFile: "Adjustments.xlsx", documentClassification: "loss_record" }),
      tx({ transactionType: "outbound", referenceId: "REF-RET", value: 50, rawText: "Customer refund processed", sourceFile: "Returns.xlsx", documentClassification: "loss_record" }),
      tx({ transactionType: "outbound", referenceId: "REF-3", value: 20, sourceFile: "Plain.xlsx", documentClassification: "movement_log" }),
    ];

    const findings = generateOperationalFindings({ transactions, documents: [], industry: "manufacturing" });

    const finding = findByTitle(findings, "Elevated Operational Leakage Exposure");
    expect(finding).toBeTruthy();
    expect(finding!.confidence).toBe(35); // adjustment (+20) + returns (+15)
    expect(finding!.severity).toBe("MEDIUM");

    const adjIdx = signalIndexOf(finding!.signals, /adjustment transaction\(s\)/);
    const adjEntry = finding!.provenance?.find(p => p.signalIndex === adjIdx);
    expect(adjEntry).toBeTruthy();
    expect(adjEntry!.sourceFiles).toEqual(["Adjustments.xlsx"]);
    expect(adjEntry!.sourceFiles).not.toContain("Returns.xlsx");
    expect(adjEntry!.sourceFiles).not.toContain("Plain.xlsx");

    const retIdx = signalIndexOf(finding!.signals, /Return or refund-related transactions detected/);
    const retEntry = finding!.provenance?.find(p => p.signalIndex === retIdx);
    expect(retEntry).toBeTruthy();
    expect(retEntry!.sourceFiles).toEqual(["Returns.xlsx"]);
    expect(retEntry!.sourceFiles).not.toContain("Adjustments.xlsx");
    expect(retEntry!.sourceFiles).not.toContain("Plain.xlsx");
  });

  // ── H. Inventory Strain — no provenance ──────────────────────────────────
  it("H — detectInventoryStrain never attaches provenance (irreducibly whole-run signals)", () => {
    const transactions = Array.from({ length: 5 }, (_, i) => tx({
      entityName: `Item ${i}`,
      referenceId: `REF-${i}`,
      quantity: 5,
      sourceFile: "Inv.xlsx",
      documentClassification: "movement_log",
    }));

    const findings = generateOperationalFindings({ transactions, documents: [], industry: "manufacturing" });

    const finding = findByTitle(findings, "Delayed Inventory Reconciliation");
    expect(finding).toBeTruthy();
    expect(finding!.provenance).toBeUndefined();
  });

  // ── I. Workflow Scalability — no provenance ──────────────────────────────
  it("I — detectWorkflowScalabilityRisk never attaches provenance (distributional statistics only)", () => {
    const transactions = Array.from({ length: 21 }, (_, i) => tx({
      entityName: `Catalogue Item ${i}`,
      referenceId: `CAT-${i}`,
      sourceFile: "Catalog.xlsx",
      documentClassification: "movement_log",
    }));

    const findings = generateOperationalFindings({ transactions, documents: [], industry: "manufacturing" });

    const finding = findByTitle(findings, "High Inventory Movement Complexity");
    expect(finding).toBeTruthy();
    expect(finding!.provenance).toBeUndefined();
  });

  // ── J. Client Concentration — no provenance ──────────────────────────────
  it("J — detectClientConcentration never attaches provenance (client aggregation discards source/class identity)", () => {
    const clients = ["Client A", "Client B", "Client C", "Client D", "Client E", "Client F"];
    const transactions = clients.map(name => tx({
      entityName: "Event Services",
      remarks: name,
      quantity: 2,
      documentClassification: "customer_frequency",
      sourceFile: "Freq.xlsx",
    }));

    const findings = generateOperationalFindings({ transactions, documents: [], industry: "manufacturing" });

    const finding = findByTitle(findings, "Client Portfolio Concentration");
    expect(finding).toBeTruthy();
    expect(finding!.provenance).toBeUndefined();
  });

  // ── K. DECISIVE A/B TEST ──────────────────────────────────────────────────
  describe("K — decisive A/B: a document merely co-present must never leak into an unrelated finding's provenance", () => {

    it("Example A — Delayed Inventory Reconciliation must NOT acquire dispatch_log provenance from a co-present, non-contributing Dispatch Log", () => {
      const inventoryTxs = Array.from({ length: 5 }, (_, i) => tx({
        entityName: `Item ${i}`,
        referenceId: `INV-${i}`,
        quantity: 5,
        sourceFile: "Inventory_Movement.xlsx",
        documentClassification: "movement_log",
      }));
      // A well-formed, non-triggering dispatch log — present in the same
      // diagnostic run, contributes nothing to the inventory finding's
      // trigger conditions (balanced, unrelated entities/dates).
      const dispatchTxs = [
        tx({ entityName: "Dispatch Item", referenceId: "DISP-1", transactionType: "inbound", date: "2026-05-01", sourceFile: "Dispatch_Log.xlsx", documentClassification: "dispatch_log" }),
        tx({ entityName: "Dispatch Item", referenceId: "DISP-2", transactionType: "outbound", date: "2026-05-01", sourceFile: "Dispatch_Log.xlsx", documentClassification: "dispatch_log" }),
      ];

      const findings = generateOperationalFindings({
        transactions: [...inventoryTxs, ...dispatchTxs],
        documents: [],
        industry: "manufacturing",
      });

      const finding = findByTitle(findings, "Delayed Inventory Reconciliation");
      expect(finding).toBeTruthy();
      // The naive whole-run proposal rejected by the prior audit would have
      // attached stats.uniqueDocClasses (["movement_log","dispatch_log"]) to
      // this finding. The approved design attaches nothing at all for this
      // detector — provably excluding the co-present dispatch_log document.
      expect(finding!.provenance).toBeUndefined();
    });

    it("Example B — Logistics Coordination Strain's peak-day provenance contains dispatch_log and excludes the unrelated inventory document on other dates", () => {
      const peakDayTxs = Array.from({ length: 20 }, (_, i) => tx({
        entityName: `Dispatch Item ${i}`,
        date: "2026-05-10",
        sourceFile: "Dispatch_Log.xlsx",
        documentClassification: "dispatch_log",
      }));
      const unrelatedInventoryTxs = [
        tx({ date: "2026-05-01", sourceFile: "Inventory_Movement.xlsx", documentClassification: "movement_log" }),
        tx({ date: "2026-05-02", sourceFile: "Inventory_Movement.xlsx", documentClassification: "movement_log" }),
        tx({ date: "2026-05-03", sourceFile: "Inventory_Movement.xlsx", documentClassification: "movement_log" }),
        tx({ date: "2026-05-04", sourceFile: "Inventory_Movement.xlsx", documentClassification: "movement_log" }),
        tx({ date: "2026-05-05", sourceFile: "Inventory_Movement.xlsx", documentClassification: "movement_log" }),
      ];

      const findings = generateOperationalFindings({
        transactions: [...peakDayTxs, ...unrelatedInventoryTxs],
        documents: [],
        industry: "manufacturing",
      });

      const finding = findByTitle(findings, "Logistics Coordination Strain");
      expect(finding).toBeTruthy();

      const idx = signalIndexOf(finding!.signals, /Peak single-day movement/);
      const entry = finding!.provenance?.find(p => p.signalIndex === idx);
      expect(entry).toBeTruthy();
      expect(entry!.sourceFiles).toEqual(["Dispatch_Log.xlsx"]);
      expect(entry!.documentClasses).toEqual(["dispatch_log"]);
      expect(entry!.sourceFiles).not.toContain("Inventory_Movement.xlsx");
      expect(entry!.documentClasses).not.toContain("movement_log");
    });
  });
});
