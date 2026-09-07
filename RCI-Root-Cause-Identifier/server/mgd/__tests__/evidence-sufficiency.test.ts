import { describe, it, expect } from "vitest";
import { computeEvidenceSufficiency } from "../evidence-sufficiency.js";

describe("computeEvidenceSufficiency", () => {
  it("NONE — no documents, no transactions", () => {
    const ev = computeEvidenceSufficiency({ transactions: [], documents: [], metrics: {} });
    expect(ev.level).toBe("NONE");
    expect(ev.documentStatus).toBe("NONE_SUPPLIED");
    expect(ev.transactionCount).toBe(0);
    expect(ev.documentsSupplied).toBe(0);
  });

  it("NONE — documents supplied but none contributed any transaction (completely unparseable)", () => {
    const ev = computeEvidenceSufficiency({
      transactions: [],
      documents: [{ id: "doc-1" }, { id: "doc-2" }],
      metrics: {},
    });
    expect(ev.level).toBe("NONE");
    expect(ev.documentStatus).toBe("ALL_UNPARSEABLE");
    expect(ev.documentsSupplied).toBe(2);
    expect(ev.documentsParsed).toBe(0);
    expect(ev.documentsUnparseable).toBe(2);
  });

  it("PARTIAL — some transactions, but below the minimum floor", () => {
    const ev = computeEvidenceSufficiency({
      transactions: [{ documentId: "doc-1" }, { documentId: "doc-1" }],
      documents: [{ id: "doc-1" }],
      metrics: {},
    });
    expect(ev.level).toBe("PARTIAL");
    expect(ev.documentStatus).toBe("ALL_PARSED");
    expect(ev.transactionCount).toBe(2);
  });

  it("PARTIAL — enough transactions overall, but one of several documents contributed nothing", () => {
    const transactions = Array.from({ length: 10 }, () => ({ documentId: "doc-1" }));
    const ev = computeEvidenceSufficiency({
      transactions,
      documents: [{ id: "doc-1" }, { id: "doc-2" }],
      metrics: {},
    });
    expect(ev.level).toBe("PARTIAL");
    expect(ev.documentStatus).toBe("PARTIALLY_PARSED");
    expect(ev.documentsParsed).toBe(1);
    expect(ev.documentsUnparseable).toBe(1);
  });

  it("SUFFICIENT — enough transactions, all supplied documents contributed", () => {
    const transactions = [
      ...Array.from({ length: 5 }, () => ({ documentId: "doc-1" })),
      ...Array.from({ length: 5 }, () => ({ documentId: "doc-2" })),
    ];
    const ev = computeEvidenceSufficiency({
      transactions,
      documents: [{ id: "doc-1" }, { id: "doc-2" }],
      metrics: {},
    });
    expect(ev.level).toBe("SUFFICIENT");
    expect(ev.documentStatus).toBe("ALL_PARSED");
    expect(ev.documentsUnparseable).toBe(0);
  });

  it("SUFFICIENT is reachable with no documents at all — inline transactions (legacy/fallback path) still count as real evidence", () => {
    const transactions = Array.from({ length: 10 }, () => ({}));
    const ev = computeEvidenceSufficiency({ transactions, documents: [], metrics: {} });
    expect(ev.level).toBe("SUFFICIENT");
    expect(ev.documentStatus).toBe("NONE_SUPPLIED");
  });

  it("metricsSupplied / benchmarksAvailable are independent of transactional evidence level", () => {
    const evNoMetrics = computeEvidenceSufficiency({ transactions: [], documents: [], metrics: {} });
    expect(evNoMetrics.metricsSupplied).toBe(0);
    expect(evNoMetrics.benchmarksAvailable).toBe(false);

    const evWithMetrics = computeEvidenceSufficiency({
      transactions: [], documents: [],
      metrics: { refundRate: 0.1, inventoryLossRate: 0.02 },
    });
    expect(evWithMetrics.level).toBe("NONE"); // still no transactional evidence
    expect(evWithMetrics.metricsSupplied).toBe(2);
    expect(evWithMetrics.benchmarksAvailable).toBe(true);
  });

  it("never throws on malformed input", () => {
    expect(() => computeEvidenceSufficiency({
      transactions: null as any, documents: undefined as any, metrics: null as any,
    })).not.toThrow();
    const ev = computeEvidenceSufficiency({ transactions: null as any, documents: undefined as any, metrics: null as any });
    expect(ev.level).toBe("NONE");
  });

  it("reasons array is always non-empty and human-readable", () => {
    const ev = computeEvidenceSufficiency({ transactions: [], documents: [], metrics: {} });
    expect(ev.reasons.length).toBeGreaterThan(0);
    expect(typeof ev.reasons[0]).toBe("string");
  });
});
