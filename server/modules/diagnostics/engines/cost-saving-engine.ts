export interface CostSavingOpportunityItem {
  title: string;
  description: string;
  estimatedSavings: string;
}

export interface CostSavingEstimate {
  opportunities: CostSavingOpportunityItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUFACTURING / GENERIC SAVINGS MAP
// ─────────────────────────────────────────────────────────────────────────────

const SAVINGS_MAP: Record<string, CostSavingOpportunityItem> = {
  maintenance: {
    title: "Maintenance Optimisation",
    description: "Reducing reactive maintenance and improving PM compliance.",
    estimatedSavings: "RM 50,000 – RM 150,000 annually",
  },
  breakdown: {
    title: "Downtime Recovery",
    description: "Reducing unplanned downtime through preventive maintenance and equipment reliability improvements.",
    estimatedSavings: "RM 120,000 – RM 350,000 annually",
  },
  scrap: {
    title: "Scrap Reduction",
    description: "Minimising scrap and rework through process control and quality improvements.",
    estimatedSavings: "RM 30,000 – RM 120,000 annually",
  },
  overtime: {
    title: "Labour Optimisation",
    description: "Reducing excessive overtime through better planning and workload distribution.",
    estimatedSavings: "RM 40,000 – RM 100,000 annually",
  },
};

const KEYWORD_TO_SAVINGS: Record<string, string> = {
  "maintenance backlog": "maintenance",
  "maintenance": "maintenance",
  "pm overdue": "maintenance",
  "preventive maintenance": "maintenance",
  "machine breakdown": "breakdown",
  "breakdown": "breakdown",
  "downtime": "breakdown",
  "unplanned downtime": "breakdown",
  "scrap": "scrap",
  "rework": "scrap",
  "quality": "scrap",
  "defect": "scrap",
  "overtime": "overtime",
  "extended shifts": "overtime",
  "labour": "overtime",
};

// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT SAVINGS MAP
// ─────────────────────────────────────────────────────────────────────────────

const EM_SAVINGS_MAP: Record<string, CostSavingOpportunityItem> = {
  em_dispatch: {
    title: "Tighten Dispatch Accuracy and Event Pack Readiness",
    description: "Introducing a mandatory dispatch sign-off checklist eliminates on-site shortfalls, emergency re-runs and same-day substitution costs that currently inflate per-event delivery expense.",
    estimatedSavings: "RM 24,000 – RM 60,000 annually",
  },
  em_emergency_sourcing: {
    title: "Reduce Emergency and Premium Vendor Spend",
    description: "Formalising supplier lock-in before event windows and building a pre-qualified backup vendor list removes the premium cost of last-minute sourcing that currently erodes event margins.",
    estimatedSavings: "RM 18,000 – RM 72,000 annually",
  },
  em_overtime: {
    title: "Reduce Crew Overtime Through Better Deployment Planning",
    description: "Matching crew numbers to event scale and complexity at booking stage — not on the day — removes structural overtime that is currently paid as a delivery cost rather than managed as a planning gap.",
    estimatedSavings: "RM 20,000 – RM 60,000 annually",
  },
  em_damage_recovery: {
    title: "Recover Damage and Asset Loss Charges Consistently",
    description: "Implementing a standardised post-event damage assessment and billing process converts currently unrecovered client-caused losses into a traceable revenue line.",
    estimatedSavings: "RM 12,000 – RM 40,000 annually",
  },
  em_rework: {
    title: "Reduce Rework and Setup Delays Through Stronger Role Ownership",
    description: "Assigning a named event commander with pre-briefed crews reduces duplicated effort, setup errors and rework cycles that currently absorb avoidable labour hours on event days.",
    estimatedSavings: "RM 15,000 – RM 45,000 annually",
  },
  em_job_costing: {
    title: "Improve Event-Level Profitability Visibility",
    description: "Tracking margin per event type and per client reveals which formats generate commercial return and which systematically lose margin — enabling better pricing and deployment decisions.",
    estimatedSavings: "RM 30,000 – RM 90,000 margin improvement annually",
  },
  em_overdue: {
    title: "Reduce Overdue-Account Leakage and Collection Drag",
    description: "Standardising post-event invoicing timelines and implementing structured follow-up on overdue accounts removes the cash drag that currently limits reinvestment in upcoming event commitments.",
    estimatedSavings: "RM 10,000 – RM 35,000 annually",
  },
  em_supplier_lockin: {
    title: "Improve Supplier Lock-In Before Event Execution",
    description: "Formal confirmation milestones with all critical vendors before the setup window eliminates the delivery uncertainty that forces emergency sourcing and on-site improvisation.",
    estimatedSavings: "RM 15,000 – RM 48,000 annually",
  },
  em_underquoting: {
    title: "Eliminate Systematic Underquoting Through Full-Cost Modelling",
    description: "Building a complete per-event cost model — covering labour, equipment wear, contingency and setup time — closes the gap between quoted and delivered margin that currently runs as a structural loss.",
    estimatedSavings: "RM 36,000 – RM 120,000 annually",
  },
};

const EM_KEYWORD_TO_SAVINGS: Record<string, string> = {
  // Dispatch / readiness
  "inventory mismatch":         "em_dispatch",
  "incomplete dispatch":        "em_dispatch",
  "dispatch accuracy":          "em_dispatch",
  "loading":                    "em_dispatch",
  "missing item":               "em_dispatch",
  "wrong item":                 "em_dispatch",
  "rental readiness":           "em_dispatch",
  "stock shortage":             "em_dispatch",
  // Emergency sourcing / supplier
  "emergency sourcing":         "em_emergency_sourcing",
  "emergency purchase":         "em_emergency_sourcing",
  "vendor no-show":             "em_emergency_sourcing",
  "vendor no show":             "em_emergency_sourcing",
  "supplier delay":             "em_emergency_sourcing",
  "late vendor":                "em_emergency_sourcing",
  "supplier lock":              "em_supplier_lockin",
  "vendor confirmation":        "em_supplier_lockin",
  // Overtime
  "crew overtime":              "em_overtime",
  "event overtime":             "em_overtime",
  "crew shortage":              "em_overtime",
  "insufficient manpower":      "em_overtime",
  "fatigue":                    "em_overtime",
  "structural overtime":        "em_overtime",
  // Damage / loss
  "damaged return":             "em_damage_recovery",
  "unrecovered":                "em_damage_recovery",
  "damage recovery":            "em_damage_recovery",
  "missing asset":              "em_damage_recovery",
  "asset loss":                 "em_damage_recovery",
  // Rework / setup
  "setup delay":                "em_rework",
  "setup error":                "em_rework",
  "rework":                     "em_rework",
  "role ambiguity":             "em_rework",
  "crew briefing":              "em_rework",
  "supervision":                "em_rework",
  // Job costing / profitability
  "margin leakage":             "em_job_costing",
  "event margin":               "em_job_costing",
  "profitability":              "em_job_costing",
  "job costing":                "em_job_costing",
  "margin blind":               "em_job_costing",
  // Overdue / collections
  "overdue account":            "em_overdue",
  "delayed invoice":            "em_overdue",
  "collection":                 "em_overdue",
  "cash drag":                  "em_overdue",
  // Underquoting
  "underquoted":                "em_underquoting",
  "underpricing":               "em_underquoting",
  "scope creep":                "em_underquoting",
  "change order":               "em_underquoting",
  "cost overrun":               "em_underquoting",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function estimateCostSavings(
  rootCauseTree: any,
  causalChains: any[],
  industry?: string,
): CostSavingEstimate {

  const primary = rootCauseTree?.primaryCause;
  const secondary: any[] = rootCauseTree?.secondaryCauses || [];
  const contributing: any[] = rootCauseTree?.contributingFactors || [];
  const allCauses = [primary, ...secondary, ...contributing].filter(Boolean);

  // ── Event Management path ─────────────────────────────────────────────────
  if (industry === "event_management") {
    const matched = new Set<string>();

    for (const cause of allCauses) {
      const title = (cause.title || cause.name || "").toLowerCase();
      for (const [keyword, savingsKey] of Object.entries(EM_KEYWORD_TO_SAVINGS)) {
        if (title.includes(keyword)) matched.add(savingsKey);
      }
    }

    for (const entry of causalChains || []) {
      const chain: string[] = entry.chain || [];
      for (const step of chain) {
        const lower = step.toLowerCase();
        for (const [keyword, savingsKey] of Object.entries(EM_KEYWORD_TO_SAVINGS)) {
          if (lower.includes(keyword)) matched.add(savingsKey);
        }
      }
    }

    // Always include core EM savings for credibility (minimum 3)
    if (matched.size === 0) {
      matched.add("em_dispatch");
      matched.add("em_overtime");
      matched.add("em_job_costing");
    }

    const opportunities: CostSavingOpportunityItem[] = [];
    for (const key of matched) {
      if (EM_SAVINGS_MAP[key]) opportunities.push(EM_SAVINGS_MAP[key]);
    }

    console.log(`💰 EM COST SAVINGS: ${opportunities.length} opportunities identified`);
    return { opportunities };
  }

  // ── Generic / Manufacturing path ──────────────────────────────────────────
  const matched = new Set<string>();

  for (const cause of allCauses) {
    const title = (cause.title || cause.name || "").toLowerCase();
    for (const [keyword, savingsKey] of Object.entries(KEYWORD_TO_SAVINGS)) {
      if (title.includes(keyword)) matched.add(savingsKey);
    }
  }

  for (const entry of causalChains || []) {
    const chain: string[] = entry.chain || [];
    for (const step of chain) {
      const lower = step.toLowerCase();
      for (const [keyword, savingsKey] of Object.entries(KEYWORD_TO_SAVINGS)) {
        if (lower.includes(keyword)) matched.add(savingsKey);
      }
    }
  }

  const opportunities: CostSavingOpportunityItem[] = [];
  for (const key of matched) {
    if (SAVINGS_MAP[key]) opportunities.push(SAVINGS_MAP[key]);
  }

  console.log("💰 COST SAVING OPPORTUNITIES GENERATED");

  return { opportunities };
}
