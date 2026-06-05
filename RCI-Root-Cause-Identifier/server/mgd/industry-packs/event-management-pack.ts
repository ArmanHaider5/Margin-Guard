// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT INDUSTRY PACK
//
// 10 deterministic rules specific to the Event Management industry.
// Each rule examines findings, root causes, benchmarks, and metrics and
// emits an IndustryRule when its trigger condition is met.
//
// Design principles:
//   • Fully deterministic — no AI, no randomness.
//   • Never throws — all logic is guarded with null-safe helpers.
//   • Rules below 30 confidence are suppressed from output.
//   • Output is sorted descending by confidence.
//   • Each rule has a stable `id` string for downstream deduplication.
// ─────────────────────────────────────────────────────────────────────────────

// ── Exported types ─────────────────────────────────────────────────────────────

export interface IndustryRule {
  id:          string;
  category:    string;
  title:       string;
  description: string;
  severity:    "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence:  number;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

type AnyFinding = {
  category?:  string;
  severity?:  string;
  confidence?: number;
  title?:     string;
  summary?:   string;
};

type AnyRootCause = {
  severity?:  string;
  confidence?: number;
  title?:     string;
};

type AnyBenchmark = {
  status?:    string;
  metric?:    string;
  category?:  string;
};

const SUPPRESS_THRESHOLD = 30;

/** Safe array helper — never throws, always returns an array. */
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Return findings whose category matches any of the provided slugs. */
function byCategory(findings: AnyFinding[], ...cats: string[]): AnyFinding[] {
  return findings.filter(f => f?.category && cats.includes(f.category));
}

/** Return true if any finding in the list has severity HIGH or CRITICAL. */
function hasHighPlus(findings: AnyFinding[]): boolean {
  return findings.some(f => f?.severity === "HIGH" || f?.severity === "CRITICAL");
}

/** Return the max confidence across a list of findings (0 if empty). */
function maxConf(findings: AnyFinding[]): number {
  return findings.reduce((m, f) => Math.max(m, f?.confidence ?? 0), 0);
}

/** Clamp a number to [0, 100]. */
function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ── Rule evaluators ───────────────────────────────────────────────────────────

/**
 * Rule 1 — Logistics Bottleneck Risk
 * Trigger: logistics_coordination finding with severity HIGH or CRITICAL.
 */
function ruleLogisticsBottleneck(findings: AnyFinding[]): IndustryRule | null {
  const matches = byCategory(findings, "logistics_coordination");
  if (!hasHighPlus(matches)) return null;

  const conf = clamp(maxConf(matches) + 5);
  return {
    id:          "em-logistics-bottleneck",
    category:    "logistics_coordination",
    title:       "Logistics Bottleneck Risk",
    description:
      "High-severity logistics coordination failures have been detected. " +
      "For event management operations, vendor dispatch and internal handover " +
      "breakdowns directly translate to client-facing delivery failures and " +
      "reputational exposure at events.",
    severity:    conf >= 80 ? "CRITICAL" : "HIGH",
    confidence:  conf,
  };
}

/**
 * Rule 2 — Revenue Fulfilment Constraint
 * Trigger: logistics_coordination AND manpower_dependency findings present together.
 */
function ruleRevenueFulfilmentConstraint(findings: AnyFinding[]): IndustryRule | null {
  const logistics  = byCategory(findings, "logistics_coordination");
  const manpower   = byCategory(findings, "manpower_dependency");
  if (!logistics.length || !manpower.length) return null;

  const conf = clamp((maxConf(logistics) + maxConf(manpower)) / 2 + 8);
  return {
    id:          "em-revenue-fulfilment-constraint",
    category:    "operations",
    title:       "Revenue Fulfilment Constraint",
    description:
      "Co-occurring logistics and manpower dependency findings indicate a " +
      "systemic fulfilment risk. Events cannot be delivered at full revenue " +
      "potential when both coordination and team capacity are constrained " +
      "simultaneously — this compound pattern typically drives client churn.",
    severity:    conf >= 75 ? "HIGH" : "MEDIUM",
    confidence:  conf,
  };
}

/**
 * Rule 3 — Inventory Visibility Weakness
 * Trigger: inventory_visibility finding with severity HIGH or CRITICAL.
 */
function ruleInventoryVisibilityWeakness(findings: AnyFinding[]): IndustryRule | null {
  const matches = byCategory(findings, "inventory_visibility");
  if (!hasHighPlus(matches)) return null;

  const conf = clamp(maxConf(matches) + 3);
  return {
    id:          "em-inventory-visibility-weakness",
    category:    "inventory_visibility",
    title:       "Inventory Visibility Weakness",
    description:
      "Critical gaps in inventory tracking have been identified. Without real-time " +
      "stock visibility, event teams operate on lagged data — creating systematic " +
      "over- and under-procurement cycles that drive margin erosion and " +
      "last-minute supplier dependency.",
    severity:    conf >= 80 ? "CRITICAL" : "HIGH",
    confidence:  conf,
  };
}

/**
 * Rule 4 — Asset Leakage Exposure
 * Trigger: inventory_visibility AND financial_leakage findings present together.
 */
function ruleAssetLeakageExposure(findings: AnyFinding[]): IndustryRule | null {
  const inv = byCategory(findings, "inventory_visibility");
  const fin = byCategory(findings, "financial_leakage");
  if (!inv.length || !fin.length) return null;

  const conf = clamp((maxConf(inv) + maxConf(fin)) / 2 + 10);
  return {
    id:          "em-asset-leakage-exposure",
    category:    "financial_leakage",
    title:       "Asset Leakage Exposure",
    description:
      "The combination of inventory visibility gaps and financial leakage " +
      "signals indicates active asset leakage — goods and materials consumed " +
      "or lost during event execution without being captured in billing or " +
      "stock records. This pattern typically compounds into significant " +
      "quarterly margin compression.",
    severity:    conf >= 75 ? "HIGH" : "MEDIUM",
    confidence:  conf,
  };
}

/**
 * Rule 5 — Reconciliation Dependency
 * Trigger: warehouse_operations finding present.
 */
function ruleReconciliationDependency(findings: AnyFinding[]): IndustryRule | null {
  const matches = byCategory(findings, "warehouse_operations");
  if (!matches.length) return null;

  const conf = clamp(maxConf(matches));
  return {
    id:          "em-reconciliation-dependency",
    category:    "warehouse_operations",
    title:       "Reconciliation Dependency",
    description:
      "Warehouse operations findings indicate a reliance on manual stock " +
      "reconciliation cycles. In event management, delayed reconciliation " +
      "creates inaccurate inventory positions ahead of live events — " +
      "compounding procurement decisions and increasing write-off exposure.",
    severity:    conf >= 70 ? "HIGH" : "MEDIUM",
    confidence:  conf,
  };
}

/**
 * Rule 6 — Driver Dependency Risk
 * Trigger: manpower_dependency AND logistics_coordination findings present together.
 */
function ruleDriverDependencyRisk(findings: AnyFinding[]): IndustryRule | null {
  const manpower  = byCategory(findings, "manpower_dependency");
  const logistics = byCategory(findings, "logistics_coordination");
  if (!manpower.length || !logistics.length) return null;

  const conf = clamp(Math.max(maxConf(manpower), maxConf(logistics)) + 6);
  return {
    id:          "em-driver-dependency-risk",
    category:    "manpower_dependency",
    title:       "Driver Dependency Risk",
    description:
      "Manpower dependency and logistics coordination issues are occurring " +
      "together, indicating that event delivery relies heavily on specific " +
      "individuals coordinating transport and logistics. The departure or " +
      "unavailability of these key persons directly stalls event execution.",
    severity:    conf >= 70 ? "HIGH" : "MEDIUM",
    confidence:  conf,
  };
}

/**
 * Rule 7 — Event Scalability Constraint
 * Trigger: workflow_scalability finding present.
 */
function ruleEventScalabilityConstraint(findings: AnyFinding[]): IndustryRule | null {
  const matches = byCategory(findings, "workflow_scalability");
  if (!matches.length) return null;

  const conf = clamp(maxConf(matches) + 4);
  return {
    id:          "em-event-scalability-constraint",
    category:    "workflow_scalability",
    title:       "Event Scalability Constraint",
    description:
      "Workflow scalability findings indicate the team is absorbing growth " +
      "through overtime and manual coordination rather than process improvement. " +
      "In event management, this ceiling is reached faster than other industries " +
      "due to concurrent event load — quality degradation accelerates beyond " +
      "the current team capacity.",
    severity:    conf >= 75 ? "HIGH" : "MEDIUM",
    confidence:  conf,
  };
}

/**
 * Rule 8 — Catering Growth Opportunity
 * Trigger: industry = event_management (always evaluated for this pack).
 * Emits a strategic opportunity signal at base confidence.
 */
function ruleCateringGrowthOpportunity(
  findings: AnyFinding[],
  metrics:  Record<string, unknown>,
): IndustryRule | null {
  // Only emit if there are signs of operational stability or light findings
  const criticalCount = findings.filter(
    f => f?.severity === "CRITICAL" || f?.severity === "HIGH",
  ).length;

  // Suppress if the operation is under too much strain to consider growth
  if (criticalCount >= 4) return null;

  // Confidence scales with how few critical issues exist
  const conf = clamp(55 + Math.max(0, (4 - criticalCount) * 5));

  return {
    id:          "em-catering-growth-opportunity",
    category:    "strategic_growth",
    title:       "Catering Growth Opportunity",
    description:
      "Event management businesses with controlled operational baselines " +
      "frequently have untapped catering margin upside. Developing or expanding " +
      "an in-house catering offering can increase per-event revenue by 20–40% " +
      "while deepening client lock-in and reducing third-party vendor dependency.",
    severity:    "LOW",
    confidence:  conf,
  };
}

/**
 * Rule 9 — Central Kitchen Readiness
 * Trigger: catering-related signals in finding titles or summaries.
 * Falls back to low-confidence detection if catering terms present.
 */
function ruleCentralKitchenReadiness(findings: AnyFinding[]): IndustryRule | null {
  const CATERING_TERMS = ["catering", "kitchen", "food", "beverage", "fnb", "f&b", "meal"];

  const cateringFindings = findings.filter(f => {
    const text = `${f?.title ?? ""} ${f?.summary ?? ""}`.toLowerCase();
    return CATERING_TERMS.some(t => text.includes(t));
  });

  // Low-confidence signal if no direct catering findings but industry context suggests it
  const hasDirectSignal = cateringFindings.length > 0;
  const conf            = hasDirectSignal
    ? clamp(Math.max(50, maxConf(cateringFindings)) + 5)
    : 32; // low but above suppress threshold — strategic advisory signal

  return {
    id:          "em-central-kitchen-readiness",
    category:    "strategic_growth",
    title:       "Central Kitchen Readiness",
    description:
      hasDirectSignal
        ? "Catering-related operational patterns have been detected. Establishing " +
          "a central kitchen or commissary function would centralise food preparation, " +
          "reduce per-event catering costs, and improve consistency across concurrent events."
        : "Event management operations at scale frequently benefit from centralised " +
          "food production infrastructure. A central kitchen reduces last-mile " +
          "catering complexity and is a high-leverage investment for businesses " +
          "running 3 or more simultaneous events.",
    severity:    conf >= 60 ? "MEDIUM" : "LOW",
    confidence:  conf,
  };
}

/**
 * Rule 10 — Operational Maturity Gap
 * Trigger: operational health score below 65.
 */
function ruleOperationalMaturityGap(
  metrics: Record<string, unknown>,
  findings: AnyFinding[],
  rootCauses: AnyRootCause[],
): IndustryRule | null {
  const healthScore = typeof metrics?.operationalHealthScore === "number"
    ? metrics.operationalHealthScore
    : null;

  // If explicit score not provided, estimate from finding/root cause severity counts
  let score: number;
  if (healthScore !== null) {
    score = healthScore;
  } else {
    const critF  = findings.filter(f => f?.severity === "CRITICAL").length;
    const highF  = findings.filter(f => f?.severity === "HIGH").length;
    const critRC = rootCauses.filter(r => r?.severity === "CRITICAL").length;
    score        = 85 - critF * 10 - highF * 5 - critRC * 8;
    score        = Math.max(0, Math.min(100, score));
  }

  if (score >= 65) return null;

  // Confidence inversely scales with score — lower score = higher confidence in this rule
  const conf = clamp(90 - score * 0.5);

  return {
    id:          "em-operational-maturity-gap",
    category:    "operational_maturity",
    title:       "Operational Maturity Gap",
    description:
      `With an operational health score of ${Math.round(score)}/100, this business ` +
      "is operating below the event management industry stability threshold of 65. " +
      "The diagnostic indicates a systemic maturity gap — the organisation has " +
      "grown event volume without building the SOPs, tracking infrastructure, and " +
      "cross-functional handover protocols required to sustain delivery quality at scale.",
    severity:    score < 50 ? "CRITICAL" : "HIGH",
    confidence:  conf,
  };
}

// ── Main evaluator ────────────────────────────────────────────────────────────

/**
 * Evaluate all Event Management industry rules against the pipeline outputs.
 *
 * @returns Array of triggered IndustryRule objects, sorted descending by
 *          confidence, with rules below 30 confidence suppressed.
 */
export function evaluateEventManagementRules(params: {
  findings?:   unknown[];
  rootCauses?: unknown[];
  benchmarks?: unknown[];
  metrics?:    unknown;
}): IndustryRule[] {
  try {
    const findings:   AnyFinding[]   = arr<AnyFinding>(params.findings);
    const rootCauses: AnyRootCause[] = arr<AnyRootCause>(params.rootCauses);
    const benchmarks: AnyBenchmark[] = arr<AnyBenchmark>(params.benchmarks);
    const metrics: Record<string, unknown> =
      params.metrics && typeof params.metrics === "object" && !Array.isArray(params.metrics)
        ? (params.metrics as Record<string, unknown>)
        : {};

    // Suppress unused variable warning — benchmarks available for future rules
    void benchmarks;

    const candidates: Array<IndustryRule | null> = [
      ruleLogisticsBottleneck(findings),
      ruleRevenueFulfilmentConstraint(findings),
      ruleInventoryVisibilityWeakness(findings),
      ruleAssetLeakageExposure(findings),
      ruleReconciliationDependency(findings),
      ruleDriverDependencyRisk(findings),
      ruleEventScalabilityConstraint(findings),
      ruleCateringGrowthOpportunity(findings, metrics),
      ruleCentralKitchenReadiness(findings),
      ruleOperationalMaturityGap(metrics, findings, rootCauses),
    ];

    const rules = candidates
      .filter((r): r is IndustryRule => r !== null && r.confidence >= SUPPRESS_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence);

    console.log(
      `[MGD][EM-PACK] evaluateEventManagementRules — ` +
      `evaluated=10 triggered=${candidates.filter(r=>r!==null).length} ` +
      `passed=${rules.length} (threshold=${SUPPRESS_THRESHOLD})`,
    );

    return rules;
  } catch (err) {
    console.error("[MGD][EM-PACK] evaluateEventManagementRules — error:", (err as Error)?.message ?? err);
    return [];
  }
}
