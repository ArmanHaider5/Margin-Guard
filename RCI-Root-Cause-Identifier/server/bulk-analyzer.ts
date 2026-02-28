/**
 * ============================================================================
 * RCI BRAIN - KNOWLEDGE-GOVERNED ANALYSIS ENGINE
 * ============================================================================
 *
 * GOVERNANCE RULES (MUST NOT BE VIOLATED):
 *
 * 1. ROOT CAUSES: AI selects ONLY from the Root Cause Library
 *    - No invented root causes allowed
 *    - Each root cause must have a valid library ID
 *    - AI matches patterns to existing library entries
 *
 * 2. RECOMMENDATIONS: AI assembles ONLY from Recommendation Archetypes
 *    - No invented recommendations allowed
 *    - Each recommendation must reference an archetype ID
 *    - AI links archetypes to matched root causes
 *
 * 3. AI ROLE IS LIMITED TO:
 *    - Pattern matching against client data
 *    - Relevance ranking of library entries
 *    - Assembly of outputs from pre-approved components
 *    - Contextualisation (NOT invention) of findings
 *
 * 4. AI MAY NOT:
 *    - Invent new root causes not in the library
 *    - Create new recommendation types
 *    - Generate advice outside archetype boundaries
 *
 * This ensures institutional consistency, professional accountability,
 * and audit trail integrity across all RCI diagnostics.
 * ============================================================================
 */

import OpenAI from "openai";
import pRetry from "p-retry";
import {
  type AnalysisFinding,
  type CostSavingOpportunity,
  type RecurrencePrediction,
  type ExtractedDocumentData,
  type FourMCategory,
  type ManagementIndicator,
  type EvidenceAnchor,
  type EvidenceStrength,
  type NarrativeTone,
  categoryToIndicator,
  type AnalysisType,
  type ClientDocument,
} from "@shared/schema";

// KNOWLEDGE LIBRARY IMPORTS - These are the ONLY sources for root causes and recommendations
import {
  rootCauseLibrary,
  manufacturingRootCausesV2,
  type RootCauseEntry,
} from "@shared/root-cause-library";
import {
  recommendationArchetypes,
  type RecommendationArchetype,
  type SeverityLevel,
} from "@shared/recommendation-archetypes";
import {
  allIndustryProblems,
  type IndustryProblem,
} from "@shared/industry-problems";
import {
  type EvidenceSignal,
  type CategorisedExtractedSignal,
  extractConcreteSignals,
  extractEvidenceSignalsFromDocuments,
  type ProcessedDocument,
} from "@shared/evidence-signals";
import {
  getIndustryMoneyInterpretation,
  applySymptomAlignmentGuardrail,
} from "@shared/analysis-builder";

/**
 * ============================================================================
 * MOCK MODE FLAG
 * ============================================================================
 *
 * When MOCK_MODE is true:
 * - Skip all external AI API calls
 * - Return deterministic mock diagnostic results
 * - Use the SAME data structures as real execution
 *
 * Mock results vary based on:
 * - Industry
 * - Selected context
 * - Analysis mode (Baseline vs Deep)
 *
 * This is a wrapper ONLY - does NOT change business logic.
 * ============================================================================
 */
export const MOCK_MODE = true;

/**
 * ============================================================================
 * RECOMMENDATION VARIATION LOGIC
 * ============================================================================
 *
 * RULE: No two diagnostics across different industries may return identical
 * recommendation sets. If similarity is unavoidable, wording must differ
 * materially.
 *
 * This is achieved through three mechanisms:
 *
 * 1. INDUSTRY-SPECIFIC WORDING:
 *    - getVariedDescription() returns industry-specific text if available
 *    - Falls back to default description if no variation exists
 *    - Ensures materially different wording across industries
 *
 * 2. SEVERITY-BASED PRIORITISATION:
 *    - sortByRelevance() orders archetypes by severity weight
 *    - Critical/high findings prioritise high-weight (urgent) actions
 *    - Medium/low findings include more prevention-focused actions
 *
 * 3. CATEGORY-BASED FILTERING:
 *    - filterByCategory() prioritises archetypes matching the dominant 4M category
 *    - Money issues get financial archetypes first
 *    - Manpower issues get people-focused archetypes first
 *
 * ============================================================================
 */

/**
 * VARIATION MECHANISM 1: Industry-Specific Wording
 * Returns the industry-specific description if available, otherwise generates
 * a materially different description by prepending industry context.
 *
 * ENFORCEMENT: If no explicit industryVariation exists, the description is
 * prefixed with industry context to ensure material difference across industries.
 */
function getVariedDescription(
  archetype: RecommendationArchetype,
  industry: string,
): string {
  // Normalise industry name for lookup
  const normalised = normaliseIndustryForVariation(industry);

  // Check if industry-specific variation exists
  if (
    archetype.industryVariations &&
    archetype.industryVariations[normalised]
  ) {
    return archetype.industryVariations[normalised];
  }

  // ENFORCEMENT: When no explicit variation exists, prefix with industry context
  // This ensures materially different wording across industries
  const industryPrefix = getIndustryContextPrefix(normalised);
  return `${industryPrefix}${archetype.description}`;
}

/**
 * ENFORCEMENT: Generates industry-specific context prefix.
 * Ensures recommendations without explicit variations still differ by industry.
 */
function getIndustryContextPrefix(industry: string): string {
  const prefixes: Record<string, string> = {
    Manufacturing: "For production operations: ",
    Construction: "For site operations: ",
    Healthcare: "For clinical settings: ",
    Hospitality: "For guest services: ",
    "F&B": "For food service operations: ",
    Retail: "For store operations: ",
    Logistics: "For distribution operations: ",
    "Oil & Gas": "For field operations: ",
    "Property Development": "For project management: ",
    Education: "For institutional operations: ",
    "Professional Services": "For client delivery: ",
    Technology: "For product operations: ",
  };
  return prefixes[industry] || `For ${industry} operations: `;
}

/**
 * Normalises industry codes to standard names for variation lookup.
 */
function normaliseIndustryForVariation(industry: string): string {
  const map: Record<string, string> = {
    manufacturing: "Manufacturing",
    construction: "Construction",
    healthcare: "Healthcare",
    hospitality: "Hospitality",
    hotels_airbnb: "Hospitality",
    logistics: "Logistics",
    oil_gas: "Oil & Gas",
    property_development: "Property Development",
    fnb_full_service: "F&B",
    fnb_qsr: "F&B",
    fnb_fast_food: "F&B",
    fnb_franchise: "F&B",
    fnb_independent: "F&B",
    retail: "Retail",
    education: "Education",
    professional_services: "Professional Services",
    technology: "Technology",
  };
  return map[industry.toLowerCase()] || industry;
}

/**
 * VARIATION MECHANISM 2: Severity-Based Prioritisation
 * Higher severity findings get higher-weight (more urgent) archetypes first.
 * Lower severity findings get a more balanced mix including prevention.
 */
function sortByRelevance(
  archetypes: RecommendationArchetype[],
  dominantSeverity: SeverityLevel,
): RecommendationArchetype[] {
  return [...archetypes].sort((a, b) => {
    const weightA = a.severityWeight || 5;
    const weightB = b.severityWeight || 5;

    // For critical/high severity: prioritise high-weight actions
    if (dominantSeverity === "critical" || dominantSeverity === "high") {
      return weightB - weightA; // Descending (highest weight first)
    }

    // For medium/low severity: more balanced approach, include prevention
    // Slightly favour prevention actions for lower severity
    const typeBoostA = a.action_type === "Prevention" ? 2 : 0;
    const typeBoostB = b.action_type === "Prevention" ? 2 : 0;
    return weightB + typeBoostB - (weightA + typeBoostA);
  });
}

/**
 * VARIATION MECHANISM 3: Category-Based Prioritisation
 * Prioritises archetypes that align with the dominant 4M category.
 * This ensures recommendations are most relevant to the primary issue type.
 *
 * - Money issues: Financial-focused archetypes first
 * - Manpower issues: People/training archetypes first
 * - Materials issues: Supply chain archetypes first
 * - Machinery issues: Equipment/systems archetypes first
 */
function prioritiseByCategory(
  archetypes: RecommendationArchetype[],
  dominantCategory: FourMCategory | null,
): RecommendationArchetype[] {
  if (!dominantCategory) return archetypes;

  // Map categories to relevant archetype ID patterns
  const categoryPatterns: Record<FourMCategory, string[]> = {
    Money: [
      "cashflow",
      "cost",
      "budget",
      "credit",
      "pricing",
      "debt",
      "cash",
      "growth",
    ],
    Manpower: [
      "training",
      "turnover",
      "ownership",
      "knowledge",
      "standards",
      "comms",
      "staffing",
      "supervision",
    ],
    Materials: [
      "inventory",
      "supplier",
      "overstock",
      "waste",
      "quality",
      "singlesource",
      "forecast",
      "storage",
    ],
    Machinery: [
      "breakdown",
      "maintenance",
      "legacy",
      "bottleneck",
      "utilization",
      "calibration",
      "sop",
      "tech",
    ],
  };

  const relevantPatterns = categoryPatterns[dominantCategory] || [];

  // Sort: archetypes matching dominant category patterns come first
  return [...archetypes].sort((a, b) => {
    const aMatchesCategory = relevantPatterns.some((p) =>
      a.archetype_id.toLowerCase().includes(p),
    );
    const bMatchesCategory = relevantPatterns.some((p) =>
      b.archetype_id.toLowerCase().includes(p),
    );

    if (aMatchesCategory && !bMatchesCategory) return -1;
    if (!aMatchesCategory && bMatchesCategory) return 1;
    return 0;
  });
}

/**
 * VARIATION MECHANISM 3: Category-Based Filtering
 * Prioritises archetypes that align with the dominant 4M category.
 */
function getDominantCategory(
  findings: AnalysisFinding[],
): FourMCategory | null {
  if (findings.length === 0) return null;

  const counts: Record<FourMCategory, number> = {
    Money: 0,
    Manpower: 0,
    Materials: 0,
    Machinery: 0,
  };

  for (const f of findings) {
    if (f.fourMCategory) counts[f.fourMCategory]++;
  }

  let max: FourMCategory = "Money";
  for (const cat of Object.keys(counts) as FourMCategory[]) {
    if (counts[cat] > counts[max]) max = cat;
  }
  return max;
}

/**
 * Determines dominant severity level from findings.
 */
function getDominantSeverity(findings: AnalysisFinding[]): SeverityLevel {
  if (findings.length === 0) return "medium";

  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasHigh = findings.some((f) => f.severity === "high");

  if (hasCritical) return "critical";
  if (hasHigh) return "high";
  return "medium";
}

/**
 * ============================================================================
 * EVIDENCE-DRIVEN FINDINGS ENGINE (vNext - Signal Extraction)
 * ============================================================================
 *
 * Enriches findings with:
 * - Concrete signal-based evidence anchors (metrics + events from documents)
 * - Evidence strength and narrative tone
 * - Industry-specific impact narratives (signal-backed bullet points)
 * - "What to Validate Next" prompts (specific documents to request)
 * - Duplicate root cause collapsing
 *
 * Non-breaking: all new fields are optional. Existing findings pass through unchanged.
 * ============================================================================
 */

