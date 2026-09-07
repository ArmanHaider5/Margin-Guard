import { CapabilityPackRegistry } from "./capability-pack-registry.js";
import { runLiquidityCapabilityPack } from "../capabilities/liquidity/liquidity-capability-pack.js";
import { runProfitabilityCapabilityPack } from "../capabilities/profitability/profitability-capability-pack.js";
import { runCashFlowCapabilityPack } from "../capabilities/cash-flow/cash-flow-capability-pack.js";
import { runWorkingCapitalCapabilityPack } from "../capabilities/working-capital/working-capital-capability-pack.js";
import { runLeverageCapabilityPack } from "../capabilities/leverage/leverage-capability-pack.js";
import { runEfficiencyCapabilityPack } from "../capabilities/efficiency/efficiency-capability-pack.js";
import { runGrowthCapabilityPack } from "../capabilities/growth/growth-capability-pack.js";
import { runInvestmentCapabilityPack } from "../capabilities/investment/investment-capability-pack.js";

/**
 * The default, production Capability Pack registration — every completed
 * pack, registered in the "recommended order" documented since the first
 * Capability Pack milestone: Liquidity, Profitability, Cash Flow, Working
 * Capital, Leverage, Efficiency, Growth, Investment. This is the *only*
 * file that imports every pack's entry function at once; every pack file
 * itself remains ignorant of the orchestrator and of every other pack
 * (except the disclosed, deliberate cross-pack reuse already documented in
 * each pack's own README section).
 *
 * Adding a future pack means adding one `registry.register(...)` call
 * here — nothing else in `orchestration/` needs to change. This file's own
 * extensions for Efficiency, Growth, and Investment are, per the Financial
 * Intelligence Orchestrator milestone's own stated design, not considered
 * "modifying the orchestrator" — `CapabilityPackRegistry` and
 * `FinancialIntelligenceOrchestrator` themselves are untouched.
 */
export function createDefaultCapabilityPackRegistry(): CapabilityPackRegistry {
  const registry = new CapabilityPackRegistry();
  registry.register({ id: "liquidity", name: "Liquidity Capability Pack", run: runLiquidityCapabilityPack });
  registry.register({ id: "profitability", name: "Profitability Capability Pack", run: runProfitabilityCapabilityPack });
  registry.register({ id: "cash_flow", name: "Cash Flow Capability Pack", run: runCashFlowCapabilityPack });
  registry.register({ id: "working_capital", name: "Working Capital Capability Pack", run: runWorkingCapitalCapabilityPack });
  registry.register({ id: "leverage", name: "Leverage Capability Pack", run: runLeverageCapabilityPack });
  registry.register({ id: "efficiency", name: "Efficiency Capability Pack", run: runEfficiencyCapabilityPack });
  registry.register({ id: "growth", name: "Growth Capability Pack", run: runGrowthCapabilityPack });
  registry.register({ id: "investment", name: "Investment Capability Pack", run: runInvestmentCapabilityPack });
  return registry;
}
