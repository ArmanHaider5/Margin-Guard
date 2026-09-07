/**
 * ============================================================================
 * DIAGNOSTIC COMPOSER - RULE-BASED NARRATIVE SYNTHESIS
 * ============================================================================
 * 
 * Transforms selected root causes into a coherent diagnostic narrative.
 * Uses rule-based templated composition only - NO AI-generated text.
 * 
 * COMPOSITION PRINCIPLES:
 * 1. Identify 1-2 dominant root causes (highest confidence across categories)
 * 2. Treat remaining causes as contributing factors
 * 3. Detect context shifts (when dominant category differs from user selection)
 * 4. Apply mode-specific language (quick = tentative, deep = definitive)
 * 
 * ============================================================================
 */

import type { RootCauseSelection, SelectedRootCause, FourMCategory, PrimaryContext } from "./root-cause-library";
import type { EvidenceSignal, CategorisedExtractedSignal } from "./evidence-signals";

export type AnalysisMode = "quick" | "deep";

// Evidence anchor for linking findings to document-derived signals
export interface DiagnosticEvidenceAnchor {
  documentName: string;
  signal: string;
  interpretation: string;
}

export interface DiagnosticFinding {
  id: string;
  title: string;
  category: FourMCategory;
  whyItMatters: string;
  interventionDirection: string;
  isDominant: boolean;
  evidenceNote?: string;
  // Evidence-driven fields (optional for backward compatibility)
  evidenceAnchors?: DiagnosticEvidenceAnchor[];
  evidenceStrength?: "WEAK" | "MODERATE" | "STRONG";
  narrativeTone?: "EXPLORATORY" | "DIAGNOSTIC" | "CONCLUSIVE";
  collapsedNote?: string;
  // Signal-driven impact and validation (vNext)
  impactObserved?: string[];
  whatToValidateNext?: string[];
  evidenceLedTitle?: string;
  insightNote?: string;
}

export interface InterventionTheme {
  theme: string;
  description: string;
  relatedCauseIds: string[];
}

export interface DiagnosticReport {
  executiveSummary: string;
  primaryFindings: DiagnosticFinding[];
  secondaryFindings: DiagnosticFinding[];
  interventionThemes: InterventionTheme[];
  preventionFocus: string[];
  contextShiftNote: string | null;
  analysisMode: AnalysisMode;
  documentsBacked: boolean;
}

export interface ComposeDiagnosticInput {
  analysisMode: AnalysisMode;
  selectedRootCauses: RootCauseSelection;
  industry: string;
  selectedContext?: PrimaryContext;
  documentsPresent: boolean;
  evidenceSignals?: EvidenceSignal[];
  concreteSignals?: CategorisedExtractedSignal[];
}

/**
 * Map 4M categories to primary context areas for context shift detection.
 */
function categoryToContext(category: FourMCategory): PrimaryContext {
  switch (category) {
    case "Money": return "Money";
    case "Manpower": return "People";
    case "Materials": return "Supply";
    case "Machinery": return "Systems";
    default: return "Process";
  }
}

/**
 * Get industry-specific language for templates.
 */
function getIndustryTerms(industry: string): { flowTerm: string; issueTerm: string; impactTerm: string } {
  const lower = (industry || "").toLowerCase();
  if (lower.includes("manufacturing") || lower.includes("construction") || lower.includes("logistics")) {
    return { flowTerm: "operational flow", issueTerm: "bottlenecks", impactTerm: "throughput delays" };
  }
  if (lower.includes("healthcare") || lower.includes("hospital")) {
    return { flowTerm: "service delivery", issueTerm: "escalation points", impactTerm: "patient wait times" };
  }
  return { flowTerm: "business operations", issueTerm: "friction points", impactTerm: "coordination gaps" };
}

/**
 * Identify intervention themes from root causes.
 * Groups causes by common intervention patterns.
 */
