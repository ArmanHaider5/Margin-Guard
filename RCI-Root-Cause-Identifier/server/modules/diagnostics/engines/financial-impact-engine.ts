// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL IMPACT ENGINE
//
// Estimates the annualised financial impact of detected operational problems.
// Instead of hardcoded flat numbers, uses signal pattern matching to classify
// the nature of losses, then applies industry-typical cost bands calibrated
// to SME contexts (not Fortune-500 scale).
//
// Output categories:
//   downtimeLoss    — revenue foregone from production stoppages
//   qualityLoss     — scrap + rework + customer returns cost
//   workforceLoss   — overtime premium + turnover/rehire cost
//   supplyChainLoss — expediting fees + stock-out penalties
//   totalLoss       — sum of all categories
//   confidenceLevel — "estimated" | "indicative" | "modelled"
//
// confidenceLevel meanings:
//   "estimated"   — ≥3 signal types matched, numbers are signal-driven
//   "indicative"  — 1–2 signal types matched, band mid-points used
//   "modelled"    — no direct signal match; derived from finding severity
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialImpact {
  downtimeLoss:     number;
  qualityLoss:      number;
  workforceLoss:    number;
  supplyChainLoss:  number;
  totalLoss:        number;
  confidenceLevel:  "estimated" | "indicative" | "modelled";
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL PATTERN GROUPS
// Each group lists signal fragments (substring matches, case-insensitive).
// ─────────────────────────────────────────────────────────────────────────────

const DOWNTIME_PATTERNS = [
  "downtime", "machine_breakdown", "machine breakdown",
  "unplanned_downtime", "line_stoppage", "line stoppage",
  "production_halt", "production halt", "production_loss",
  "equipment_failure", "equipment failure", "breakdown",
];

const QUALITY_PATTERNS = [
  "scrap", "rework", "defect", "quality_drift", "quality drift",
  "rejection", "non_conformance", "non conformance", "yield_loss",
  "warranty", "return_rate", "customer_complaint",
];

const WORKFORCE_PATTERNS = [
  "overtime", "high_turnover", "high turnover", "turnover",
  "skill_gap", "skill gap", "operator_fatigue", "operator fatigue",
  "training", "rehire", "absenteeism", "productivity_drop",
];

const SUPPLY_CHAIN_PATTERNS = [
  "supplier_delay", "supplier delay", "material_shortage",
  "material shortage", "stock_out", "stock out", "leadtime",
  "lead_time", "lead time", "expediting", "inventory_discrepancy",
  "order_backlog", "order backlog",
];

// ─────────────────────────────────────────────────────────────────────────────
// COST BANDS (SME defaults, annualised, in base currency units)
// Each band: [low, mid, high] representing the loss range for that category.
// ─────────────────────────────────────────────────────────────────────────────

const COST_BANDS = {
  downtime:    { low: 150_000, mid: 320_000, high: 600_000 },
  quality:     { low:  60_000, mid: 130_000, high: 260_000 },
  workforce:   { low:  40_000, mid:  90_000, high: 180_000 },
  supplyChain: { low:  30_000, mid:  70_000, high: 140_000 },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function matchesPatterns(signals: string[], patterns: string[]): boolean {
  for (const sig of signals) {
    const sigLower = sig.toLowerCase().replace(/_/g, " ");
    for (const pattern of patterns) {
      const patternNorm = pattern.toLowerCase().replace(/_/g, " ");
      if (sigLower.includes(patternNorm) || patternNorm.includes(sigLower)) {
        return true;
      }
    }
  }
  return false;
}

function countMatches(signals: string[], patterns: string[]): number {
  let count = 0;
  for (const sig of signals) {
    const sigLower = sig.toLowerCase().replace(/_/g, " ");
    for (const pattern of patterns) {
      const patternNorm = pattern.toLowerCase().replace(/_/g, " ");
      if (sigLower.includes(patternNorm) || patternNorm.includes(sigLower)) {
        count++;
        break; // only count each signal once per group
      }
    }
  }
  return count;
}

// Intensity factor: more matching signals within a group → higher end of band
function intensityBand(
  matchCount: number,
  band: { low: number; mid: number; high: number }
): number {
  if (matchCount >= 3) return band.high;
  if (matchCount >= 2) return band.mid;
  return band.low;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function estimateFinancialImpact(
  signals: string[],
  findings?: any[]
): FinancialImpact {

  const allSignals = [
    ...(signals ?? []),
    // Also extract signal-like text from finding titles / categories
    ...(findings ?? []).map((f) => (f.title ?? f.name ?? "").toLowerCase()),
    ...(findings ?? []).map((f) => (f.category ?? "").toLowerCase()),
  ];

  const downtimeMatches    = countMatches(allSignals, DOWNTIME_PATTERNS);
  const qualityMatches     = countMatches(allSignals, QUALITY_PATTERNS);
  const workforceMatches   = countMatches(allSignals, WORKFORCE_PATTERNS);
  const supplyChainMatches = countMatches(allSignals, SUPPLY_CHAIN_PATTERNS);

  const matchedGroups =
    (downtimeMatches > 0 ? 1 : 0) +
    (qualityMatches > 0 ? 1 : 0) +
    (workforceMatches > 0 ? 1 : 0) +
    (supplyChainMatches > 0 ? 1 : 0);

  // Confidence level
  let confidenceLevel: FinancialImpact["confidenceLevel"];
  if (matchedGroups >= 3)     confidenceLevel = "estimated";
  else if (matchedGroups >= 1) confidenceLevel = "indicative";
  else                         confidenceLevel = "modelled";

  // ── Calculate losses ────────────────────────────────────────────────────

  let downtimeLoss = 0;
  let qualityLoss  = 0;
  let workforceLoss = 0;
  let supplyChainLoss = 0;

  if (downtimeMatches > 0) {
    downtimeLoss = intensityBand(downtimeMatches, COST_BANDS.downtime);
  }

  if (qualityMatches > 0) {
    qualityLoss = intensityBand(qualityMatches, COST_BANDS.quality);
  }

  if (workforceMatches > 0) {
    workforceLoss = intensityBand(workforceMatches, COST_BANDS.workforce);
  }

  if (supplyChainMatches > 0) {
    supplyChainLoss = intensityBand(supplyChainMatches, COST_BANDS.supplyChain);
  }

  // ── Modelled fallback: derive from finding count / severity ─────────────
  if (matchedGroups === 0 && (findings ?? []).length > 0) {
    const findingCount = (findings ?? []).length;
    const baseFallback = COST_BANDS.quality.low;

    // Heuristic: each finding adds a proportional cost estimate
    qualityLoss   = Math.round(baseFallback * Math.min(findingCount, 4) * 0.5);
    workforceLoss = Math.round(COST_BANDS.workforce.low * 0.4);
  }

  const totalLoss = downtimeLoss + qualityLoss + workforceLoss + supplyChainLoss;

  console.log(
    `💰 FINANCIAL IMPACT: total=${totalLoss.toLocaleString()} | confidence=${confidenceLevel}`,
    `| groups matched: downtime=${downtimeMatches}, quality=${qualityMatches},`,
    `workforce=${workforceMatches}, supply=${supplyChainMatches}`
  );

  return {
    downtimeLoss,
    qualityLoss,
    workforceLoss,
    supplyChainLoss,
    totalLoss,
    confidenceLevel,
  };
}
