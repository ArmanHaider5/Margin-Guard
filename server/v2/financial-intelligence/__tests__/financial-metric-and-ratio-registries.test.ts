import { describe, it, expect } from "vitest";
import {
  FinancialMetricRegistry,
  createDefaultFinancialMetricRegistry,
} from "../metrics/financial-metric-definitions.js";
import {
  FinancialRatioRegistry,
  createDefaultFinancialRatioRegistry,
} from "../ratios/financial-ratio-definitions.js";
import { ConfigurationError } from "../../shared/index.js";
import type { FinancialRatioCategory } from "../../shared/index.js";

describe("FinancialMetricRegistry", () => {
  it("the default registry is seeded with the twenty built-in metric definitions", () => {
    const registry = createDefaultFinancialMetricRegistry();
    expect(registry.all()).toHaveLength(20);
    expect(registry.get("total_revenue")?.name).toBe("Total Revenue");
    expect(registry.get("cost_of_goods_sold")?.name).toBe("Cost of Goods Sold");
    expect(registry.get("total_operating_expenses")?.name).toBe("Total Operating Expenses");
    expect(registry.get("net_profit")?.name).toBe("Net Profit");
    expect(registry.get("cash_generated")?.name).toBe("Cash Generated");
    expect(registry.get("cash_used")?.name).toBe("Cash Used");
    expect(registry.get("operating_cash_flow")?.name).toBe("Operating Cash Flow");
    expect(registry.get("current_period_revenue")?.name).toBe("Current Period Revenue");
    expect(registry.get("prior_period_revenue")?.name).toBe("Prior Period Revenue");
  });

  it("rejects duplicate registration", () => {
    const registry = new FinancialMetricRegistry();
    registry.register({ id: "x", name: "X", description: "d", unit: "currency", requiredFinancialObjectTypes: [] });
    expect(() =>
      registry.register({ id: "x", name: "X2", description: "d2", unit: "currency", requiredFinancialObjectTypes: [] }),
    ).toThrow(ConfigurationError);
  });

  it("get() returns undefined for an unregistered id, never throws", () => {
    const registry = createDefaultFinancialMetricRegistry();
    expect(registry.get("not_a_real_metric")).toBeUndefined();
  });

  it("every built-in metric definition traces its requiredFinancialObjectTypes to real Financial Object Model type names", () => {
    const registry = createDefaultFinancialMetricRegistry();
    const knownFinancialObjectTypes = new Set([
      "Asset", "Liability", "Equity", "Revenue", "Expense", "WorkingCapitalComponent", "CashMovement",
    ]);
    for (const definition of registry.all()) {
      for (const type of definition.requiredFinancialObjectTypes) {
        expect(knownFinancialObjectTypes.has(type)).toBe(true);
      }
    }
  });
});

describe("FinancialRatioRegistry", () => {
  it("the default registry is seeded with thirteen built-in ratio definitions, covering ten of the eleven FIF categories", () => {
    const registry = createDefaultFinancialRatioRegistry();
    expect(registry.all()).toHaveLength(13);

    const categories = new Set(registry.all().map((d) => d.category));
    expect(categories.size).toBe(10);
    expect(registry.get("net_margin")?.name).toBe("Net Margin");
    expect(registry.get("operating_margin")?.name).toBe("Operating Margin");
    expect(registry.get("cash_coverage_ratio")?.name).toBe("Cash Coverage Ratio");
    // revenue_growth_rate's requiredMetricDefinitionIds was updated (GR-002)
    // from its Sprint 2 Foundation placeholder to the two real Metrics the
    // Growth Capability Pack's calculator actually consumes.
    expect(registry.get("revenue_growth_rate")?.requiredMetricDefinitionIds).toEqual([
      "current_period_revenue",
      "prior_period_revenue",
    ]);
  });

  it("the 'operational' boundary category is deliberately unpopulated", () => {
    const registry = createDefaultFinancialRatioRegistry();
    expect(registry.byCategory("operational" as FinancialRatioCategory)).toHaveLength(0);
  });

  it("byCategory filters correctly", () => {
    const registry = createDefaultFinancialRatioRegistry();
    const liquidity = registry.byCategory("liquidity");
    expect(liquidity.every((d) => d.category === "liquidity")).toBe(true);
    expect(liquidity.some((d) => d.id === "current_ratio")).toBe(true);
  });

  it("rejects duplicate registration", () => {
    const registry = new FinancialRatioRegistry();
    registry.register({ id: "x", name: "X", description: "d", category: "liquidity", requiredMetricDefinitionIds: [] });
    expect(() =>
      registry.register({ id: "x", name: "X2", description: "d2", category: "liquidity", requiredMetricDefinitionIds: [] }),
    ).toThrow(ConfigurationError);
  });

  it("every built-in ratio's requiredMetricDefinitionIds resolves to a real registered FinancialMetricDefinition", () => {
    const metricRegistry = createDefaultFinancialMetricRegistry();
    const ratioRegistry = createDefaultFinancialRatioRegistry();
    for (const ratioDefinition of ratioRegistry.all()) {
      for (const metricId of ratioDefinition.requiredMetricDefinitionIds) {
        expect(metricRegistry.get(metricId)).toBeDefined();
      }
    }
  });
});

describe("Scope boundary: no calculation logic exists yet", () => {
  it("no MetricCalculator or RatioCalculator implementation is exported or constructible from this module's public API", async () => {
    const publicApi = await import("../index.js");
    // The public surface exposes only types and analyzeFinancialSignals() — no
    // calculator class/factory of any kind.
    const exportedNames = Object.keys(publicApi);
    expect(exportedNames).not.toContain("MetricCalculator");
    expect(exportedNames).not.toContain("RatioCalculator");
    expect(exportedNames).toEqual(["analyzeFinancialSignals"]);
  });
});