function extractInterventionThemes(causes: SelectedRootCause[]): InterventionTheme[] {
  const themes: InterventionTheme[] = [];
  
  const processRelated = causes.filter(c => 
    c.interventionDirection?.toLowerCase().includes("process") ||
    c.interventionDirection?.toLowerCase().includes("workflow") ||
    c.interventionDirection?.toLowerCase().includes("procedure")
  );
  if (processRelated.length > 0) {
    themes.push({
      theme: "Process Standardisation",
      description: "Establish clear procedures and workflows to reduce variation.",
      relatedCauseIds: processRelated.map(c => c.id)
    });
  }
  
  const trainingRelated = causes.filter(c =>
    c.interventionDirection?.toLowerCase().includes("train") ||
    c.interventionDirection?.toLowerCase().includes("skill") ||
    c.interventionDirection?.toLowerCase().includes("competenc")
  );
  if (trainingRelated.length > 0) {
    themes.push({
      theme: "Capability Building",
      description: "Strengthen team skills and knowledge to address root causes.",
      relatedCauseIds: trainingRelated.map(c => c.id)
    });
  }
  
  const systemRelated = causes.filter(c =>
    c.interventionDirection?.toLowerCase().includes("system") ||
    c.interventionDirection?.toLowerCase().includes("equipment") ||
    c.interventionDirection?.toLowerCase().includes("technology") ||
    c.interventionDirection?.toLowerCase().includes("tool")
  );
  if (systemRelated.length > 0) {
    themes.push({
      theme: "Systems & Equipment",
      description: "Address technology, equipment, or infrastructure gaps.",
      relatedCauseIds: systemRelated.map(c => c.id)
    });
  }
  
  const controlRelated = causes.filter(c =>
    c.interventionDirection?.toLowerCase().includes("control") ||
    c.interventionDirection?.toLowerCase().includes("monitor") ||
    c.interventionDirection?.toLowerCase().includes("tracking") ||
    c.interventionDirection?.toLowerCase().includes("measure")
  );
  if (controlRelated.length > 0) {
    themes.push({
      theme: "Monitoring & Control",
      description: "Implement tracking and feedback mechanisms for sustained improvement.",
      relatedCauseIds: controlRelated.map(c => c.id)
    });
  }
  
  return themes;
}

/**
 * Extract prevention focus areas from root causes.
 */
function extractPreventionFocus(causes: SelectedRootCause[], industry: string): string[] {
  const terms = getIndustryTerms(industry);
  const focus: string[] = [];
  
  const hasMoneyIssues = causes.some(c => c.category === "Money");
  const hasManpowerIssues = causes.some(c => c.category === "Manpower");
  const hasMaterialIssues = causes.some(c => c.category === "Materials");
  const hasMachineryIssues = causes.some(c => c.category === "Machinery");
  
  if (hasMoneyIssues) {
    focus.push("Financial controls and cash flow monitoring");
  }
  if (hasManpowerIssues) {
    focus.push("Staff development and clear accountability structures");
  }
  if (hasMaterialIssues) {
    focus.push("Supply chain visibility and inventory management");
  }
  if (hasMachineryIssues) {
    focus.push("Preventive maintenance and equipment lifecycle planning");
  }
  
  if (focus.length === 0) {
    focus.push(`Regular review of ${terms.flowTerm} to catch emerging issues early`);
  }
  
  return focus;
}

/**
 * Get category-specific evidence alignment phrase for executive summary.
 * Maps 4M categories to professional language about document validation.
 */
function getCategoryAlignmentPhrase(category: FourMCategory): string {
  switch (category) {
    case "Money":
      return "Documented cash flow and financial records reinforce the primary financial root cause identified.";
    case "Manpower":
      return "Workforce-related records reinforce the primary staffing and capability root cause identified.";
    case "Materials":
      return "Supply chain and inventory records reinforce the primary materials root cause identified.";
    case "Machinery":
      return "Equipment and systems records reinforce the primary operational infrastructure root cause identified.";
    default:
      return "Document review reinforces the primary root cause identified.";
  }
}

/**
 * Check if there's a strong evidence signal matching the dominant category.
 */
