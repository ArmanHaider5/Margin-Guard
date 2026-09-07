import type { FinancialMetric } from "../../shared/index.js";
import type {
  Asset,
  Liability,
  Equity,
  Revenue,
  Expense,
  WorkingCapitalComponent,
  CashMovement,
} from "../models/financial-object-model.js";
import type { FinancialMetricDefinition } from "./financial-metric-definitions.js";

/**
 * INTERFACE ONLY — no implementation exists yet, by this milestone's explicit
 * scope ("do not implement business formulas yet"). This is the contract a
 * future calculation service will implement per `FinancialMetricDefinition`
 * (e.g. a `TotalRevenueCalculator implements MetricCalculator`), consuming the
 * internal Financial Object Model and producing a public `FinancialMetric`.
 *
 * Deliberately internal to `financial-intelligence/` (not exported from
 * `index.ts`) — it references the internal Financial Object Model types
 * directly, and per ADR-009's reasoning, a calculation-implementation contract
 * tied to internal working types has no business being visible to other
 * modules, which only ever need the resulting `FinancialMetric`.
 */

/** The internal Financial Object Model instances a MetricCalculator may draw
 * from — grouped by type for convenience, not a formal registry. */
export interface FinancialObjectSet {
  readonly assets: readonly Asset[];
  readonly liabilities: readonly Liability[];
  readonly equity: readonly Equity[];
  readonly revenue: readonly Revenue[];
  readonly expense: readonly Expense[];
  readonly workingCapitalComponents: readonly WorkingCapitalComponent[];
  readonly cashMovements: readonly CashMovement[];
}

export interface MetricCalculationContext {
  readonly documentId: string;
  readonly financialObjects: FinancialObjectSet;
}

export interface MetricCalculator {
  readonly definition: FinancialMetricDefinition;
  /** Whether this calculator has sufficient Financial Object data to produce a
   * result for the given context — checked before `calculate()` is called. */
  canCalculate(context: MetricCalculationContext): boolean;
  /** Produces the FinancialMetric, or `undefined` if `canCalculate()` would
   * have returned false. No calculator implementing this interface exists yet. */
  calculate(context: MetricCalculationContext): FinancialMetric | undefined;
}
