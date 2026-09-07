import { ValidationError } from "../errors/index.js";
import {
  defaultConfidenceBandResolver,
  type BandResolver,
  type DefaultConfidenceBand,
} from "./band-resolver.js";

/**
 * A single 0–1 confidence score. This is the primitive every multi-dimensional
 * confidence shape (e.g. document-parser's Extraction/Recognition/Evidence/Overall
 * confidence) is composed from, per `03_MGD_DATA_MODEL.md` §2.22's principle that
 * confidence is a first-class object, never a bare number.
 *
 * `Confidence` does not hardcode band names or thresholds (e.g. LOW/MEDIUM/HIGH) —
 * banding is delegated to an injectable `BandResolver` (see `band-resolver.ts`), so
 * future frameworks or modules may define their own band vocabulary without
 * modifying this class. `.band()` remains fully deterministic: the same value and
 * the same resolver always produce the same band.
 */
export class Confidence {
  private constructor(readonly value: number) {}

  static create(value: number): Confidence {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new ValidationError("Confidence value must be a finite number in [0, 1]", {
        details: { value },
      });
    }
    return new Confidence(value);
  }

  static zero(): Confidence {
    return new Confidence(0);
  }

  /** Resolves this score against the platform default band vocabulary (low/medium/high). */
  band(): DefaultConfidenceBand;
  /** Resolves this score against a caller-supplied `BandResolver` with its own band vocabulary. */
  band<TBand extends string>(resolver: BandResolver<TBand>): TBand;
  band<TBand extends string>(resolver?: BandResolver<TBand>): TBand | DefaultConfidenceBand {
    if (resolver) {
      return resolver.resolve(this.value);
    }
    return defaultConfidenceBandResolver.resolve(this.value);
  }

  equals(other: Confidence): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value.toFixed(4);
  }
}
