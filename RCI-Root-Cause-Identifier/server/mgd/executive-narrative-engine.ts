// ─────────────────────────────────────────────────────────────────────────────
// MGD EXECUTIVE NARRATIVE ENGINE
//
// Converts operational findings, root causes, recommendations, and operational
// health metrics into structured MGD executive narrative sections suitable for
// client-facing operational diagnostic reports.
//
// Design principles:
//   • No AI/LLM — all narrative is synthesised deterministically from input data.
//   • Template pools are selected via deterministic seed (input shape hash) to
//     produce natural variation without randomness.
//   • Sections degrade gracefully when data is absent — fallback summaries
//     replace missing content rather than throwing.
//   • Architecture is extensible: generators are independent functions that can
//     be overridden by industry-specific narrative packs in the future.
//   • Never throws — every public function is wrapped in a top-level try/catch.
// ─────────────────────────────────────────────────────────────────────────────

import type { OperationalFinding }       from "./findings-engine";
import type { RootCause }                from "./root-cause-engine";
import type { OperationalRecommendation } from "./recommendation-engine";

// ── Exported interfaces ────────────────────────────────────────────────────────

export interface ExecutiveNarrativeSection {
  id:       string;
  title:    string;
  content:  string;
  priority?: number;
}

export interface ExecutiveNarrativeReport {
  executiveOverview:  ExecutiveNarrativeSection;
  keyFindings:        ExecutiveNarrativeSection;
  rootCauseSummary:   ExecutiveNarrativeSection;
  operationalHealth:  ExecutiveNarrativeSection;
  priorityActions:    ExecutiveNarrativeSection;
  strategicDirection: ExecutiveNarrativeSection;
  finalConclusion:    ExecutiveNarrativeSection;

  metadata: {
    generatedAt:              string;
    industry?:                string;
    findingsCount:            number;
    rootCauseCount:           number;
    recommendationCount:      number;
    operationalHealthScore?:  number;
  };
}

export interface NarrativeParams {
  findings:               OperationalFinding[];
  rootCauses:             RootCause[];
  recommendations:        OperationalRecommendation[];
  operationalHealthScore?: number;
  industry?:              string;
}

// ── Finding/RC category labels ─────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  inventory_visibility:  "inventory management",
  logistics_coordination: "logistics coordination",
  warehouse_operations:  "warehouse operations",
  manpower_dependency:   "manpower dependency",
  financial_leakage:     "financial leakage",
  workflow_scalability:  "workflow scalability",
};

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1,
};

// ── Health score classification ────────────────────────────────────────────────

function classifyHealth(score?: number): {
  label:       string;
  description: string;
  tone:        "stable" | "moderate" | "elevated" | "critical";
} {
  if (score == null)  return { label: "Not Assessed", description: "no health score provided", tone: "moderate" };
  if (score >= 80)    return { label: "Operationally Stable", description: "operations are performing within acceptable parameters", tone: "stable" };
  if (score >= 65)    return { label: "Moderate Operational Strain", description: "the operation is functional but carrying structural inefficiencies that will compound under demand growth", tone: "moderate" };
  if (score >= 50)    return { label: "Elevated Operational Strain", description: "the operation is absorbing significant inefficiencies that expose it to service disruptions during peak demand", tone: "elevated" };
  return              { label: "Critical Operational Instability", description: "core operational processes are under severe strain and corrective action is required before further demand growth is pursued", tone: "critical" };
}

// ── Deterministic template selection ─────────────────────────────────────────
//
// Uses a stable seed derived from the input shape rather than random selection.
// This ensures the same data always produces the same narrative, while different
// data produces naturally varied phrasing.

function seedFrom(findings: OperationalFinding[], rootCauses: RootCause[]): number {
  return (findings.length * 3 + rootCauses.length * 7) % 5;
}

function pick<T>(pool: T[], seed: number): T {
  return pool[seed % pool.length];
}

// ── Utility helpers ────────────────────────────────────────────────────────────

/**
 * Join an array into a natural English list.
 * e.g. ["A", "B", "C"] → "A, B, and C"
 *      ["A", "B"]       → "A and B"
 *      ["A"]            → "A"
 *      []               → fallback
 */
