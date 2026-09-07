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
  // Event Management specific buckets (present only for event_management industry)
  overtimeLeakage?:       number;
  emergencySourcingCost?: number;
  reworkLabourCost?:      number;
  assetWriteOff?:         number;
  unrecoveredDamage?:     number;
  missedBillables?:       number;
  underquotedMargin?:     number;
  collectionDrag?:        number;
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

// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT FINANCIAL IMPACT
// Signal patterns mapped to EM-specific cost buckets.
// ─────────────────────────────────────────────────────────────────────────────

const EM_OVERTIME_PATTERNS = [
  "crew_overtime", "event_overtime", "event_fatigue", "crew_shortage",
  "insufficient_manpower", "overtime", "extended_shift", "overtime_charges",
];

const EM_EMERGENCY_SOURCING_PATTERNS = [
  "emergency_purchase", "last_minute_change", "supplier_delay",
  "vendor_no_show", "premium_cost", "emergency sourcing", "last-minute sourcing",
];

const EM_REWORK_PATTERNS = [
  "setup_delay", "incomplete_setup", "rework", "late_setup",
  "setup_error", "dispatch_error", "loading_error",
];

const EM_ASSET_WRITEOFF_PATTERNS = [
  "damaged_return", "broken_item", "repair_backlog",
  "missing_item", "equipment_unavailable", "damaged_dispatch",
];

const EM_UNRECOVERED_DAMAGE_PATTERNS = [
  "damaged_return", "missing_item", "unrecovered_loss",
  "replacement_cost", "refund_issue",
];

const EM_MISSED_BILLABLES_PATTERNS = [
  "scope_addition", "untracked_add_on", "low_margin",
  "underquoted_event", "pricing_gap",
];

const EM_UNDERQUOTED_PATTERNS = [
  "underquoted_event", "low_margin", "cost_overrun", "pricing_gap", "margin_blind_spot",
];

const EM_COLLECTION_DRAG_PATTERNS = [
  "overdue_account", "delayed_invoice", "collection_gap", "cash_flow_issue",
];

const EM_COST_BANDS = {
  overtime:         { low: 24_000, mid: 60_000,  high: 120_000 },
  emergencySourcing:{ low: 18_000, mid: 48_000,  high: 96_000  },
  rework:           { low: 12_000, mid: 30_000,  high: 60_000  },
  assetWriteOff:    { low: 8_000,  mid: 22_000,  high: 48_000  },
  unrecoveredDamage:{ low: 6_000,  mid: 18_000,  high: 40_000  },
  missedBillables:  { low: 15_000, mid: 40_000,  high: 80_000  },
  underquoted:      { low: 30_000, mid: 72_000,  high: 150_000 },
  collectionDrag:   { low: 10_000, mid: 28_000,  high: 60_000  },
};

function estimateEventFinancialImpact(signals: string[], findings?: any[]): FinancialImpact {
  const allSignals = [
    ...(signals ?? []),
    ...(findings ?? []).map((f) => (f.title ?? f.name ?? "").toLowerCase()),
    ...(findings ?? []).map((f) => (f.category ?? "").toLowerCase()),
  ];

  const get = (patterns: string[]) => countMatches(allSignals, patterns);

  const overtimeMatches         = get(EM_OVERTIME_PATTERNS);
  const emergencyMatches        = get(EM_EMERGENCY_SOURCING_PATTERNS);
  const reworkMatches           = get(EM_REWORK_PATTERNS);
  const assetMatches            = get(EM_ASSET_WRITEOFF_PATTERNS);
  const unrecoveredMatches      = get(EM_UNRECOVERED_DAMAGE_PATTERNS);
  const missedBillablesMatches  = get(EM_MISSED_BILLABLES_PATTERNS);
  const underquotedMatches      = get(EM_UNDERQUOTED_PATTERNS);
  const collectionMatches       = get(EM_COLLECTION_DRAG_PATTERNS);

  const overtimeLeakage       = overtimeMatches        > 0 ? intensityBand(overtimeMatches,        EM_COST_BANDS.overtime)          : 0;
  const emergencySourcingCost = emergencyMatches        > 0 ? intensityBand(emergencyMatches,        EM_COST_BANDS.emergencySourcing) : 0;
  const reworkLabourCost      = reworkMatches           > 0 ? intensityBand(reworkMatches,           EM_COST_BANDS.rework)            : 0;
  const assetWriteOff         = assetMatches            > 0 ? intensityBand(assetMatches,            EM_COST_BANDS.assetWriteOff)     : 0;
  const unrecoveredDamage     = unrecoveredMatches      > 0 ? intensityBand(unrecoveredMatches,      EM_COST_BANDS.unrecoveredDamage) : 0;
  const missedBillables       = missedBillablesMatches  > 0 ? intensityBand(missedBillablesMatches,  EM_COST_BANDS.missedBillables)   : 0;
  const underquotedMargin     = underquotedMatches      > 0 ? intensityBand(underquotedMatches,      EM_COST_BANDS.underquoted)       : 0;
  const collectionDrag        = collectionMatches       > 0 ? intensityBand(collectionMatches,       EM_COST_BANDS.collectionDrag)    : 0;

  const matchedGroups = [
    overtimeMatches, emergencyMatches, reworkMatches, assetMatches,
    unrecoveredMatches, missedBillablesMatches, underquotedMatches, collectionMatches,
  ].filter(m => m > 0).length;

  const confidenceLevel: FinancialImpact["confidenceLevel"] =
    matchedGroups >= 4 ? "estimated" :
    matchedGroups >= 1 ? "indicative" : "modelled";

  const totalLoss =
    overtimeLeakage + emergencySourcingCost + reworkLabourCost + assetWriteOff +
    unrecoveredDamage + missedBillables + underquotedMargin + collectionDrag;

  // Modelled fallback — at least show directional loss from findings
  const modelled = totalLoss === 0 && (findings ?? []).length > 0
    ? EM_COST_BANDS.overtime.low + EM_COST_BANDS.emergencySourcing.low
    : 0;

  const finalTotal = totalLoss > 0 ? totalLoss : modelled;

  console.log(
    `💰 EM FINANCIAL IMPACT: total=${finalTotal.toLocaleString()} | confidence=${confidenceLevel}`,
    `| groups: overtime=${overtimeMatches}, emergency=${emergencyMatches},`,
    `rework=${reworkMatches}, asset=${assetMatches}, unrecovered=${unrecoveredMatches}`,
  );

  return {
    downtimeLoss: reworkLabourCost,
    qualityLoss: assetWriteOff + unrecoveredDamage,
    workforceLoss: overtimeLeakage,
    supplyChainLoss: emergencySourcingCost,
    totalLoss: finalTotal,
    confidenceLevel,
    overtimeLeakage,
    emergencySourcingCost,
    reworkLabourCost,
    assetWriteOff,
    unrecoveredDamage,
    missedBillables,
    underquotedMargin,
    collectionDrag,
  };
}

export function estimateFinancialImpact(
  signals: string[],
  findings?: any[],
  industry?: string,
): FinancialImpact {

  if (industry === "event_management") {
    return estimateEventFinancialImpact(signals, findings);
  }


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
