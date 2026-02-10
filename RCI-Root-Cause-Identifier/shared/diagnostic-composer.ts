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
import type { EvidenceSignal } from "./evidence-signals";

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
  const { analysisMode, selectedRootCauses, industry, selectedContext, documentsPresent, evidenceSignals } = input;
  
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
  
  // Get matching evidence signals for a category (Deep Analysis only)
  const getMatchingSignals = (category: FourMCategory): EvidenceSignal[] => {
    if (analysisMode !== "deep" || !evidenceSignals || evidenceSignals.length === 0) {
      return [];
    }
    return evidenceSignals.filter(signal => signal.category === category);
  };

  // Determine evidence strength from matching signals
  const determineEvidenceStrength = (signals: EvidenceSignal[]): "WEAK" | "MODERATE" | "STRONG" => {
    if (signals.length === 0) return "WEAK";
    const strongCount = signals.filter(s => s.strength === "strong").length;
    const mediumCount = signals.filter(s => s.strength === "medium").length;
    // STRONG requires at least 2 evidence anchors (per spec)
    if (signals.length >= 2 && (strongCount > 0 || mediumCount >= 2)) return "STRONG";
    if (signals.length >= 1 && (strongCount > 0 || mediumCount > 0)) return "MODERATE";
    return "WEAK";
  };

  // Determine narrative tone based on evidence strength
  const determineNarrativeTone = (strength: "WEAK" | "MODERATE" | "STRONG"): "EXPLORATORY" | "DIAGNOSTIC" | "CONCLUSIVE" => {
    if (strength === "STRONG") return "CONCLUSIVE";
    if (strength === "MODERATE") return "DIAGNOSTIC";
    return "EXPLORATORY";
  };

  // Build evidence anchors from matching signals
  const buildEvidenceAnchors = (signals: EvidenceSignal[]): DiagnosticEvidenceAnchor[] => {
    return signals.map(signal => ({
      documentName: (signal.sourceDocuments && signal.sourceDocuments.length > 0) 
        ? signal.sourceDocuments.join(", ") 
        : "Uploaded document",
      signal: signal.matchedTerms.slice(0, 3).join(", "),
      interpretation: signal.description,
    }));
  };

  // Apply narrative tone to whyItMatters text
  const applyNarrativeTone = (text: string, tone: "EXPLORATORY" | "DIAGNOSTIC" | "CONCLUSIVE"): string => {
    switch (tone) {
      case "EXPLORATORY":
        return `Early signals suggest: ${text}`;
      case "DIAGNOSTIC":
        return `There is a recurring pattern indicating: ${text}`;
      case "CONCLUSIVE":
        return `The evidence consistently shows: ${text}`;
      default:
        return text;
    }
  };
  
  // Convert to DiagnosticFinding with evidence-driven fields
  const toDiagnosticFinding = (cause: SelectedRootCause, isDominant: boolean): DiagnosticFinding => {
    const matchingSignals = getMatchingSignals(cause.category);
    const evidenceStrength = determineEvidenceStrength(matchingSignals);
    const narrativeTone = determineNarrativeTone(evidenceStrength);
    const evidenceAnchors = buildEvidenceAnchors(matchingSignals);

    const finding: DiagnosticFinding = {
      id: cause.id,
      title: cause.title,
      category: cause.category,
      whyItMatters: matchingSignals.length > 0
        ? applyNarrativeTone(cause.whyItMatters || "Impact requires further assessment.", narrativeTone)
        : cause.whyItMatters || "Impact requires further assessment.",
      interventionDirection: cause.interventionDirection || "Intervention approach to be determined.",
      isDominant,
      evidenceAnchors: evidenceAnchors.length > 0 ? evidenceAnchors : undefined,
      evidenceStrength: matchingSignals.length > 0 ? evidenceStrength : undefined,
      narrativeTone: matchingSignals.length > 0 ? narrativeTone : undefined,
    };
    
    // Evidence note: evidence-based phrasing (replaces old "Based on problem description")
    if (isDominant && matchingSignals.length > 0) {
      finding.evidenceNote = evidenceStrength === "STRONG"
        ? "Supported by consistent document-derived evidence."
        : evidenceStrength === "MODERATE"
          ? "Supported by partial document-derived evidence."
          : "Insufficient evidence — further document review recommended.";
    } else if (isDominant && matchingSignals.length === 0 && analysisMode === "deep") {
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