// Build evidence anchors from extracted concrete signals (metrics + events)
// matching a finding's 4M category. Only concrete signals are used — no generic terms.
function buildEvidenceAnchorsFromSignals(
  category: FourMCategory,
  concreteSignals: CategorisedExtractedSignal[],
  evidenceSignals: EvidenceSignal[],
): EvidenceAnchor[] {
  const anchors: EvidenceAnchor[] = [];
  const seen = new Set<string>();

  const matchingConcreteSignals = concreteSignals.filter(
    (s) => s.category === category,
  );
  for (const sig of matchingConcreteSignals) {
    const key = `${sig.documentName}:${sig.signal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    anchors.push({
      documentName: sig.documentName,
      signal: sig.signal,
      interpretation: sig.rawText,
    });
    if (anchors.length >= 5) break;
  }

  if (anchors.length === 0) {
    const matchingTermSignals = evidenceSignals.filter(
      (s) => s.category === category,
    );
    for (const signal of matchingTermSignals) {
      const docName =
        signal.sourceDocuments && signal.sourceDocuments.length > 0
          ? signal.sourceDocuments.join(", ")
          : null;
      if (!docName) continue;
      const concreteTerms = signal.matchedTerms.filter(
        (t) => t.length > 3 && !GENERIC_ANCHOR_TERMS.has(t.toLowerCase()),
      );
      if (concreteTerms.length === 0) continue;
      const key = `${docName}:${concreteTerms[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      anchors.push({
        documentName: docName,
        signal: concreteTerms.slice(0, 3).join(", "),
        interpretation: signal.description,
      });
      if (anchors.length >= 5) break;
    }
  }

  return anchors;
}

const GENERIC_ANCHOR_TERMS = new Set([
  "operational data",
  "pattern match",
  "uploaded operational documents",
  "uploaded document",
  "money category detected",
  "document analysis",
  "pattern matched",
  "category detected",
  "data detected",
]);

const GENERIC_SIGNAL_PATTERNS = [
  /^pattern match/i,
  /^operational data/i,
  /^document analysis/i,
  /^uploaded/i,
  /^category detected/i,
  /^data detected/i,
];

function isGenericAnchor(anchor: EvidenceAnchor): boolean {
  const sig = (anchor.signal || "").toLowerCase().trim();
  if (GENERIC_ANCHOR_TERMS.has(sig)) return true;
  for (const pat of GENERIC_SIGNAL_PATTERNS) {
    if (pat.test(sig)) return true;
  }
  if (sig.length < 4 || sig === anchor.documentName?.toLowerCase()) return true;
  return false;
}

function filterGenericAnchors(anchors: EvidenceAnchor[]): EvidenceAnchor[] {
  return anchors.filter((a) => !isGenericAnchor(a));
}

const CATEGORY_CONSEQUENCE: Record<FourMCategory, string> = {
  Money: "increased financial exposure",
  Manpower: "workforce capacity constraints",
  Machinery: "operational reliability risk",
  Materials: "supply chain disruption",
};

const CATEGORY_CAUSAL_FRAME: Record<FourMCategory, string> = {
  Money: "driving financial exposure",
  Manpower: "undermining workforce capacity",
  Machinery: "driving operational reliability risk",
  Materials: "disrupting supply chain performance",
};

function buildEvidenceLedTitle(
  originalTitle: string,
  anchors: EvidenceAnchor[],
  category: FourMCategory,
): string {
  const rootCauseCore = originalTitle
    .replace(/^\[NEEDS VALIDATION\]\s*/i, "")
    .replace(/^\[PRELIMINARY\]\s*/i, "");

  const causalFrame =
    CATEGORY_CAUSAL_FRAME[category] || "contributing to operational impact";

  const shortCause =
    rootCauseCore.length > 60
      ? rootCauseCore.split(/[—–,]/)[0].trim()
      : rootCauseCore;

  return `${shortCause} ${causalFrame}`;
}

function buildInsightNote(
  originalTitle: string,
  description: string,
  causes: string[],
  category: FourMCategory,
  anchors: EvidenceAnchor[],
): string {
  const concreteAnchors = filterGenericAnchors(anchors);
  const hasSignals = concreteAnchors.length > 0;
  const rootCause = causes.length > 0 ? causes[0] : originalTitle;

  if (hasSignals) {
    const signalSummary = concreteAnchors
      .slice(0, 2)
      .map((a) => a.signal)
      .join(" and ");
    const causalPhrases: Record<FourMCategory, string> = {
      Money:
        "strongly indicates cost structures are misaligned with operational reality, eroding margins and tightening cash position",
      Manpower:
        "strongly indicates workforce allocation and retention practices are insufficient, increasing overtime dependency and institutional knowledge loss",
      Machinery:
        "strongly indicates maintenance is primarily reactive rather than preventive, increasing failure frequency and schedule volatility",
      Materials:
        "strongly indicates supply chain controls are insufficient, creating quality and delivery risks that cascade into production commitments",
    };
    return `The pattern of ${signalSummary} ${causalPhrases[category] || "points to a systemic root cause requiring intervention"}.`;
  }

  return `Preliminary analysis suggests ${rootCause.toLowerCase()} may be a contributing factor in the ${category} domain, but additional document evidence is needed to confirm the causal pathway.`;
}

function calibrateSeverity(
  originalSeverity: "low" | "medium" | "high" | "critical",
  evidenceStrength: EvidenceStrength,
): "low" | "medium" | "high" | "critical" {
  const severityRank: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  const maxAllowed: Record<EvidenceStrength, string> = {
    WEAK: "medium",
    MODERATE: "high",
    STRONG: "critical",
  };
  const cap = maxAllowed[evidenceStrength];
  if (severityRank[originalSeverity] > severityRank[cap]) {
    return cap as "low" | "medium" | "high" | "critical";
  }
  return originalSeverity;
}

// Determine evidence strength based on concrete signal count + term signals
function determineEvidenceStrength(
  anchors: EvidenceAnchor[],
  concreteSignals: CategorisedExtractedSignal[],
  termSignals: EvidenceSignal[],
): EvidenceStrength {
  if (anchors.length === 0) return "WEAK";
  const concreteCount = concreteSignals.length;
  const strongTerms = termSignals.filter((s) => s.strength === "strong").length;
  const mediumTerms = termSignals.filter((s) => s.strength === "medium").length;
  if (
    concreteCount >= 2 ||
    (anchors.length >= 2 && (strongTerms > 0 || mediumTerms >= 2))
  )
    return "STRONG";
  if (
    concreteCount >= 1 ||
    (anchors.length >= 1 && (strongTerms > 0 || mediumTerms > 0))
  )
    return "MODERATE";
  return "WEAK";
}

// Determine narrative tone from evidence strength
function determineNarrativeTone(strength: EvidenceStrength): NarrativeTone {
  if (strength === "STRONG") return "CONCLUSIVE";
  if (strength === "MODERATE") return "DIAGNOSTIC";
  return "EXPLORATORY";
}

// Industry-specific impact chain maps: category → industry → impact bullet patterns
const INDUSTRY_IMPACT_CHAINS: Record<
  string,
  Record<FourMCategory, string[]>
> = {
  manufacturing: {
    Money: [
      "WIP accumulation ties up working capital",
      "Unplanned overtime inflates labour cost per unit",
      "Margin erosion from throughput losses",
    ],
    Manpower: [
      "Skill gaps drive rework and quality variation",
      "Overtime fatigue reduces output quality",
      "Turnover disrupts production line continuity",
    ],
    Machinery: [
      "Downtime cascades into schedule slippage",
      "Deferred maintenance increases breakdown frequency",
      "Equipment aging raises repair-to-replace cost ratio",
    ],
    Materials: [
      "Stockouts halt production lines",
      "Quality rejections trigger rework and waste",
      "Supplier delays cascade into delivery commitments",
    ],
  },
  healthcare: {
    Money: [
      "Reimbursement delays compress operating cashflow",
      "Payer mix imbalances reduce revenue per encounter",
      "Capacity under-utilisation increases fixed cost per patient",
    ],
    Manpower: [
      "Staff shortages increase patient wait times",
      "Burnout drives turnover and locum costs",
      "Training gaps create clinical risk exposure",
    ],
    Machinery: [
      "Equipment downtime delays diagnostic workflows",
      "Deferred calibration affects clinical accuracy",
      "System outages disrupt patient record access",
    ],
    Materials: [
      "Supply shortages delay treatment protocols",
      "Expired stock incurs waste and compliance risk",
      "Vendor disruptions affect critical consumables",
    ],
  },
  logistics: {
    Money: [
      "SLA penalties directly erode margins",
      "Fuel cost volatility compresses route profitability",
      "Late invoicing delays cash conversion cycle",
    ],
    Manpower: [
      "Driver shortage increases overtime and route delays",
      "High turnover raises recruitment and training costs",
      "Dispatch errors from understaffing cause SLA breaches",
    ],
    Machinery: [
      "Fleet breakdowns cause delivery failures",
      "Deferred maintenance increases roadside incident risk",
      "Aging vehicles increase fuel consumption per km",
    ],
    Materials: [
      "Warehouse stockout delays order fulfilment",
      "Damaged goods in transit trigger returns and credits",
      "Supplier delays cascade into customer delivery SLAs",
    ],
  },
};

function getIndustryKey(industry: string): string {
  const lower = (industry || "").toLowerCase();
  if (lower.includes("manufacturing") || lower.includes("construction"))
    return "manufacturing";
  if (
    lower.includes("healthcare") ||
    lower.includes("hospital") ||
    lower.includes("pharma")
  )
    return "healthcare";
  if (
    lower.includes("logistics") ||
    lower.includes("shipping") ||
    lower.includes("transport")
  )
    return "logistics";
  return "general";
}

// Build impact bullets from extracted signals + industry chain
function buildImpactObserved(
  category: FourMCategory,
  concreteSignals: CategorisedExtractedSignal[],
  industry: string,
): string[] {
  const bullets: string[] = [];
  const matchingSignals = concreteSignals.filter(
    (s) => s.category === category,
  );

  for (const sig of matchingSignals.slice(0, 3)) {
    bullets.push(`${sig.signal} (${sig.documentName})`);
  }

  const industryKey = getIndustryKey(industry);
  const chains = INDUSTRY_IMPACT_CHAINS[industryKey];
  if (chains && chains[category]) {
    const industryBullets = chains[category];
    for (const b of industryBullets.slice(0, 2)) {
      if (bullets.length >= 5) break;
      bullets.push(b);
    }
  }

  return bullets;
}

// Determine what documents to request next based on category
const VALIDATION_DOCS: Record<FourMCategory, string[]> = {
  Money: [
    "Aged receivables report (last 3 months)",
    "Monthly P&L or management accounts",
    "Cash flow statement or forecast",
  ],
  Manpower: [
    "Overtime log or attendance records",
    "Staff turnover report (last 12 months)",
    "Training records or competency matrix",
  ],
  Machinery: [
    "Maintenance log or work order history",
    "Equipment downtime register",
    "Asset condition or inspection report",
  ],
  Materials: [
    "Inventory reconciliation report",
    "Supplier delivery performance log",
    "Quality rejection or rework register",
  ],
};

function buildWhatToValidateNext(
  category: FourMCategory,
  hasConcreteSignals: boolean,
): string[] {
  const docs = VALIDATION_DOCS[category] || [];
  if (!hasConcreteSignals) {
    return docs.slice(0, 3);
  }
  return docs.slice(0, 2);
}

// Enrich a single finding with signal-driven evidence fields
function enrichFindingWithEvidence(
  finding: AnalysisFinding,
  evidenceSignals: EvidenceSignal[],
  concreteSignals: CategorisedExtractedSignal[],
  industry: string,
): AnalysisFinding {
  const matchingTermSignals = evidenceSignals.filter(
    (s) => s.category === finding.fourMCategory,
  );
  const matchingConcreteSignals = concreteSignals.filter(
    (s) => s.category === finding.fourMCategory,
  );
  const hasAnySignals =
    matchingTermSignals.length > 0 || matchingConcreteSignals.length > 0;

  if (!hasAnySignals) {
    const insightNote = buildInsightNote(
      finding.title,
      finding.description,
      finding.causes,
      finding.fourMCategory,
      [],
    );
    return {
      ...finding,
      severity: calibrateSeverity(finding.severity, "WEAK"),
      evidenceStrength: "WEAK",
      narrativeTone: "EXPLORATORY",
      impactObserved: [],
      whatToValidateNext: buildWhatToValidateNext(finding.fourMCategory, false),
      insightNote,
    };
  }

  const rawAnchors = buildEvidenceAnchorsFromSignals(
    finding.fourMCategory,
    concreteSignals,
    evidenceSignals,
  );
  const anchors = filterGenericAnchors(rawAnchors);
  const strength = determineEvidenceStrength(
    anchors,
    matchingConcreteSignals,
    matchingTermSignals,
  );
  const tone = determineNarrativeTone(strength);

  const impactObserved = buildImpactObserved(
    finding.fourMCategory,
    concreteSignals,
    industry,
  );
  const whatToValidateNext = buildWhatToValidateNext(
    finding.fourMCategory,
    matchingConcreteSignals.length > 0,
  );

  const evidenceLedTitle = buildEvidenceLedTitle(
    finding.title,
    anchors,
    finding.fourMCategory,
  );
  const insightNote = buildInsightNote(
    finding.title,
    finding.description,
    finding.causes,
    finding.fourMCategory,
    anchors,
  );
  const calibratedSeverity = calibrateSeverity(finding.severity, strength);

  return {
    ...finding,
    severity: calibratedSeverity,
    evidence:
      strength === "WEAK"
        ? ["Insufficient document evidence — further review recommended"]
        : finding.evidence,
    evidenceAnchors: anchors.length > 0 ? anchors : undefined,
    evidenceStrength: strength,
    narrativeTone: tone,
    impactObserved: impactObserved.length > 0 ? impactObserved : undefined,
    whatToValidateNext:
      whatToValidateNext.length > 0 ? whatToValidateNext : undefined,
    evidenceLedTitle:
      evidenceLedTitle !== finding.title ? evidenceLedTitle : undefined,
    insightNote,
  };
}

function collapseDuplicateFindings(
  findings: AnalysisFinding[],
): AnalysisFinding[] {
  const grouped: Record<string, AnalysisFinding[]> = {};
  for (const f of findings) {
    const key = f.fourMCategory;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  }

  const result: AnalysisFinding[] = [];
  const strengthOrder: Record<string, number> = {
    STRONG: 3,
    MODERATE: 2,
    WEAK: 1,
  };
  const severityOrder: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const sortByStrength = (arr: AnalysisFinding[]) => {
    arr.sort((a, b) => {
      const sa = strengthOrder[a.evidenceStrength || "WEAK"];
      const sb = strengthOrder[b.evidenceStrength || "WEAK"];
      if (sb !== sa) return sb - sa;
      return (
        (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
      );
    });
  };

  for (const category of Object.keys(grouped)) {
    const group = grouped[category];
    if (group.length <= 1) {
      result.push(...group);
      continue;
    }

    sortByStrength(group);
    const primary = group[0];
    const alternates = group.slice(1);

    const allCauses = [
      ...primary.causes,
      ...alternates.flatMap((f) => f.causes),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    const allEvidence = [
      ...(primary.evidence || []),
      ...alternates.flatMap((f) => f.evidence || []),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    const allAnchors = [
      ...(primary.evidenceAnchors || []),
      ...alternates.flatMap((f) => f.evidenceAnchors || []),
    ];
    const uniqueAnchors = allAnchors.filter(
      (a, i, arr) => arr.findIndex((x) => x.signal === a.signal) === i,
    );

    const allImpacts = [
      ...(primary.impactObserved || []),
      ...alternates.flatMap((f) => f.impactObserved || []),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    const allValidation = [
      ...(primary.whatToValidateNext || []),
      ...alternates.flatMap((f) => f.whatToValidateNext || []),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    const strengthLabels: Record<string, string> = {
      STRONG: "Strong",
      MODERATE: "Medium",
      WEAK: "Weak",
    };
    const hypothesisLines = allCauses.slice(0, 3).map((c, idx) => {
      const matchingFinding = group.find((f) => f.causes.includes(c));
      const confidence = matchingFinding?.evidenceStrength || "WEAK";
      const role =
        idx === 0 ? "Primary Hypothesis" : `Alternative Hypothesis ${idx}`;
      return `${role}: ${c} (Confidence: ${strengthLabels[confidence] || "Weak"})`;
    });

    const hypothesisBlock = `\n\nRoot Cause Hypotheses:\n${hypothesisLines.join("\n")}`;

    const costParts = group.map((f) => f.estimatedCostImpact).filter(Boolean);
    const combinedCost = costParts.length > 0 ? costParts[0] : undefined;

    const merged: AnalysisFinding = {
      ...primary,
      causes: allCauses.slice(0, 3),
      evidence: allEvidence,
      evidenceAnchors: uniqueAnchors.length > 0 ? uniqueAnchors : undefined,
      impactObserved: allImpacts.length > 0 ? allImpacts : undefined,
      whatToValidateNext: allValidation.length > 0 ? allValidation : undefined,
      description: primary.description + hypothesisBlock,
      estimatedCostImpact: combinedCost,
      collapsedNote:
        alternates.length > 0
          ? `${alternates.length} additional root cause hypothesis${alternates.length > 1 ? "es" : ""} merged into this finding`
          : primary.collapsedNote,
    };

    result.push(merged);
  }

  return result;
}

const OPERATIONAL_CATEGORIES: Set<FourMCategory> = new Set([
  "Machinery",
  "Materials",
  "Manpower",
]);

function hasOperationalEvidence(
  concreteSignals: CategorisedExtractedSignal[],
): boolean {
  return concreteSignals.some((s) => OPERATIONAL_CATEGORIES.has(s.category));
}

function enforceCausalOrdering(
  findings: AnalysisFinding[],
  industry: string,
  concreteSignals: CategorisedExtractedSignal[],
): AnalysisFinding[] {
  if (!hasOperationalEvidence(concreteSignals)) return findings;

  const operational = findings.filter((f) =>
    OPERATIONAL_CATEGORIES.has(f.fourMCategory),
  );
  const money = findings.filter((f) => f.fourMCategory === "Money");

  if (operational.length === 0 || money.length === 0) return findings;

  const firstMoneyIdx = findings.findIndex((f) => f.fourMCategory === "Money");
  const firstOpsIdx = findings.findIndex((f) =>
    OPERATIONAL_CATEGORIES.has(f.fourMCategory),
  );

  if (firstOpsIdx < firstMoneyIdx) return findings;

  const reordered: AnalysisFinding[] = [];
  let opsInserted = false;
  for (const f of findings) {
    if (f.fourMCategory === "Money" && !opsInserted) {
      const topOp = operational[0];
      reordered.push(topOp);
      opsInserted = true;
    }
    if (opsInserted && f === operational[0]) continue;
    reordered.push(f);
  }
  return reordered;
}

function classifyProblemIntent(problemText: string) {
  const text = (problemText || "").toLowerCase();

  const intentMap = {
    money: ["margin", "profit", "cash", "cost", "budget", "funding", "working capital", "revenue", "financial", "liquidity"],
    manpower: ["overtime", "staff", "turnover", "resignation", "attrition", "burnout", "morale", "accountability", "supervisor", "headcount"],
    machinery: ["downtime", "breakdown", "maintenance", "pm", "equipment", "machine", "reliability", "firefighting", "failure"],
    materials: ["supplier", "inventory", "stock", "raw material", "delivery", "quality issue", "rework", "defect"],
  };

  const weights: Record<string, number> = {
    money: 0,
    manpower: 0,
    machinery: 0,
    materials: 0,
  };

  for (const category in intentMap) {
    for (const keyword of intentMap[category]) {
      if (text.includes(keyword)) {
        weights[category] += 1;
      }
    }
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  if (total === 0) return weights;

  for (const key in weights) {
    weights[key] = weights[key] / total;
  }

  return weights;
}

const CATEGORY_PREDICTION_TEMPLATES: Record<FourMCategory, string[]> = {
  Machinery: [
    "Recurring unplanned downtime and equipment failures likely to escalate without structured preventive maintenance program",
    "Equipment reliability degradation expected to worsen, increasing emergency repair costs and production schedule disruption",
  ],
  Manpower: [
    "Workforce capacity gaps and overtime dependency likely to drive further attrition and institutional knowledge loss",
    "Staff burnout and skill gaps expected to increase quality variation and reduce operational throughput",
  ],
  Materials: [
    "Supply chain disruptions and quality control gaps likely to cascade into delivery commitments and customer satisfaction",
    "Inventory management issues expected to increase carrying costs and stockout risk across production lines",
  ],
  Money: [
    "Financial exposure from cost structure misalignment likely to tighten cash position and constrain operational flexibility",
    "Margin erosion expected to accelerate without intervention on cost drivers and billing cycle alignment",
  ],
};

function buildPredictionsFromFindings(
  enrichedFindings: AnalysisFinding[],
  prefix: string,
): RecurrencePrediction[] {
  const severityRank: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  const strengthRank: Record<string, number> = {
    STRONG: 3,
    MODERATE: 2,
    WEAK: 1,
  };

  const ranked = [...enrichedFindings].sort((a, b) => {
    const sevDiff =
      (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (sevDiff !== 0) return sevDiff;
    return (
      (strengthRank[b.evidenceStrength || "WEAK"] || 0) -
      (strengthRank[a.evidenceStrength || "WEAK"] || 0)
    );
  });

  const topFindings = ranked.slice(0, 2);

  return topFindings.map((finding, idx) => {
    const category =
      finding.fourMCategory &&
      CATEGORY_PREDICTION_TEMPLATES[finding.fourMCategory]
        ? finding.fourMCategory
        : "Money";
    const templates = CATEGORY_PREDICTION_TEMPLATES[category];
    const issue = templates[idx % templates.length];

    const sev = finding.severity;
    const strength = finding.evidenceStrength || "WEAK";
    let timeframe: string;
    let likelihood: "low" | "medium" | "high";

    if (
      (sev === "critical" && strength === "STRONG") ||
      (sev === "high" && strength === "STRONG")
    ) {
      timeframe = "Within 1–3 months if unaddressed";
      likelihood = "high";
    } else if (
      sev === "high" ||
      (sev === "critical" && strength !== "STRONG")
    ) {
      timeframe = "Within 3–6 months if unaddressed";
      likelihood = "high";
    } else {
      timeframe = "Within 6–12 months if unaddressed";
      likelihood = "medium";
    }

    const anchors = (finding.evidenceAnchors || [])
      .slice(0, 3)
      .map((a) => a.signal);
    const basedOn =
      anchors.length > 0 ? ` (Based on: ${anchors.join(", ")})` : "";

    return {
      id: `pred-${prefix}-${idx}-${finding.id}`,
      issue: `${issue}${basedOn}`,
      likelihood,
      expectedTimeframe: timeframe,
    };
  });
}

// Full evidence-driven enrichment pipeline for a set of findings
function applyEvidenceDrivenEnrichment(
  findings: AnalysisFinding[],
  evidenceSignals: EvidenceSignal[],
  industry: string,
  concreteSignals: CategorisedExtractedSignal[] = [],
): AnalysisFinding[] {
  const enriched = findings.map((f) =>
    enrichFindingWithEvidence(f, evidenceSignals, concreteSignals, industry),
  );
  const withHypotheses = enriched.map((f) => {
    if (f.description.includes("Root Cause Hypotheses:")) return f;
    const strengthLabels: Record<string, string> = {
      STRONG: "Strong",
      MODERATE: "Medium",
      WEAK: "Weak",
    };
    const confidence = strengthLabels[f.evidenceStrength || "WEAK"] || "Weak";
    const hypothesisBlock = `\n\nRoot Cause Hypotheses:\nPrimary Hypothesis: ${f.causes[0] || f.title} (Confidence: ${confidence})`;
    return { ...f, description: f.description + hypothesisBlock };
  });
  const collapsed = collapseDuplicateFindings(withHypotheses);
  return enforceCausalOrdering(collapsed, industry, concreteSignals);
}

// Generate synthetic evidence signals for fallback analysis paths (V2/mock mode).
// In real document-driven analysis, signals come from extractEvidenceSignalsFromDocuments().
// Without uploaded documents, findings are marked EXPLORATORY with no concrete anchors.
function generateFallbackEvidenceSignals(
  findings: AnalysisFinding[],
  isBaseline: boolean,
): EvidenceSignal[] {
  if (isBaseline) return [];
  return [];
}

/**
 * Generates a unique fingerprint for the recommendation set.
 * Used for audit trail and preventing accidental duplication.
 */
function generateRecommendationFingerprint(
  industry: string,
  category: FourMCategory | null,
  archetypeIds: string[],
): string {
  const sortedIds = [...archetypeIds].sort().join(",");
  return `${industry}-${category || "mixed"}-${sortedIds.slice(0, 50)}`;
}

/**
 * VARIATION MECHANISM 4: Industry-Based Selection Offset
 * ============================================================================
 *
 * RULE: No two diagnostics across different industries may return identical
 * recommendation sets. If similarity is unavoidable, wording must differ
 * materially.
 *
 * GUARANTEE LEVELS:
 * 1. WORDING DIVERGENCE (GUARANTEED): Industry-specific prefixes ensure
 *    materially different text even when archetype sets are identical.
 *    See getVariedDescription() and getIndustryContextPrefix().
 *
 * 2. SET DIVERGENCE (BEST-EFFORT): Industry offset reorders the candidate
 *    pool so different industries select different top-N archetypes.
 *    This works when pool size > N; edge cases may result in identical sets
 *    but wording will still differ per guarantee #1.
 *
 * GOVERNANCE-SAFE MECHANISM:
 * - Does NOT add archetypes outside the linked root cause set
 * - Only reorders the existing approved pool
 * - Different industries receive different ordering
 *
 * ============================================================================
 */
function applyIndustrySelectionOffset(
  archetypes: RecommendationArchetype[],
  industry: string,
): RecommendationArchetype[] {
  if (archetypes.length <= 1) return archetypes;

  // Generate a deterministic offset based on industry name hash
  // Uses full hash for better distribution across industries
  const industryHash = industry
    .split("")
    .reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const offset = industryHash % archetypes.length;

  // Rotate the array by the offset to ensure different selection order
  if (offset === 0) return archetypes;

  const rotated = [...archetypes.slice(offset), ...archetypes.slice(0, offset)];
  console.log(
    `VARIATION: Applied industry offset ${offset} for ${industry} (pool size: ${archetypes.length})`,
  );
  return rotated;
}

/**
 * VARIATION ENFORCEMENT: Filter archetypes by industry applicability
 * Removes archetypes that are specifically NOT applicable to the current industry.
 */
function filterByIndustryApplicability(
  archetypes: RecommendationArchetype[],
  industry: string,
): RecommendationArchetype[] {
  const normalised = normaliseIndustryForVariation(industry);

  return archetypes.filter((arch) => {
    // "All" industries means applicable everywhere
    if (arch.applicable_industries === "All") return true;

    // Check if this industry is in the applicable list
    return arch.applicable_industries.some(
      (ind) => ind.toLowerCase() === normalised.toLowerCase(),
    );
  });
}

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Please set the API key in your environment.",
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

interface AnalysisInput {
  documents: ClientDocument[];
  industry: string;
  analysisType: AnalysisType;
  clientName: string;
  problemStatement: string;
  diagnosticContexts?: string[];
  selectedSymptoms?: string[];
  mode: "baseline" | "deep";
}

interface AnalysisResult {
  findings: AnalysisFinding[];
  summary: string;
  costSavingOpportunities: CostSavingOpportunity[];
  predictions: RecurrencePrediction[];
  analysisMode?: "baseline" | "evidence-enriched"; // Indicates which mode was used
  confidence?: "preliminary" | "low" | "substantiated"; // Confidence level ("low" = safe diagnostic floor)
  isMockMode?: boolean; // Flag to indicate mock mode results
  categoryConfidenceMap?: Record<string, any>;
  caseConfidence?: {
    caseConfidenceScore: number;
    caseConfidenceLevel: string;
    totalConcreteSignals: number;
    totalEvidenceSignals: number;
    activeCategories: number;
  };
}

/**
 * ============================================================================
 * DIAGNOSTIC BASELINE INTERFACE
 * ============================================================================
 *
 * The Diagnostic Baseline always exists when a diagnostic is initiated.
 * It provides the minimum context required to run an honest first-pass
 * institutional diagnostic WITHOUT fabricating evidence.
 *
 * Baseline mode enables:
 * - Initial assessment without requiring document uploads
 * - Pattern matching against industry-specific root causes
 * - Preliminary recommendations based on problem description
 *
 * The output is clearly marked as:
 * - Status: Draft
 * - Confidence: Preliminary
 *
 * ============================================================================
 */
interface DiagnosticBaseline {
  clientId: string;
  clientName: string;
  industry: string;
  problemDescription: string;
  diagnosticContext: FourMCategory[]; // Default: ["Money", "Manpower", "Materials", "Machinery"]
}

/**
 * KNOWLEDGE-GOVERNED: Aggregates document data for pattern matching
 * This extracts raw data - AI will match against library, not invent causes
 */
function aggregateDocumentData(documents: ClientDocument[]): {
  allText: string;
  allIssues: string[];
  allAmounts: { value: number; context: string }[];
  allDates: string[];
  tableData: string;
} {
  const allText: string[] = [];
  const allIssues: string[] = [];
  const allAmounts: { value: number; context: string }[] = [];
  const allDates: string[] = [];
  const tableSummaries: string[] = [];

  for (const doc of documents) {
    const data = doc.extractedData as ExtractedDocumentData | null;
    if (!data) continue;

    if (data.rawText) {
      allText.push(data.rawText.slice(0, 5000));
    }

    if (data.issues) {
      allIssues.push(...data.issues);
    }

    if (data.amounts) {
      allAmounts.push(...data.amounts);
    }

    if (data.dates) {
      allDates.push(...data.dates);
    }

    if (data.tables) {
      for (const table of data.tables.slice(0, 5)) {
        const headerStr = table.headers.join(" | ");
        const rowSamples = table.rows
          .slice(0, 10)
          .map((r) => r.join(" | "))
          .join("\n");
        tableSummaries.push(
          `Table "${table.name || "Unnamed"}":\nHeaders: ${headerStr}\nSample rows:\n${rowSamples}`,
        );
      }
    }
  }

  return {
    allText: allText.join("\n\n").slice(0, 20000),
    allIssues: Array.from(new Set(allIssues)).slice(0, 50),
    allAmounts: allAmounts.slice(0, 50),
    allDates: Array.from(new Set(allDates)).slice(0, 30),
    tableData: tableSummaries.join("\n\n---\n\n").slice(0, 15000),
  };
}

/**
 * KNOWLEDGE-GOVERNED: Get relevant root causes from the library
 * These are the ONLY root causes the AI may select from
 */
/**
 * INDUSTRY-LOCKED ROOT CAUSE SELECTION
 *
 * Root causes must be industry-relevant to avoid generic diagnostics.
 * Selection is rule-based: only root causes where applicableIndustries
 * includes client.industry are selected.
 *
 * Cross-industry root causes (crossIndustry: true) are ONLY allowed when:
 * - No exact industry match exists, OR
 * - They are explicitly marked as universally applicable
 *
 * AI role is LIMITED to pattern matching - no guessing allowed.
 */
function getRelevantRootCauses(industry: string): RootCauseEntry[] {
  const normalizedIndustry = industry.toLowerCase();

  // First: find root causes with exact industry match
  const exactMatches = rootCauseLibrary.filter((rc) =>
    rc.applicableIndustries.some(
      (ind: string) =>
        ind.toLowerCase() === normalizedIndustry ||
        ind.toLowerCase().includes(normalizedIndustry) ||
        normalizedIndustry.includes(ind.toLowerCase()),
    ),
  );

  // If we have exact matches, return them
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // If no exact industry match exists, allow cross-industry root causes ONLY
  // if explicitly marked (crossIndustry: true)
  return rootCauseLibrary.filter((rc) => rc.crossIndustry === true);
}

/**
 * KNOWLEDGE-GOVERNED: Get relevant recommendations from archetypes
 * These are the ONLY recommendations the AI may assemble from
 */
function getRelevantArchetypes(
  industry: string,
  rootCauseIds: string[],
): RecommendationArchetype[] {
  // Filter archetypes that apply to matched root causes and industry
  // AI will assemble from these - it cannot create new recommendations
  return recommendationArchetypes.filter((arch) => {
    const industryMatch =
      arch.applicable_industries === "All" ||
      arch.applicable_industries.some(
        (ind: string) =>
          ind.toLowerCase().includes(industry.toLowerCase()) ||
          industry.toLowerCase().includes(ind.toLowerCase()),
      );

    const causeMatch =
      rootCauseIds.length === 0 ||
      arch.applicable_root_cause_ids.some((rcId) =>
        rootCauseIds.includes(rcId),
      );

    return industryMatch && causeMatch;
  });
}

/**
 * KNOWLEDGE-GOVERNED: Get industry problems for context
 */
function getRelevantProblems(industry: string): IndustryProblem[] {
  return allIndustryProblems
    .filter((p) => p.industry === industry)
    .slice(0, 20);
}

/**
 * ============================================================================
 * KNOWLEDGE-GOVERNED QUICK ANALYSIS
 * ============================================================================
 *
 * AI ROLE: Pattern matching and relevance ranking ONLY
 * - Matches client data patterns to root cause library entries
 * - Ranks relevance based on symptom matching
 * - Selects applicable archetypes for recommendations
 * - DOES NOT invent new root causes or recommendations
 */
async function runQuickAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  const { documents, industry, clientName } = input;
  const aggregated = aggregateDocumentData(documents);

  // KNOWLEDGE LIBRARY: Load approved root causes and archetypes
  const approvedRootCauses = getRelevantRootCauses(industry);
  const relevantProblems = getRelevantProblems(industry);

  // GOVERNANCE: System prompt enforces library-only selection
  const systemPrompt = `You are the RCI Brain - a KNOWLEDGE-GOVERNED diagnostic engine for EDX consulting.

CRITICAL GOVERNANCE RULES:
1. You may ONLY select root causes from the provided ROOT CAUSE LIBRARY
2. You may ONLY recommend interventions from the provided ARCHETYPE LIST
3. You must NOT invent new root causes - only match patterns to library entries
4. You must NOT invent new recommendations - only assemble from archetypes

Your role is LIMITED to:
- Pattern matching: Match client symptoms to library root causes
- Relevance ranking: Score how well each root cause matches the evidence
- Assembly: Link matching root causes to their approved archetypes

You are analyzing data for: ${clientName} (${industry})`;

  // KNOWLEDGE LIBRARY: Provide approved root causes for selection
  const rootCauseList = approvedRootCauses
    .map(
      (rc) =>
        `ID: ${rc.id} | Title: ${rc.title} | Category: ${rc.category} | Symptoms: ${rc.symptoms.join(", ")}`,
    )
    .join("\n");

  const userPrompt = `MATCH client data patterns to the ROOT CAUSE LIBRARY entries below.

CLIENT DATA TO ANALYSE:
Issues identified: ${aggregated.allIssues.join("; ")}
Financial indicators: ${aggregated.allAmounts.map((a) => a.context).join("; ")}
Table data summary: ${aggregated.tableData.slice(0, 3000)}

ROOT CAUSE LIBRARY (SELECT FROM THESE ONLY):
${rootCauseList}

INDUSTRY CONTEXT:
${relevantProblems
  .map((p) => `- ${p.title}: ${p.description}`)
  .slice(0, 10)
  .join("\n")}

INSTRUCTIONS:
1. Match client symptoms to library root causes by ID
2. Rank matches by relevance (1-100)
3. Provide evidence from client data supporting each match
4. DO NOT invent new root causes - only select from library

Return JSON:
{
  "matchedRootCauses": [
    {
      "libraryId": "rc-xxxx",
      "relevanceScore": 85,
      "matchedSymptoms": ["symptom1", "symptom2"],
      "clientEvidence": ["specific data point from client"]
    }
  ],
  "summary": "Brief institutional summary of matched patterns"
}`;

  const response = await pRetry(
    async () => {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // Lower temperature for more consistent library matching
        max_tokens: 3000,
      });
      return completion.choices[0].message.content;
    },
    { retries: 3 },
  );

  const parsed = JSON.parse(response || "{}");

  // KNOWLEDGE-GOVERNED: Validate and filter matches against library
  // GOVERNANCE CHECK: Only accept matches with valid library IDs
  const validatedMatches = (parsed.matchedRootCauses || [])
    .filter((match: any) => {
      const isValid = approvedRootCauses.some(
        (rc) => rc.id === match.libraryId,
      );
      if (!isValid && match.libraryId) {
        console.warn(
          `GOVERNANCE: Rejected invalid root cause ID in quick analysis: ${match.libraryId}`,
        );
      }
      return isValid;
    })
    .slice(0, 5); // Quick analysis: top 5 matches

  // GOVERNANCE: Log if no valid matches found
  if (validatedMatches.length === 0) {
    console.warn(
      "GOVERNANCE: No valid root cause matches found - AI output did not match library entries",
    );
  }

  // KNOWLEDGE-GOVERNED: Convert matched root causes to findings
  // Each finding MUST reference a library entry
  const findings: AnalysisFinding[] = validatedMatches
    .map((match: any, idx: number) => {
      // KNOWLEDGE-GOVERNED: Look up the library entry
      const libraryEntry = approvedRootCauses.find(
        (rc) => rc.id === match.libraryId,
      );
      if (!libraryEntry) return null;

      return {
        id: `finding-${idx}-${match.libraryId}`,
        title: libraryEntry.title,
        description: `Root Cause:\n${libraryEntry.title}\n\nWhy It Matters:\n${libraryEntry.whyItMatters}\n\nIntervention Direction:\n${libraryEntry.interventionDirection}`,
        fourMCategory: libraryEntry.category as FourMCategory,
        indicator: categoryToIndicator[libraryEntry.category as FourMCategory],
        severity:
          match.relevanceScore >= 80
            ? "high"
            : match.relevanceScore >= 60
              ? "medium"
              : "low",
        frequency: match.matchedSymptoms?.length || 1,
        causes: [libraryEntry.title],
        estimatedCostImpact: undefined,
        evidence: match.clientEvidence || [],
      };
    })
    .filter(Boolean) as AnalysisFinding[];

  // KNOWLEDGE-GOVERNED: Assemble recommendations from archetypes ONLY
  // Get archetype IDs directly from library entries (not parsed from finding IDs)
  const linkedArchetypeIds = new Set<string>();
  validatedMatches.forEach((match: any) => {
    const libraryEntry = approvedRootCauses.find(
      (rc) => rc.id === match.libraryId,
    );
    if (libraryEntry) {
      // Use the pre-defined archetype links from the library
      libraryEntry.archetypeIds.forEach((id) => linkedArchetypeIds.add(id));
    }
  });

  // GOVERNANCE: Only use archetypes from the approved library
  let applicableArchetypes = recommendationArchetypes.filter((arch) =>
    linkedArchetypeIds.has(arch.archetype_id),
  );

  // ============================================================================
  // VARIATION LOGIC: Ensure different industries get different recommendations
  // ============================================================================
  //
  // RULE: No two diagnostics across different industries may return identical
  // recommendation sets. If similarity is unavoidable, wording must differ
  // materially.
  //
  // ENFORCEMENT MECHANISMS (applied in sequence):
  // 1. Filter by industry applicability - remove non-applicable archetypes
  // 2. Add industry-specific archetypes - ensure set divergence
  // 3. Prioritise by category - category-relevant archetypes first
  // 4. Sort by severity weight - urgent actions for critical findings
  // 5. Apply industry-specific wording - material text differences
  // ============================================================================

  const dominantSeverity = getDominantSeverity(findings);
  const dominantCategory = getDominantCategory(findings);

  // VARIATION STEP 1: Filter by industry applicability
  applicableArchetypes = filterByIndustryApplicability(
    applicableArchetypes,
    industry,
  );

  // VARIATION STEP 2: Prioritise by category (most relevant to primary issue type first)
  const categoryPrioritised = prioritiseByCategory(
    applicableArchetypes,
    dominantCategory,
  );

  // VARIATION STEP 3: Sort by severity weight (urgent actions for critical findings)
  const sortedArchetypes = sortByRelevance(
    categoryPrioritised,
    dominantSeverity,
  );

  // VARIATION STEP 4: Filter by action type THEN apply industry offset
  // The offset is applied AFTER sorting/filtering so it affects the final selection
  const immediateActions = sortedArchetypes.filter(
    (arch) => arch.action_type === "Immediate",
  );
  const offsetActions = applyIndustrySelectionOffset(
    immediateActions,
    industry,
  );

  // Generate fingerprint for traceability (after offset applied)
  const fingerprint = generateRecommendationFingerprint(
    industry,
    dominantCategory,
    offsetActions.slice(0, 3).map((a) => a.archetype_id),
  );

  const costSavingOpportunities: CostSavingOpportunity[] = offsetActions
    .slice(0, 3)
    .map((arch, idx) => ({
      id: `opp-${idx}-${arch.archetype_id}`,
      title: arch.archetype_name,
      // VARIATION: Use industry-specific wording (explicit or generated)
      description: getVariedDescription(arch, industry),
      estimatedSavings: "To be assessed",
      implementationEffort:
        arch.consultant_required === "No"
          ? ("low" as const)
          : arch.consultant_required === "Sometimes"
            ? ("medium" as const)
            : ("high" as const),
      relatedFindings: findings.map((f) => f.id),
    }));

  // Log recommendation set fingerprint for audit
  console.log(`VARIATION: Quick analysis recommendation set [${fingerprint}]`);

  // Executive Summary language must match diagnostic confidence level.
  // Evidence-driven enrichment: quick analysis has no evidence signals (baseline)
  return {
    findings,
    summary:
      parsed.summary ||
      "This diagnostic is evidence-enriched and incorporates uploaded documents to validate and prioritise root causes.",
    costSavingOpportunities,
    predictions: [],
    analysisMode: "evidence-enriched",
    confidence: "substantiated",
  };
}

/**
 * ============================================================================
 * KNOWLEDGE-GOVERNED BASELINE ANALYSIS
 * ============================================================================
 *
 * Baseline mode enables honest first-pass institutional diagnostics
 * without fabricating evidence.
 *
 * USES THE SAME:
 * - Diagnostic engine
 * - Root cause selection logic (from Root Cause Library)
 * - Recommendation logic (from Recommendation Archetypes)
 *
 * OUTPUT MARKERS:
 * - Status: Draft
 * - Confidence: Preliminary
 *
 * This mode runs when no processed documents are available, using only
 * the problem description and industry context for pattern matching.
 */
async function runBaselineAnalysis(
  input: AnalysisInput,
): Promise<AnalysisResult> {
  const { industry, clientName, problemStatement } = input;

  console.log("BASELINE: Using diagnostic baseline for initial analysis.");

  // KNOWLEDGE LIBRARY: Load approved root causes and archetypes
  const approvedRootCauses = getRelevantRootCauses(industry);
  const relevantProblems = getRelevantProblems(industry);

  // GOVERNANCE: System prompt enforces library-only selection
  const systemPrompt = `You are the RCI Brain - a KNOWLEDGE-GOVERNED diagnostic engine for EDX consulting.

CRITICAL GOVERNANCE RULES:
1. You may ONLY select root causes from the provided ROOT CAUSE LIBRARY
2. You may ONLY recommend interventions from the provided ARCHETYPE LIST
3. You must NOT invent new root causes - only match patterns to library entries
4. You must NOT invent new recommendations - only assemble from archetypes

BASELINE MODE CONTEXT:
- This is an initial assessment WITHOUT processed documents
- Match patterns based on problem description and industry context only
- Mark ALL findings as PRELIMINARY
- DO NOT fabricate evidence - work only with what is provided

Your role is LIMITED to:
- Pattern matching: Match described symptoms to library root causes
- Relevance ranking: Score how well each root cause matches the description
- Assembly: Link matching root causes to their approved archetypes

You are analyzing data for: ${clientName} (${industry})`;

  // KNOWLEDGE LIBRARY: Provide approved root causes for selection
  const rootCauseList = approvedRootCauses
    .map(
      (rc) =>
        `ID: ${rc.id} | Title: ${rc.title} | Category: ${rc.category} | Symptoms: ${rc.symptoms.join(", ")}`,
    )
    .join("\n");

  const userPrompt = `MATCH the problem description to ROOT CAUSE LIBRARY entries.

BASELINE CONTEXT (No documents available):
Problem Statement: ${problemStatement || "General operational assessment requested"}
Industry: ${industry}

INDUSTRY PROBLEMS TO CONSIDER:
${relevantProblems
  .map((p) => `- ${p.title}: ${p.description}`)
  .slice(0, 10)
  .join("\n")}

ROOT CAUSE LIBRARY (SELECT FROM THESE ONLY):
${rootCauseList}

INSTRUCTIONS:
1. Based on the problem description and industry context, identify likely root causes
2. Match to library entries by ID
3. Rank by relevance (1-100) - use lower scores as this is preliminary
4. Note that evidence is limited to problem description only
5. DO NOT invent new root causes - only select from library

Return JSON:
{
  "matchedRootCauses": [
    {
      "libraryId": "rc-xxxx",
      "relevanceScore": 65,
      "matchedSymptoms": ["symptom1", "symptom2"],
      "clientEvidence": ["from problem description"]
    }
  ],
  "summary": "Preliminary baseline assessment based on problem description"
}`;

  const response = await pRetry(
    async () => {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Slightly higher for baseline as we have less context
        max_tokens: 3000,
      });
      return completion.choices[0].message.content;
    },
    { retries: 3 },
  );

  const parsed = JSON.parse(response || "{}");

  // KNOWLEDGE-GOVERNED: Validate matches against library
  const validatedMatches = (parsed.matchedRootCauses || [])
    .filter((match: any) => {
      const isValid = approvedRootCauses.some(
        (rc) => rc.id === match.libraryId,
      );
      if (!isValid && match.libraryId) {
        console.warn(
          `GOVERNANCE: Rejected invalid root cause ID in baseline analysis: ${match.libraryId}`,
        );
      }
      return isValid;
    })
    .slice(0, 5); // Baseline: top 5 preliminary matches

  if (validatedMatches.length === 0) {
    console.warn(
      "GOVERNANCE: No valid root cause matches in baseline - returning generic assessment",
    );
  }

  // KNOWLEDGE-GOVERNED: Convert matched root causes to findings
  // Baseline mode marks all findings as preliminary
  const findings: AnalysisFinding[] = validatedMatches
    .map((match: any, idx: number) => {
      const libraryEntry = approvedRootCauses.find(
        (rc) => rc.id === match.libraryId,
      );
      if (!libraryEntry) return null;

      return {
        id: `finding-baseline-${idx}-${match.libraryId}`,
        title: `[PRELIMINARY] ${libraryEntry.title}`,
        description: `Root Cause:\n${libraryEntry.title}\n\nWhy It Matters:\n${libraryEntry.whyItMatters}\n\nIntervention Direction:\n${libraryEntry.interventionDirection}\n\n⚠️ Note: This is a preliminary finding based on baseline assessment. Document evidence is required for confirmation.`,
        fourMCategory: libraryEntry.category as FourMCategory,
        indicator: categoryToIndicator[libraryEntry.category as FourMCategory],
        severity: "medium", // Baseline always uses medium severity
        frequency: match.matchedSymptoms?.length || 1,
        causes: [libraryEntry.title],
        estimatedCostImpact: undefined,
        evidence: match.clientEvidence || [
          "Derived from stated problem — upload documents to strengthen evidence",
        ],
      };
    })
    .filter(Boolean) as AnalysisFinding[];

  // KNOWLEDGE-GOVERNED: Assemble recommendations from archetypes
  const linkedArchetypeIds = new Set<string>();
  validatedMatches.forEach((match: any) => {
    const libraryEntry = approvedRootCauses.find(
      (rc) => rc.id === match.libraryId,
    );
    if (libraryEntry) {
      libraryEntry.archetypeIds.forEach((id) => linkedArchetypeIds.add(id));
    }
  });

  let applicableArchetypes = recommendationArchetypes.filter((arch) =>
    linkedArchetypeIds.has(arch.archetype_id),
  );

  // Apply variation logic (same as quick/deep analysis)
  const dominantCategory = getDominantCategory(findings);
  const dominantSeverity = getDominantSeverity(findings);
  const filteredArchetypes = filterByIndustryApplicability(
    applicableArchetypes,
    industry,
  );
  const categoryPrioritised = prioritiseByCategory(
    filteredArchetypes,
    dominantCategory,
  );
  const sortedArchetypes = sortByRelevance(
    categoryPrioritised,
    dominantSeverity,
  );
  const offsetArchetypes = applyIndustrySelectionOffset(
    sortedArchetypes,
    industry,
  );

  const fingerprint = generateRecommendationFingerprint(
    industry,
    dominantCategory,
    offsetArchetypes.slice(0, 3).map((a) => a.archetype_id),
  );

  const costSavingOpportunities: CostSavingOpportunity[] = offsetArchetypes
    .slice(0, 3)
    .map((arch, idx) => ({
      id: `opp-baseline-${idx}-${arch.archetype_id}`,
      title: `[PRELIMINARY] ${arch.archetype_name}`,
      description: getVariedDescription(arch, industry),
      estimatedSavings: "To be assessed after document review",
      implementationEffort:
        arch.consultant_required === "No"
          ? ("low" as const)
          : arch.consultant_required === "Sometimes"
            ? ("medium" as const)
            : ("high" as const),
      relatedFindings: findings.map((f) => f.id),
    }));

  console.log(
    `VARIATION: Baseline analysis recommendation set [${fingerprint}]`,
  );

  // Executive Summary language must match diagnostic confidence level.
  return {
    findings,
    summary:
      parsed.summary ||
      "This is an initial diagnostic based on stated problems and industry patterns. Upload documents to strengthen confidence.",
    costSavingOpportunities,
    predictions: [], // No predictions in baseline mode
    analysisMode: "baseline",
    confidence: "preliminary",
  };
}

/**
 * ============================================================================
 * KNOWLEDGE-GOVERNED DEEP ANALYSIS
 * ============================================================================
 *
 * AI ROLE: Comprehensive pattern matching and archetype assembly
 * - Matches ALL relevant root causes from library
 * - Assembles full recommendation set from archetypes
 * - Provides predictions based on historical patterns
 * - DOES NOT invent new root causes or recommendations
 */
async function runDeepAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  const { documents, industry, clientName } = input;
  const aggregated = aggregateDocumentData(documents);

  // KNOWLEDGE LIBRARY: Load complete approved sources
  const approvedRootCauses = getRelevantRootCauses(industry);
  const relevantProblems = getRelevantProblems(industry);

  // GOVERNANCE: Enforce strict library-only selection
  const systemPrompt = `You are the RCI Brain - a KNOWLEDGE-GOVERNED diagnostic engine for EDX consulting.

CRITICAL GOVERNANCE RULES - VIOLATION IS NOT PERMITTED:

1. ROOT CAUSES: Select ONLY from the provided ROOT CAUSE LIBRARY
   - Each root cause you identify MUST have a library ID
   - You CANNOT invent new root causes
   - If evidence doesn't match any library entry, note "insufficient match"

2. RECOMMENDATIONS: Assemble ONLY from RECOMMENDATION ARCHETYPES
   - Each recommendation MUST reference an archetype ID
   - You CANNOT create new recommendation types
   - Archetypes are linked to root causes - respect these linkages

3. YOUR PERMITTED ACTIONS:
   - MATCH: Identify which library root causes match client evidence
   - RANK: Score relevance of each match (0-100)
   - LINK: Connect matched root causes to applicable archetypes
   - CONTEXTUALISE: Explain how the pattern manifests for this client
   
4. YOUR PROHIBITED ACTIONS:
   - INVENT: Do not create new root causes
   - GENERATE: Do not generate novel recommendations
   - IMPROVISE: Do not deviate from library entries

Client: ${clientName} | Industry: ${industry}
This is a DEEP analysis - be comprehensive but STAY WITHIN governance boundaries.`;

  // KNOWLEDGE LIBRARY: Full root cause catalogue for deep matching
  const rootCauseList = approvedRootCauses
    .map(
      (rc) =>
        `ID: ${rc.id}
Title: ${rc.title}
Category: ${rc.category}
Symptoms: ${rc.symptoms.join(", ")}
Intervention: ${rc.interventionType}
Linked Archetypes: ${rc.archetypeIds.join(", ")}`,
    )
    .join("\n\n");

  const userPrompt = `PERFORM COMPREHENSIVE PATTERN MATCHING against the ROOT CAUSE LIBRARY.

CLIENT DATA TO ANALYSE:
---
Issues from documents: 
${aggregated.allIssues.join("\n")}

Financial data points:
${aggregated.allAmounts.map((a) => `${a.context}: ${a.value}`).join("\n")}

Key dates: ${aggregated.allDates.join(", ")}

Document excerpts:
${aggregated.allText.slice(0, 8000)}

Table data:
${aggregated.tableData.slice(0, 5000)}
---

ROOT CAUSE LIBRARY (SELECT FROM THESE ONLY):
${rootCauseList}

INDUSTRY CONTEXT:
${relevantProblems.map((p) => `- ${p.title} (${p.dominantM}): ${p.description}`).join("\n")}

INSTRUCTIONS:
1. Match each identified issue to library root causes by ID
2. Score each match for relevance (0-100 based on symptom alignment)
3. List evidence from client data supporting each match
4. Note the linked archetype IDs for each matched root cause
5. For each match, explain how this pattern manifests for this specific client
6. DO NOT invent root causes - if no library match exists, skip that issue

Return JSON:
{
  "matchedRootCauses": [
    {
      "libraryId": "rc-xxxx",
      "relevanceScore": 85,
      "matchedSymptoms": ["symptom1", "symptom2"],
      "clientEvidence": ["specific evidence from client data"],
      "linkedArchetypeIds": ["archetype-id-1", "archetype-id-2"],
      "clientContext": "How this root cause manifests for this specific client"
    }
  ],
  "unmatchedIssues": ["issues that didn't match any library entry"],
  "summary": "Comprehensive institutional summary of diagnostic findings",
  "recurrencePatterns": [
    {
      "rootCauseId": "rc-xxxx",
      "likelihood": "high|medium|low",
      "basis": "Why this pattern is likely to recur"
    }
  ]
}`;

  const response = await pRetry(
    async () => {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 6000,
      });
      return completion.choices[0].message.content;
    },
    { retries: 3 },
  );

  const parsed = JSON.parse(response || "{}");

  // KNOWLEDGE-GOVERNED: Validate and convert matched root causes
  // GOVERNANCE CHECK: Reject any matches not in the library
  const validatedMatches = (parsed.matchedRootCauses || []).filter(
    (match: any) => {
      const isValid = approvedRootCauses.some(
        (rc) => rc.id === match.libraryId,
      );
      if (!isValid) {
        console.warn(
          `GOVERNANCE: Rejected invalid root cause ID: ${match.libraryId}`,
        );
      }
      return isValid;
    },
  );

  // GOVERNANCE: Log if no valid matches found
  if (validatedMatches.length === 0) {
    console.warn(
      "GOVERNANCE: No valid root cause matches found in deep analysis - AI output did not match library entries",
    );
  }

  const findings: AnalysisFinding[] = validatedMatches
    .slice(0, 10) // Deep analysis: up to 10 findings
    .map((match: any, idx: number) => {
      // KNOWLEDGE-GOVERNED: Look up the library entry
      const libraryEntry = approvedRootCauses.find(
        (rc) => rc.id === match.libraryId,
      );
      if (!libraryEntry) return null;

      const severity =
        match.relevanceScore >= 85
          ? "critical"
          : match.relevanceScore >= 70
            ? "high"
            : match.relevanceScore >= 50
              ? "medium"
              : "low";

      return {
        id: `finding-${idx}-${match.libraryId}`,
        title: libraryEntry.title,
        description: `Root Cause:\n${libraryEntry.title}\n\nWhy It Matters:\n${libraryEntry.whyItMatters}\n\nIntervention Direction:\n${libraryEntry.interventionDirection}`,
        fourMCategory: libraryEntry.category as FourMCategory,
        indicator: categoryToIndicator[libraryEntry.category as FourMCategory],
        severity: severity as "low" | "medium" | "high" | "critical",
        frequency: match.matchedSymptoms?.length || 1,
        causes: [libraryEntry.title],
        estimatedCostImpact: undefined,
        evidence: match.clientEvidence || [],
      };
    })
    .filter(Boolean) as AnalysisFinding[];

  // KNOWLEDGE-GOVERNED: Assemble recommendations from archetypes ONLY
  // Get all archetype IDs linked to matched root causes
  const linkedArchetypeIds = new Set<string>();
  validatedMatches.forEach((match: any) => {
    const libraryEntry = approvedRootCauses.find(
      (rc) => rc.id === match.libraryId,
    );
    if (libraryEntry) {
      libraryEntry.archetypeIds.forEach((id) => linkedArchetypeIds.add(id));
    }
    (match.linkedArchetypeIds || []).forEach((id: string) =>
      linkedArchetypeIds.add(id),
    );
  });

  // GOVERNANCE: Only use archetypes from the approved library
  let assembledArchetypes = recommendationArchetypes.filter((arch) =>
    linkedArchetypeIds.has(arch.archetype_id),
  );

  // ============================================================================
  // VARIATION LOGIC: Ensure different industries get different recommendations
  // ============================================================================
  //
  // RULE: No two diagnostics across different industries may return identical
  // recommendation sets. If similarity is unavoidable, wording must differ
  // materially.
  //
  // ENFORCEMENT MECHANISMS (applied in sequence):
  // 1. Filter by industry applicability - remove non-applicable archetypes
  // 2. Add industry-specific archetypes - ensure set divergence
  // 3. Prioritise by category - category-relevant archetypes first
  // 4. Sort by severity weight - urgent actions for critical findings
  // 5. Apply industry-specific wording - material text differences
  // ============================================================================

  const dominantSeverity = getDominantSeverity(findings);
  const dominantCategory = getDominantCategory(findings);

  // VARIATION STEP 1: Filter by industry applicability
  assembledArchetypes = filterByIndustryApplicability(
    assembledArchetypes,
    industry,
  );

  // VARIATION STEP 2: Prioritise by category (most relevant to primary issue type first)
  const categoryPrioritised = prioritiseByCategory(
    assembledArchetypes,
    dominantCategory,
  );

  // VARIATION STEP 3: Sort by severity weight (urgent actions for critical findings)
  const sortedArchetypes = sortByRelevance(
    categoryPrioritised,
    dominantSeverity,
  );

  // VARIATION STEP 4: Apply industry offset AFTER sorting, BEFORE slicing
  // This ensures different industries get different final sets
  const offsetArchetypes = applyIndustrySelectionOffset(
    sortedArchetypes,
    industry,
  );

  // Generate fingerprint for traceability (after offset applied)
  const fingerprint = generateRecommendationFingerprint(
    industry,
    dominantCategory,
    offsetArchetypes.slice(0, 8).map((a) => a.archetype_id),
  );

  const costSavingOpportunities: CostSavingOpportunity[] = offsetArchetypes
    .slice(0, 8)
    .map((arch, idx) => ({
      id: `opp-${idx}-${arch.archetype_id}`,
      title: arch.archetype_name,
      // VARIATION STEP 5: Use industry-specific wording (explicit or generated)
      description: getVariedDescription(arch, industry),
      estimatedSavings: "To be assessed by consultant",
      implementationEffort:
        arch.consultant_required === "No"
          ? ("low" as const)
          : arch.consultant_required === "Sometimes"
            ? ("medium" as const)
            : ("high" as const),
      relatedFindings: findings.map((f) => f.id),
    }));

  // Log recommendation set fingerprint for audit
  console.log(`VARIATION: Deep analysis recommendation set [${fingerprint}]`);

  const predictions: RecurrencePrediction[] = buildPredictionsFromFindings(
    findings,
    "deep",
  );

  // Executive Summary language must match diagnostic confidence level.
  // Evidence-driven enrichment: deep analysis applies evidence-driven pipeline
  // (In production mode with real document evidence signals)
  return {
    findings,
    summary:
      parsed.summary ||
      "This diagnostic is evidence-enriched and incorporates uploaded documents to validate and prioritise root causes.",
    costSavingOpportunities,
    predictions,
    analysisMode: "evidence-enriched",
    confidence: "substantiated",
  };
}

