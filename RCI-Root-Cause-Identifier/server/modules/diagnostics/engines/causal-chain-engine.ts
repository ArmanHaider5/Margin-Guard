export interface CausalChain {
  chain: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CAUSAL LINK GRAPH
// Each entry: "trigger signal" → "consequence signal"
// Built as a directed graph — traversal stops when no further link exists.
// ─────────────────────────────────────────────────────────────────────────────
const CAUSAL_LINKS: Record<string, string> = {
  // Maintenance → Breakdown path
  "pm overdue":              "maintenance backlog",
  "maintenance backlog":     "machine breakdown",
  "machine breakdown":       "unplanned downtime",
  "unplanned downtime":      "production loss",
  "production loss":         "missed delivery",

  // Capacity / Overtime path
  "capacity utilization high": "line bottleneck",
  "line bottleneck":           "overtime spike",
  "overtime spike":            "operator fatigue",
  "operator fatigue":          "operator error",
  "operator error":            "defect rate increase",

  // Quality degradation path
  "quality drift":        "defect rate increase",
  "defect rate increase": "rework",
  "rework":               "scrap spike",
  "scrap spike":          "material waste",
  "material waste":       "cost overrun",

  // Supply chain disruption path
  "supplier delay":       "material shortage",
  "material shortage":    "line stoppage",
  "line stoppage":        "missed delivery",
  "missed delivery":      "customer penalty",

  // Workforce / retention path
  "high turnover":        "skill gap",
  "skill gap":            "training overload",
  "training overload":    "productivity drop",
  "productivity drop":    "output shortfall",

  // Inventory / planning path
  "inventory discrepancy": "stock out",
  "stock out":             "production halt",
  "production halt":       "order backlog",
  "order backlog":         "customer penalty",

  // Energy / utility path
  "energy spike":         "utility overrun",
  "utility overrun":      "cost overrun",

  // Legacy aliases (kept for backward compatibility)
  "downtime":             "overtime spike",
  "overtime":             "missed delivery",
  "scrap":                "rework",
  "lead time increase":   "missed delivery",
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL VOCABULARY
// Maps known signal IDs / category terms → canonical causal graph keys.
// Both underscore_case and space-separated forms are included.
// ─────────────────────────────────────────────────────────────────────────────
const SIGNAL_ALIAS_MAP: Record<string, string> = {
  // Maintenance
  "pm_overdue":            "pm overdue",
  "pm overdue":            "pm overdue",
  "maintenance_backlog":   "maintenance backlog",
  "maintenance backlog":   "maintenance backlog",
  "machine_breakdown":     "machine breakdown",
  "machine breakdown":     "machine breakdown",
  "equipment_failure":     "machine breakdown",
  "equipment failure":     "machine breakdown",

  // Downtime
  "unplanned_downtime":    "unplanned downtime",
  "unplanned downtime":    "unplanned downtime",
  "downtime":              "unplanned downtime",
  "downtime_spike":        "unplanned downtime",
  "production_loss":       "production loss",

  // Capacity
  "capacity_utilization_high": "capacity utilization high",
  "line_bottleneck":           "line bottleneck",
  "bottleneck":                "line bottleneck",

  // Overtime / fatigue
  "overtime_spike":        "overtime spike",
  "overtime":              "overtime spike",
  "extended_shift":        "overtime spike",
  "operator_fatigue":      "operator fatigue",
  "operator_error":        "operator error",

  // Quality
  "quality_drift":         "quality drift",
  "defect_rate":           "defect rate increase",
  "defect_rate_increase":  "defect rate increase",
  "high_defect_rate":      "defect rate increase",
  "rework":                "rework",
  "scrap_spike":           "scrap spike",
  "scrap":                 "scrap spike",
  "material_waste":        "material waste",

  // Supply chain
  "supplier_delay":        "supplier delay",
  "material_shortage":     "material shortage",
  "lead_time_increase":    "material shortage",
  "leadtime_increase":     "material shortage",
  "lead time increase":    "material shortage",
  "stock_out":             "stock out",
  "inventory_discrepancy": "inventory discrepancy",

  // Workforce
  "high_turnover":         "high turnover",
  "turnover_rate":         "high turnover",
  "skill_gap":             "skill gap",
  "training_gap":          "skill gap",
  "productivity_drop":     "productivity drop",

  // Delivery
  "missed_delivery":       "missed delivery",
  "delivery_delay":        "missed delivery",
  "order_backlog":         "order backlog",

  // Cost
  "cost_overrun":          "cost overrun",
  "energy_spike":          "energy spike",
};

// ─────────────────────────────────────────────────────────────────────────────
// FINDING CATEGORY → SEED SIGNALS
// If no direct signal match is found, infer seed signals from finding categories.
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_SEED_SIGNALS: Record<string, string[]> = {
  "Machinery":  ["machine breakdown", "pm overdue"],
  "Materials":  ["supplier delay", "material shortage"],
  "Manpower":   ["high turnover", "operator fatigue"],
  "Money":      ["cost overrun", "energy spike"],
  // Industry-agnostic aliases
  "Operations": ["capacity utilization high", "line bottleneck"],
  "Quality":    ["quality drift", "defect rate increase"],
  "Supply":     ["supplier delay", "material shortage"],
  "Workforce":  ["high turnover", "skill gap"],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function normalizeSignalKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function resolveCanonical(raw: string): string | null {
  const normalized = normalizeSignalKey(raw);
  return SIGNAL_ALIAS_MAP[normalized] ?? SIGNAL_ALIAS_MAP[raw.toLowerCase()] ?? null;
}

function buildChainFrom(seed: string): string[] {
  const chain: string[] = [seed];
  let current = seed;
  const visited = new Set<string>([current]);

  while (CAUSAL_LINKS[current]) {
    const next = CAUSAL_LINKS[current];
    if (visited.has(next)) break;
    chain.push(next);
    visited.add(next);
    current = next;
  }

  return chain;
}

function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function buildCausalChains(
  signals: (string | Record<string, any>)[],
  findings: any[]
): CausalChain[] {
  const seedSet = new Set<string>();

  // ── 1. Resolve seeds from incoming signals ──────────────────────────────
  for (const sig of signals ?? []) {
    const rawId =
      typeof sig === "string"
        ? sig
        : (sig.signalId ?? sig.id ?? sig.matchedPhrase ?? sig.phrase ?? "");

    if (!rawId) continue;

    const canonical = resolveCanonical(rawId);
    if (canonical) {
      seedSet.add(canonical);
      continue;
    }

    // Fuzzy fallback: check if the normalized form contains any known key
    const normalized = normalizeSignalKey(rawId);
    for (const alias of Object.keys(SIGNAL_ALIAS_MAP)) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        const mapped = SIGNAL_ALIAS_MAP[alias];
        if (mapped) seedSet.add(mapped);
      }
    }
  }

  // ── 2. Resolve seeds from finding titles ───────────────────────────────
  for (const finding of findings ?? []) {
    const title = normalizeSignalKey(finding.title ?? finding.name ?? "");
    for (const alias of Object.keys(SIGNAL_ALIAS_MAP)) {
      if (title.includes(alias)) {
        const mapped = SIGNAL_ALIAS_MAP[alias];
        if (mapped) seedSet.add(mapped);
      }
    }
  }

  // ── 3. Seed from finding categories if still empty ────────────────────
  if (seedSet.size === 0) {
    for (const finding of findings ?? []) {
      const category = (finding.category ?? "").trim();
      const categorySeeds = CATEGORY_SEED_SIGNALS[category];
      if (categorySeeds) {
        for (const s of categorySeeds) seedSet.add(s);
      }
    }
  }

  // ── 4. Build chains from each seed ────────────────────────────────────
  const chainMap = new Map<string, string[]>();

  for (const seed of seedSet) {
    const chain = buildChainFrom(seed);
    if (chain.length >= 2) {
      const key = chain.join("|");
      if (!chainMap.has(key)) {
        chainMap.set(key, chain);
      }
    }
  }

  // ── 5. Deduplicate: keep only chains not fully covered by a longer one
  const sorted = Array.from(chainMap.values()).sort(
    (a, b) => b.length - a.length
  );

  const deduplicated: string[][] = [];
  for (const chain of sorted) {
    const chainSet = new Set(chain);
    const coveredByExisting = deduplicated.some((existing) => {
      const existingSet = new Set(existing);
      return Array.from(chainSet).every((s) => existingSet.has(s));
    });
    if (!coveredByExisting) {
      deduplicated.push(chain);
    }
  }

  // ── 6. Format output ──────────────────────────────────────────────────
  const result: CausalChain[] = deduplicated.map((chain) => ({
    chain: chain.map(titleCase),
  }));

  console.log(
    `🔗 CAUSAL CHAINS: ${result.length} chains from ${seedSet.size} seeds`,
    seedSet.size > 0 ? `[${Array.from(seedSet).slice(0, 3).join(", ")}...]` : "(none)"
  );

  return result;
}
