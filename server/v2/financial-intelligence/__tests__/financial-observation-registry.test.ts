import { describe, it, expect } from "vitest";
import {
  FinancialObservationRegistry,
  createDefaultFinancialObservationRegistry,
} from "../observations/financial-observation-definitions.js";
import { createDefaultFinancialMetricRegistry } from "../metrics/financial-metric-definitions.js";
import { createDefaultFinancialRatioRegistry } from "../ratios/financial-ratio-definitions.js";
import { ConfigurationError } from "../../shared/index.js";
import type { FinancialObservationCategory } from "../../shared/index.js";

describe("FinancialObservationRegistry", () => {
  it("the default registry is seeded with the eighteen built-in observation definitions", () => {
    const registry = createDefaultFinancialObservationRegistry();
    expect(registry.all()).toHaveLength(18);
    expect(registry.get("current_ratio_below_range")?.statementTemplate).toBe(
      "Current ratio is below the preferred operating range.",
    );
    expect(registry.get("gross_margin_negative")?.statementTemplate).toBe("Gross margin is negative.");
    expect(registry.get("net_margin_negative")?.statementTemplate).toBe("Net margin is negative.");
    expect(registry.get("operating_margin_negative")?.statementTemplate).toBe("Operating margin is negative.");
    expect(registry.get("operating_cash_flow_negative")?.statementTemplate).toBe("Operating cash flow is negative.");
    expect(registry.get("cash_coverage_ratio_low")?.statementTemplate).toBe("Cash coverage ratio is below 1.0.");
    expect(registry.get("working_capital_ratio_negative")?.statementTemplate).toBe("Working capital ratio is negative.");
    expect(registry.get("debt_to_equity_negative")?.statementTemplate).toBe("Debt to equity ratio is negative.");
    expect(registry.get("asset_turnover_zero")?.statementTemplate).toBe("Asset turnover is zero.");
    expect(registry.get("revenue_growth_negative")?.statementTemplate).toBe("Revenue growth is negative.");
    expect(registry.get("return_on_equity_negative")?.statementTemplate).toBe("Return on equity is negative.");
  });

  it("rejects duplicate registration", () => {
    const registry = new FinancialObservationRegistry();
    registry.register({
      id: "x",
      name: "X",
      description: "d",
      category: "liquidity",
      statementTemplate: "X is X.",
      requiredMetricDefinitionIds: [],
      requiredRatioDefinitionIds: ["current_ratio"],
    });
    expect(() =>
      registry.register({
        id: "x",
        name: "X2",
        description: "d2",
        category: "liquidity",
        statementTemplate: "X is X.",
        requiredMetricDefinitionIds: [],
        requiredRatioDefinitionIds: ["current_ratio"],
      }),
    ).toThrow(ConfigurationError);
  });

  it("get() returns undefined for an unregistered id, never throws", () => {
    const registry = createDefaultFinancialObservationRegistry();
    expect(registry.get("not_a_real_observation")).toBeUndefined();
  });

  it("byCategory filters correctly", () => {
    const registry = createDefaultFinancialObservationRegistry();
    const liquidity = registry.byCategory("liquidity");
    expect(liquidity.every((d) => d.category === "liquidity")).toBe(true);
    expect(liquidity.some((d) => d.id === "current_ratio_below_range")).toBe(true);
  });

  it("covers nine of the eleven FinancialObservationCategory values; the remaining two have no definition", () => {
    const registry = createDefaultFinancialObservationRegistry();
    const categories = new Set(registry.all().map((d) => d.category));
    expect(categories.size).toBe(9);

    const uncovered: FinancialObservationCategory[] = ["return", "operational"];
    for (const category of uncovered) {
      expect(registry.byCategory(category)).toHaveLength(0);
    }
  });

  it("every built-in definition derives from at least one Metric or Ratio definition", () => {
    const registry = createDefaultFinancialObservationRegistry();
    for (const definition of registry.all()) {
      const total = definition.requiredMetricDefinitionIds.length + definition.requiredRatioDefinitionIds.length;
      expect(total).toBeGreaterThan(0);
    }
  });

  it("every built-in definition's requiredMetricDefinitionIds resolves to a real registered FinancialMetricDefinition", () => {
    const metricRegistry = createDefaultFinancialMetricRegistry();
    const observationRegistry = createDefaultFinancialObservationRegistry();
    for (const definition of observationRegistry.all()) {
      for (const metricId of definition.requiredMetricDefinitionIds) {
        expect(metricRegistry.get(metricId)).toBeDefined();
      }
    }
  });

  it("every built-in definition's requiredRatioDefinitionIds resolves to a real registered FinancialRatioDefinition", () => {
    const ratioRegistry = createDefaultFinancialRatioRegistry();
    const observationRegistry = createDefaultFinancialObservationRegistry();
    for (const definition of observationRegistry.all()) {
      for (const ratioId of definition.requiredRatioDefinitionIds) {
        expect(ratioRegistry.get(ratioId)).toBeDefined();
      }
    }
  });

  it("no statementTemplate contains diagnostic or causal language", () => {
    const registry = createDefaultFinancialObservationRegistry();
    const causalMarkers = ["because", "due to", "caused by", "root cause", "recommend"];
    for (const definition of registry.all()) {
      const lower = definition.statementTemplate.toLowerCase();
      for (const marker of causalMarkers) {
        expect(lower.includes(marker)).toBe(false);
      }
    }
  });
});

describe("Scope boundary: no observation generation logic exists yet", () => {
  it("ObservationCalculator is not exported or constructible from this module's public API", async () => {
    const publicApi = await import("../index.js");
    const exportedNames = Object.keys(publicApi);
    expect(exportedNames).not.toContain("ObservationCalculator");
    expect(exportedNames).not.toContain("FinancialObservationRegistry");
    expect(exportedNames).toEqual(["analyzeFinancialSignals"]);
  });
});