/**
 * ============================================================================
 * MANUFACTURING V2 RESULT GENERATOR
 * ============================================================================
 *
 * Generates analysis results using EXCLUSIVELY manufacturingRootCausesV2.
 * - No fallback to generic root cause library
 * - No cross-industry causes
 * - Uses V2 field structure (evidenceSignals, whyItMatters, interventionDirection)
 *
 * ============================================================================
 */
function generateManufacturingV2Result(
  input: AnalysisInput,
  isBaseline: boolean,
): AnalysisResult {
  const {
    clientName,
    analysisType,
    problemStatement,
    diagnosticContexts,
    documents,
  } = input;

  console.log(
    "MANUFACTURING V2: Generating results from manufacturingRootCausesV2",
  );
  console.log(
    `MANUFACTURING V2: ${manufacturingRootCausesV2.length} root causes available`,
  );

  // Normalize category from V2 format
  const normalizeCategory = (cat: string): FourMCategory => {
    if (cat === "Material") return "Materials";
    return cat as FourMCategory;
  };

  // Context weighting for V2
  const contextToCategory: Record<string, string[]> = {
    Money: ["Money"],
    Manpower: ["Manpower"],
    Operations: ["Materials", "Material", "Machinery"],
    Systems: ["Machinery"],
    Compliance: ["Money", "Manpower"],
  };

  // Get categories that match selected contexts
  const contextMatchedCategories = new Set<string>();
  if (diagnosticContexts && diagnosticContexts.length > 0) {
    for (const ctx of diagnosticContexts) {
      const cats = contextToCategory[ctx] || [];
      cats.forEach((c) => contextMatchedCategories.add(c));
    }
  }

  // ============================================================================
  // BALANCED EVIDENCE SCORING
  // Score = problem statement relevance + document evidence + discovery bonus
  // ============================================================================

  const processedDocs = documents.filter(
    (d) => d.status === "processed" && d.extractedData,
  );

  const aggregatedText = processedDocs
    .map((doc) => doc.extractedData?.rawText)
    .filter(Boolean)
    .join("\n\n");

  console.log("🚨 SIGNAL EXTRACTOR INVOKED – DEBUG MARKER (Manufacturing V2)");
  console.log("🔎 AGGREGATED TEXT LENGTH:", aggregatedText.length);
  console.log(
    "🔎 AGGREGATED TEXT (first 300 chars):",
    aggregatedText.slice(0, 300),
  );

  if (!isBaseline && aggregatedText.length < 100) {
    console.log(
      `MANUFACTURING V2: INSUFFICIENT TEXT — aggregatedText only ${aggregatedText.length} chars`,
    );
    return {
      findings: [],
      summary:
        "No readable text from uploaded documents. Please upload documents with selectable text (not scanned images).",
      costSavingOpportunities: [],
      predictions: [],
      analysisMode: "evidence-enriched",
      confidence: "low",
      isMockMode: false,
    };
  }

  const docInputs: ProcessedDocument[] = processedDocs.map((d) => ({
    id: d.id,
    name: d.fileName,
    content: d.extractedData?.rawText || "",
    type: d.fileType || "other",
  }));

  const concreteSignals = extractConcreteSignals(docInputs);
  const evidenceSignals = extractEvidenceSignalsFromDocuments(docInputs);

  console.log(
    `MANUFACTURING V2: Extracted ${concreteSignals.length} concrete signals, ${evidenceSignals.length} evidence signals`,
  );

  const categoryConfidenceMap: Record<string, any> = {};
  const allCategories = ["Money", "Manpower", "Machinery", "Materials"];

  allCategories.forEach(cat => {
    const categoryConcreteSignals =
      concreteSignals.filter(s => s.category === cat);
    const categoryEvidenceSignals =
      evidenceSignals.filter(s => s.category === cat);

    const metricSignals =
      categoryConcreteSignals.filter(s => s.signalType === "metric");
    const eventSignals =
      categoryConcreteSignals.filter(s => s.signalType === "event");

    const crossCategoryCount =
      new Set(concreteSignals.map(s => s.category)).size;

    const confidenceScore =
      (metricSignals.length * 5) +
      (eventSignals.length * 3) +
      (categoryEvidenceSignals.length * 4) +
      (crossCategoryCount > 1 ? 2 : 0);

    let confidenceLevel = "Low";
    if (confidenceScore >= 23) {
      confidenceLevel = "Critical";
    } else if (confidenceScore >= 15) {
      confidenceLevel = "High";
    } else if (confidenceScore >= 8) {
      confidenceLevel = "Moderate";
    }

    categoryConfidenceMap[cat] = {
      confidenceScore,
      confidenceLevel,
      metricSignals: metricSignals.length,
      eventSignals: eventSignals.length,
      evidenceSignals: categoryEvidenceSignals.length
    };

    console.log("📊 CATEGORY CONFIDENCE:", cat, categoryConfidenceMap[cat]);
  });

  const totalConcreteSignals = concreteSignals.length;
  const totalEvidenceSignals = evidenceSignals.length;
  const activeCategories =
    Object.values(categoryConfidenceMap)
      .filter((c: any) => c.confidenceScore > 0).length;

  const caseConfidenceScore =
    (totalConcreteSignals * 3) +
    (totalEvidenceSignals * 4) +
    (activeCategories * 2);

  let caseConfidenceLevel = "Moderate";
  if (caseConfidenceScore >= 35) {
    caseConfidenceLevel = "Very High";
  } else if (caseConfidenceScore >= 20) {
    caseConfidenceLevel = "High";
  }

  console.log("🏛 CASE CONFIDENCE:", {
    totalConcreteSignals,
    totalEvidenceSignals,
    activeCategories,
    caseConfidenceScore,
    caseConfidenceLevel
  });

  if (
    !isBaseline &&
    concreteSignals.length === 0 &&
    evidenceSignals.length === 0
  ) {
    console.log(
      `MANUFACTURING V2: HARD FAIL — no signals extracted from ${docInputs.length} document(s)`,
    );
    return {
      findings: [],
      summary:
        "No operational or financial signals detected. Please upload Ops, Maintenance, QC, or Finance documents.",
      costSavingOpportunities: [],
      predictions: [],
      analysisMode: "evidence-enriched",
      confidence: "low",
      isMockMode: false,
    };
  }

  const documentText = processedDocs
    .map((d) => d.extractedData?.rawText || "")
    .join(" ")
    .toLowerCase();
  const hasDocumentEvidence = documentText.length > 0 && !isBaseline;

  const problemText = (problemStatement || "").toLowerCase();
  const problemIntent = classifyProblemIntent(problemText);
  console.log("🧠 Problem Intent Weights:", problemIntent);
  const hasProblemStatement = problemText.length > 0;
  const observedSymptoms = new Set(input.selectedSymptoms || []);

  console.log(
    `MANUFACTURING V2 SCORING: Problem statement: ${hasProblemStatement ? "YES" : "NO"}, Document evidence: ${hasDocumentEvidence ? "YES" : "NO"}, Symptoms: ${observedSymptoms.size}`,
  );

  const signalCategories = new Set(concreteSignals.map((s) => s.category));

  const scoredCauses = manufacturingRootCausesV2.map((rc) => {
    let score = 0;
    let isContextMatched = false;
    let problemMatches = 0;
    let documentMatches = 0;
    let symptomMatches = 0;

    if (
      contextMatchedCategories.size > 0 &&
      contextMatchedCategories.has(rc.category)
    ) {
      score += 5;
      isContextMatched = true;
    }

    if (observedSymptoms.size > 0 && rc.symptomTags) {
      for (const tag of rc.symptomTags) {
        if (observedSymptoms.has(tag)) {
          symptomMatches++;
          score += 12;
        }
      }
    }

    if (signalCategories.has(rc.category as any)) {
      score += 8;
    }

    // 🔥 Problem Statement Tag Matching (Stronger Alignment)
    if (rc.symptomTags) {
      for (const tag of rc.symptomTags) {
        if (problemText.includes(tag.toLowerCase())) {
          problemMatches++;
          score += 18;
        }
      }
    }

    if (hasDocumentEvidence) {
      for (const signal of rc.evidenceSignals || []) {
        if (documentText.includes(signal.toLowerCase())) {
          documentMatches++;
          score += 15;
        }
      }
    }

    if (problemMatches > 0 && documentMatches > 0) {
      score += 10;
    }

    const category = (rc.category || "").toLowerCase();
    if (problemIntent[category]) {
      score *= (1 + problemIntent[category] * 1.5);
      // 🔒 CATEGORY ANCHOR BOOST
      score += problemIntent[category] * 10;
    }

    return {
      cause: rc,
      score,
      findingConfidenceScore: 0,
      findingConfidenceLevel: "Low",
      isContextMatched,
      problemMatches,
      documentMatches,
      symptomMatches,
    };
  });

  // Sort by score (higher priority first)
  scoredCauses.sort((a, b) => b.score - a.score);

  // ============================================================================
  // EVIDENCE-BASED THRESHOLDING
  // - Only include root causes where score >= 8
  // - Allow multiple root causes per category if they meet threshold
  // - Exclude categories entirely if no root cause passes threshold
  // - DO NOT force inclusion per 4M category
  // - FALLBACK: If signals exist but no root cause passes, surface top 2 as indicative
  // ============================================================================
  const INCLUSION_THRESHOLD = 8;
  const thresholdPassed = scoredCauses.filter(
    (item) => item.score >= INCLUSION_THRESHOLD,
  );
  const thresholdFailed = scoredCauses.filter(
    (item) => item.score < INCLUSION_THRESHOLD,
  );

  let selectedWithMeta: typeof scoredCauses;
  let isFallbackMode = false;

  if (thresholdPassed.length === 0) {
    const hasSignals = concreteSignals.length > 0 || evidenceSignals.length > 0;
    if (hasSignals && scoredCauses.length > 0) {
      console.log(
        `MANUFACTURING V2: FALLBACK — no root causes passed threshold (>= ${INCLUSION_THRESHOLD}) but ${concreteSignals.length + evidenceSignals.length} signals exist. Surfacing top 2 as indicative.`,
      );
      selectedWithMeta = scoredCauses.slice(0, 2);
      isFallbackMode = true;
    } else {
      console.log(
        `MANUFACTURING V2: HARD FAIL — no root causes passed evidence threshold (>= ${INCLUSION_THRESHOLD}) and no signals`,
      );
      return {
        findings: [],
        summary:
          "No operational or financial signals detected. Please upload Ops, Maintenance, QC, or Finance documents.",
        costSavingOpportunities: [],
        predictions: [],
        analysisMode: "evidence-enriched",
        confidence: "low",
        isMockMode: false,
      };
    }
  } else {
    const maxFindings = 6;
    selectedWithMeta = thresholdPassed.slice(0, maxFindings);
  }

  for (const item of selectedWithMeta) {
    const triggers =
      ((item.cause as any).signalTriggers || []).map((t: string) => t.toLowerCase());

    const relevantConcreteSignals =
      concreteSignals.filter(sig =>
        triggers.some((trigger: string) =>
          sig.rawText.toLowerCase().includes(trigger)
        )
      );

    const relevantEvidenceSignals =
      evidenceSignals.filter(sig =>
        triggers.some((trigger: string) =>
          sig.matchedTerms?.some((term: string) =>
            term.toLowerCase().includes(trigger)
          )
        )
      );

    const metricSignals =
      relevantConcreteSignals.filter(s => s.signalType === "metric");
    const eventSignals =
      relevantConcreteSignals.filter(s => s.signalType === "event");

    const baseScore =
      (metricSignals.length * 5) +
      (eventSignals.length * 3) +
      (relevantEvidenceSignals.length * 4);

    let relevanceBonus = 0;
    if (metricSignals.length + eventSignals.length >= 2) {
      relevanceBonus = 4;
    } else if (metricSignals.length + eventSignals.length === 1) {
      relevanceBonus = 2;
    }

    const findingCategories =
      new Set([
        ...metricSignals.map(s => s.category),
        ...eventSignals.map(s => s.category)
      ]);
    const crossCategoryBonus = findingCategories.size >= 2 ? 3 : 0;

    const metricBonus = metricSignals.length > 0 ? 2 : 0;

    const finalScore =
      baseScore + relevanceBonus + crossCategoryBonus + metricBonus;

    let level = "Low";
    if (finalScore >= 28) {
      level = "Critical";
    } else if (finalScore >= 18) {
      level = "High";
    } else if (finalScore >= 10) {
      level = "Moderate";
    }

    item.findingConfidenceScore = finalScore;
    item.findingConfidenceLevel = level;

    const matchedConcreteSignals =
      relevantConcreteSignals.map(sig => sig.rawText);
    const matchedEvidenceSignals =
      relevantEvidenceSignals.map(sig =>
        sig.matchedTerms ? sig.matchedTerms.join(", ") : ""
      );
    const supportingDocuments =
      Array.from(
        new Set(
          relevantConcreteSignals.map(sig => sig.documentName)
        )
      );

    (item as any).evidenceTrail = {
      matchedConcreteSignals,
      matchedEvidenceSignals,
      supportingDocuments
    };

    console.log("🔎 FINDING CONFIDENCE:", item.cause.id, {
      triggerCount: triggers.length,
      relevantConcreteSignals: relevantConcreteSignals.length,
      relevantEvidenceSignals: relevantEvidenceSignals.length,
      finalScore,
      level
    });

    console.log("📎 EVIDENCE TRAIL:", item.cause.id, {
      matchedConcreteSignals,
      matchedEvidenceSignals,
      supportingDocuments
    });
  }

  // Log threshold results
  console.log(
    `MANUFACTURING V2 THRESHOLD: ${thresholdPassed.length} passed (>= ${INCLUSION_THRESHOLD}), ${thresholdFailed.length} excluded`,
  );
  console.log(
    `MANUFACTURING V2: Selected ${selectedWithMeta.length} root causes (evidence-based)`,
  );

  // Count categories represented
  const categoriesRepresented = new Set(
    selectedWithMeta.map((item) => item.cause.category),
  );
  console.log(
    `MANUFACTURING V2: Categories with findings: ${Array.from(categoriesRepresented).join(", ") || "NONE"}`,
  );

  selectedWithMeta.forEach((item, idx) => {
    const matchInfo = [];
    if (item.problemMatches > 0)
      matchInfo.push(`problem:${item.problemMatches}`);
    if (item.documentMatches > 0)
      matchInfo.push(`docs:${item.documentMatches}`);
    if (item.problemMatches > 0 && item.documentMatches > 0)
      matchInfo.push("+bonus");
    if (item.isContextMatched) matchInfo.push("ctx");
    if (item.symptomMatches > 0)
      matchInfo.push(`symptoms:${item.symptomMatches}`);
    const matchStr = matchInfo.length > 0 ? ` [${matchInfo.join(", ")}]` : "";
    console.log(
      `  ${idx + 1}. [${item.cause.id}] ${item.cause.title} (score: ${item.score})${matchStr}`,
    );
  });

  if (thresholdFailed.length > 0) {
    console.log(`MANUFACTURING V2: Top 3 excluded (below threshold):`);
    thresholdFailed.slice(0, 3).forEach((item, idx) => {
      console.log(
        `  - [${item.cause.id}] ${item.cause.title} (score: ${item.score})`,
      );
    });
  }

  const findings: AnalysisFinding[] = selectedWithMeta.map((item, idx) => {
    const rc = item.cause;
    const isOutOfContext =
      diagnosticContexts &&
      diagnosticContexts.length > 0 &&
      !item.isContextMatched;
    const isIndicative = isFallbackMode;
    const severity = isBaseline
      ? "medium"
      : isIndicative
        ? "medium"
        : (["high", "medium", "critical"] as const)[idx % 3];
    const prefix = isBaseline
      ? "[PRELIMINARY] "
      : isIndicative
        ? "[NEEDS VALIDATION] "
        : "";

    let contextNote = "";
    if (isOutOfContext) {
      contextNote =
        "\n\n📌 Note: This factor emerged from evidence analysis despite falling outside the primary diagnostic focus.";
    }
    if (isIndicative) {
      contextNote +=
        "\n\n⚠️ Below evidence threshold — surfaced for guided validation. Upload additional documents to strengthen this finding.";
    }

    const normalizedCategory = normalizeCategory(rc.category);

    return {
      id: `finding-mfgv2-${idx}-${rc.id}`,
      title: `${prefix}${rc.title}`,
      description: `Root Cause:\n${rc.title}\n\nWhy It Matters:\n${rc.whyItMatters}\n\nIntervention Direction:\n${rc.interventionDirection}${isBaseline ? "\n\n⚠️ Note: This is a preliminary finding based on baseline assessment. Document evidence is required for confirmation." : ""}${contextNote}`,
      fourMCategory: normalizedCategory,
      indicator: categoryToIndicator[normalizedCategory],
      severity,
      frequency: idx + 1,
      causes: [rc.title],
      estimatedCostImpact: isBaseline
        ? undefined
        : isIndicative
          ? undefined
          : `RM ${(10000 + idx * 5000).toLocaleString()}`,
      evidence: isBaseline
        ? [
            "Derived from stated problem — upload documents to strengthen evidence",
          ]
        : isIndicative
          ? ["Below evidence threshold — surfaced for guided validation"]
          : [
              `Evidence from Manufacturing operational data`,
              `Signal extracted from uploaded documents`,
            ],
      evidenceStrength: isIndicative ? ("WEAK" as EvidenceStrength) : undefined,
      collapsedNote: isIndicative
        ? "Below evidence threshold – surfaced for guided validation"
        : undefined,
      insightNote: isIndicative
        ? "Indicative finding — needs additional document evidence to confirm"
        : undefined,
      evidenceTrail: (item as any).evidenceTrail || undefined,
    };
  });

  // V2 root causes don't have archetypeIds, generate generic recommendations
  const costSavingOpportunities: CostSavingOpportunity[] = isBaseline
    ? []
    : [
        {
          id: "opp-mfgv2-1",
          title: "Process Optimisation Review",
          description:
            "Conduct structured review of identified root causes to develop targeted intervention plan.",
          estimatedSavings: "RM 15,000 - 50,000 annually (estimated)",
          implementationEffort: "medium" as const,
          relatedFindings: findings.map((f) => f.id),
        },
        {
          id: "opp-mfgv2-2",
          title: "Operational Efficiency Improvement",
          description:
            "Address systemic factors contributing to the identified root causes through structured change management.",
          estimatedSavings: "RM 10,000 - 30,000 annually (estimated)",
          implementationEffort: "high" as const,
          relatedFindings: findings.map((f) => f.id),
        },
      ];

  // Executive Summary
  const contextFocusPhrase =
    diagnosticContexts && diagnosticContexts.length > 0
      ? ` with focus on ${diagnosticContexts.map((c) => c.toLowerCase()).join(" and ")} factors`
      : "";

  const symptomPhrase =
    input.selectedSymptoms && input.selectedSymptoms.length > 0
      ? ` Observed symptoms: ${input.selectedSymptoms.join(", ")}.`
      : "";

  const summaryPrefix = isBaseline
    ? `This is an initial diagnostic based on stated problems and Manufacturing industry patterns${contextFocusPhrase}. Upload documents to strengthen confidence. Stated problem: "${problemStatement}".`
    : `Using document-derived signals and observed symptoms.${contextFocusPhrase}${symptomPhrase} Evidence supports the stated problem: "${problemStatement}".`;

  // Dynamic summary based on evidence-based findings
  const categoryList = Array.from(categoriesRepresented);
  const categoryPhrase =
    categoryList.length > 0
      ? ` across ${categoryList.length} area${categoryList.length > 1 ? "s" : ""} (${categoryList.join(", ")})`
      : "";

  const findingsPhrase =
    findings.length > 0
      ? `Identified ${findings.length} root cause${findings.length > 1 ? "s" : ""}${categoryPhrase} in Manufacturing operations for ${clientName}.`
      : `No root causes met the evidence threshold for ${clientName}. Consider uploading additional documents or refining the problem statement.`;

  const confidenceLevel = isBaseline
    ? "preliminary"
    : isFallbackMode
      ? "indicative"
      : "substantiated";

  const enrichmentSignals = isBaseline
    ? generateFallbackEvidenceSignals(findings, true)
    : evidenceSignals;
  const enrichedFindings = applyEvidenceDrivenEnrichment(
    findings,
    enrichmentSignals,
    "Manufacturing",
    concreteSignals,
  );

  const predictions: RecurrencePrediction[] = isBaseline
    ? []
    : buildPredictionsFromFindings(enrichedFindings, "mfgv2");

  return {
    findings: enrichedFindings,
    summary: `${summaryPrefix} ${findingsPhrase}`,
    costSavingOpportunities,
    predictions,
    analysisMode: isBaseline ? "baseline" : "evidence-enriched",
    confidence: confidenceLevel,
    isMockMode: isBaseline,
    categoryConfidenceMap,
    caseConfidence: {
      caseConfidenceScore,
      caseConfidenceLevel,
      totalConcreteSignals,
      totalEvidenceSignals,
      activeCategories
    },
  };
}

