/**
 * ============================================================================
 * Margin Guard ANALYSIS BUILDER - KNOWLEDGE-GOVERNED OUTPUT ASSEMBLY
 * ============================================================================
 * 
 * This module assembles diagnostic outputs from APPROVED KNOWLEDGE SOURCES ONLY.
 * 
 * GOVERNANCE PRINCIPLES:
 * 
 * 1. ROOT CAUSES: All root causes come from the Root Cause Library
 *    - See: ./root-cause-library.ts
 *    - Each cause has a unique ID, symptoms, and linked archetypes
 *    - No root causes are invented or generated
 * 
 * 2. RECOMMENDATIONS: All recommendations come from Recommendation Archetypes
 *    - See: ./recommendation-archetypes.ts
 *    - Archetypes are pre-approved intervention patterns
 *    - Each archetype links to specific root causes
 * 
 * 3. ASSEMBLY ROLE: This builder ONLY:
 *    - Formats library entries for presentation
 *    - Links root causes to their archetypes
 *    - Generates contextualised language (not new content)
 *    - Structures outputs for reports and UI
 * 
 * 4. PROHIBITED: This builder does NOT:
 *    - Invent new root causes
 *    - Generate novel recommendations
 *    - Create advice outside archetype boundaries
 * 
 * AUDIT TRAIL: Every output can be traced to:
 *    - A root cause library ID (e.g., "rc-m001")
 *    - A recommendation archetype ID (e.g., "ra-im-cashflow-001")
 * 
 * ============================================================================
 */

import type { RootCauseSelection, SelectedRootCause, FourMCategory, SelectionContext, PrimaryContext } from "./root-cause-library";
import type { SymptomTag } from "./root-cause-library";
import { selectRootCausesFromLibrary } from "./root-cause-library";
import { getArchetypeById } from "./recommendation-archetypes";
import { composeDiagnosticReport, type DiagnosticReport } from "./diagnostic-composer";
import { extractEvidenceSignalsFromDocuments, extractConcreteSignals, type ProcessedDocument } from "./evidence-signals";
import type { AnalysisFinding } from "./schema";

// Re-export DiagnosticReport types for consumers
export type { DiagnosticReport, DiagnosticFinding, DiagnosticEvidenceAnchor, InterventionTheme } from "./diagnostic-composer";

const SYMPTOM_REQUIRED_CATEGORIES: Record<string, FourMCategory[]> = {
  HIGH_TURNOVER: ["Manpower"],
  KNOWLEDGE_LOSS: ["Manpower"],
  MISSED_DEADLINES: ["Materials", "Machinery"],
  FIRE_FIGHTING_CULTURE: ["Materials", "Machinery"],
};

const SYMPTOM_TEXT_PATTERNS: Record<string, RegExp[]> = {
  HIGH_TURNOVER: [/high\s+turnover/i, /staff\s+turnover/i, /employee\s+turnover/i, /attrition/i, /resignat/i],
  KNOWLEDGE_LOSS: [/knowledge\s+loss/i, /brain\s+drain/i, /expertise\s+gap/i, /institutional\s+knowledge/i, /know-?how\s+loss/i],
  MISSED_DEADLINES: [/missed?\s+deadline/i, /deadline\s+miss/i, /late\s+delivery/i, /delivery\s+delay/i, /overdue\s+project/i],
  FIRE_FIGHTING_CULTURE: [/fire[- ]?fight/i, /reactive\s+culture/i, /constant\s+crisis/i, /crisis\s+mode/i, /always\s+putting\s+out\s+fires/i],
};

function detectSymptomsFromText(problemStatement: string): SymptomTag[] {
  const detected: SymptomTag[] = [];
  for (const [tag, patterns] of Object.entries(SYMPTOM_TEXT_PATTERNS)) {
    if (patterns.some(p => p.test(problemStatement))) {
      detected.push(tag as SymptomTag);
    }
  }
  return detected;
}

