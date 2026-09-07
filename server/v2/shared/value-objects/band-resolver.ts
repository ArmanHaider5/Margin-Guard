import { ValidationError } from "../errors/index.js";

/**
 * Strategy abstraction for mapping a numeric confidence value onto a named band.
 * `Confidence` (see `confidence.ts`) does not hardcode band names or thresholds —
 * it delegates to a `BandResolver`, so a future framework or module can define its
 * own band vocabulary (e.g. a five-band scale, or domain-specific names) without
 * modifying the Confidence class itself.
 */
export interface BandResolver<TBand extends string = string> {
  resolve(value: number): TBand;
}

/** One boundary in a `ThresholdBandResolver` — `band` applies for value >= `min`. */
export interface BandThreshold<TBand extends string> {
  readonly min: number;
  readonly band: TBand;
}

/**
 * The standard, general-purpose `BandResolver` implementation: a sorted list of
 * `{ min, band }` thresholds. Still fully deterministic — the same value always
 * resolves to the same band for a given set of thresholds — but the thresholds
 * themselves are configuration, not code baked into `Confidence`.
 */
export class ThresholdBandResolver<TBand extends string> implements BandResolver<TBand> {
  private readonly thresholds: ReadonlyArray<BandThreshold<TBand>>;

  constructor(thresholds: ReadonlyArray<BandThreshold<TBand>>) {
    if (!Array.isArray(thresholds) || thresholds.length === 0) {
      throw new ValidationError("ThresholdBandResolver requires at least one threshold", {
        details: { thresholds },
      });
    }
    const sorted = [...thresholds].sort((a, b) => a.min - b.min);
    if (sorted[0].min > 0) {
      throw new ValidationError(
        "ThresholdBandResolver thresholds must cover the full [0, 1] range starting at 0",
        { details: { thresholds } },
      );
    }
    this.thresholds = sorted;
  }

  resolve(value: number): TBand {
    let result = this.thresholds[0].band;
    for (const threshold of this.thresholds) {
      if (value >= threshold.min) {
        result = threshold.band;
      } else {
        break;
      }
    }
    return result;
  }
}

export type DefaultConfidenceBand = "low" | "medium" | "high";

/**
 * The platform's default band vocabulary and thresholds — used only when a caller
 * does not supply their own `BandResolver`. This is ordinary configuration data,
 * not special-cased logic inside `Confidence`.
 */
export const DEFAULT_CONFIDENCE_BAND_THRESHOLDS: ReadonlyArray<BandThreshold<DefaultConfidenceBand>> =
  Object.freeze([
    { min: 0, band: "low" },
    { min: 0.4, band: "medium" },
    { min: 0.75, band: "high" },
  ]);

export const defaultConfidenceBandResolver: BandResolver<DefaultConfidenceBand> =
  new ThresholdBandResolver(DEFAULT_CONFIDENCE_BAND_THRESHOLDS);
