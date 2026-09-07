import type { Period } from "../../shared/index.js";
import type { FinancialObjectSet } from "../metrics/metric-calculator.js";

/**
 * The single top-level input to a `FinancialCalculationPipeline` run — seeds
 * Stage 1 (Metrics). Stages 2 (Ratios) and 3 (Observations) never read this
 * directly; their contexts (`RatioCalculationContext`,
 * `ObservationCalculationContext`) are built exclusively from the prior
 * stage(s)' completed output, per `calculation-stage-order.ts`'s ordering
 * rule.
 */
export interface FinancialCalculationExecutionContext {
  readonly documentId: string;
  readonly period?: Period;
  readonly financialObjects: FinancialObjectSet;
}
