// ─────────────────────────────────────────────────────────────────────────────
// CONSULTING NARRATIVE ENGINE
//
// Generates consultant-grade prose for two outputs:
//   - summary:   A concise executive summary paragraph (displayed in the UI)
//   - narrative: A fuller diagnostic narrative (PDF reports, detailed views)
//
// Follows the Situation → Complication → Resolution structure used in
// management consulting deliverables (McKinsey, BCG, Bain style).
//
// SAFETY: all text is derived from structured data. No numbers are invented.
// Directional language ("elevated", "recurring") is used without claiming
// precise metrics unless the data explicitly provides them.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsultingNarrative {
  summary: string;
  narrative: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY LANGUAGE LIBRARY
// Each entry provides vocabulary to frame root cause prose by 4M category.
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_FRAMES: Record<string, {
  situationOpener: string;
  primaryDescriptor: string;
  consequence: string;
  risksPhrase: string;
  resolutionDirection: string;
}> = {
  Machinery: {
    situationOpener: "Equipment reliability is the central operational constraint identified in this assessment.",
    primaryDescriptor: "machinery and equipment failure",
    consequence: "Recurring breakdowns and deferred maintenance are compressing available production capacity and increasing operational recovery costs.",
    risksPhrase: "delivery reliability and operational throughput",
    resolutionDirection: "Stabilising equipment availability through structured preventive maintenance and reliability improvement is the most direct path to operational recovery.",
  },
  Materials: {
    situationOpener: "Supply chain instability is the primary operational pressure identified in this assessment.",
    primaryDescriptor: "materials and supply chain disruption",
    consequence: "Procurement gaps and material shortages are interrupting production flow and forcing reactive scheduling adjustments.",
    risksPhrase: "production continuity and customer commitments",
    resolutionDirection: "Strengthening supplier relationships, improving material visibility, and building buffer inventory are the foundational interventions required.",
  },
  Manpower: {
    situationOpener: "Workforce management is the primary operational challenge identified in this assessment.",
    primaryDescriptor: "workforce capacity and stability",
    consequence: "Staffing gaps, skills deficits, and elevated turnover are eroding operational consistency and increasing the cost of recovery.",
    risksPhrase: "operational quality and institutional knowledge retention",
    resolutionDirection: "Addressing workforce retention, structured onboarding, and skills development will build the stable operational base required for consistent performance.",
  },
  Money: {
    situationOpener: "Cost structure inefficiency is the primary operational pressure identified in this assessment.",
    primaryDescriptor: "financial leakage and cost escalation",
    consequence: "Uncontrolled cost escalation across operating areas is compressing margins and reducing the organisation's capacity to invest in improvement.",
    risksPhrase: "financial sustainability and investment headroom",
    resolutionDirection: "Establishing cost visibility, enforcing expenditure controls, and addressing the operational drivers of cost are the immediate priorities.",
  },
  Operations: {
    situationOpener: "Operational process discipline is the primary constraint identified in this assessment.",
    primaryDescriptor: "process instability and planning gaps",
    consequence: "Inconsistent processes and reactive scheduling are generating avoidable waste, rework, and delivery failures.",
    risksPhrase: "operational efficiency and output predictability",
    resolutionDirection: "Process standardisation, structured planning disciplines, and consistent performance monitoring are the core remediation priorities.",
  },
  Quality: {
    situationOpener: "Quality management failure is the primary driver of operational cost in this assessment.",
    primaryDescriptor: "quality control breakdown",
    consequence: "Elevated defect rates, rework costs, and customer returns are creating a compounding cost burden across the value chain.",
    risksPhrase: "customer satisfaction and production efficiency",
    resolutionDirection: "Deploying root-cause-based quality controls, tightening inspection disciplines, and addressing upstream process variation are the priority interventions.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAIN → PROSE CONVERTER
// Transforms a causal step array into a fluent cause-effect sentence.
// ─────────────────────────────────────────────────────────────────────────────

// Maps a normalised step name → a gerund/action phrase for prose embedding
const STEP_PROSE_MAP: Record<string, string> = {
  "pm overdue":                  "deferred preventive maintenance",
  "maintenance backlog":         "a growing maintenance backlog",
  "machine breakdown":           "recurring machine breakdowns",
  "unplanned downtime":          "unplanned production stoppages",
  "production loss":             "reduced production output",
  "production halt":             "production halts",
  "missed delivery":             "missed customer delivery commitments",
  "customer penalty":            "customer penalties and relationship damage",
  "line bottleneck":             "line bottlenecks",
  "capacity utilization high":   "capacity running at or near its limit",
  "overtime spike":              "escalating overtime costs",
  "operator fatigue":            "operator fatigue",
  "operator error":              "elevated operator error rates",
  "defect rate increase":        "rising defect rates",
  "rework":                      "rework and re-inspection cycles",
  "scrap spike":                 "accelerating scrap generation",
  "material waste":              "avoidable material waste",
  "cost overrun":                "cost overruns",
  "supplier delay":              "supplier delays",
  "material shortage":           "material shortages",
  "line stoppage":               "line stoppages",
  "stock out":                   "stock-out events",
  "order backlog":               "an order backlog",
  "high turnover":               "high workforce turnover",
  "skill gap":                   "widening skills gaps",
  "training overload":           "training capacity strain",
  "productivity drop":           "declining team productivity",
  "output shortfall":            "output shortfalls",
  "inventory discrepancy":       "inventory discrepancies",
  "energy spike":                "energy cost spikes",
  "utility overrun":             "utility cost overruns",
  "quality drift":               "drift in quality standards",
};

function normalise(step: string): string {
  return step.toLowerCase().replace(/_/g, " ").trim();
}

function prosifyChain(chain: string[]): string {
  if (!chain || chain.length < 2) return "";

  const phrases = chain.map((step) => {
    const key = normalise(step);
    return STEP_PROSE_MAP[key] ?? step.toLowerCase();
  });

  if (phrases.length === 2) {
    return `${capitalise(phrases[0])} is directly contributing to ${phrases[1]}.`;
  }

  if (phrases.length === 3) {
    return `${capitalise(phrases[0])} is leading to ${phrases[1]}, and ultimately ${phrases[2]}.`;
  }

  const head = phrases[0];
  const middle = phrases.slice(1, -1).join(", then to ");
  const tail = phrases[phrases.length - 1];
  return `${capitalise(head)} is progressing through ${middle}, and compounding into ${tail}.`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECONDARY CAUSE DESCRIPTION
// Formats a readable list of secondary contributing factors.
// ─────────────────────────────────────────────────────────────────────────────

function describeSecondary(secondary: any[]): string {
  const names = secondary
    .map((s) => (s.title || s.name || "").trim())
    .filter(Boolean);

  if (names.length === 0) return "";
  if (names.length === 1) return `This is compounded by a contributing factor: ${names[0].toLowerCase()}.`;
  const last = names[names.length - 1];
  const rest = names.slice(0, -1).map((n) => n.toLowerCase()).join(", ");
  return `Contributing factors include ${rest}, and ${last.toLowerCase()} — each amplifying the primary root cause.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function generateConsultingNarrative(
  rootCauseTree: any,
  causalChains: any[],
  findings?: any[],
  healthScore?: { overallScore: number; riskLevel: string },
): ConsultingNarrative {

  const primary = rootCauseTree?.primaryCause;
  const secondary: any[] = rootCauseTree?.secondaryCauses ?? [];
  const primaryChain: string[] = causalChains?.[0]?.chain ?? [];
  const allFindings = findings ?? [];

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!primary && allFindings.length === 0) {
    console.log("🧠 CONSULTING NARRATIVE: empty (no findings)");
    return {
      summary: "Insufficient evidence to produce a root cause assessment. Consider uploading operational documents — maintenance logs, production records, or quality reports — to strengthen diagnostic confidence.",
      narrative: "No operational signals were detected in the submitted evidence. The diagnostic engine requires document-derived data to produce findings.",
    };
  }

  const primaryTitle = (primary?.title ?? primary?.name ?? allFindings[0]?.title ?? "Operational Failure").trim();
  const primaryCategory = (primary?.category ?? allFindings[0]?.category ?? "Operations").trim();
  const categoryFrame = CATEGORY_FRAMES[primaryCategory] ?? CATEGORY_FRAMES["Operations"];

  // ── Count and severity context ───────────────────────────────────────────
  const totalFindings = allFindings.length || (secondary.length + 1);
  const findingCountPhrase =
    totalFindings === 1 ? "one root cause" :
    totalFindings === 2 ? "two root causes" :
    `${totalFindings} root causes`;

  const riskLevel = healthScore?.riskLevel ?? "Moderate";
  const riskPhrase =
    riskLevel === "Critical" ? "at critical operational risk" :
    riskLevel === "High"     ? "under significant operational strain" :
    riskLevel === "Moderate" ? "facing moderate operational pressure" :
                                "in a stable but improvable operational state";

  // ── Causal chain prose ───────────────────────────────────────────────────
  const chainProse = prosifyChain(primaryChain);

  // ── Secondary causes prose ───────────────────────────────────────────────
  const secondaryProse = describeSecondary(secondary);

  // ── BUILD SUMMARY (displayed in UI as Executive Summary) ────────────────
  // Follows: Situation → Key Finding → Business Consequence
  const summaryParts: string[] = [
    `This assessment identifies ${findingCountPhrase} with the organisation ${riskPhrase}.`,
    `The primary driver is ${primaryTitle.toLowerCase()} — a ${categoryFrame.primaryDescriptor} issue that is directly affecting ${categoryFrame.risksPhrase}.`,
  ];

  if (secondary.length > 0) {
    const secondaryNames = secondary
      .map((s) => (s.title ?? s.name ?? "").trim())
      .filter(Boolean)
      .map((n) => n.toLowerCase());

    if (secondaryNames.length === 1) {
      summaryParts.push(`A secondary contributor — ${secondaryNames[0]} — is amplifying the operational impact.`);
    } else if (secondaryNames.length > 1) {
      summaryParts.push(`Secondary contributors include ${secondaryNames.slice(0, -1).join(", ")} and ${secondaryNames[secondaryNames.length - 1]}, each compounding the primary issue.`);
    }
  }

  summaryParts.push(categoryFrame.resolutionDirection);

  const summary = summaryParts.join(" ");

  // ── BUILD NARRATIVE (fuller, for PDF / detailed views) ──────────────────
  // Follows: Situation → Evidence → Complication → Chain → Resolution Direction
  const narrativeParts: string[] = [
    categoryFrame.situationOpener,
    `Evidence points to ${primaryTitle.toLowerCase()} as the root driver — ${categoryFrame.consequence}`,
  ];

  if (secondaryProse) {
    narrativeParts.push(secondaryProse);
  }

  if (chainProse) {
    narrativeParts.push(chainProse);
  }

  narrativeParts.push(
    `Left unaddressed, these conditions will continue to undermine ${categoryFrame.risksPhrase}. ${categoryFrame.resolutionDirection}`
  );

  const narrative = narrativeParts.join(" ");

  console.log("🧠 CONSULTING NARRATIVE: generated", `(${summary.length} char summary, ${narrative.length} char narrative)`);

  return { summary, narrative };
}