export function safeJoin(items: string[], fallback = "the affected areas"): string {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Return the top N findings sorted by severity DESC then confidence DESC.
 */
export function pickTopFindings(
  findings: OperationalFinding[],
  max: number = 6,
): OperationalFinding[] {
  if (!Array.isArray(findings)) return [];
  return findings
    .filter(f => f != null)
    .sort((a, b) => {
      const sd = (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
      if (sd !== 0) return sd;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    })
    .slice(0, max);
}

/**
 * Return HIGH/CRITICAL recommendations sorted by priority DESC then confidence DESC.
 */
export function pickTopRecommendations(
  recommendations: OperationalRecommendation[],
  max: number = 6,
): OperationalRecommendation[] {
  if (!Array.isArray(recommendations)) return [];
  return recommendations
    .filter(r => r != null && (r.priority === "HIGH" || r.priority === "CRITICAL"))
    .sort((a, b) => {
      const pd = (SEVERITY_ORDER[b.priority] ?? 0) - (SEVERITY_ORDER[a.priority] ?? 0);
      if (pd !== 0) return pd;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    })
    .slice(0, max);
}

function hasCategory(findings: OperationalFinding[], cat: string): boolean {
  return findings.some(f => f?.category === cat);
}

function countBySeverity(items: Array<{ severity: string }>, sev: string): number {
  return items.filter(x => x?.severity === sev).length;
}

function uniqueCategories(findings: OperationalFinding[]): string[] {
  return [...new Set(findings.filter(f => f != null).map(f => f.category).filter(Boolean))];
}

function formatSection(
  id: string,
  title: string,
  content: string,
  priority?: number,
): ExecutiveNarrativeSection {
  return { id, title, content: content.trim(), priority };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Executive Overview ─────────────────────────────────────────────────────

export function generateExecutiveOverview(
  findings:   OperationalFinding[],
  rootCauses: RootCause[],
  recommendations: OperationalRecommendation[],
  healthScore?: number,
  industry?: string,
): ExecutiveNarrativeSection {
  const health       = classifyHealth(healthScore);
  const seed         = seedFrom(findings, rootCauses);
  const critCount    = countBySeverity(findings, "CRITICAL");
  const highCount    = countBySeverity(findings, "HIGH");
  const critRCCount  = countBySeverity(rootCauses, "CRITICAL");
  const cats         = uniqueCategories(findings);
  const catLabels    = cats.map(c => CATEGORY_LABEL[c] ?? c).filter(Boolean);
  const hasLeakage   = hasCategory(findings, "financial_leakage");
  const hasLogistics = hasCategory(findings, "logistics_coordination");
  const hasInv       = hasCategory(findings, "inventory_visibility");
  const hasMano      = hasCategory(findings, "manpower_dependency");
  const hasScaling   = hasCategory(findings, "workflow_scalability");

  const openings = [
    `This operational diagnostic report presents the findings of a structured review conducted under the Margin Guard Diagnostics (MGD) framework.`,
    `The following analysis reflects a structured operational review completed under the Margin Guard Diagnostics (MGD) framework.`,
    `Margin Guard Diagnostics has completed a structured operational review of the subject business, with findings presented in this executive diagnostic report.`,
    `This report presents the outcome of a structured MGD operational review, providing an executive-level summary of operational health and systemic risks identified.`,
    `The Margin Guard Diagnostics (MGD) framework has been applied to deliver the following structured operational assessment.`,
  ];

  const stateLines = [
    `The operational health assessment returned a classification of ${health.label}, indicating that ${health.description}.`,
    `Based on the diagnostic evidence collected, the operation is classified as ${health.label} — ${health.description}.`,
    `The MGD health classification for this review is ${health.label}, reflecting that ${health.description}.`,
  ];

  const themeLines: string[] = [];
  if (critCount > 0 || critRCCount > 0) {
    themeLines.push(`${critCount + critRCCount} critical-severity issue${critCount + critRCCount > 1 ? "s were" : " was"} identified requiring immediate management attention.`);
  }
  if (highCount > 0) {
    themeLines.push(`A further ${highCount} high-severity operational finding${highCount > 1 ? "s" : ""} ${highCount > 1 ? "indicate" : "indicates"} structural strain that will amplify under demand growth.`);
  }
  if (catLabels.length > 0) {
    themeLines.push(`Operational stress is concentrated across ${safeJoin(catLabels, "core operational areas")}.`);
  }
  if (hasLeakage) {
    themeLines.push(`Financial leakage indicators were detected, suggesting undocumented value loss in the current operating model.`);
  }
  if (hasLogistics && hasInv) {
    themeLines.push(`Logistics and inventory processes show evidence of structural misalignment that increases the risk of fulfillment failure during peak demand.`);
  } else if (hasLogistics) {
    themeLines.push(`Logistics coordination patterns reflect reactive scheduling practices that are vulnerable to disruption under increasing order volume.`);
  } else if (hasInv) {
    themeLines.push(`Inventory visibility gaps indicate a structural lag between physical stock position and recorded data — a risk to fulfillment reliability.`);
  }
  if (hasMano) {
    themeLines.push(`Significant operational decisions are concentrated in a small number of individuals, creating single-point-of-failure exposure.`);
  }
  if (hasScaling) {
    themeLines.push(`Workflow scalability constraints suggest the current operating model will not sustain proportional demand growth without redesign.`);
  }
  if (recommendations.length > 0) {
    const critRecs = recommendations.filter(r => r.priority === "CRITICAL").length;
    const highRecs = recommendations.filter(r => r.priority === "HIGH").length;
    if (critRecs > 0) {
      themeLines.push(`${critRecs} recommendation${critRecs > 1 ? "s" : ""} ${critRecs > 1 ? "have" : "has"} been prioritised at CRITICAL level, requiring immediate action.`);
    } else if (highRecs > 0) {
      themeLines.push(`${highRecs} high-priority recommendation${highRecs > 1 ? "s" : ""} have been identified to address the most pressing operational vulnerabilities.`);
    }
  }

  const content = [
    pick(openings, seed),
    pick(stateLines, seed),
    ...themeLines,
  ].join(" ");

  console.log(`[MGD][NARRATIVE] generateExecutiveOverview — health=${health.label} themes=${themeLines.length}`);
  return formatSection("executive-overview", "Executive Overview", content, 1);
}

// ── 2. Key Findings ───────────────────────────────────────────────────────────

export function generateKeyFindingsNarrative(
  findings: OperationalFinding[],
): ExecutiveNarrativeSection {
  const top = pickTopFindings(findings, 6);

  if (top.length === 0) {
    console.log("[MGD][NARRATIVE] generateKeyFindingsNarrative — no findings, using fallback");
    return formatSection("key-findings", "Key Operational Findings",
      "Insufficient operational data was available to generate specific findings at this time. A structured data collection process is recommended before proceeding with targeted corrective action.",
      2);
  }

  const critical = top.filter(f => f.severity === "CRITICAL");
  const high     = top.filter(f => f.severity === "HIGH");
  const medium   = top.filter(f => f.severity === "MEDIUM" || f.severity === "LOW");

  const lines: string[] = [];

  const intros = [
    `The diagnostic review identified the following key operational findings, ranked by severity and evidential confidence:`,
    `${top.length} key findings were surfaced through the MGD diagnostic process, presented below in order of operational significance:`,
    `Analysis of operational data surfaced ${top.length} material findings. The highest-priority observations are summarised below:`,
    `The following findings represent the most operationally significant observations from this review:`,
  ];
  lines.push(intros[top.length % intros.length]);

  if (critical.length > 0) {
    lines.push(`\nCritical Findings:`);
    for (const f of critical) {
      lines.push(`• ${f.title}${f.summary ? ` — ${f.summary}` : ""}`);
    }
  }
  if (high.length > 0) {
    lines.push(`\nHigh-Priority Findings:`);
    for (const f of high) {
      lines.push(`• ${f.title}${f.summary ? ` — ${f.summary}` : ""}`);
    }
  }
  if (medium.length > 0) {
    lines.push(`\nAdditional Observations:`);
    for (const f of medium) {
      lines.push(`• ${f.title}${f.summary ? ` — ${f.summary}` : ""}`);
    }
  }

  const closing = [
    `These findings represent the operational pressure points with the highest potential for corrective leverage.`,
    `Taken together, these findings paint a picture of an operation under structural strain that can be systematically resolved.`,
    `Each finding above represents a discrete correctable condition — the root cause analysis that follows explains the systemic connections between them.`,
  ];
  lines.push(`\n${closing[top.length % closing.length]}`);

  console.log(`[MGD][NARRATIVE] generateKeyFindingsNarrative — top=${top.length} critical=${critical.length} high=${high.length}`);
  return formatSection("key-findings", "Key Operational Findings", lines.join("\n"), 2);
}

// ── 3. Root Cause Summary ─────────────────────────────────────────────────────

export function generateRootCauseNarrative(
  rootCauses: RootCause[],
  findings:   OperationalFinding[],
): ExecutiveNarrativeSection {
  if (rootCauses.length === 0) {
    console.log("[MGD][NARRATIVE] generateRootCauseNarrative — no root causes, using fallback");
    return formatSection("root-cause-summary", "Root Cause Analysis",
      "Root cause synthesis requires sufficient operational finding data. Once findings are confirmed, the MGD engine will identify and map the systemic causes driving operational strain.",
      3);
  }

  const seed       = seedFrom(findings, rootCauses);
  const critCount  = countBySeverity(rootCauses, "CRITICAL");
  const highCount  = countBySeverity(rootCauses, "HIGH");
  const topRCs     = [...rootCauses].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)).slice(0, 5);

  const intros = [
    `The MGD diagnostic engine identified ${rootCauses.length} systemic root cause${rootCauses.length > 1 ? "s" : ""} underlying the operational findings above. These are not independent issues — they represent interconnected structural conditions that compound under operational pressure.`,
    `Analysis of the finding patterns revealed ${rootCauses.length} root cause${rootCauses.length > 1 ? "s" : ""} driving the operational challenges observed. Understanding these systemic causes is essential for effective corrective action.`,
    `${rootCauses.length} root cause${rootCauses.length > 1 ? "s were" : " was"} identified through the MGD causal pattern analysis. The following summary explains the structural conditions producing the observed operational strain.`,
    `Root cause analysis identified ${rootCauses.length} systemic cause${rootCauses.length > 1 ? "s" : ""} at the core of the operational challenges. These causes are listed below in order of evidential strength.`,
  ];

  const lines: string[] = [pick(intros, seed)];

  if (critCount > 0) {
    lines.push(`\n${critCount} root cause${critCount > 1 ? "s are" : " is"} rated CRITICAL — representing structural conditions that generate recurring operational failures.`);
  }

  lines.push("");
  for (const rc of topRCs) {
    const impactPreview = rc.operationalImpact?.slice(0, 2) ?? [];
    const impactText = impactPreview.length > 0
      ? ` Primary impacts include: ${safeJoin(impactPreview, "operational disruption")}.`
      : "";
    lines.push(`${rc.severity} | ${rc.title} (${rc.confidence}% confidence)${impactText}`);
  }

  const closes = [
    `\nThese root causes are systemic rather than symptomatic — resolving the surface-level issues without addressing the underlying conditions will produce only temporary improvement.`,
    `\nEach root cause above represents a structural condition embedded in the operating model. Corrective action at the recommendation level is designed to address these causes directly, not merely their visible symptoms.`,
    `\nThe structural nature of these root causes means that operational improvements must be process-level interventions, not event-level responses.`,
  ];
  lines.push(pick(closes, seed));

  console.log(`[MGD][NARRATIVE] generateRootCauseNarrative — rootCauses=${rootCauses.length} critical=${critCount} high=${highCount}`);
  return formatSection("root-cause-summary", "Root Cause Analysis", lines.join("\n"), 3);
}

// ── 4. Operational Health ─────────────────────────────────────────────────────

export function generateOperationalHealthNarrative(
  findings:    OperationalFinding[],
  rootCauses:  RootCause[],
  healthScore?: number,
): ExecutiveNarrativeSection {
  const health    = classifyHealth(healthScore);
  const seed      = seedFrom(findings, rootCauses);
  const catLabels = uniqueCategories(findings).map(c => CATEGORY_LABEL[c] ?? c).filter(Boolean);

  const scoreText = healthScore != null ? ` The composite operational health score of ${healthScore}/100 reflects` : `The diagnostic pattern reflects`;

  const toneIntros: Record<string, string[]> = {
    stable: [
      `${scoreText} an operation that has achieved a functional baseline across its core processes.`,
      `${scoreText} an operation demonstrating adequate process control across the areas reviewed.`,
    ],
    moderate: [
      `${scoreText} an operation that is functional but carrying unresolved structural inefficiencies.`,
      `${scoreText} an operation that is sustaining performance through effort rather than process discipline.`,
    ],
    elevated: [
      `${scoreText} an operation absorbing significant structural inefficiency — a condition that will deteriorate under increased demand.`,
      `${scoreText} an operation where structural gaps are actively generating service risk on a recurring basis.`,
    ],
    critical: [
      `${scoreText} an operation where core process failures are generating compounding operational costs and service risk.`,
      `${scoreText} an operation in which structural failures are systemic — sustained corrective action is required before further growth can be pursued.`,
    ],
  };

  const domainLines: string[] = [];
  if (catLabels.length > 0) {
    domainLines.push(`Operational strain is concentrated in ${safeJoin(catLabels, "core domains")}.`);
  }

  const implicationsByTone: Record<string, string> = {
    stable:   `Under these conditions, the focus shifts from stabilisation to optimisation — embedding process controls that preserve performance as the business scales.`,
    moderate: `Under these conditions, targeted stabilisation interventions will deliver meaningful performance improvement with minimal disruption to current operations.`,
    elevated: `Under these conditions, the risk of service disruption increases with each demand peak. Immediate stabilisation action is the priority before optimisation can begin.`,
    critical: `Under these conditions, corrective action cannot be deferred. Operational instability at this level generates compounding costs and will erode client confidence if left unaddressed.`,
  };

  const lines = [
    `Operational Health Classification: ${health.label}.`,
    pick(toneIntros[health.tone], seed),
    ...domainLines,
    implicationsByTone[health.tone],
  ];

  console.log(`[MGD][NARRATIVE] generateOperationalHealthNarrative — score=${healthScore} classification=${health.label}`);
  return formatSection("operational-health", "Operational Health Assessment", lines.join(" "), 4);
}

// ── 5. Priority Actions ───────────────────────────────────────────────────────

export function generatePriorityActionsNarrative(
  recommendations: OperationalRecommendation[],
  findings:         OperationalFinding[],
  rootCauses:       RootCause[],
): ExecutiveNarrativeSection {
  const top = pickTopRecommendations(recommendations, 8);

  if (top.length === 0) {
    console.log("[MGD][NARRATIVE] generatePriorityActionsNarrative — no high/critical recs");
    return formatSection("priority-actions", "Priority Actions",
      "No high-priority recommendations were generated from the current data set. As operational data is enriched, the MGD engine will identify and prioritise corrective actions.",
      5);
  }

  const seed = seedFrom(findings, rootCauses);

  // Categorise by function
  const immediate   = top.filter(r => r.timeframe === "IMMEDIATE");
  const visibility  = top.filter(r => r.category === "operational_visibility" && r.timeframe !== "IMMEDIATE");
  const workflow    = top.filter(r => ["workflow_redesign", "manpower_coordination"].includes(r.category) && r.timeframe !== "IMMEDIATE");
  const scalability = top.filter(r => ["operational_scalability", "logistics_optimization"].includes(r.category) && r.timeframe !== "IMMEDIATE");

  const intros = [
    `The following priority actions have been identified from the diagnostic findings. Actions are organised by urgency and operational function.`,
    `MGD has identified the following structured action plan, organised by timeframe and operational domain:`,
    `The diagnostic evidence supports the following priority action programme, organised by implementation urgency:`,
    `Based on the root cause analysis and findings, the following actions are recommended, ordered by operational priority:`,
  ];

  const lines: string[] = [pick(intros, seed)];

  if (immediate.length > 0) {
    lines.push(`\nImmediate Stabilisation (Action Now):`);
    for (const r of immediate) {
      lines.push(`• ${r.title} [${r.implementationDifficulty} effort] — ${r.summary}`);
    }
  }

  if (visibility.length > 0) {
    lines.push(`\nOperational Visibility:`);
    for (const r of visibility) {
      lines.push(`• ${r.title} [${r.implementationDifficulty} effort, ${r.timeframe.replace("_", " ")}] — ${r.summary}`);
    }
  }

  if (workflow.length > 0) {
    lines.push(`\nWorkflow Improvements:`);
    for (const r of workflow) {
      lines.push(`• ${r.title} [${r.implementationDifficulty} effort, ${r.timeframe.replace("_", " ")}] — ${r.summary}`);
    }
  }

  if (scalability.length > 0) {
    lines.push(`\nScalability Improvements:`);
    for (const r of scalability) {
      lines.push(`• ${r.title} [${r.implementationDifficulty} effort, ${r.timeframe.replace("_", " ")}] — ${r.summary}`);
    }
  }

  // Remaining actions not captured above
  const covered = new Set([...immediate, ...visibility, ...workflow, ...scalability].map(r => r.id));
  const remaining = top.filter(r => !covered.has(r.id));
  if (remaining.length > 0) {
    lines.push(`\nAdditional Recommended Actions:`);
    for (const r of remaining) {
      lines.push(`• ${r.title} — ${r.summary}`);
    }
  }

  const critImmediateCount = immediate.filter(r => r.priority === "CRITICAL").length;
  if (critImmediateCount > 0) {
    lines.push(`\n${critImmediateCount} immediate action${critImmediateCount > 1 ? "s are" : " is"} rated CRITICAL and should be implemented without delay.`);
  }

  console.log(`[MGD][NARRATIVE] generatePriorityActionsNarrative — total=${top.length} immediate=${immediate.length} workflow=${workflow.length} scalability=${scalability.length}`);
  return formatSection("priority-actions", "Priority Actions", lines.join("\n"), 5);
}

// ── 6. Strategic Direction ────────────────────────────────────────────────────

export function generateStrategicDirectionNarrative(
  findings:        OperationalFinding[],
  rootCauses:      RootCause[],
  recommendations: OperationalRecommendation[],
  industry?:       string,
): ExecutiveNarrativeSection {
  const seed        = seedFrom(findings, rootCauses);
  const hasScaling  = hasCategory(findings, "workflow_scalability") || rootCauses.some(rc => rc.title.toLowerCase().includes("scalability"));
  const hasInv      = hasCategory(findings, "inventory_visibility");
  const hasLog      = hasCategory(findings, "logistics_coordination");
  const longTermRec = recommendations.filter(r => r.timeframe === "LONG_TERM" || r.timeframe === "90_DAYS");

  const openings = [
    `The operational improvements identified in this review represent the first phase of a structured operational maturity journey.`,
    `Beyond the immediate corrective actions, this diagnostic review points toward a clear path of operational maturation for the business.`,
    `The findings and recommendations in this report form the foundation of a structured operational improvement programme.`,
    `This diagnostic review positions the business at the beginning of a measurable operational improvement journey.`,
  ];

  const lines: string[] = [pick(openings, seed)];

  lines.push(
    `The stabilisation actions in Phase 1 are designed to eliminate the most acute operational risks and establish reliable baseline controls. ` +
    `Once these controls are embedded, the business will be positioned to move from reactive coordination to structured operational management.`,
  );

  if (hasInv || hasLog) {
    lines.push(
      `Achieving reliable inventory visibility and logistics coordination discipline will unlock the ability to commit confidently to client fulfilment windows — ` +
      `a capability that directly translates to improved client retention and revenue predictability.`,
    );
  }

  if (hasScaling) {
    lines.push(
      `Addressing the identified scalability constraints is a prerequisite for sustainable growth. ` +
      `The current operating model has reached a complexity ceiling — the workflow redesign work identified in this report is what separates a business that grows profitably from one that grows chaotically.`,
    );
  }

  const predictiveLines = [
    `As operational controls mature, the business will develop predictive visibility into demand cycles, allowing for proactive resource allocation rather than reactive scrambling.`,
    `Mature operational controls create the conditions for predictive planning: stock positions are known in advance, logistics is scheduled rather than improvised, and coordination decisions are process-driven rather than person-dependent.`,
    `The longer-term goal is an operation that can anticipate operational pressure rather than absorb it — a transition from reactive management to predictive operational control.`,
  ];
  lines.push(pick(predictiveLines, seed));

  if (longTermRec.length > 0) {
    lines.push(
      `The ${longTermRec.length} longer-horizon recommendation${longTermRec.length > 1 ? "s" : ""} in this report — such as ${longTermRec[0].title} — represent the structural investments that convert a stabilised operation into a scalable, process-driven enterprise.`,
    );
  }

  console.log(`[MGD][NARRATIVE] generateStrategicDirectionNarrative — hasScaling=${hasScaling} hasInv=${hasInv} longTerm=${longTermRec.length}`);
  return formatSection("strategic-direction", "Strategic Direction", lines.join(" "), 6);
}

// ── 7. Final Conclusion ───────────────────────────────────────────────────────

export function generateFinalConclusionNarrative(
  findings:        OperationalFinding[],
  rootCauses:      RootCause[],
  recommendations: OperationalRecommendation[],
  healthScore?:    number,
): ExecutiveNarrativeSection {
  const health  = classifyHealth(healthScore);
  const seed    = seedFrom(findings, rootCauses);
  const critRec = recommendations.filter(r => r.priority === "CRITICAL").length;
  const highRec = recommendations.filter(r => r.priority === "HIGH").length;

  const demandVsComplexity = [
    `A key distinction that this review reinforces: the operational challenges observed are not primarily a consequence of insufficient demand — they are the result of operational complexity that has outpaced the systems and processes managing it.`,
    `This diagnostic confirms a pattern common in high-growth businesses: demand is present, but the operational infrastructure has not scaled to match it. The opportunity is not to generate more revenue — it is to retain more of the revenue already being generated by eliminating operational leakage and failure.`,
    `The evidence in this review points to an operation where the fundamental commercial opportunity is strong, but where operational gaps are eroding the value being delivered. Demand is not the constraint — operational capability is.`,
    `The findings in this review distinguish between a demand problem and an operational capability problem. The business is not lacking in market opportunity — it is leaking value through operational processes that have not been optimised to match its current scale.`,
  ];

  const actionableClose = [
    `The recommendations in this report are practical, sequenced, and designed to generate visible operational improvement within 30 to 90 days. The management team has the knowledge and resources to execute the stabilisation phase — what is required is structured commitment to the process.`,
    `The corrective actions identified are deliberately practical in scope. The immediate stabilisation steps require no additional capital — only structured application of existing team capability to better-defined processes.`,
    `The priority actions identified are within the operational capacity of the current team to implement. No significant capital investment is required for the immediate stabilisation phase — the gains come from process discipline rather than additional resource.`,
  ];

  const positiveClose = [
    `With structured implementation of the recommended actions, the business is well-positioned to convert current operational strain into a durable competitive advantage — an operation that grows reliably, serves clients consistently, and retains value at scale.`,
    `The business has the operational foundation to succeed at its stated growth objectives. This report provides the structured framework to ensure that foundation is built deliberately rather than discovered through operational failure.`,
    `The path from current state to operational maturity is well-defined by this analysis. Consistent execution of the identified priority actions will produce a measurable improvement in operational resilience and financial performance within one operating quarter.`,
  ];

  const lines: string[] = [];

  lines.push(pick(demandVsComplexity, seed));

  if (critRec > 0 || highRec > 0) {
    lines.push(
      `This review has identified ${critRec + highRec} high-priority corrective action${critRec + highRec > 1 ? "s" : ""} ` +
      `${critRec > 0 ? `(${critRec} rated CRITICAL) ` : ""}` +
      `that address the root causes directly. These are not aspirational improvements — they are structural corrections with defined implementation steps.`,
    );
  }

  lines.push(pick(actionableClose, seed));
  lines.push(pick(positiveClose, seed));

  console.log(`[MGD][NARRATIVE] generateFinalConclusionNarrative — critRec=${critRec} highRec=${highRec} health=${health.label}`);
  return formatSection("final-conclusion", "Conclusion", lines.join(" "), 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a complete MGD executive narrative report from operational
 * intelligence data.  Never throws — every failure degrades gracefully.
 */
export function generateExecutiveNarrative(params: NarrativeParams): ExecutiveNarrativeReport {
  const {
    findings        = [],
    rootCauses      = [],
    recommendations = [],
    operationalHealthScore,
    industry,
  } = params ?? {};

  // Sanitise inputs
  const safeFindings   = Array.isArray(findings)        ? findings.filter(f => f != null)       : [];
  const safeRootCauses = Array.isArray(rootCauses)      ? rootCauses.filter(rc => rc != null)   : [];
  const safeRecs       = Array.isArray(recommendations) ? recommendations.filter(r => r != null) : [];

  console.log(
    `[MGD][NARRATIVE] generateExecutiveNarrative — ` +
    `${safeFindings.length} findings, ` +
    `${safeRootCauses.length} rootCauses, ` +
    `${safeRecs.length} recommendations, ` +
    `healthScore=${operationalHealthScore ?? "n/a"}, ` +
    `industry=${industry ?? "unspecified"}`,
  );

  const fallbackSection = (id: string, title: string, priority?: number): ExecutiveNarrativeSection =>
    formatSection(id, title, "Insufficient data to generate this section. Please provide operational findings and root causes.", priority);

  let executiveOverview:  ExecutiveNarrativeSection;
  let keyFindings:        ExecutiveNarrativeSection;
  let rootCauseSummary:   ExecutiveNarrativeSection;
  let operationalHealth:  ExecutiveNarrativeSection;
  let priorityActions:    ExecutiveNarrativeSection;
  let strategicDirection: ExecutiveNarrativeSection;
  let finalConclusion:    ExecutiveNarrativeSection;

  try { executiveOverview  = generateExecutiveOverview(safeFindings, safeRootCauses, safeRecs, operationalHealthScore, industry); }
  catch (e) { console.error("[MGD][NARRATIVE] executiveOverview failed:", e); executiveOverview = fallbackSection("executive-overview", "Executive Overview", 1); }

  try { keyFindings        = generateKeyFindingsNarrative(safeFindings); }
  catch (e) { console.error("[MGD][NARRATIVE] keyFindings failed:", e); keyFindings = fallbackSection("key-findings", "Key Operational Findings", 2); }

  try { rootCauseSummary   = generateRootCauseNarrative(safeRootCauses, safeFindings); }
  catch (e) { console.error("[MGD][NARRATIVE] rootCauseSummary failed:", e); rootCauseSummary = fallbackSection("root-cause-summary", "Root Cause Analysis", 3); }

  try { operationalHealth  = generateOperationalHealthNarrative(safeFindings, safeRootCauses, operationalHealthScore); }
  catch (e) { console.error("[MGD][NARRATIVE] operationalHealth failed:", e); operationalHealth = fallbackSection("operational-health", "Operational Health Assessment", 4); }

  try { priorityActions    = generatePriorityActionsNarrative(safeRecs, safeFindings, safeRootCauses); }
  catch (e) { console.error("[MGD][NARRATIVE] priorityActions failed:", e); priorityActions = fallbackSection("priority-actions", "Priority Actions", 5); }

  try { strategicDirection = generateStrategicDirectionNarrative(safeFindings, safeRootCauses, safeRecs, industry); }
  catch (e) { console.error("[MGD][NARRATIVE] strategicDirection failed:", e); strategicDirection = fallbackSection("strategic-direction", "Strategic Direction", 6); }

  try { finalConclusion    = generateFinalConclusionNarrative(safeFindings, safeRootCauses, safeRecs, operationalHealthScore); }
  catch (e) { console.error("[MGD][NARRATIVE] finalConclusion failed:", e); finalConclusion = fallbackSection("final-conclusion", "Conclusion", 7); }

  const report: ExecutiveNarrativeReport = {
    executiveOverview:  executiveOverview!,
    keyFindings:        keyFindings!,
    rootCauseSummary:   rootCauseSummary!,
    operationalHealth:  operationalHealth!,
    priorityActions:    priorityActions!,
    strategicDirection: strategicDirection!,
    finalConclusion:    finalConclusion!,
    metadata: {
      generatedAt:            new Date().toISOString(),
      industry,
      findingsCount:          safeFindings.length,
      rootCauseCount:         safeRootCauses.length,
      recommendationCount:    safeRecs.length,
      operationalHealthScore,
    },
  };

  console.log(
    `[MGD][NARRATIVE] Report generated — ` +
    `sections=7, ` +
    `findings=${report.metadata.findingsCount}, ` +
    `rootCauses=${report.metadata.rootCauseCount}, ` +
    `recs=${report.metadata.recommendationCount}`,
  );

  for (const [key, section] of Object.entries(report)) {
    if (key === "metadata") continue;
    const s = section as ExecutiveNarrativeSection;
    console.log(`[MGD][NARRATIVE]   § [${s.id}] "${s.title}" — ${s.content.length} chars`);
  }

  return report;
}