function hasStrongEvidenceForCategory(
  category: FourMCategory | null,
  evidenceSignals: EvidenceSignal[] | undefined
): boolean {
  if (!category || !evidenceSignals || evidenceSignals.length === 0) return false;
  return evidenceSignals.some(
    signal => signal.category === category && signal.strength === "strong"
  );
}

/**
 * Generate mode-specific executive summary using rule-based templates.
 * 
 * QUICK ANALYSIS: Framed as initial diagnostic, pattern-based language
 * DEEP ANALYSIS: Evidence-backed language, document validation, definitive tone
 * 
 * Evidence Signal Integration (Deep Mode only):
 * - If evidenceSignals present: Add document validation sentence
 * - If dominant category has strong evidence alignment: Add alignment phrase
 */
function composeExecutiveSummary(
  input: ComposeDiagnosticInput,
  dominantCauses: SelectedRootCause[],
  allCauses: SelectedRootCause[],
  contextShift: boolean,
  dominantCategory: FourMCategory | null
): string {
  const { analysisMode, industry, selectedContext, documentsPresent, evidenceSignals } = input;
  const terms = getIndustryTerms(industry);
  const isDeep = analysisMode === "deep";
  
  const totalCauses = allCauses.length;
  const dominantCount = dominantCauses.length;
  const dominantTitles = dominantCauses.slice(0, 2).map(c => `"${c.title}"`).join(" and ");
  
  let summary = "";
  
  // Deep Analysis: Always use definitive, evidence-backed language
  // Quick Analysis: Use tentative, pattern-based language
  const hasEvidenceSignals = evidenceSignals && evidenceSignals.length > 0;
  
  if (isDeep) {
    // Deep mode uses definitive language
    // Only reference "uploaded documents" if evidence signals were actually extracted
    const evidencePhrase = hasEvidenceSignals 
      ? `Based on review of uploaded documents and operational data` 
      : documentsPresent
        ? `Based on comprehensive diagnostic analysis`
        : `Based on comprehensive diagnostic analysis`;
    
    summary = `${evidencePhrase}, this diagnostic has identified ${totalCauses} root cause${totalCauses !== 1 ? "s" : ""} affecting ${terms.flowTerm} in your ${industry || "organisation"}. `;
    
    if (dominantCount > 0) {
      summary += `The primary issue${dominantCount > 1 ? "s" : ""} — ${dominantTitles} — ${dominantCount > 1 ? "represent" : "represents"} the most significant contributor${dominantCount > 1 ? "s" : ""} to current ${terms.impactTerm}. `;
    }
    
    if (contextShift && selectedContext && dominantCategory) {
      summary += `While the diagnostic focus was on ${selectedContext}, the evidence indicates that ${dominantCategory}-related factors are the primary drivers. This finding warrants attention. `;
    }
    
    // Evidence signal integration for Deep Analysis
    if (hasEvidenceSignals) {
      // Add document validation sentence
      summary += `Findings are supported by review of operational and financial records. `;
      
      // If dominant category aligns with strong evidence, add alignment phrase
      if (hasStrongEvidenceForCategory(dominantCategory, evidenceSignals)) {
        summary += `${getCategoryAlignmentPhrase(dominantCategory!)} `;
      }
    }
    
    const isManufacturing = (industry || "").toLowerCase().includes("manufacturing");
    const allCategories = new Set(allCauses.map(c => c.category));
    if (isManufacturing && allCategories.size === 1 && allCategories.has("Money")) {
      summary += `Operational root causes may be under-detected. Consider validating Ops/Maintenance signals. `;
    }

    summary += `The findings support targeted intervention to address these root causes.`;
  } else {
    // Quick mode uses tentative, pattern-based language
    // NO mention of documents or evidence signals
    summary = `This initial diagnostic, based on stated issues and ${industry || "industry"} patterns, indicates ${totalCauses} potential root cause${totalCauses !== 1 ? "s" : ""} that may be affecting ${terms.flowTerm}. `;
    
    if (dominantCount > 0) {
      summary += `Preliminary analysis suggests ${dominantTitles} ${dominantCount > 1 ? "are" : "is"} likely contributing to ${terms.issueTerm}. `;
    }
    
    if (contextShift && selectedContext && dominantCategory) {
      summary += `Although the focus was on ${selectedContext}, initial patterns point to ${dominantCategory}-related factors. Further validation is recommended. `;
    }
    
    const isManufacturingQuick = (industry || "").toLowerCase().includes("manufacturing");
    const allCategoriesQuick = new Set(allCauses.map(c => c.category));
    if (isManufacturingQuick && allCategoriesQuick.size === 1 && allCategoriesQuick.has("Money")) {
      summary += `Operational root causes may be under-detected. Consider validating Ops/Maintenance signals. `;
    }

    summary += `These findings should be validated with frontline staff before finalising intervention plans.`;
  }
  
  return summary;
}