export function applySymptomAlignmentGuardrail(
  findings: AnalysisFinding[],
  problemStatement: string,
  selectedSymptoms?: string[],
): AnalysisFinding[] {
  if (findings.length === 0) return findings;

  const detectedSymptoms = problemStatement ? detectSymptomsFromText(problemStatement) : [];
  const explicitSymptoms = (selectedSymptoms || []) as SymptomTag[];
  const allSymptoms = [...new Set([...detectedSymptoms, ...explicitSymptoms])];
  if (allSymptoms.length === 0) return findings;

  const requiredCategories = new Set<FourMCategory>();
  for (const symptom of allSymptoms) {
    const cats = SYMPTOM_REQUIRED_CATEGORIES[symptom];
    if (cats) {
      for (const c of cats) requiredCategories.add(c);
    }
  }
  if (requiredCategories.size === 0) return findings;

  const aligned: AnalysisFinding[] = [];
  const demoted: AnalysisFinding[] = [];

  for (const finding of findings) {
    if (requiredCategories.has(finding.fourMCategory)) {
      aligned.push(finding);
    } else {
      demoted.push({
        ...finding,
        description: finding.description + "\n\n📌 This is a downstream impact, not a primary root cause.",
      });
    }
  }

  const hasAlignedFinding = aligned.length > 0;

  if (!hasAlignedFinding) {
    return findings;
  }

  return [...aligned, ...demoted];
}

/**
 * ============================================================================
 * UNIFIED ANALYSIS FUNCTION
 * ============================================================================
 * 
 * Single entry point for all diagnostic analyses. Both modes use the SAME
 * root cause selection pipeline from the Knowledge Library.
 * 
 * MODE BEHAVIOR:
 * - "quick": Ignores document-derived evidence signals (baseline analysis)
 * - "deep": Includes document-derived evidence signals (evidence-enriched analysis)
 * 
 * GOVERNANCE: Root cause selection rules, confidence logic, and Knowledge
 * Library remain unchanged. This is a structural refactor only.
 * ============================================================================
 */

export type AnalysisMode = "quick" | "deep";

export interface RunAnalysisInput {
  mode: AnalysisMode;
  industry: string;
  problemStatement: string;
  selectedContext?: string;
  documents?: Array<{ content?: string; text?: string; data?: string }>;
}

export interface RunAnalysisOutput {
  mode: AnalysisMode;
  rootCauseSelection: RootCauseSelection;
  dynamicAnalysis: DynamicAnalysis;
  diagnosticReport: DiagnosticReport;
  confidence: "preliminary" | "substantiated";
}

/**
 * Unified analysis function - single entry point for all diagnostic modes.
 * 
 * Both modes use the SAME root cause selection pipeline:
 * - "quick": Baseline analysis without document evidence signals
 * - "deep": Evidence-enriched analysis with document-derived signals
 * 
 * @param input - Analysis input with mode, industry, problem statement, and optional documents
 * @returns Root cause selection and assembled dynamic analysis
 */
