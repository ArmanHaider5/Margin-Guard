/**
 * Public entry point for shared Value Objects. Nothing outside `shared/` may import
 * from a sibling file directly — only from this barrel, per the platform's
 * one-public-entry-point rule (see `server/v2/README.md`).
 */
export { Identifier } from "./identifier.js";
export { Currency } from "./currency.js";
export { Money } from "./money.js";
export { Percentage } from "./percentage.js";
export { Quantity } from "./quantity.js";
export { Confidence } from "./confidence.js";
export {
  ThresholdBandResolver,
  defaultConfidenceBandResolver,
  DEFAULT_CONFIDENCE_BAND_THRESHOLDS,
} from "./band-resolver.js";
export type { BandResolver, BandThreshold, DefaultConfidenceBand } from "./band-resolver.js";
export { DateRange } from "./date-range.js";
export { Period } from "./period.js";