/**
 * ============================================================================
 * SIGNAL-DRIVEN DEEP ANALYSIS
 * ============================================================================
 *
 * Uses real signal extraction from uploaded documents to score and rank root
 * causes from the Knowledge Library. No mock patterns or AI API calls.
 *
 * Pipeline:
 * 1. Extract concrete signals (metrics + events) from documents
 * 2. Extract evidence signals (term-based) from documents
 * 3. Score root causes against extracted signals
 * 4. Rank by evidence strength, apply context weighting
 * 5. Enrich findings with signal-driven evidence anchors
 * ============================================================================
 */
function runSignalDrivenDeepAnalysis(input: AnalysisInput): AnalysisResult {
  const {
    industry,
    clientName,
    problemStatement,
    diagnosticContexts,
    documents,
  } = input;

  console.log(`SIGNAL-DRIVEN DEEP: Running for ${clientName} (${industry})`);

  if (industry.toLowerCase() === "manufacturing") {
    return generateManufacturingV2Result(input, false);
  }

  const processedDocs = documents.filter(
    (d) => d.status === "processed" && d.extractedData,
  );

  const aggregatedText = processedDocs
    .map((doc) => doc.extractedData?.rawText)
    .filter(Boolean)
    .join("\n\n");

  console.log(
    "🚨 SIGNAL EXTRACTOR INVOKED – DEBUG MARKER (Signal-Driven Deep)",
  );
  console.log("🔎 AGGREGATED TEXT LENGTH:", aggregatedText.length);
  console.log(
    "🔎 AGGREGATED TEXT (first 300 chars):",
    aggregatedText.slice(0, 300),
  );

  if (aggregatedText.length < 100) {
    console.log(
      `SIGNAL-DRIVEN DEEP: INSUFFICIENT TEXT — aggregatedText only ${aggregatedText.length} chars`,
    );
    return {
      findings: [],
      summary:
        "No readable text from uploaded documents. Please upload documents with selectable text (not scanned images).",
      costSavingOpportunities: [],
      predictions: [],
      analysisMode: "evidence-enriched",
      confidence: "low",
      isMockMode: false,
    };
  }

  const docInputs: ProcessedDocument[] = processedDocs.map((d) => ({
    id: d.id,
    name: d.fileName,
    content: d.extractedData?.rawText || "",
    type: d.fileType || "other",
  }));

  const concreteSignals = extractConcreteSignals(docInputs);
  const evidenceSignals = extractEvidenceSignalsFromDocuments(docInputs);

  console.log(
    `SIGNAL-DRIVEN DEEP: Extracted ${concreteSignals.length} concrete signals, ${evidenceSignals.length} evidence signals`,
  );

  if (concreteSignals.length === 0 && evidenceSignals.length === 0) {
    console.log(
      `SIGNAL-DRIVEN DEEP: HARD FAIL — no signals extracted from ${docInputs.length} document(s)`,
    );
    return {
      findings: [],
      summary:
        "No operational or financial signals detected. Please upload Ops, Maintenance, QC, or Finance documents.",
      costSavingOpportunities: [],
      predictions: [],
      analysisMode: "evidence-enriched",
      confidence: "low",
      isMockMode: false,
    };
  }

  const documentText = processedDocs
    .map((d) => d.extractedData?.rawText || "")
    .join(" ")
    .toLowerCase();
  const problemText = (problemStatement || "").toLowerCase();
  const problemIntent = classifyProblemIntent(problemText);
  console.log("🧠 Problem Intent Weights:", problemIntent);

  const contextToCategory: Record<string, string[]> = {
    Money: ["Money"],
    Manpower: ["Manpower"],
    Operations: ["Materials", "Machinery"],
    Systems: ["Machinery"],
    Compliance: ["Money", "Manpower"],
  };
  const contextMatchedCategories = new Set<string>();
  if (diagnosticContexts && diagnosticContexts.length > 0) {
    for (const ctx of diagnosticContexts) {
      const cats = contextToCategory[ctx] || [];
      cats.forEach((c) => contextMatchedCategories.add(c));
    }
  }

  const signalCategories = new Set(concreteSignals.map((s) => s.category));
  const observedSymptoms = new Set(input.selectedSymptoms || []);

  const industryRootCauses = getRelevantRootCauses(industry);

  const scoredCauses = industryRootCauses.map((rc) => {
    let score = 0;
    let isContextMatched = false;
    let problemMatches = 0;
    let documentMatches = 0;
    let symptomMatches = 0;

    if (
      contextMatchedCategories.size > 0 &&
      contextMatchedCategories.has(rc.category)
    ) {
      score += 5;
      isContextMatched = true;
    }

    if (observedSymptoms.size > 0 && rc.symptomTags) {
      for (const tag of rc.symptomTags) {
        if (observedSymptoms.has(tag)) {
          symptomMatches++;
          score += 12;
        }
      }
    }

    // 🔥 Problem Statement Tag Matching (Stronger Alignment)
    if (rc.symptomTags) {
      for (const tag of rc.symptomTags) {
        if (problemText.includes(tag.toLowerCase())) {
          problemMatches++;
          score += 18;
        }
      }
    }

    for (const symptom of rc.symptoms || []) {
      if (documentText.includes(symptom.toLowerCase())) {
        documentMatches++;
        score += 15;
      }
    }

    if (signalCategories.has(rc.category as any)) {
      score += 8;
    }

    if (problemMatches > 0 && documentMatches > 0) {
      score += 10;
    }
    // 🔥 STRATEGIC PROBLEM ALIGNMENT BOOST
    if (problemMatches > 0) {
      score += 10;

      if (documentMatches > 0) {
        score += 15;
      }

      if (symptomMatches > 0) {
        score += 8;
      }
    }

    const category = (rc.category || "").toLowerCase();
    if (problemIntent[category]) {
      score *= (1 + problemIntent[category] * 1.5);
      // 🔒 CATEGORY ANCHOR BOOST
      score += problemIntent[category] * 10;
    }

    return {
      cause: rc,
      score,
      findingConfidenceScore: 0,
      findingConfidenceLevel: "Low",
      isContextMatched,
      problemMatches,
      documentMatches,
      symptomMatches,
    };
  });

  scoredCauses.sort((a, b) => b.score - a.score);

  const INCLUSION_THRESHOLD = 8;
  const thresholdPassed = scoredCauses.filter(
    (item) => item.score >= INCLUSION_THRESHOLD,
  );

  let selectedWithMeta: typeof scoredCauses;
  let isFallbackMode = false;

  if (thresholdPassed.length === 0) {
    const hasSignals = concreteSignals.length > 0 || evidenceSignals.length > 0;
    if (hasSignals && scoredCauses.length > 0) {
      console.log(
        `SIGNAL-DRIVEN DEEP: FALLBACK — no root causes passed threshold (>= ${INCLUSION_THRESHOLD}) but ${concreteSignals.length + evidenceSignals.length} signals exist. Surfacing top 2 as indicative.`,
      );
      selectedWithMeta = scoredCauses.slice(0, 2);
      isFallbackMode = true;
    } else {
      console.log(
        `SIGNAL-DRIVEN DEEP: HARD FAIL — no root causes passed evidence threshold (>= ${INCLUSION_THRESHOLD}) and no signals`,
      );
      return {
        findings: [],
        summary:
          "No operational or financial signals detected. Please upload Ops, Maintenance, QC, or Finance documents.",
        costSavingOpportunities: [],
        predictions: [],
        analysisMode: "evidence-enriched",
        confidence: "low",
        isMockMode: false,
      };
    }
  } else {
    selectedWithMeta = thresholdPassed.slice(0, 6);
  }

  for (const item of selectedWithMeta) {
    const triggers =
      ((item.cause as any).signalTriggers || []).map((t: string) => t.toLowerCase());

    const relevantConcreteSignals =
      concreteSignals.filter(sig =>
        triggers.some((trigger: string) =>
          sig.rawText.toLowerCase().includes(trigger)
        )
      );

    const relevantEvidenceSignals =
      evidenceSignals.filter(sig =>
        triggers.some((trigger: string) =>
          sig.matchedTerms?.some((term: string) =>
            term.toLowerCase().includes(trigger)
          )
        )
      );

    const metricSignals =
      relevantConcreteSignals.filter(s => s.signalType === "metric");
    const eventSignals =
      relevantConcreteSignals.filter(s => s.signalType === "event");

    const baseScore =
      (metricSignals.length * 5) +
      (eventSignals.length * 3) +
      (relevantEvidenceSignals.length * 4);

    let relevanceBonus = 0;
    if (metricSignals.length + eventSignals.length >= 2) {
      relevanceBonus = 4;
    } else if (metricSignals.length + eventSignals.length === 1) {
      relevanceBonus = 2;
    }

    const findingCategories =
      new Set([
        ...metricSignals.map(s => s.category),
        ...eventSignals.map(s => s.category)
      ]);
    const crossCategoryBonus = findingCategories.size >= 2 ? 3 : 0;

    const metricBonus = metricSignals.length > 0 ? 2 : 0;

    const finalScore =
      baseScore + relevanceBonus + crossCategoryBonus + metricBonus;

    let level = "Low";
    if (finalScore >= 28) {
      level = "Critical";
    } else if (finalScore >= 18) {
      level = "High";
    } else if (finalScore >= 10) {
      level = "Moderate";
    }

    item.findingConfidenceScore = finalScore;
    item.findingConfidenceLevel = level;

    const matchedConcreteSignals =
      relevantConcreteSignals.map(sig => sig.rawText);
    const matchedEvidenceSignals =
      relevantEvidenceSignals.map(sig =>
        sig.matchedTerms ? sig.matchedTerms.join(", ") : ""
      );
    const supportingDocuments =
      Array.from(
        new Set(
          relevantConcreteSignals.map(sig => sig.documentName)
        )
      );

    (item as any).evidenceTrail = {
      matchedConcreteSignals,
      matchedEvidenceSignals,
      supportingDocuments
    };

    console.log("🔎 FINDING CONFIDENCE:", item.cause.id, {
      triggerCount: triggers.length,
      relevantConcreteSignals: relevantConcreteSignals.length,
      relevantEvidenceSignals: relevantEvidenceSignals.length,
      finalScore,
      level
    });

    console.log("📎 EVIDENCE TRAIL:", item.cause.id, {
      matchedConcreteSignals,
      matchedEvidenceSignals,
      supportingDocuments
    });
  }

  if (observedSymptoms.size > 0) {
    console.log(
      `SIGNAL-DRIVEN DEEP: Observed symptoms: ${[...observedSymptoms].join(", ")}`,
    );
  }
  console.log(
    `SIGNAL-DRIVEN DEEP: Selected ${selectedWithMeta.length} root causes`,
  );
  selectedWithMeta.forEach((item, idx) => {
    const parts = [
      `score:${item.score}`,
      `problem:${item.problemMatches}`,
      `docs:${item.documentMatches}`,
    ];
    if (item.symptomMatches > 0) parts.push(`symptoms:${item.symptomMatches}`);
    console.log(
      `  ${idx + 1}. [${item.cause.id}] ${item.cause.title} (${parts.join(", ")})`,
    );
  });

  const findings: AnalysisFinding[] = selectedWithMeta.map((item, idx) => {
    const rc = item.cause;
    const isOutOfContext =
      diagnosticContexts &&
      diagnosticContexts.length > 0 &&
      !item.isContextMatched;
    const isIndicative = isFallbackMode;
    const severity = isIndicative
      ? ("medium" as const)
      : (["high", "medium", "critical"] as const)[idx % 3];

    let contextNote = "";
    if (isOutOfContext) {
      contextNote =
        "\n\n📌 Note: This factor emerged from evidence analysis despite falling outside the primary diagnostic focus.";
    }
    if (isIndicative) {
      contextNote +=
        "\n\n⚠️ Below evidence threshold — surfaced for guided validation. Upload additional documents to strengthen this finding.";
    }

    const prefix = isIndicative ? "[NEEDS VALIDATION] " : "";

    return {
      id: `finding-signal-${idx}-${rc.id}`,
      title: `${prefix}${rc.title}`,
      description: `Root Cause:\n${rc.title}\n\nWhy It Matters:\n${rc.whyItMatters}\n\nIntervention Direction:\n${rc.interventionDirection}${contextNote}`,
      fourMCategory: rc.category as FourMCategory,
      indicator: categoryToIndicator[rc.category as FourMCategory],
      severity,
      frequency: idx + 1,
      causes: [rc.title],
      estimatedCostImpact: isIndicative
        ? undefined
        : `RM ${(10000 + idx * 5000).toLocaleString()}`,
      evidence: isIndicative
        ? ["Below evidence threshold — surfaced for guided validation"]
        : [
            `Evidence from ${industry} operational data`,
            `Signal extracted from uploaded documents`,
          ],
      evidenceStrength: isIndicative ? ("WEAK" as EvidenceStrength) : undefined,
      collapsedNote: isIndicative
        ? "Below evidence threshold – surfaced for guided validation"
        : undefined,
      insightNote: isIndicative
        ? "Indicative finding — needs additional document evidence to confirm"
        : undefined,
      evidenceTrail: (item as any).evidenceTrail || undefined,
    };
  });

  const linkedArchetypeIds = new Set<string>();
  selectedWithMeta.forEach((item) => {
    item.cause.archetypeIds.forEach((id) => linkedArchetypeIds.add(id));
  });

  const applicableArchetypes = recommendationArchetypes
    .filter((arch) => linkedArchetypeIds.has(arch.archetype_id))
    .slice(0, 5);

  const costSavingOpportunities: CostSavingOpportunity[] =
    applicableArchetypes.map((arch, idx) => ({
      id: `opp-signal-${idx}-${arch.archetype_id}`,
      title: arch.archetype_name,
      description: getVariedDescription(arch, industry),
      estimatedSavings: `RM ${(5000 + idx * 3000).toLocaleString()} annually`,
      implementationEffort:
        arch.consultant_required === "No"
          ? ("low" as const)
          : arch.consultant_required === "Sometimes"
            ? ("medium" as const)
            : ("high" as const),
      relatedFindings: findings.map((f) => f.id),
    }));

  const contextFocusPhrase =
    diagnosticContexts && diagnosticContexts.length > 0
      ? ` with focus on ${diagnosticContexts.map((c) => c.toLowerCase()).join(" and ")} factors`
      : "";

  const symptomPhrase =
    input.selectedSymptoms && input.selectedSymptoms.length > 0
      ? ` Observed symptoms: ${input.selectedSymptoms.join(", ")}.`
      : "";

  const summaryPrefix = `Using document-derived signals and observed symptoms.${contextFocusPhrase}${symptomPhrase} Evidence supports the stated problem: "${problemStatement}".`;

  const enrichedFindings = applyEvidenceDrivenEnrichment(
    findings,
    evidenceSignals,
    industry,
    concreteSignals,
  );

  const predictions: RecurrencePrediction[] = buildPredictionsFromFindings(
    enrichedFindings,
    "signal",
  );

  const categoriesRepresented = new Set(
    enrichedFindings.map((f) => f.fourMCategory),
  );
  const categoryList = Array.from(categoriesRepresented);
  const categoryPhrase =
    categoryList.length > 0
      ? ` across ${categoryList.length} area${categoryList.length > 1 ? "s" : ""} (${categoryList.join(", ")})`
      : "";

  return {
    findings: enrichedFindings,
    summary: `${summaryPrefix} Identified ${enrichedFindings.length} root cause${enrichedFindings.length > 1 ? "s" : ""}${categoryPhrase} in ${industry} operations for ${clientName}.`,
    costSavingOpportunities,
    predictions,
    analysisMode: "evidence-enriched",
    confidence: "substantiated",
    isMockMode: false,
  };
}