/**
 * Compose a structured diagnostic report from selected root causes.
 * 
 * COMPOSITION RULES:
 * 1. Identify 1-2 dominant root causes (highest confidence across all categories)
 * 2. Treat remaining causes as contributing factors (secondary findings)
 * 3. Detect context shifts (dominant category differs from selectedContext)
 * 4. Apply mode-specific language to executive summary
 * 
 * Uses rule-based templated composition only - NO AI-generated text.
 */
export function composeDiagnosticReport(input: ComposeDiagnosticInput): DiagnosticReport {
  const { analysisMode, selectedRootCauses, industry, selectedContext, documentsPresent, evidenceSignals, concreteSignals } = input;
  
  const allCauses: SelectedRootCause[] = selectedRootCauses.categories
    ?.flatMap(cat => cat.causes || []) || [];
  
  const sortedCauses = [...allCauses].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  
  const dominantCauses = sortedCauses.slice(0, 2);
  const contributingCauses = sortedCauses.slice(2);
  
  let dominantCategory: FourMCategory | null = null;
  if (dominantCauses.length > 0) {
    const categoryCounts: Record<string, number> = {};
    for (const cause of dominantCauses) {
      categoryCounts[cause.category] = (categoryCounts[cause.category] || 0) + 1;
    }
    dominantCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as FourMCategory || null;
  }
  
  let contextShift = false;
  let contextShiftNote: string | null = null;
  
  if (selectedContext && dominantCategory) {
    const expectedContext = categoryToContext(dominantCategory);
    if (expectedContext !== selectedContext) {
      contextShift = true;
      contextShiftNote = analysisMode === "deep"
        ? `While the diagnostic focus was set to "${selectedContext}", the reviewed evidence indicates that ${dominantCategory}-related factors are the primary contributors. This shift in diagnostic focus reflects what the data reveals.`
        : `Initial analysis focused on "${selectedContext}", but preliminary patterns suggest ${dominantCategory}-related factors may be more significant. Consider validating this finding with your team.`;
    }
  }
  
  const executiveSummary = composeExecutiveSummary(
    input,
    dominantCauses,
    allCauses,
    contextShift,
    dominantCategory
  );

  const concreteSignalsList = concreteSignals || [];
  const termSignalsList = evidenceSignals || [];

  const getMatchingConcreteSignals = (category: FourMCategory): CategorisedExtractedSignal[] => {
    return concreteSignalsList.filter(s => s.category === category);
  };

  const getMatchingTermSignals = (category: FourMCategory): EvidenceSignal[] => {
    if (analysisMode !== "deep") return [];
    return termSignalsList.filter(signal => signal.category === category);
  };

  const computeEvidenceStrength = (
    concreteCount: number,
    termSignals: EvidenceSignal[],
    anchorCount: number
  ): "WEAK" | "MODERATE" | "STRONG" => {
    if (anchorCount === 0) return "WEAK";
    const strongTerms = termSignals.filter(s => s.strength === "strong").length;
    const mediumTerms = termSignals.filter(s => s.strength === "medium").length;
    if (concreteCount >= 2 || (anchorCount >= 2 && (strongTerms > 0 || mediumTerms >= 2))) return "STRONG";
    if (concreteCount >= 1 || (anchorCount >= 1 && (strongTerms > 0 || mediumTerms > 0))) return "MODERATE";
    return "WEAK";
  };

  const computeNarrativeTone = (strength: "WEAK" | "MODERATE" | "STRONG"): "EXPLORATORY" | "DIAGNOSTIC" | "CONCLUSIVE" => {
    if (strength === "STRONG") return "CONCLUSIVE";
    if (strength === "MODERATE") return "DIAGNOSTIC";
    return "EXPLORATORY";
  };

  const GENERIC_TERMS = new Set([
    "operational data", "pattern match", "pattern matched", "uploaded operational documents",
    "uploaded document", "money category detected", "document analysis",
    "category detected", "data detected",
  ]);

  const isGenericSignal = (signal: string): boolean => {
    const s = (signal || "").toLowerCase().trim();
    if (GENERIC_TERMS.has(s)) return true;
    if (s.length < 4) return true;
    if (/^pattern match/i.test(s) || /^operational data/i.test(s) || /^document analysis/i.test(s) || /^uploaded/i.test(s)) return true;
    return false;
  };

  const buildAnchors = (category: FourMCategory): DiagnosticEvidenceAnchor[] => {
    const anchors: DiagnosticEvidenceAnchor[] = [];
    const seen = new Set<string>();

    const matching = getMatchingConcreteSignals(category);
    for (const sig of matching) {
      if (isGenericSignal(sig.signal)) continue;
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
      const termSigs = getMatchingTermSignals(category);
      for (const signal of termSigs) {
        const docName = (signal.sourceDocuments && signal.sourceDocuments.length > 0)
          ? signal.sourceDocuments.join(", ")
          : null;
        if (!docName) continue;
        const concreteTerms = signal.matchedTerms.filter(t => !isGenericSignal(t));
        if (concreteTerms.length === 0) continue;
        anchors.push({
          documentName: docName,
          signal: concreteTerms.slice(0, 3).join(", "),
          interpretation: signal.description,
        });
        if (anchors.length >= 5) break;
      }
    }

    return anchors;
  };

  const CATEGORY_CONSEQUENCE: Record<FourMCategory, string> = {
    Money: "increased financial exposure",
    Manpower: "workforce capacity constraints",
    Machinery: "operational reliability risk",
    Materials: "supply chain disruption",
  };

  const composerBuildEvidenceLedTitle = (
    originalTitle: string,
    anchors: DiagnosticEvidenceAnchor[],
    category: FourMCategory
  ): string | undefined => {
    if (anchors.length === 0) return undefined;
    const topSignals = anchors.slice(0, 2).map(a => a.signal).join(" and ");
    const consequence = CATEGORY_CONSEQUENCE[category] || "operational impact";
    const ledTitle = `${topSignals} → ${consequence}`;
    return ledTitle !== originalTitle ? ledTitle : undefined;
  };

  const composerBuildInsightNote = (
    cause: SelectedRootCause,
    anchors: DiagnosticEvidenceAnchor[]
  ): string => {
    if (anchors.length > 0) {
      const signalSummary = anchors.slice(0, 2).map(a => a.signal).join(", ");
      return `Observed signals (${signalSummary}) point to ${cause.title.toLowerCase()} as a contributing factor in the ${cause.category} domain.`;
    }
    return `Preliminary pattern analysis suggests ${cause.title.toLowerCase()} may be a factor, but concrete document evidence is needed to confirm.`;
  };

  const INDUSTRY_IMPACT_CHAINS: Record<string, Record<FourMCategory, string[]>> = {
    manufacturing: {
      Money: ["WIP accumulation ties up working capital", "Unplanned overtime inflates labour cost per unit"],
      Manpower: ["Skill gaps drive rework and quality variation", "Overtime fatigue reduces output quality"],
      Machinery: ["Downtime cascades into schedule slippage", "Deferred maintenance increases breakdown frequency"],
      Materials: ["Stockouts halt production lines", "Quality rejections trigger rework and waste"],
    },
    healthcare: {
      Money: ["Reimbursement delays compress operating cashflow", "Capacity under-utilisation increases fixed cost per patient"],
      Manpower: ["Staff shortages increase patient wait times", "Burnout drives turnover and locum costs"],
      Machinery: ["Equipment downtime delays diagnostic workflows", "System outages disrupt patient record access"],
      Materials: ["Supply shortages delay treatment protocols", "Expired stock incurs waste and compliance risk"],
    },
    logistics: {
      Money: ["SLA penalties directly erode margins", "Fuel cost volatility compresses route profitability"],
      Manpower: ["Driver shortage increases overtime and route delays", "Dispatch errors from understaffing cause SLA breaches"],
      Machinery: ["Fleet breakdowns cause delivery failures", "Aging vehicles increase fuel consumption per km"],
      Materials: ["Warehouse stockout delays order fulfilment", "Supplier delays cascade into customer delivery SLAs"],
    },
  };

  const getIndustryKeyForComposer = (ind: string): string => {
    const lower = (ind || "").toLowerCase();
    if (lower.includes("manufacturing") || lower.includes("construction")) return "manufacturing";
    if (lower.includes("healthcare") || lower.includes("hospital")) return "healthcare";
    if (lower.includes("logistics") || lower.includes("shipping") || lower.includes("transport")) return "logistics";
    return "general";
  };

  const buildImpactBullets = (category: FourMCategory): string[] => {
    const bullets: string[] = [];
    const matching = getMatchingConcreteSignals(category);
    for (const sig of matching.slice(0, 3)) {
      bullets.push(`${sig.signal} (${sig.documentName})`);
    }
    const indKey = getIndustryKeyForComposer(industry);
    const chains = INDUSTRY_IMPACT_CHAINS[indKey];
    if (chains && chains[category]) {
      for (const b of chains[category]) {
        if (bullets.length >= 5) break;
        bullets.push(b);
      }
    }
    return bullets;
  };

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

  const toDiagnosticFinding = (cause: SelectedRootCause, isDominant: boolean): DiagnosticFinding => {
    const matchingConcrete = getMatchingConcreteSignals(cause.category);
    const matchingTerms = getMatchingTermSignals(cause.category);
    const anchors = buildAnchors(cause.category);
    const hasAnySignals = matchingConcrete.length > 0 || matchingTerms.length > 0;

    const evidenceStrength = computeEvidenceStrength(matchingConcrete.length, matchingTerms, anchors.length);
    const narrativeTone = computeNarrativeTone(evidenceStrength);
    const impactBullets = buildImpactBullets(cause.category);

    const whatToValidateNext = hasAnySignals
      ? (VALIDATION_DOCS[cause.category] || []).slice(0, 2)
      : (VALIDATION_DOCS[cause.category] || []).slice(0, 3);

    const evidenceLedTitle = composerBuildEvidenceLedTitle(cause.title, anchors, cause.category);
    const insightNote = composerBuildInsightNote(cause, anchors);

    const finding: DiagnosticFinding = {
      id: cause.id,
      title: cause.title,
      category: cause.category,
      whyItMatters: cause.whyItMatters || "Impact requires further assessment.",
      interventionDirection: cause.interventionDirection || "Intervention approach to be determined.",
      isDominant,
      evidenceAnchors: anchors.length > 0 ? anchors : undefined,
      evidenceStrength,
      narrativeTone,
      impactObserved: impactBullets.length > 0 ? impactBullets : undefined,
      whatToValidateNext: whatToValidateNext.length > 0 ? whatToValidateNext : undefined,
      evidenceLedTitle,
      insightNote,
    };

    if (isDominant && !hasAnySignals && analysisMode === "deep") {
      finding.evidenceNote = "No matching document evidence found for this category.";
    }

    return finding;
  };
  
  const primaryFindings = dominantCauses.map(c => toDiagnosticFinding(c, true));
  const secondaryFindings = contributingCauses.map(c => toDiagnosticFinding(c, false));
  
  const interventionThemes = extractInterventionThemes(allCauses);
  
  const preventionFocus = extractPreventionFocus(allCauses, industry);
  
  return {
    executiveSummary,
    primaryFindings,
    secondaryFindings,
    interventionThemes,
    preventionFocus,
    contextShiftNote,
    analysisMode,
    documentsBacked: documentsPresent
  };
}
