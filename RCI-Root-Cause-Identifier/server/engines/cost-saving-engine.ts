export interface CostSavingOpportunityItem {
  title: string;
  description: string;
  estimatedSavings: string;
}

export interface CostSavingEstimate {
  opportunities: CostSavingOpportunityItem[];
}

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

export function estimateCostSavings(
  rootCauseTree: any,
  causalChains: any[],
): CostSavingEstimate {
  const matched = new Set<string>();

  const primary = rootCauseTree?.primaryCause;
  const secondary: any[] = rootCauseTree?.secondaryCauses || [];
  const contributing: any[] = rootCauseTree?.contributingFactors || [];

  const allCauses = [primary, ...secondary, ...contributing].filter(Boolean);

  for (const cause of allCauses) {
    const title = (cause.title || cause.name || "").toLowerCase();
    for (const [keyword, savingsKey] of Object.entries(KEYWORD_TO_SAVINGS)) {
      if (title.includes(keyword)) {
        matched.add(savingsKey);
      }
    }
  }

  for (const entry of causalChains || []) {
    const chain: string[] = entry.chain || [];
    for (const step of chain) {
      const lower = step.toLowerCase();
      for (const [keyword, savingsKey] of Object.entries(KEYWORD_TO_SAVINGS)) {
        if (lower.includes(keyword)) {
          matched.add(savingsKey);
        }
      }
    }
  }

  const opportunities: CostSavingOpportunityItem[] = [];
  for (const key of matched) {
    if (SAVINGS_MAP[key]) {
      opportunities.push(SAVINGS_MAP[key]);
    }
  }

  console.log("💰 COST SAVING OPPORTUNITIES GENERATED");

  return { opportunities };
}
