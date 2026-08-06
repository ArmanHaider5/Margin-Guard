import { describe, it, expect } from "vitest";
import { Confidence } from "../../shared/index.js";
import type { FinancialMetric, FinancialRatio, FinancialObservation } from "../../shared/index.js";
import { DefaultFinancialCalculationPipeline } from "../pipeline/financial-calculation-pipeline.js";
import type { FinancialCalculationExecutionContext } from "../pipeline/execution-context.js";
import type { MetricCalculator, MetricCalculationContext, FinancialObjectSet } from "../metrics/metric-calculator.js";
import type { RatioCalculator, RatioCalculationContext } from "../ratios/ratio-calculator.js";
import type { ObservationCalculator, ObservationCalculationContext } from "../observations/observation-calculator.js";
import type { FinancialMetricDefinition } from "../metrics/financial-metric-definitions.js";
import type { FinancialRatioDefinition } from "../ratios/financial-ratio-definitions.js";
import type { FinancialObservationDefinition } from "../observations/financial-observation-definitions.js";

/**
 * Test-double calculators only — fixed, fabricated output for exercising
 * orchestration mechanics (ordering, gating, determinism). None of this is a
 * real business formula; it exists solely so this test file does not need a
 * real MetricCalculator/RatioCalculator/ObservationCalculator implementation,
 * which by this milestone's explicit scope does not exist.
 */

const emptyFinancialObjects: FinancialObjectSet = {
  assets: [],
  liabilities: [],
  equity: [],
  revenue: [],
  expense: [],
  workingCapitalComponents: [],
  cashMovements: [],
};

function makeMetricCalculator(id: string, opts: { canCalculate?: boolean } = {}): MetricCalculator {
  const definition: FinancialMetricDefinition = {
    id,
    name: id,
    description: "test double",
    unit: "currency",
    requiredFinancialObjectTypes: [],
  };
  return {
    definition,
    canCalculate: (_context: MetricCalculationContext) => opts.canCalculate ?? true,
    calculate: (context: MetricCalculationContext): FinancialMetric => ({
      id: `metric-${id}`,
      definitionId: id,
      value: 100,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: [],
      confidence: Confidence.create(0.9),
      basis: "test double",
    }),
  };
}

function makeUncalculableMetricCalculator(id: string): MetricCalculator {
  return makeMetricCalculator(id, { canCalculate: false });
}

function makeRatioCalculator(id: string, requiredMetricDefinitionId: string): RatioCalculator {
  const definition: FinancialRatioDefinition = {
    id,
    name: id,
    description: "test double",
    category: "liquidity",
    requiredMetricDefinitionIds: [requiredMetricDefinitionId],
  };
  return {
    definition,
    canCalculate: (context: RatioCalculationContext) =>
      context.metrics.some((m) => m.definitionId === requiredMetricDefinitionId),
    calculate: (context: RatioCalculationContext): FinancialRatio => ({
      id: `ratio-${id}`,
      definitionId: id,
      category: "liquidity",
      value: 1,
      documentId: context.documentId,
      metricIds: context.metrics.map((m) => m.id),
      confidence: Confidence.create(0.9),
      basis: "test double",
    }),
  };
}

function makeObservationCalculator(id: string, requiredRatioDefinitionId: string): ObservationCalculator {
  const definition: FinancialObservationDefinition = {
    id,
    name: id,
    description: "test double",
    category: "liquidity",
    statementTemplate: "Test observation.",
    requiredMetricDefinitionIds: [],
    requiredRatioDefinitionIds: [requiredRatioDefinitionId],
  };
  return {
    definition,
    canCalculate: (context: ObservationCalculationContext) =>
      context.ratios.some((r) => r.definitionId === requiredRatioDefinitionId),
    calculate: (context: ObservationCalculationContext): FinancialObservation => ({
      id: `observation-${id}`,
      definitionId: id,
      category: "liquidity",
      statement: "Test observation.",
      documentId: context.documentId,
      metricIds: context.metrics.map((m) => m.id),
      ratioIds: context.ratios.map((r) => r.id),
      confidence: Confidence.create(0.9),
      basis: "test double",
    }),
  };
}

function makeContext(): FinancialCalculationExecutionContext {
  return { documentId: "doc-1", financialObjects: emptyFinancialObjects };
}