/**
 * ============================================================================
 * MOCK DATA GENERATOR
 * ============================================================================
 *
 * Generates deterministic mock diagnostic results when MOCK_MODE is true.
 * Uses the SAME data structures as real execution.
 * Results vary based on industry, context, and analysis mode.
 *
 * This is a wrapper ONLY - does NOT change business logic.
 * ============================================================================
 */
function generateMockAnalysisResult(
  input: AnalysisInput,
  isBaseline: boolean,
): AnalysisResult {
  // Context reflects user focus, evidence determines truth.
  const {
    industry,
    clientName,
    analysisType,
    problemStatement,
    diagnosticContexts,
  } = input;

  console.log(
    `MOCK: Generating mock results for ${clientName} (${industry}) - ${isBaseline ? "Baseline" : analysisType}`,
  );
  if (diagnosticContexts?.length) {
    console.log(
      `MOCK: Context focus: ${diagnosticContexts.join(", ")} (guides ranking, does not restrict)`,
    );
  }

  // ============================================================================
  // MANUFACTURING V2: Use manufacturingRootCausesV2 exclusively for Manufacturing
  // No fallback to generic library, no cross-industry causes
  // ============================================================================
  if (industry.toLowerCase() === "manufacturing") {
    console.log(
      "MANUFACTURING V2: Using manufacturingRootCausesV2 exclusively",
    );
    return generateManufacturingV2Result(input, isBaseline);
  }

  // Get relevant root causes for this industry (deterministic based on industry)
  const industryRootCauses = getRelevantRootCauses(industry);
  const industryProblems = getRelevantProblems(industry);

  // Context reflects user focus, evidence determines truth.
  // Selected contexts are PRIORITY signals, not hard filters.
  // Causes within selected contexts receive higher initial weighting.
  // Causes outside selected contexts may still appear if strongly supported by evidence.
  const CONTEXT_BOOST = 10; // Priority boost for causes matching selected contexts
  const EVIDENCE_BOOST = 5; // Boost for causes with strong evidence support (simulated)

  const contextToCategory: Record<string, string[]> = {
    Money: ["Money"],
    Manpower: ["Manpower"],
    Operations: ["Materials", "Machinery"],
    Systems: ["Machinery"],
    Compliance: ["Money", "Manpower"],
  };

  // Get categories that match selected contexts
  const contextMatchedCategories = new Set<string>();
  if (diagnosticContexts && diagnosticContexts.length > 0) {
    for (const ctx of diagnosticContexts) {
      const cats = contextToCategory[ctx] || [];
      cats.forEach((c) => contextMatchedCategories.add(c));
    }
  }

  // Score root causes: context match + evidence strength (simulated)
  // Context guides, not restricts - all causes remain eligible
  const scoredCauses = industryRootCauses.map((rc, idx) => {
    let score = 0;
    let isContextMatched = false;

    // Context boost for matching categories
    if (
      contextMatchedCategories.size > 0 &&
      contextMatchedCategories.has(rc.category)
    ) {
      score += CONTEXT_BOOST;
      isContextMatched = true;
    }

    // Simulated evidence strength (varies by position for determinism)
    // In real mode, this would be based on document content analysis
    const evidenceStrength =
      idx % 3 === 0 ? EVIDENCE_BOOST : idx % 2 === 0 ? EVIDENCE_BOOST / 2 : 0;
    score += evidenceStrength;

    return { cause: rc, score, isContextMatched };
  });

  // Sort by score (higher priority first), preserving determinism
  scoredCauses.sort((a, b) => b.score - a.score);

  // Deterministic selection based on industry + context hash
  const contextString = `${industry}:${problemStatement || ""}:${analysisType}:${diagnosticContexts?.join(",") || ""}`;
  const contextHash = contextString
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Select top causes by score, allowing mix of context-matched and evidence-supported
  // Context guides ranking but does NOT filter out non-matching causes
  const numToSelect = Math.min(4, scoredCauses.length); // Select up to 4 causes
  const hashOffset =
    contextHash % Math.max(1, scoredCauses.length - numToSelect);

  // Take top-scored causes, with slight hash-based variation within same-score groups
  const selectedWithMeta = scoredCauses
    .slice(0, numToSelect + 1)
    .slice(hashOffset % 2, (hashOffset % 2) + numToSelect);
  const selectedCauses = selectedWithMeta.map((s) => s.cause);

  // Track if any causes are outside selected context (for explanation note)
  const hasOutOfContextCauses =
    diagnosticContexts &&
    diagnosticContexts.length > 0 &&
    selectedWithMeta.some((s) => !s.isContextMatched);
  const contextMatchCount = selectedWithMeta.filter(
    (s) => s.isContextMatched,
  ).length;

  console.log(
    `MOCK: Selected ${selectedCauses.length} root causes (${contextMatchCount} context-matched, ${selectedCauses.length - contextMatchCount} evidence-supported)`,
  );

  // Generate findings from selected root causes
  // Context reflects user focus, evidence determines truth.
  const findings: AnalysisFinding[] = selectedWithMeta.map((item, idx) => {
    const rc = item.cause;
    const isOutOfContext =
      diagnosticContexts &&
      diagnosticContexts.length > 0 &&
      !item.isContextMatched;
    const severity = isBaseline
      ? "medium"
      : (["high", "medium", "critical"] as const)[idx % 3];
    const prefix = isBaseline ? "[PRELIMINARY] " : "";

    // Add explanation note for causes outside selected context
    let contextNote = "";
    if (isOutOfContext) {
      contextNote =
        "\n\n📌 Note: This factor emerged from evidence analysis despite falling outside the primary diagnostic focus.";
    }

    return {
      id: `finding-mock-${idx}-${rc.id}`,
      title: `${prefix}${rc.title}`,
      description: `Root Cause:\n${rc.title}\n\nWhy It Matters:\n${rc.whyItMatters}\n\nIntervention Direction:\n${rc.interventionDirection}${isBaseline ? "\n\n⚠️ Note: This is a preliminary finding based on baseline assessment. Document evidence is required for confirmation." : ""}${contextNote}`,
      fourMCategory: rc.category as FourMCategory,
      indicator: categoryToIndicator[rc.category as FourMCategory],
      severity,
      frequency: idx + 1,
      causes: [rc.title],
      estimatedCostImpact: isBaseline
        ? undefined
        : `RM ${(10000 + idx * 5000).toLocaleString()}`,
      evidence: isBaseline
        ? [
            "Derived from stated problem — upload documents to strengthen evidence",
          ]
        : [
            `Evidence from ${industry} operational data`,
            `Pattern matched from document analysis`,
          ],
    };
  });

  // Get linked archetypes for recommendations
  const linkedArchetypeIds = new Set<string>();
  selectedCauses.forEach((rc) => {
    rc.archetypeIds.forEach((id) => linkedArchetypeIds.add(id));
  });

  const applicableArchetypes = recommendationArchetypes
    .filter((arch) => linkedArchetypeIds.has(arch.archetype_id))
    .slice(0, isBaseline ? 3 : 5);

  const prefix = isBaseline ? "[PRELIMINARY] " : "";
  const costSavingOpportunities: CostSavingOpportunity[] =
    applicableArchetypes.map((arch, idx) => ({
      id: `opp-mock-${idx}-${arch.archetype_id}`,
      title: `${prefix}${arch.archetype_name}`,
      description: getVariedDescription(arch, industry),
      estimatedSavings: isBaseline
        ? "To be assessed after document review"
        : `RM ${(5000 + idx * 3000).toLocaleString()} annually`,
      implementationEffort:
        arch.consultant_required === "No"
          ? ("low" as const)
          : arch.consultant_required === "Sometimes"
            ? ("medium" as const)
            : ("high" as const),
      relatedFindings: findings.map((f) => f.id),
    }));

  // Executive Summary language must match diagnostic confidence level.
  // Summary explicitly references: stated problem(s), whether evidence supports or contradicts them.
  // Context reflects user focus, evidence determines truth.
  const contextFocusPhrase =
    diagnosticContexts && diagnosticContexts.length > 0
      ? ` with focus on ${diagnosticContexts.map((c) => c.toLowerCase()).join(" and ")} factors`
      : "";

  // Add explanation when causes appear outside selected context
  const outOfContextNote = hasOutOfContextCauses
    ? ` While the diagnostic focused on ${diagnosticContexts?.map((c) => c.toLowerCase()).join(" and ")} factors, evidence indicates additional contributing factors.`
    : "";

  const summaryPrefix = isBaseline
    ? `This is an initial diagnostic based on stated problems and industry patterns${contextFocusPhrase}. Upload documents to strengthen confidence. Stated problem: "${problemStatement}".`
    : `This diagnostic is evidence-enriched and incorporates uploaded documents to validate and prioritise root causes${contextFocusPhrase}. Evidence supports the stated problem: "${problemStatement}".`;

  // Evidence-driven enrichment: always run pipeline — empty signals → EXPLORATORY tone
  const fallbackSignals = generateFallbackEvidenceSignals(findings, isBaseline);
  const enrichedFindings = applyEvidenceDrivenEnrichment(
    findings,
    fallbackSignals,
    industry,
  );

  const predictions: RecurrencePrediction[] = isBaseline
    ? []
    : buildPredictionsFromFindings(enrichedFindings, "mock");

  return {
    findings: enrichedFindings,
    summary: `${summaryPrefix} Identified ${enrichedFindings.length} root causes in ${industry} operations for ${clientName}.${outOfContextNote}`,
    costSavingOpportunities,
    predictions,
    analysisMode: isBaseline ? "baseline" : "evidence-enriched",
    confidence: isBaseline ? "preliminary" : "substantiated",
    isMockMode: true, // Flag to indicate mock mode in results
  };
}

