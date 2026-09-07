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
// EVENT MANAGEMENT CATEGORY FRAMES
// Domain-specific frames for event operations — replaces generic 4M language
// with event-native terminology when industry = "event_management".
// ─────────────────────────────────────────────────────────────────────────────
const EM_CATEGORY_FRAMES: Record<string, {
  situationOpener: string;
  primaryDescriptor: string;
  consequence: string;
  risksPhrase: string;
  resolutionDirection: string;
}> = {
  Manpower: {
    situationOpener: "Crew and field execution is the primary operational strain identified across this event business.",
    primaryDescriptor: "crew capacity, supervision and role clarity",
    consequence: "Insufficient crew, unclear role ownership and absent supervision are creating setup delays, quality failures and reactive firefighting on event days — with overtime and fatigue becoming structural rather than exceptional.",
    risksPhrase: "event-day execution quality, client satisfaction and crew retention",
    resolutionDirection: "Establishing structured crew briefing, clear role ownership and a named event commander for each deployment is the most direct path to consistent field execution.",
  },
  Inventory: {
    situationOpener: "Asset and rental readiness is the central operational gap identified in this event operation.",
    primaryDescriptor: "dispatch accuracy, equipment condition and inventory control",
    consequence: "Assets are leaving the warehouse without confirmed quantity, condition or completeness. Shortfalls surface on-site — triggering emergency substitutions, delayed setups and unplanned costs that erode event margins.",
    risksPhrase: "event setup reliability, client experience and rental asset profitability",
    resolutionDirection: "Introducing a dispatch sign-off process, pre-departure condition checks and a booking-linked inventory reservation system will close the readiness gap at source.",
  },
  Suppliers: {
    situationOpener: "Third-party vendor reliability is a direct execution risk identified in this event business.",
    primaryDescriptor: "supplier coordination, lock-in and delivery reliability",
    consequence: "Critical vendors are not being confirmed ahead of event windows. Late deliveries, partial orders and vendor no-shows are creating last-minute sourcing pressure — with premium costs and setup disruption absorbed by the operation.",
    risksPhrase: "event execution certainty, cost control and commercial margin",
    resolutionDirection: "Implementing a supplier lock-in process with formal confirmation milestones before each event window will reduce dependency risk and remove emergency sourcing as a recurring cost.",
  },
  Financial: {
    situationOpener: "Commercial control is the primary profitability risk identified in this event operation.",
    primaryDescriptor: "event margin leakage, pricing accuracy and cost recovery",
    consequence: "Events that appear commercially viable at quotation are delivering below expectation after execution. Reactive delivery costs, untracked scope additions and unrecovered damage charges are consuming margin that was earned at the booking stage.",
    risksPhrase: "event profitability, pricing discipline and long-term commercial sustainability",
    resolutionDirection: "Establishing event-level job costing, a formal change-order process and disciplined damage recovery will convert operational activity into measurable commercial return.",
  },
  Operations: {
    situationOpener: "Event execution discipline is the primary operational gap identified in this assessment.",
    primaryDescriptor: "event-day coordination, planning structure and escalation clarity",
    consequence: "Events proceed without confirmed run-sheets, role assignments or a named command owner. Issues that surface during live execution circulate unresolved — compounding into client-visible failures and avoidable margin cost.",
    risksPhrase: "event delivery quality, client retention and operational repeatability",
    resolutionDirection: "Introducing a structured event run-sheet, a pre-event readiness sign-off and a designated command owner for each deployment is the foundational operational fix required.",
  },
  Money: {
    situationOpener: "Financial leakage from event delivery is the primary commercial risk identified in this assessment.",
    primaryDescriptor: "margin erosion, emergency cost and unrecovered charges",
    consequence: "Unplanned overtime, emergency procurement and scope additions absorbed without billing are eroding event-level margins. The pattern is consistent — indicating systemic commercial control gaps rather than isolated delivery failures.",
    risksPhrase: "event profitability, cash position and pricing integrity",
    resolutionDirection: "Implementing event-level job costing, disciplined change-order capture and systematic damage/loss recovery will rebuild the commercial control that currently sits below the threshold required for a sustainable event business.",
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
  industry?: string,
): ConsultingNarrative {

  const primary = rootCauseTree?.primaryCause;
  const secondary: any[] = rootCauseTree?.secondaryCauses ?? [];
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
  const primaryCategory = (primary?.category ?? allFindings[0]?.category ?? allFindings[0]?.fourMCategory ?? "Operations").trim();

  // ── Select category frame — EM gets domain-specific vocabulary ───────────
  const isEM = industry === "event_management";
  let categoryFrame: typeof CATEGORY_FRAMES[string];
  if (isEM) {
    categoryFrame = EM_CATEGORY_FRAMES[primaryCategory]
      ?? EM_CATEGORY_FRAMES["Operations"];
  } else {
    categoryFrame = CATEGORY_FRAMES[primaryCategory] ?? CATEGORY_FRAMES["Operations"];
  }

  // ── EM: Use EM-specific causal chain prose instead of manufacturing prose ─
  const primaryChain: string[] = causalChains?.[0]?.chain ?? [];
  const isEMChain = isEM || primaryChain.some(step =>
    ["dispatch", "crew", "venue", "setup", "rental", "event", "vendor", "asset"].some(kw =>
      step.toLowerCase().includes(kw)
    )
  );

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
  // For EM chains, build prose directly from the readable chain steps
  // without routing through the manufacturing STEP_PROSE_MAP
  let chainProse: string;
  if (isEMChain && primaryChain.length >= 2) {
    const steps = primaryChain.map(s => s.toLowerCase());
    if (steps.length === 2) {
      chainProse = `${capitalise(steps[0])} is directly creating ${steps[1]}.`;
    } else if (steps.length === 3) {
      chainProse = `${capitalise(steps[0])} leads to ${steps[1]}, which in turn produces ${steps[2]}.`;
    } else {
      const head = steps[0];
      const mid = steps.slice(1, -1).join(", then ");
      const tail = steps[steps.length - 1];
      chainProse = `${capitalise(head)} progresses through ${mid} — compounding into ${tail}.`;
    }
  } else {
    chainProse = prosifyChain(primaryChain);
  }

  // ── Secondary causes prose ───────────────────────────────────────────────
  const secondaryProse = describeSecondary(secondary);

  // ── BUILD SUMMARY (displayed in UI as Executive Summary) ────────────────
  // Follows: Situation → Key Finding → Business Consequence
  const summaryParts: string[] = [];

  if (isEM) {
    // EM-specific executive summary opener — event-business language
    const emContext =
      riskLevel === "Critical" ? "critical execution risk across its event operation" :
      riskLevel === "High"     ? "significant operational strain that is eroding execution quality and commercial return" :
      riskLevel === "Moderate" ? "recurring operational pressure that is limiting consistent event delivery" :
                                  "operational gaps that, left unaddressed, will constrain its ability to scale delivery";

    summaryParts.push(
      `This diagnostic identifies ${findingCountPhrase} creating ${emContext}.`,
      `The primary driver — ${primaryTitle.toLowerCase()} — is a ${categoryFrame.primaryDescriptor} gap that is directly affecting ${categoryFrame.risksPhrase}.`,
    );
  } else {
    summaryParts.push(
      `This assessment identifies ${findingCountPhrase} with the organisation ${riskPhrase}.`,
      `The primary driver is ${primaryTitle.toLowerCase()} — a ${categoryFrame.primaryDescriptor} issue that is directly affecting ${categoryFrame.risksPhrase}.`,
    );
  }

  if (secondary.length > 0) {
    const secondaryNames = secondary
      .map((s) => (s.title ?? s.name ?? "").trim())
      .filter(Boolean)
      .map((n) => n.toLowerCase());

    if (secondaryNames.length === 1) {
      summaryParts.push(isEM
        ? `A compounding factor — ${secondaryNames[0]} — is amplifying delivery strain and commercial exposure.`
        : `A secondary contributor — ${secondaryNames[0]} — is amplifying the operational impact.`
      );
    } else if (secondaryNames.length > 1) {
      summaryParts.push(isEM
        ? `Compounding contributors include ${secondaryNames.slice(0, -1).join(", ")} and ${secondaryNames[secondaryNames.length - 1]} — each adding cost and execution uncertainty.`
        : `Secondary contributors include ${secondaryNames.slice(0, -1).join(", ")} and ${secondaryNames[secondaryNames.length - 1]}, each compounding the primary issue.`
      );
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
