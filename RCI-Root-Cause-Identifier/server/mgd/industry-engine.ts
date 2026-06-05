// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY ENGINE
//
// Routes pipeline outputs to the correct industry pack and returns industry-
// specific rules together with an operational maturity classification.
//
// Design principles:
//   • Fully deterministic — no AI, no randomness.
//   • Never throws — all logic is null-safe and wrapped in try/catch.
//   • Maturity level derived from health score (or estimated from findings).
//   • Extensible: add new industry packs by registering them in PACK_REGISTRY.
// ─────────────────────────────────────────────────────────────────────────────

import {
  evaluateEventManagementRules,
  type IndustryRule,
} from "./industry-packs/event-management-pack.js";

// ── Re-export IndustryRule so callers only need this module ──────────────────

export type { IndustryRule };

// ── Types ─────────────────────────────────────────────────────────────────────

export type MaturityLevel = "FOUNDATIONAL" | "DEVELOPING" | "SCALING" | "ADVANCED";

export interface IndustryInsightsResult {
  industry:      string;
  rules:         IndustryRule[];
  maturityLevel: MaturityLevel;
}

export interface IndustryInsightsParams {
  industry?:    string;
  findings?:    unknown[];
  rootCauses?:  unknown[];
  benchmarks?:  unknown[];
  metrics?:     unknown;
}

// ── Pack registry ─────────────────────────────────────────────────────────────
// Each entry maps an industry slug to its evaluator function.
// Evaluator must match the signature:
//   (params: { findings, rootCauses, benchmarks, metrics }) => IndustryRule[]

type PackEvaluator = (params: {
  findings?:   unknown[];
  rootCauses?: unknown[];
  benchmarks?: unknown[];
  metrics?:    unknown;
}) => IndustryRule[];

const PACK_REGISTRY: Record<string, PackEvaluator> = {
  event_management: evaluateEventManagementRules,
};

// ── Maturity classification ───────────────────────────────────────────────────

/**
 * Derive a MaturityLevel from a 0–100 health score.
 *
 *  80+   → ADVANCED
 *  65–79 → SCALING
 *  50–64 → DEVELOPING
 *  <50   → FOUNDATIONAL
 */
function classifyMaturity(score: number): MaturityLevel {
  if (score >= 80) return "ADVANCED";
  if (score >= 65) return "SCALING";
  if (score >= 50) return "DEVELOPING";
  return "FOUNDATIONAL";
}

/**
 * Estimate a health score from findings and root causes when an explicit
 * operationalHealthScore is not available in the metrics object.
 *
 * Starts at 85 and applies deductions:
 *   CRITICAL finding   → −10
 *   HIGH finding       → −5
 *   CRITICAL root cause → −8
 *   HIGH root cause    → −4
 * Clamped to [0, 100].
 */
function estimateHealthScore(
  findings:   unknown[],
  rootCauses: unknown[],
): number {
  let score = 85;

  for (const f of findings) {
    const sev = (f as Record<string, unknown>)?.severity;
    if (sev === "CRITICAL") score -= 10;
    else if (sev === "HIGH") score -= 5;
  }

  for (const r of rootCauses) {
    const sev = (r as Record<string, unknown>)?.severity;
    if (sev === "CRITICAL") score -= 8;
    else if (sev === "HIGH") score -= 4;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Resolve the operational health score from the metrics object, falling back
 * to an estimate derived from findings and root causes.
 */
function resolveHealthScore(
  metrics:    unknown,
  findings:   unknown[],
  rootCauses: unknown[],
): number {
  if (
    metrics &&
    typeof metrics === "object" &&
    !Array.isArray(metrics)
  ) {
    const m = metrics as Record<string, unknown>;
    if (typeof m.operationalHealthScore === "number") {
      return Math.max(0, Math.min(100, m.operationalHealthScore));
    }
    if (typeof m.healthScore === "number") {
      return Math.max(0, Math.min(100, m.healthScore));
    }
  }
  return estimateHealthScore(findings, rootCauses);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate industry-specific insights for a given set of pipeline outputs.
 *
 * @param params.industry   - Industry slug (e.g. "event_management").
 *                            Falls back to a no-op result for unknown slugs.
 * @param params.findings   - Operational findings from the findings engine.
 * @param params.rootCauses - Root causes from the root cause engine.
 * @param params.benchmarks - Benchmark results from the benchmark engine.
 * @param params.metrics    - Metrics object containing operationalHealthScore
 *                            (or healthScore) when available.
 *
 * @returns { industry, rules, maturityLevel } — never throws.
 */
export function generateIndustryInsights(
  params: IndustryInsightsParams,
): IndustryInsightsResult {
  try {
    const industry    = typeof params.industry === "string" && params.industry.trim()
      ? params.industry.trim().toLowerCase()
      : "unknown";
    const findings    = Array.isArray(params.findings)   ? params.findings   : [];
    const rootCauses  = Array.isArray(params.rootCauses) ? params.rootCauses : [];
    const benchmarks  = Array.isArray(params.benchmarks) ? params.benchmarks : [];
    const metrics     = params.metrics ?? {};

    // ── Resolve health score & maturity ─────────────────────────────────────
    const healthScore   = resolveHealthScore(metrics, findings, rootCauses);
    const maturityLevel = classifyMaturity(healthScore);

    // ── Route to pack ────────────────────────────────────────────────────────
    const evaluator = PACK_REGISTRY[industry];

    if (!evaluator) {
      console.log(
        `[MGD][INDUSTRY-ENGINE] No pack registered for industry="${industry}" — ` +
        `returning empty rules, maturityLevel=${maturityLevel} (healthScore=${healthScore})`,
      );
      return { industry, rules: [], maturityLevel };
    }

    const rules = evaluator({ findings, rootCauses, benchmarks, metrics });

    console.log(
      `[MGD][INDUSTRY-ENGINE] generateIndustryInsights — industry="${industry}" ` +
      `healthScore=${healthScore} maturityLevel=${maturityLevel} rules=${rules.length}`,
    );

    return { industry, rules, maturityLevel };
  } catch (err) {
    console.error(
      "[MGD][INDUSTRY-ENGINE] generateIndustryInsights — unhandled error:",
      (err as Error)?.message ?? err,
    );
    return {
      industry:      params.industry ?? "unknown",
      rules:         [],
      maturityLevel: "FOUNDATIONAL",
    };
  }
}