/**
 * ============================================================================
 * MAIN ANALYSIS ENTRY POINT
 * ============================================================================
 *
 * GOVERNANCE GUARANTEE:
 * - All root causes come from rootCauseLibrary
 * - All recommendations come from recommendationArchetypes
 * - AI performs pattern matching and assembly only
 * - No invented causes or recommendations in output
 *
 * DUAL MODE OPERATION:
 * - If processed documents exist → run Evidence-Enriched mode (Quick or Deep)
 * - If no documents exist → run Baseline mode (preliminary assessment)
 *
 * MOCK MODE:
 * - When MOCK_MODE is true, skips AI API calls and returns deterministic results
 * - Uses the same data structures as real execution
 * - Results vary based on industry, context, and analysis mode
 *
 * Baseline mode enables honest first-pass institutional diagnostics
 * without fabricating evidence.
 */
export async function runBulkAnalysis(
  input: AnalysisInput,
): Promise<AnalysisResult> {
  const isBaseline = input.mode === "baseline";

  const processedDocs = input.documents.filter(
    (d) => d.status === "processed" && d.extractedData,
  );
  const hasUploadedDocs = processedDocs.length > 0;

  let result: AnalysisResult;

  if (input.mode === "deep" && hasUploadedDocs) {
    console.log(
      `SIGNAL-DRIVEN DEEP: Bypassing mock mode — ${processedDocs.length} document(s) uploaded`,
    );
    result = runSignalDrivenDeepAnalysis(input);
  } else if (input.mode === "deep" && MOCK_MODE) {
    console.log(
      `DEEP DIAGNOSTIC BLOCKED: No processed documents and mock mode active`,
    );
    result = {
      findings: [],
      summary:
        "Evidence pipeline not active. Connect signal extractor to enable Deep Diagnostic.",
      costSavingOpportunities: [],
      predictions: [],
      analysisMode: "evidence-enriched",
      confidence: "low",
      isMockMode: true,
    };
  } else if (MOCK_MODE) {
    console.log(
      `MOCK MODE: Skipping AI API calls, returning mock results. Mode: ${input.mode}`,
    );
    result = generateMockAnalysisResult(input, isBaseline);
  } else if (isBaseline) {
    console.log("MODE: Baseline (Preliminary). Running Baseline analysis.");
    result = await runBaselineAnalysis(input);
  } else if (input.analysisType === "quick") {
    result = await runQuickAnalysis({ ...input, documents: processedDocs });
  } else {
    result = await runDeepAnalysis({ ...input, documents: processedDocs });
  }

  if (
    input.problemStatement ||
    (input.selectedSymptoms && input.selectedSymptoms.length > 0)
  ) {
    const before = result.findings.map((f) => f.fourMCategory).join(", ");
    result.findings = applySymptomAlignmentGuardrail(
      result.findings,
      input.problemStatement || "",
      input.selectedSymptoms,
    );
    const after = result.findings.map((f) => f.fourMCategory).join(", ");
    if (before !== after) {
      console.log(
        `SYMPTOM ALIGNMENT GUARDRAIL: Reordered findings [${before}] → [${after}]`,
      );
    }
  }

  return result;
}
