import type { FinancialEvidence, FinancialMetric, FinancialObservation, FinancialRatio, FinancialSignal } from "../../../shared/index.js";

/**
 * The common shape every Capability Pack's entry function (`run<Domain>CapabilityPack`)
 * returns — introduced during the "shared internals" refactoring milestone,
 * after Liquidity/Profitability/Cash Flow had each independently declared
 * their own `{Domain}CapabilityResult` interface with identical
 * `metrics`/`ratios`/`observations`/`evidence`/`signals` fields (verified
 * identical, not assumed, before extracting this).
 *
 * Each pack's own result type extends this with its domain-specific raw
 * Financial Object fields (`LiquidityCapabilityResult` adds `assets`/`liabilities`,
 * `ProfitabilityCapabilityResult` adds `revenue`/`expenses`, and so on) — this
 * base only captures the part that is genuinely identical across every pack.
 *
 * Internal to `financial-intelligence/` — never exported from `index.ts`, and
 * no Capability Pack's own result type is exported from `index.ts` either
 * (per every prior milestone's "not wired into `analyzeFinancialSignals()`,
 * not public" decision). This is a shared internal contract between
 * `capabilities/*` implementations, not a new public surface.
 */
export interface CapabilityResult {
  readonly metrics: readonly FinancialMetric[];
  readonly ratios: readonly FinancialRatio[];
  readonly observations: readonly FinancialObservation[];
  readonly evidence: readonly FinancialEvidence[];
  readonly signals: readonly FinancialSignal[];
}