export function runAnalysis(input: RunAnalysisInput): RunAnalysisOutput {
  const { mode, industry, problemStatement, selectedContext, documents } = input;

  // Build symptoms from problem statement
  const symptoms = problemStatement
    .split(/[.,;!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  // Build selection context - SAME pipeline for both modes
  const selectionContext: SelectionContext = {
    industry,
    symptoms,
    problemStatement,
    selectedContext: selectedContext as PrimaryContext | undefined,
  };

  // MODE BEHAVIOR: "deep" includes document-derived evidence signals
  // "quick" ignores document evidence (documentSignals and evidenceSignals not set)
  // Evidence weighting applies ONLY in Deep Analysis.
  // Quick Analysis behavior remains unchanged.
  // 
  // LAYERED EVIDENCE APPROACH:
  // - documentSignals: Raw phrase matching for general symptom detection
  // - evidenceSignals: Structured 4M-category signals with strength weighting
  // Both contribute to confidence scoring in Deep Analysis mode.
  if (mode === "deep" && documents && documents.length > 0) {
    // Extract text content from documents for evidence matching
    const documentSignals: string[] = [];
    for (const doc of documents) {
      const content = doc.content || doc.text || doc.data || "";
      if (content) {
        // Extract key phrases for symptom matching
        const phrases = content
          .split(/[.,;!?\n]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 5);
        documentSignals.push(...phrases);
      }
    }
    if (documentSignals.length > 0) {
      selectionContext.documentSignals = documentSignals;
    }

    // Extract structured evidence signals from documents (Deep Analysis ONLY)
    // Document evidence reinforces or suppresses root cause confidence based on factual signals.
    const processedDocuments: ProcessedDocument[] = documents.map((doc, idx) => ({
      id: `doc-${idx}`,
      name: `Document ${idx + 1}`,
      content: doc.content || doc.text || doc.data || "",
      type: "document"
    }));
    const evidenceSignals = extractEvidenceSignalsFromDocuments(processedDocuments);
    if (evidenceSignals.length > 0) {
      selectionContext.evidenceSignals = evidenceSignals;
    }
  }

  // SAME ROOT CAUSE SELECTION PIPELINE for both modes
  const rootCauseSelection = selectRootCausesFromLibrary(selectionContext);

  // Build dynamic analysis from selection with mode-specific parameters
  const analysisInput = {
    problem: problemStatement,
    industry,
    context: selectedContext ? [selectedContext] : [],
    mode,
    documentCount: documents?.length || 0,
  };
  const dynamicAnalysis = buildDynamicAnalysis(analysisInput, rootCauseSelection);

  let concreteSignals: import("./evidence-signals").CategorisedExtractedSignal[] = [];
  if (mode === "deep" && documents && documents.length > 0) {
    const processedDocsForSignals: ProcessedDocument[] = documents.map((doc, idx) => ({
      id: `doc-${idx}`,
      name: doc.name || `Document ${idx + 1}`,
      content: doc.content || doc.text || doc.data || "",
      type: "document"
    }));
    concreteSignals = extractConcreteSignals(processedDocsForSignals);
  }

  const diagnosticReport = composeDiagnosticReport({
    analysisMode: mode,
    selectedRootCauses: rootCauseSelection,
    industry,
    selectedContext: selectedContext as PrimaryContext | undefined,
    documentsPresent: documents !== undefined && documents.length > 0,
    evidenceSignals: selectionContext.evidenceSignals,
    concreteSignals,
  });

  // Confidence level based on mode
  const confidence: "preliminary" | "substantiated" = 
    mode === "deep" && documents && documents.length > 0 
      ? "substantiated" 
      : "preliminary";

  return {
    mode,
    rootCauseSelection,
    dynamicAnalysis,
    diagnosticReport,
    confidence,
  };
}

export type CauseSeverity = "low" | "medium" | "high";

type IndustryType = "manufacturing" | "healthcare" | "services";

interface IndustryLanguage {
  flowTerm: string;
  delayTerm: string;
  bottleneckTerm: string;
  handoffTerm: string;
  trackingTerm: string;
  ownershipTerm: string;
  impactExamples: string;
  fixApproach: string;
}

function getIndustryType(industry: string): IndustryType {
  const lower = (industry || "").toLowerCase();
  if (lower.includes("manufacturing") || lower.includes("construction") || lower.includes("logistics") || lower.includes("oil") || lower.includes("gas")) {
    return "manufacturing";
  }
  if (lower.includes("healthcare") || lower.includes("hospital") || lower.includes("pharma")) {
    return "healthcare";
  }
  return "services";
}

function getIndustryLanguage(industry: string): IndustryLanguage {
  const type = getIndustryType(industry);
  
  switch (type) {
    case "manufacturing":
      return {
        flowTerm: "operational flow",
        delayTerm: "throughput delays",
        bottleneckTerm: "scheduling bottleneck",
        handoffTerm: "production handoff",
        trackingTerm: "output tracking",
        ownershipTerm: "line ownership",
        impactExamples: "missed schedules, throughput drops, or production backlogs",
        fixApproach: "Map the operational flow and fix scheduling gaps"
      };
    case "healthcare":
      return {
        flowTerm: "service flow",
        delayTerm: "service delays",
        bottleneckTerm: "escalation point",
        handoffTerm: "care handoff",
        trackingTerm: "case tracking",
        ownershipTerm: "escalation ownership",
        impactExamples: "service delays, escalation failures, or patient wait times",
        fixApproach: "Clarify escalation paths and service flow ownership"
      };
    default:
      return {
        flowTerm: "delivery flow",
        delayTerm: "delivery delays",
        bottleneckTerm: "coordination gap",
        handoffTerm: "task handoff",
        trackingTerm: "delivery tracking",
        ownershipTerm: "delivery ownership",
        impactExamples: "coordination gaps, missed handoffs, or client complaints",
        fixApproach: "Assign clear delivery ownership at each stage"
      };
  }
}

// Evidence-driven industry interpretation layer
// Varies "Why It Matters" wording by industry for Money findings
export type IndustryMoneyInterpretation = {
  whyItMattersOverride: string;
  signalInterpretations: Record<string, string>;
};

const INDUSTRY_MONEY_INTERPRETATIONS: Record<string, IndustryMoneyInterpretation> = {
  manufacturing: {
    whyItMattersOverride: "Financial leakage in manufacturing often ties to WIP accumulation, unplanned downtime costs, overtime spend, and inventory carrying costs that erode margins.",
    signalInterpretations: {
      "overdue": "Overdue payments may indicate cash tied up in WIP or slow receivables from production delays.",
      "cash flow problem": "Cash flow gaps in manufacturing commonly stem from inventory carrying costs and production scheduling mismatches.",
      "late payment": "Late payments may reflect downstream production bottlenecks causing invoicing delays.",
    },
  },
  healthcare: {
    whyItMattersOverride: "Healthcare financial issues frequently tie to reimbursement delays, payer mix imbalances, and capacity utilisation shortfalls that reduce revenue per bed.",
    signalInterpretations: {
      "overdue": "Overdue payments may reflect claim denials or slow reimbursement cycles from insurers.",
      "cash flow problem": "Cash flow strain in healthcare often correlates with payer mix issues and delayed reimbursements.",
      "late payment": "Late payments may indicate coding or documentation issues causing claim processing delays.",
    },
  },
  logistics: {
    whyItMattersOverride: "Logistics financial pressure often stems from fuel cost volatility, SLA penalty exposure, and route inefficiencies that compress already thin margins.",
    signalInterpretations: {
      "overdue": "Overdue receivables in logistics may indicate SLA disputes or documentation gaps delaying payment.",
      "cash flow problem": "Cash flow issues frequently link to fuel price spikes and delayed shipper payments.",
      "late payment": "Late payments may reflect disputed delivery penalties or complex multi-party billing.",
    },
  },
};

// Get industry-specific Money interpretation (returns null if no match)
export function getIndustryMoneyInterpretation(industry: string): IndustryMoneyInterpretation | null {
  const lower = (industry || "").toLowerCase();
  if (lower.includes("manufacturing") || lower.includes("construction")) {
    return INDUSTRY_MONEY_INTERPRETATIONS.manufacturing;
  }
  if (lower.includes("healthcare") || lower.includes("hospital") || lower.includes("pharma")) {
    return INDUSTRY_MONEY_INTERPRETATIONS.healthcare;
  }
  if (lower.includes("logistics") || lower.includes("shipping") || lower.includes("transport")) {
    return INDUSTRY_MONEY_INTERPRETATIONS.logistics;
  }
  return null;
}

export interface RootCauseOutput {
  id: string;
  name: string;
  causes: Array<{
    id: string;
    title: string;
    severity: CauseSeverity;
    intervention: string;
    issue: string;
    impact: string;
    direction: string;
  }>;
}

export interface ReasoningSnapshot {
  problemStatement: string;
  industry: string;
  analysisApproach: string;
  patternMatching: string;
  confidenceRationale: string;
}

export interface EvidenceTraceability {
  clientInputs: {
    documentsReviewed: string;
    interviewsConducted: string;
    observationsNoted: string;
  };
  knowledgeReferences: {
    rootCausePatterns: string;
    historicalCases: string;
    frameworksApplied: string;
  };
  reasoningTrace: string;
  assumptionsLimitations: string;
}

export interface RecommendationItem {
  id: string;
  text: string;
}

export interface RecommendationLayer {
  type: "immediate" | "structural" | "prevention";
  recommendations: RecommendationItem[];
}

export interface InterventionAssessment {
  severity: "low" | "medium" | "high";
  businessImpact: "low" | "medium" | "high";
  clientCapability: "low" | "medium" | "high";
  requiresIntervention: boolean;
}

export interface ExecutiveSummaryData {
  situationOverview: string;
  keyFindings: string[];
  businessImpact: string;
  recommendedDirection: string;
  interventionAssessment: string;
  nextStepOptions: string[];
}

export interface ConsultingScopeData {
  phase1: { objectives: string; activities: string; outputs: string };
  phase2: { objectives: string; activities: string; outputs: string };
  phase3: { objectives: string; activities: string; outputs: string };
}

export interface DynamicAnalysis {
  rootCauses: RootCauseOutput[];
  reasoningSnapshot: ReasoningSnapshot;
  evidenceTraceability: EvidenceTraceability;
  recommendations: RecommendationLayer[];
  interventionAssessment: InterventionAssessment;
  executiveSummary: ExecutiveSummaryData;
  consultingScope: ConsultingScopeData;
  analysisDate: string;
}

interface AnalysisInput {
  problem: string;
  industry: string;
  context: string[];
  mode?: "quick" | "deep";
  documentCount?: number;
}

function determineInterventionSeverity(selection: RootCauseSelection): InterventionAssessment {
  const allCauses = selection.categories?.flatMap(c => c.causes) || [];
  const avgConfidence = allCauses.length > 0 
    ? allCauses.reduce((sum, c) => sum + (c.confidence || 0), 0) / allCauses.length 
    : 50;
  
  const consultantRequiredCount = allCauses.filter(c => c.intervention === "consultant-required").length;
  const advisoryCount = allCauses.filter(c => c.intervention === "advisory").length;
  
  let severity: "low" | "medium" | "high" = "medium";
  if (allCauses.length === 0) {
    severity = "low";
  } else if (avgConfidence >= 80 || consultantRequiredCount >= 2) {
    severity = "high";
  } else if (avgConfidence >= 65 || consultantRequiredCount >= 1) {
    severity = "medium";
  }
  
  let businessImpact: "low" | "medium" | "high" = "medium";
  const totalMatches = selection.totalMatches || 0;
  if (totalMatches >= 8) {
    businessImpact = "high";
  } else if (totalMatches <= 3) {
    businessImpact = "low";
  }
  
  let clientCapability: "low" | "medium" | "high" = "medium";
  if (consultantRequiredCount > advisoryCount) {
    clientCapability = "low";
  } else if (advisoryCount >= consultantRequiredCount * 2) {
    clientCapability = "high";
  }
  
  const requiresIntervention = severity === "high" && businessImpact === "high" && clientCapability === "low";
  
  return { severity, businessImpact, clientCapability, requiresIntervention };
}

function buildReasoningSnapshot(input: AnalysisInput, selection: RootCauseSelection, lang: IndustryLanguage): ReasoningSnapshot {
  const categories = selection.categories || [];
  const allCauses = categories.flatMap(c => c.causes || []);
  const totalMatches = selection.totalMatches || 0;
  
  const topCause = allCauses.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
  
  const categoryImpacts: string[] = [];
  categories.forEach(cat => {
    if (cat.id === "money") categoryImpacts.push("invoices piling up, payments delayed, or margins shrinking");
    if (cat.id === "manpower") categoryImpacts.push(`unclear ${lang.ownershipTerm}, or the same mistakes repeating`);
    if (cat.id === "material") categoryImpacts.push("waiting on supplies, stock-outs, or rework from bad materials");
    if (cat.id === "machinery") categoryImpacts.push("breakdowns, workarounds, or staff avoiding certain equipment");
  });
  
  const impactSummary = categoryImpacts.length > 0 
    ? categoryImpacts.join("; ") 
    : `something disrupting ${lang.flowTerm}`;
  
  return {
    problemStatement: input.problem || "No problem statement provided",
    industry: input.industry || "General",
    analysisApproach: totalMatches > 0
      ? `What you described points to ${impactSummary}. Common ${lang.flowTerm} issue in ${input.industry}.`
      : `Tell us what is happening. Describe ${lang.delayTerm}, complaints, or ${lang.handoffTerm} failures.`,
    patternMatching: topCause
      ? `"${topCause.title}" stands out. ${totalMatches > 1 ? `${totalMatches - 1} other ${lang.flowTerm} issues also showing.` : ""}`
      : `No clear pattern yet. Try describing specific ${lang.delayTerm} or ${lang.bottleneckTerm} problems.`,
    confidenceRationale: `High severity means strong match to ${lang.flowTerm} patterns. Lower severity still worth checking.`
  };
}

function buildEvidenceTraceability(input: AnalysisInput, selection: RootCauseSelection): EvidenceTraceability {
  const categories = selection.categories || [];
  const patternIds = categories
    .flatMap(c => (c.causes || []).map(cause => cause.id?.toUpperCase() || ""))
    .filter(Boolean)
    .join(", ");
  
  const categoryNames = categories.map(c => c.name).join(", ") || "4M categories";
  
  const problemPreview = (input.problem || "").substring(0, 100);
  const problemEllipsis = (input.problem || "").length > 100 ? "..." : "";
  const totalMatches = selection.totalMatches || 0;
  const categoryCount = categories.length;
  
  return {
    clientInputs: {
      documentsReviewed: "Your problem description",
      interviewsConducted: "Not yet. Recommend talking to 3-5 staff who see the problem daily.",
      observationsNoted: `${input.industry || "General"} context. Symptoms from your description.`
    },
    knowledgeReferences: {
      rootCausePatterns: patternIds || "None matched",
      historicalCases: "Compared to similar ${input.industry} cases we have seen",
      frameworksApplied: `4M check: ${categoryNames}`
    },
    reasoningTrace: problemPreview
      ? `You said: "${problemPreview}${problemEllipsis}". Checked ${input.industry || "general"} patterns. Found ${totalMatches} likely causes in ${categoryCount} areas.`
      : "Need your problem description to start.",
    assumptionsLimitations: "Based on what you told us. Next step is to confirm with your team. Scores show likelihood, not proof."
  };
}

function buildRecommendations(selection: RootCauseSelection, industry: string): RecommendationLayer[] {
  const categories = selection.categories || [];
  const allCauses = categories.flatMap(c => c.causes || []);
  
  // Step 1: Collect all unique archetype IDs from selected root causes
  const seenArchetypeIds = new Set<string>();
  const archetypeList: Array<{ archetype: any; causeId: string }> = [];
  
  for (const cause of allCauses) {
    for (const archetypeId of cause.archetypeIds || []) {
      // Step 5: Remove duplicates - skip if already seen
      if (seenArchetypeIds.has(archetypeId)) continue;
      
      // Step 2: Retrieve archetype
      const archetype = getArchetypeById(archetypeId);
      if (!archetype) continue;
      
      // Step 3: Filter by applicable industry
      const applicableIndustries = archetype.applicable_industries;
      const industryLower = (industry || "").toLowerCase();
      
      let isApplicable = false;
      if (applicableIndustries === "All") {
        isApplicable = true;
      } else if (Array.isArray(applicableIndustries)) {
        isApplicable = applicableIndustries.some((ind: string) => 
          industryLower.includes(ind.toLowerCase()) || ind.toLowerCase().includes(industryLower)
        );
        // If no specific match but industry list is empty or null, apply to all
        if (!isApplicable && applicableIndustries.length === 0) {
          isApplicable = true;
        }
      }
      
      if (!isApplicable) continue;
      
      seenArchetypeIds.add(archetypeId);
      archetypeList.push({ archetype, causeId: cause.id });
    }
  }
  
  // Step 4: Group recommendations by action_type
  const immediate: RecommendationItem[] = [];
  const structural: RecommendationItem[] = [];
  const prevention: RecommendationItem[] = [];
  
  let iIdx = 1, sIdx = 1, pIdx = 1;
  
  for (const { archetype } of archetypeList) {
    if (archetype.action_type === "Immediate" && immediate.length < 5) {
      immediate.push({ id: `i${iIdx++}`, text: archetype.description });
    } else if (archetype.action_type === "Structural" && structural.length < 5) {
      structural.push({ id: `s${sIdx++}`, text: archetype.description });
    } else if (archetype.action_type === "Prevention" && prevention.length < 5) {
      prevention.push({ id: `p${pIdx++}`, text: archetype.description });
    }
  }
  
  return [
    { type: "immediate", recommendations: immediate },
    { type: "structural", recommendations: structural },
    { type: "prevention", recommendations: prevention }
  ];
}

/**
 * Executive Summary generation split by analysis mode.
 * 
 * QUICK ANALYSIS (Initial Diagnostic):
 * - States it is an initial diagnostic
 * - Based on stated issues and industry patterns
 * - Avoids definitive or conclusive language
 * 
 * DEEP ANALYSIS (Evidence-Backed):
 * - States it is evidence-backed
 * - References uploaded documents and validation
 * - Uses firmer, more conclusive language
 * 
 * Executive Summary ALWAYS renders for both modes.
 * No AI-related language or confidence scores included.
 */
function buildExecutiveSummary(input: AnalysisInput, selection: RootCauseSelection, assessment: InterventionAssessment, lang: IndustryLanguage): ExecutiveSummaryData {
  const categories = selection.categories || [];
  const allCauses = categories.flatMap(c => c.causes || []);
  const topFindings = allCauses
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 4)
    .map(c => c.title);
  
  const categoryNames = categories.map(c => c.name).join(", ") || lang.flowTerm;
  const totalMatches = selection.totalMatches || 0;
  const isDeepAnalysis = input.mode === "deep";
  const documentCount = input.documentCount || 0;
  
  // Mode-specific situation overview
  let situationOverview: string;
  if (totalMatches === 0) {
    situationOverview = `Tell me what is going wrong. ${lang.delayTerm}? ${lang.handoffTerm} failures? Staff frustration?`;
  } else if (isDeepAnalysis) {
    // Deep Analysis: Evidence-backed, firm language
    situationOverview = `Based on review of ${documentCount} document${documentCount !== 1 ? "s" : ""} and operational data, ${totalMatches} root causes have been identified affecting ${lang.flowTerm} across ${categoryNames} in your ${input.industry || "business"}.`;
  } else {
    // Quick Analysis: Initial diagnostic, tentative language
    situationOverview = `This initial diagnostic, based on the stated issues and ${input.industry || "industry"} patterns, indicates ${totalMatches} potential areas affecting ${lang.flowTerm} across ${categoryNames}. Further validation is recommended.`;
  }
  
  // Mode-specific impact statement
  let impactStatement: string;
  if (isDeepAnalysis) {
    // Deep Analysis: Conclusive language
    if (assessment.businessImpact === "high") {
      impactStatement = `The evidence shows significant ongoing losses through ${lang.impactExamples}.`;
    } else if (assessment.businessImpact === "low") {
      impactStatement = `The documented issues are contained. Addressing them now prevents escalation.`;
    } else {
      impactStatement = `The reviewed data indicates your team is managing workarounds instead of optimising ${lang.flowTerm}.`;
    }
  } else {
    // Quick Analysis: Tentative language
    if (assessment.businessImpact === "high") {
      impactStatement = `If these patterns hold, ongoing losses through ${lang.impactExamples} are possible.`;
    } else if (assessment.businessImpact === "low") {
      impactStatement = `Initial indicators suggest the ${lang.bottleneckTerm} may be contained. Confirm with your team.`;
    } else {
      impactStatement = `Your team may be spending time on workarounds instead of managing ${lang.flowTerm}. This warrants further review.`;
    }
  }
  
  // Mode-specific intervention text
  let interventionText: string;
  if (isDeepAnalysis) {
    // Deep Analysis: Firm recommendations
    if (assessment.requiresIntervention) {
      interventionText = `The documented evidence points to systemic issues that internal fixes rarely resolve. Structured external support is recommended.`;
    } else if (assessment.clientCapability === "high") {
      interventionText = `Your team has the capability to address these issues. Periodic guidance sessions should suffice.`;
    } else {
      interventionText = `The reviewed patterns suggest an outside perspective would help identify solutions your team may overlook.`;
    }
  } else {
    // Quick Analysis: Tentative recommendations
    if (assessment.requiresIntervention) {
      interventionText = `Based on initial patterns, external support may be beneficial. Confirm findings before deciding.`;
    } else if (assessment.clientCapability === "high") {
      interventionText = `Initial assessment suggests your team can likely handle this ${lang.bottleneckTerm}. Validate with frontline staff.`;
    } else {
      interventionText = `An outside perspective may help, but recommend validating these findings with your team first.`;
    }
  }
  
  // Mode-specific recommended direction
  let recommendedDirection: string;
  if (isDeepAnalysis) {
    recommendedDirection = `The documented findings should be prioritised by impact. Address root causes in order and track measurable improvement.`;
  } else {
    recommendedDirection = `Validate these initial findings with frontline staff. If confirmed, prioritise the top issues and monitor progress.`;
  }
  
  // Mode-specific key findings prefix
  let keyFindingsResult: string[];
  if (topFindings.length > 0) {
    keyFindingsResult = topFindings;
  } else {
    keyFindingsResult = [`Need more details about ${lang.flowTerm} problems.`];
  }
  
  const severityText = assessment.severity === "high" 
    ? `Multiple ${lang.flowTerm} stages affected.` 
    : assessment.severity === "medium" 
      ? `A few ${lang.handoffTerm} points struggling.` 
      : `One or two ${lang.bottleneckTerm} spots need attention.`;
  
  return {
    situationOverview,
    keyFindings: keyFindingsResult,
    businessImpact: `${impactStatement} ${severityText}`,
    recommendedDirection,
    interventionAssessment: interventionText,
    nextStepOptions: [
      assessment.requiresIntervention 
        ? (isDeepAnalysis ? "Engage structured support (recommended)" : "Consider bringing in help after validation")
        : "Get guidance as you go",
      `Handle it internally with ${lang.trackingTerm}`,
      isDeepAnalysis ? "Implement priority fixes within 30 days" : "Watch it for 90 days, then decide"
    ]
  };
}

function buildConsultingScope(selection: RootCauseSelection, assessment: InterventionAssessment, lang: IndustryLanguage): ConsultingScopeData {
  const categories = selection.categories || [];
  const categoryNames = categories.map(c => c.name).join(", ") || lang.flowTerm;
  const causeCount = selection.totalMatches || 0;
  
  return {
    phase1: {
      objectives: `Confirm these ${causeCount} issues with frontline staff. Map where ${lang.delayTerm} actually happen in ${lang.flowTerm}.`,
      activities: `Sit with 5-8 people who manage ${lang.flowTerm}. Watch one full cycle. Review ${lang.trackingTerm} numbers.`,
      outputs: `List of real ${lang.bottleneckTerm} points with examples. Cost in hours or money. Agreement on what to fix first.`
    },
    phase2: {
      objectives: `Fix root causes in ${categoryNames}. Redesign ${lang.handoffTerm} points that keep breaking.`,
      activities: `Work with your team to redesign ${lang.flowTerm}. Write down the new way. Test before rolling out.`,
      outputs: `Step-by-step action plan. ${lang.trackingTerm} sheet. Clear ${lang.ownershipTerm} assignments.`
    },
    phase3: {
      objectives: `Get the ${lang.flowTerm} fixes working. Make sure your team can maintain without outside help.`,
      activities: `${assessment.severity === "high" ? "4-6" : "2-4"} weeks side by side. Show them what to watch in ${lang.flowTerm}. Hand over completely.`,
      outputs: `${lang.bottleneckTerm} problems solved. Team knows ${lang.ownershipTerm}. Weekly ${lang.trackingTerm} in place.`
    }
  };
}

interface CauseOutputLines {
  issue: string;
  impact: string;
  direction: string;
}

function generateCauseOutputLines(cause: SelectedRootCause, lang: IndustryLanguage): CauseOutputLines {
  const title = cause.title || "";
  const symptoms = cause.symptoms || [];
  const intervention = cause.intervention || "advisory";
  
  const issue = title.length > 0 
    ? title.charAt(0).toUpperCase() + title.slice(1)
    : "Problem not clearly defined yet.";
  
  let impact = "";
  const symptomExamples = symptoms.slice(0, 2).join(" and ");
  if (symptomExamples) {
    impact = `Leads to ${symptomExamples} disrupting ${lang.flowTerm}.`;
  } else if (intervention === "consultant-required") {
    impact = `Causing ${lang.impactExamples}.`;
  } else if (intervention === "advisory") {
    impact = `Creating ${lang.bottleneckTerm} that slows ${lang.flowTerm}.`;
  } else {
    impact = `Adding friction at ${lang.handoffTerm} points.`;
  }
  
  let direction = "";
  if (intervention === "consultant-required") {
    direction = `${lang.fixApproach}. Assign ${lang.ownershipTerm}.`;
  } else if (intervention === "advisory") {
    direction = `Tighten ${lang.trackingTerm} and weekly reviews.`;
  } else {
    direction = `Train staff on correct ${lang.handoffTerm} procedure.`;
  }
  
  return { issue, impact, direction };
}

export function buildDynamicAnalysis(input: AnalysisInput, selection: RootCauseSelection | null | undefined): DynamicAnalysis {
  const safeSelection: RootCauseSelection = selection || { categories: [], totalMatches: 0 };
  const categories = safeSelection.categories || [];
  const lang = getIndustryLanguage(input.industry);
  
  const rootCauses: RootCauseOutput[] = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    causes: (cat.causes || []).map(c => {
      const lines = generateCauseOutputLines(c, lang);
      const conf = c.confidence || 0;
      let severity: CauseSeverity = "medium";
      if (conf >= 80) severity = "high";
      else if (conf < 60) severity = "low";
      return {
        id: c.id,
        title: c.title,
        severity,
        intervention: c.intervention,
        issue: lines.issue,
        impact: lines.impact,
        direction: lines.direction
      };
    })
  }));
  
  const interventionAssessment = determineInterventionSeverity(safeSelection);
  const reasoningSnapshot = buildReasoningSnapshot(input, safeSelection, lang);
  const evidenceTraceability = buildEvidenceTraceability(input, safeSelection);
  const recommendations = buildRecommendations(safeSelection, input.industry);
  const executiveSummary = buildExecutiveSummary(input, safeSelection, interventionAssessment, lang);
  const consultingScope = buildConsultingScope(safeSelection, interventionAssessment, lang);
  
  return {
    rootCauses,
    reasoningSnapshot,
    evidenceTraceability,
    recommendations,
    interventionAssessment,
    executiveSummary,
    consultingScope,
    analysisDate: new Date().toISOString()
  };
}