describe("DefaultFinancialCalculationPipeline", () => {
  it("with no registered calculators, returns empty results for any input — nothing is calculated today", () => {
    const pipeline = new DefaultFinancialCalculationPipeline();
    const result = pipeline.run(makeContext());
    expect(result).toEqual({ metrics: [], ratios: [], observations: [] });
  });

  it("runs metric calculators, then ratio calculators against the computed metrics, then observation calculators against the computed ratios", () => {
    const pipeline = new DefaultFinancialCalculationPipeline(
      [makeMetricCalculator("m1")],
      [makeRatioCalculator("r1", "m1")],
      [makeObservationCalculator("o1", "r1")],
    );
    const result = pipeline.run(makeContext());

    expect(result.metrics).toHaveLength(1);
    expect(result.ratios).toHaveLength(1);
    expect(result.observations).toHaveLength(1);
    expect(result.ratios[0]?.metricIds).toEqual(result.metrics.map((m) => m.id));
    expect(result.observations[0]?.ratioIds).toEqual(result.ratios.map((r) => r.id));
  });

  it("a ratio calculator whose required metric was never produced is gated out (canCalculate() false), not run", () => {
    const pipeline = new DefaultFinancialCalculationPipeline(
      [makeUncalculableMetricCalculator("m1")],
      [makeRatioCalculator("r1", "m1")],
      [],
    );
    const result = pipeline.run(makeContext());

    expect(result.metrics).toHaveLength(0);
    expect(result.ratios).toHaveLength(0);
  });

  it("an observation calculator whose required ratio was never produced is gated out, not run", () => {
    const pipeline = new DefaultFinancialCalculationPipeline(
      [makeMetricCalculator("m1")],
      [], // no ratio calculators registered, so no ratio named "r1" is ever produced
      [makeObservationCalculator("o1", "r1")],
    );
    const result = pipeline.run(makeContext());

    expect(result.metrics).toHaveLength(1);
    expect(result.observations).toHaveLength(0);
  });

  it("executes calculators of the same stage in the exact array order given, never reordered", () => {
    const pipeline = new DefaultFinancialCalculationPipeline(
      [makeMetricCalculator("c"), makeMetricCalculator("a"), makeMetricCalculator("b")],
      [],
      [],
    );
    const result = pipeline.run(makeContext());
    expect(result.metrics.map((m) => m.definitionId)).toEqual(["c", "a", "b"]);
  });

  it("a calculator returning undefined from calculate() despite canCalculate() being true is silently skipped, not left as a hole", () => {
    const definition: FinancialMetricDefinition = {
      id: "m-undefined",
      name: "m-undefined",
      description: "test double",
      unit: "currency",
      requiredFinancialObjectTypes: [],
    };
    const contractViolatingCalculator: MetricCalculator = {
      definition,
      canCalculate: () => true,
      calculate: () => undefined,
    };
    const pipeline = new DefaultFinancialCalculationPipeline(
      [makeMetricCalculator("m1"), contractViolatingCalculator, makeMetricCalculator("m2")],
      [],
      [],
    );
    const result = pipeline.run(makeContext());
    expect(result.metrics.map((m) => m.definitionId)).toEqual(["m1", "m2"]);
  });

  it("is deterministic: identical calculators and identical input produce identical output on repeated runs", () => {
    const pipeline = new DefaultFinancialCalculationPipeline(
      [makeMetricCalculator("m1"), makeMetricCalculator("m2")],
      [makeRatioCalculator("r1", "m1")],
      [makeObservationCalculator("o1", "r1")],
    );
    const context = makeContext();
    const first = pipeline.run(context);
    const second = pipeline.run(context);
    expect(first).toEqual(second);
  });
});

describe("Scope boundary: no calculation logic runs by default, and no orchestration machinery leaks publicly", () => {
  it("DefaultFinancialCalculationPipeline is not exported or constructible from this module's public API", async () => {
    const publicApi = await import("../index.js");
    const exportedNames = Object.keys(publicApi);
    expect(exportedNames).not.toContain("FinancialCalculationPipeline");
    expect(exportedNames).not.toContain("DefaultFinancialCalculationPipeline");
    expect(exportedNames).not.toContain("runMetricCalculators");
    expect(exportedNames).not.toContain("runRatioCalculators");
    expect(exportedNames).not.toContain("runObservationCalculators");
    expect(exportedNames).toEqual(["analyzeFinancialSignals"]);
  });
});
