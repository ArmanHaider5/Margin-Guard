import { describe, it, expect } from "vitest";
import { EvidenceChainResolver } from "../evidence-chain-resolver.js";
import type { FinancialMetric, FinancialObservation, FinancialRatio } from "../../../../shared/index.js";

/**
 * Direct unit coverage for the shared component extracted from Liquidity,
 * Profitability, and Cash Flow's near-identical `resolveEvidenceObjectIds()`
 * functions. The three packs' own integration tests already exercise this
 * indirectly (and, per this milestone's "no behavioural changes"
 * requirement, still assert the exact same computed ids as before the
 * extraction) — this file tests the resolver in isolation, on its own
 * generic `EvidenceLinkedFinancialObject` shape, independent of any one
 * pack's domain types.
 */

function makeObservation(overrides: Partial<FinancialObservation> = {}): FinancialObservation {
  return {
    id: "obs-1",
    definitionId: "def-1",
    category: "liquidity",
    statement: "test statement",
    documentId: "doc-1",
    metricIds: [],
    ratioIds: [],
    confidence: { value: 0.8 } as any,
    basis: "test",
    ...overrides,
  };
}

function makeRatio(overrides: Partial<FinancialRatio> = {}): FinancialRatio {
  return {
    id: "ratio-1",
    definitionId: "ratio-def-1",
    category: "liquidity",
    value: 1,
    documentId: "doc-1",
    metricIds: [],
    confidence: { value: 0.8 } as any,
    basis: "test",
    ...overrides,
  };
}

function makeMetric(overrides: Partial<FinancialMetric> = {}): FinancialMetric {
  return {
    id: "metric-1",
    definitionId: "metric-def-1",
    value: 100,
    unit: "currency",
    documentId: "doc-1",
    financialObjectIds: [],
    confidence: { value: 0.8 } as any,
    basis: "test",
    ...overrides,
  };
}

describe("EvidenceChainResolver.resolve", () => {
  it("walks Observation → Ratio.metricIds → Metric.financialObjectIds → FinancialObject.evidenceObjectIds", () => {
    const resolver = new EvidenceChainResolver();
    const observation = makeObservation({ ratioIds: ["ratio-1"] });
    const ratio = makeRatio({ id: "ratio-1", metricIds: ["metric-1"] });
    const metric = makeMetric({ id: "metric-1", financialObjectIds: ["obj-1"] });
    const financialObjects = [{ id: "obj-1", evidenceObjectIds: ["e-1", "e-2"] }];

    const result = resolver.resolve(observation, [ratio], [metric], financialObjects);
    expect(result).toEqual(["e-1", "e-2"]);
  });

  it("also resolves Observations that reference Metrics directly (metricIds), not only via a Ratio", () => {
    const resolver = new EvidenceChainResolver();
    const observation = makeObservation({ metricIds: ["metric-1"], ratioIds: [] });
    const metric = makeMetric({ id: "metric-1", financialObjectIds: ["obj-1"] });
    const financialObjects = [{ id: "obj-1", evidenceObjectIds: ["e-1"] }];

    const result = resolver.resolve(observation, [], [metric], financialObjects);
    expect(result).toEqual(["e-1"]);
  });

  it("returns an empty array when nothing in the chain resolves", () => {
    const resolver = new EvidenceChainResolver();
    const observation = makeObservation({ ratioIds: ["ratio-not-present"] });
    const result = resolver.resolve(observation, [], [], []);
    expect(result).toEqual([]);
  });

  it("ignores financial objects that are not referenced by the resolved metrics", () => {
    const resolver = new EvidenceChainResolver();
    const observation = makeObservation({ ratioIds: ["ratio-1"] });
    const ratio = makeRatio({ id: "ratio-1", metricIds: ["metric-1"] });
    const metric = makeMetric({ id: "metric-1", financialObjectIds: ["obj-1"] });
    const financialObjects = [
      { id: "obj-1", evidenceObjectIds: ["e-1"] },
      { id: "obj-unrelated", evidenceObjectIds: ["e-unrelated"] },
    ];

    const result = resolver.resolve(observation, [ratio], [metric], financialObjects);
    expect(result).toEqual(["e-1"]);
  });

  it("deduplicates evidence object ids shared across multiple financial objects", () => {
    const resolver = new EvidenceChainResolver();
    const observation = makeObservation({ ratioIds: ["ratio-1"] });
    const ratio = makeRatio({ id: "ratio-1", metricIds: ["metric-1"] });
    const metric = makeMetric({ id: "metric-1", financialObjectIds: ["obj-1", "obj-2"] });
    const financialObjects = [
      { id: "obj-1", evidenceObjectIds: ["e-shared"] },
      { id: "obj-2", evidenceObjectIds: ["e-shared"] },
    ];

    const result = resolver.resolve(observation, [ratio], [metric], financialObjects);
    expect(result).toEqual(["e-shared"]);
  });
});

describe("EvidenceChainResolver.resolveMany", () => {
  it("unions the resolved ids of every observation, deduplicated", () => {
    const resolver = new EvidenceChainResolver();
    const observationA = makeObservation({ id: "obs-a", ratioIds: ["ratio-1"] });
    const observationB = makeObservation({ id: "obs-b", ratioIds: ["ratio-2"] });
    const ratioA = makeRatio({ id: "ratio-1", metricIds: ["metric-1"] });
    const ratioB = makeRatio({ id: "ratio-2", metricIds: ["metric-2"] });
    const metricA = makeMetric({ id: "metric-1", financialObjectIds: ["obj-1"] });
    const metricB = makeMetric({ id: "metric-2", financialObjectIds: ["obj-2"] });
    const financialObjects = [
      { id: "obj-1", evidenceObjectIds: ["e-1"] },
      { id: "obj-2", evidenceObjectIds: ["e-1", "e-2"] },
    ];

    const result = resolver.resolveMany([observationA, observationB], [ratioA, ratioB], [metricA, metricB], financialObjects);
    expect(result.slice().sort()).toEqual(["e-1", "e-2"]);
  });

  it("returns an empty array for an empty observation list", () => {
    const resolver = new EvidenceChainResolver();
    expect(resolver.resolveMany([], [], [], [])).toEqual([]);
  });
});
