import type { FinancialMetric, FinancialRatio, FinancialObservation } from "../../shared/index.js";
import type { MetricCalculator } from "../metrics/metric-calculator.js";
import type { RatioCalculator } from "../ratios/ratio-calculator.js";
import type { ObservationCalculator } from "../observations/observation-calculator.js";
import { runMetricCalculators } from "../metrics/metric-calculation-stage.js";
import { runRatioCalculators } from "../ratios/ratio-calculation-stage.js";
import { runObservationCalculators } from "../observations/observation-calculation-stage.js";
import type { FinancialCalculationExecutionContext } from "./execution-context.js";

/**
 * The complete output of one Financial Calculation Pipeline run — every
 * FinancialMetric, FinancialRatio, and FinancialObservation produced for one
 * document. Internal to `financial-intelligence/` (not exported from
 * `index.ts`), consistent with `MetricCalculator`/`RatioCalculator`/
 * `ObservationCalculator` also staying internal — nothing outside this
 * module constructs or consumes a pipeline run directly today.
 */
export interface FinancialCalculationResult {
  readonly metrics: readonly FinancialMetric[];
  readonly ratios: readonly FinancialRatio[];
  readonly observations: readonly FinancialObservation[];
}

/**
 * Pipeline orchestration interface — the contract a Financial Calculation
 * Pipeline run fulfills, independent of which concrete calculators it holds.
 */
export interface FinancialCalculationPipeline {
  run(context: FinancialCalculationExecutionContext): FinancialCalculationResult;
}

/**
 * The one concrete implementation of `FinancialCalculationPipeline` — pure
 * orchestration, zero formula logic. Executes the three stages in the only
 * order the architecture permits (`calculation-stage-order.ts`):
 * Metrics → Ratios → Observations, each stage's context built exclusively
 * from the prior stage(s)' completed output — never interleaved, never run
 * out of order.
 *
 * Constructed with a fixed, ordered set of calculators per stage — in
 * production use today that set is always empty, since no
 * `MetricCalculator`/`RatioCalculator`/`ObservationCalculator`
 * implementation exists yet (see `financial-intelligence/README.md`).
 * Running this pipeline today legitimately returns
 * `{ metrics: [], ratios: [], observations: [] }` for any input — that is
 * correct, not a bug: there is nothing yet registered to calculate anything.
 * This milestone's purpose is solely to prove the orchestration mechanics
 * are sound, exercised in tests with test-double calculators, not real
 * formulas.
 */
export class DefaultFinancialCalculationPipeline implements FinancialCalculationPipeline {
  constructor(
    private readonly metricCalculators: readonly MetricCalculator[] = [],
    private readonly ratioCalculators: readonly RatioCalculator[] = [],
    private readonly observationCalculators: readonly ObservationCalculator[] = [],
  ) {}

  run(context: FinancialCalculationExecutionContext): FinancialCalculationResult {
    const metrics = runMetricCalculators(this.metricCalculators, {
      documentId: context.documentId,
      financialObjects: context.financialObjects,
    });

    const ratios = runRatioCalculators(this.ratioCalculators, {
      documentId: context.documentId,
      metrics,
    });

    const observations = runObservationCalculators(this.observationCalculators, {
      documentId: context.documentId,
      metrics,
      ratios,
    });

    return { metrics, ratios, observations };
  }
}
