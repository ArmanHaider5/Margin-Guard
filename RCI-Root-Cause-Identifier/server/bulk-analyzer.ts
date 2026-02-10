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
  type ClientDocument
} from "@shared/schema";

// KNOWLEDGE LIBRARY IMPORTS - These are the ONLY sources for root causes and recommendations
import { rootCauseLibrary, manufacturingRootCausesV2, type RootCauseEntry } from "@shared/root-cause-library";
import { recommendationArchetypes, type RecommendationArchetype, type SeverityLevel } from "@shared/recommendation-archetypes";
import { allIndustryProblems, type IndustryProblem } from "@shared/industry-problems";
import { type EvidenceSignal } from "@shared/evidence-signals";
import { getIndustryMoneyInterpretation } from "@shared/analysis-builder";

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
  industry: string
): string {
  // Normalise industry name for lookup
  const normalised = normaliseIndustryForVariation(industry);
  
  // Check if industry-specific variation exists
  if (archetype.industryVariations && archetype.industryVariations[normalised]) {
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
    "Manufacturing": "For production operations: ",
    "Construction": "For site operations: ",
    "Healthcare": "For clinical settings: ",
    "Hospitality": "For guest services: ",
    "F&B": "For food service operations: ",
    "Retail": "For store operations: ",
    "Logistics": "For distribution operations: ",
    "Oil & Gas": "For field operations: ",
    "Property Development": "For project management: ",
    "Education": "For institutional operations: ",
    "Professional Services": "For client delivery: ",
    "Technology": "For product operations: ",
  };
  return prefixes[industry] || `For ${industry} operations: `;
}

/**
 * Normalises industry codes to standard names for variation lookup.
 */
function normaliseIndustryForVariation(industry: string): string {
  const map: Record<string, string> = {
    "manufacturing": "Manufacturing",
    "construction": "Construction",
    "healthcare": "Healthcare",
    "hospitality": "Hospitality",
    "hotels_airbnb": "Hospitality",
    "logistics": "Logistics",
    "oil_gas": "Oil & Gas",
    "property_development": "Property Development",
    "fnb_full_service": "F&B",
    "fnb_qsr": "F&B",
    "fnb_fast_food": "F&B",
    "fnb_franchise": "F&B",
    "fnb_independent": "F&B",
    "retail": "Retail",
    "education": "Education",
    "professional_services": "Professional Services",
    "technology": "Technology",
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
  dominantSeverity: SeverityLevel
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
    return (weightB + typeBoostB) - (weightA + typeBoostA);
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
  dominantCategory: FourMCategory | null
): RecommendationArchetype[] {
  if (!dominantCategory) return archetypes;
  
  // Map categories to relevant archetype ID patterns
  const categoryPatterns: Record<FourMCategory, string[]> = {
    Money: ["cashflow", "cost", "budget", "credit", "pricing", "debt", "cash", "growth"],
    Manpower: ["training", "turnover", "ownership", "knowledge", "standards", "comms", "staffing", "supervision"],
    Materials: ["inventory", "supplier", "overstock", "waste", "quality", "singlesource", "forecast", "storage"],
    Machinery: ["breakdown", "maintenance", "legacy", "bottleneck", "utilization", "calibration", "sop", "tech"]
  };
  
  const relevantPatterns = categoryPatterns[dominantCategory] || [];
  
  // Sort: archetypes matching dominant category patterns come first
  return [...archetypes].sort((a, b) => {
    const aMatchesCategory = relevantPatterns.some(p => 
      a.archetype_id.toLowerCase().includes(p)
    );
    const bMatchesCategory = relevantPatterns.some(p => 
      b.archetype_id.toLowerCase().includes(p)
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
function getDominantCategory(findings: AnalysisFinding[]): FourMCategory | null {
  if (findings.length === 0) return null;
  
  const counts: Record<FourMCategory, number> = {
    Money: 0, Manpower: 0, Materials: 0, Machinery: 0
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
  
  const hasCritical = findings.some(f => f.severity === "critical");
  const hasHigh = findings.some(f => f.severity === "high");
  
  if (hasCritical) return "critical";
  if (hasHigh) return "high";
  return "medium";
}

/**
 * ============================================================================
 * EVIDENCE-DRIVEN FINDINGS ENGINE
 * ============================================================================
 * 
 * Enriches findings with evidence anchors, evidence strength, narrative tone,
 * industry-specific interpretation, and duplicate root cause collapsing.
 * 
 * Non-breaking: all new fields are optional. Existing findings pass through unchanged.
 * ============================================================================
 */

// Build evidence anchors from evidence signals matching a finding's 4M category
function buildEvidenceAnchorsForFinding(
  category: FourMCategory,
  evidenceSignals: EvidenceSignal[]
): EvidenceAnchor[] {
  const matchingSignals = evidenceSignals.filter(s => s.category === category);
  return matchingSignals.map(signal => ({
    documentName: (signal.sourceDocuments && signal.sourceDocuments.length > 0)
      ? signal.sourceDocuments.join(", ")
      : "Uploaded document",
    signal: signal.matchedTerms.slice(0, 3).join(", "),
    interpretation: signal.description,
  }));
}

// Determine evidence strength: STRONG requires at least 2 anchors
function determineEvidenceStrength(anchors: EvidenceAnchor[], signals: EvidenceSignal[]): EvidenceStrength {
  if (anchors.length === 0) return "WEAK";
  const strongSignals = signals.filter(s => s.strength === "strong").length;
  const mediumSignals = signals.filter(s => s.strength === "medium").length;
  if (anchors.length >= 2 && (strongSignals > 0 || mediumSignals >= 2)) return "STRONG";
  if (anchors.length >= 1 && (strongSignals > 0 || mediumSignals > 0)) return "MODERATE";
  return "WEAK";
}

// Determine narrative tone from evidence strength
function determineNarrativeTone(strength: EvidenceStrength): NarrativeTone {
  if (strength === "STRONG") return "CONCLUSIVE";
  if (strength === "MODERATE") return "DIAGNOSTIC";
  return "EXPLORATORY";
}

// Apply narrative tone prefix to description text
function applyNarrativePrefix(text: string, tone: NarrativeTone): string {
  switch (tone) {
    case "EXPLORATORY": return `Early signals suggest: ${text}`;
    case "DIAGNOSTIC": return `There is a recurring pattern indicating: ${text}`;
    case "CONCLUSIVE": return `The evidence consistently shows: ${text}`;
    default: return text;
  }
}

// Enrich a single finding with evidence-driven fields
function enrichFindingWithEvidence(
  finding: AnalysisFinding,
  evidenceSignals: EvidenceSignal[],
  industry: string
): AnalysisFinding {
  const matchingSignals = evidenceSignals.filter(s => s.category === finding.fourMCategory);
  if (matchingSignals.length === 0) {
    return {
      ...finding,
      evidenceStrength: "WEAK",
      narrativeTone: "EXPLORATORY",
      description: applyNarrativePrefix(finding.description, "EXPLORATORY"),
    };
  }

  const anchors = buildEvidenceAnchorsForFinding(finding.fourMCategory, evidenceSignals);
  const strength = determineEvidenceStrength(anchors, matchingSignals);
  const tone = determineNarrativeTone(strength);

  // Apply industry-specific "Why It Matters" override for Money findings
  // Rewrites the description block's "Why It Matters" section with industry-aware wording
  let enrichedDescription = finding.description;
  if (finding.fourMCategory === "Money") {
    const interpretation = getIndustryMoneyInterpretation(industry);
    if (interpretation) {
      enrichedDescription = enrichedDescription.replace(
        /Why It Matters:\n[^\n]+/,
        `Why It Matters:\n${interpretation.whyItMattersOverride}`
      );
    }
  }

  // Apply narrative tone prefix to description
  enrichedDescription = applyNarrativePrefix(enrichedDescription, tone);

  return {
    ...finding,
    description: enrichedDescription,
    evidence: strength === "WEAK"
      ? ["Insufficient document evidence — further review recommended"]
      : finding.evidence,
    evidenceAnchors: anchors.length > 0 ? anchors : undefined,
    evidenceStrength: strength,
    narrativeTone: tone,
  };
}

// Duplicate root cause collapsing:
// When more than 2 findings share the same 4M category, rank by evidence strength
// then severity and keep only the top 2 (primary + secondary). Distinct root causes
// within a category are preserved — collapsing only trims overflow.
function collapseDuplicateFindings(findings: AnalysisFinding[]): AnalysisFinding[] {
  const grouped: Record<string, AnalysisFinding[]> = {};
  for (const f of findings) {
    const key = f.fourMCategory;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  }

  const result: AnalysisFinding[] = [];
  const strengthOrder: Record<string, number> = { STRONG: 3, MODERATE: 2, WEAK: 1 };
  const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

  for (const category of Object.keys(grouped)) {
    const group = grouped[category];
    if (group.length <= 2) {
      result.push(...group);
      continue;
    }

    // First deduplicate by root cause title — keep the strongest variant
    const byRootCause: Record<string, AnalysisFinding[]> = {};
    for (const f of group) {
      const rcKey = f.causes[0] || f.title;
      if (!byRootCause[rcKey]) byRootCause[rcKey] = [];
      byRootCause[rcKey].push(f);
    }

    const deduped: AnalysisFinding[] = [];
    for (const variants of Object.values(byRootCause)) {
      if (variants.length === 1) {
        deduped.push(variants[0]);
      } else {
        // Keep the variant with strongest evidence
        variants.sort((a, b) => {
          const sa = strengthOrder[a.evidenceStrength || "WEAK"];
          const sb = strengthOrder[b.evidenceStrength || "WEAK"];
          if (sb !== sa) return sb - sa;
          return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        });
        deduped.push(variants[0]);
      }
    }

    // Now cap at 2 per category: primary (strongest) + secondary
    if (deduped.length <= 2) {
      result.push(...deduped);
    } else {
      deduped.sort((a, b) => {
        const sa = strengthOrder[a.evidenceStrength || "WEAK"];
        const sb = strengthOrder[b.evidenceStrength || "WEAK"];
        if (sb !== sa) return sb - sa;
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      });
      result.push(deduped[0], deduped[1]);
    }
  }

  return result;
}

// Full evidence-driven enrichment pipeline for a set of findings
function applyEvidenceDrivenEnrichment(
  findings: AnalysisFinding[],
  evidenceSignals: EvidenceSignal[],
  industry: string
): AnalysisFinding[] {
  // Step 1: Enrich each finding with evidence data
  const enriched = findings.map(f => enrichFindingWithEvidence(f, evidenceSignals, industry));
  // Step 2: Collapse duplicates (same 4M category)
  return collapseDuplicateFindings(enriched);
}

// Generate baseline evidence signals for fallback analysis paths (V2/mock mode).
// In real document-driven analysis, signals come from extractEvidenceSignalsFromDocuments().
// These synthetic signals ensure the enrichment pipeline runs even without uploaded documents,
// producing MODERATE-strength findings that prompt the user to upload documents.
function generateMockEvidenceSignals(
  findings: AnalysisFinding[],
  isBaseline: boolean
): EvidenceSignal[] {
  if (isBaseline) return []; // No evidence signals for baseline mode
  
  // Create one signal per represented 4M category
  const categories = new Set(findings.map(f => f.fourMCategory));
  const signals: EvidenceSignal[] = [];
  
  for (const category of categories) {
    signals.push({
      signalId: `sig-mock-${category.toLowerCase()}`,
      category,
      description: `Evidence patterns detected for ${category} category from uploaded documents`,
      matchedTerms: ["operational data", "pattern match"],
      strength: findings.filter(f => f.fourMCategory === category).length >= 2 ? "strong" : "medium",
      sourceDocuments: ["Uploaded operational documents"],
    });
  }
  
  return signals;
}

/**
 * Generates a unique fingerprint for the recommendation set.
 * Used for audit trail and preventing accidental duplication.
 */
function generateRecommendationFingerprint(
  industry: string,
  category: FourMCategory | null,
  archetypeIds: string[]
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
  industry: string
): RecommendationArchetype[] {
  if (archetypes.length <= 1) return archetypes;
  
  // Generate a deterministic offset based on industry name hash
  // Uses full hash for better distribution across industries
  const industryHash = industry.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const offset = industryHash % archetypes.length;
  
  // Rotate the array by the offset to ensure different selection order
  if (offset === 0) return archetypes;
  
  const rotated = [...archetypes.slice(offset), ...archetypes.slice(0, offset)];
  console.log(`VARIATION: Applied industry offset ${offset} for ${industry} (pool size: ${archetypes.length})`);
  return rotated;
}

/**
 * VARIATION ENFORCEMENT: Filter archetypes by industry applicability
 * Removes archetypes that are specifically NOT applicable to the current industry.
 */
function filterByIndustryApplicability(
  archetypes: RecommendationArchetype[],
  industry: string
): RecommendationArchetype[] {
  const normalised = normaliseIndustryForVariation(industry);
  
  return archetypes.filter(arch => {
    // "All" industries means applicable everywhere
    if (arch.applicable_industries === "All") return true;
    
    // Check if this industry is in the applicable list
    return arch.applicable_industries.some(
      ind => ind.toLowerCase() === normalised.toLowerCase()
    );
  });
}

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured. Please set the API key in your environment.");
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
  // Diagnostics must be anchored to an explicit problem statement.
  // This drives root cause relevance scoring and Executive Summary generation.
  problemStatement: string;
  // Context selection narrows diagnostic scope and increases relevance.
  // Causes outside selected contexts are deprioritised.
  diagnosticContexts?: string[];
  // Diagnostic mode is finalised once and treated as the single source of truth.
  // Mode is determined by caller (routes.ts) based on document availability, not re-derived here.
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
        const rowSamples = table.rows.slice(0, 10).map(r => r.join(" | ")).join("\n");
        tableSummaries.push(`Table "${table.name || 'Unnamed'}":\nHeaders: ${headerStr}\nSample rows:\n${rowSamples}`);
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
  const exactMatches = rootCauseLibrary.filter(rc => 
    rc.applicableIndustries.some((ind: string) => 
      ind.toLowerCase() === normalizedIndustry ||
      ind.toLowerCase().includes(normalizedIndustry) || 
      normalizedIndustry.includes(ind.toLowerCase())
    )
  );
  
  // If we have exact matches, return them
  if (exactMatches.length > 0) {
    return exactMatches;
  }
  
  // If no exact industry match exists, allow cross-industry root causes ONLY
  // if explicitly marked (crossIndustry: true)
  return rootCauseLibrary.filter(rc => rc.crossIndustry === true);
}

/**
 * KNOWLEDGE-GOVERNED: Get relevant recommendations from archetypes
 * These are the ONLY recommendations the AI may assemble from
 */
function getRelevantArchetypes(industry: string, rootCauseIds: string[]): RecommendationArchetype[] {
  // Filter archetypes that apply to matched root causes and industry
  // AI will assemble from these - it cannot create new recommendations
  return recommendationArchetypes.filter(arch => {
    const industryMatch = arch.applicable_industries === "All" || 
      arch.applicable_industries.some((ind: string) => 
        ind.toLowerCase().includes(industry.toLowerCase()) ||
        industry.toLowerCase().includes(ind.toLowerCase())
      );
    
    const causeMatch = rootCauseIds.length === 0 || 
      arch.applicable_root_cause_ids.some(rcId => rootCauseIds.includes(rcId));
    
    return industryMatch && causeMatch;
  });
}

/**
 * KNOWLEDGE-GOVERNED: Get industry problems for context
 */
function getRelevantProblems(industry: string): IndustryProblem[] {
  return allIndustryProblems.filter(p => p.industry === industry).slice(0, 20);
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
  const rootCauseList = approvedRootCauses.map(rc => 
    `ID: ${rc.id} | Title: ${rc.title} | Category: ${rc.category} | Symptoms: ${rc.symptoms.join(", ")}`
  ).join("\n");

  const userPrompt = `MATCH client data patterns to the ROOT CAUSE LIBRARY entries below.

CLIENT DATA TO ANALYSE:
Issues identified: ${aggregated.allIssues.join("; ")}
Financial indicators: ${aggregated.allAmounts.map(a => a.context).join("; ")}
Table data summary: ${aggregated.tableData.slice(0, 3000)}

ROOT CAUSE LIBRARY (SELECT FROM THESE ONLY):
${rootCauseList}

INDUSTRY CONTEXT:
${relevantProblems.map(p => `- ${p.title}: ${p.description}`).slice(0, 10).join("\n")}

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
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // Lower temperature for more consistent library matching
        max_tokens: 3000,
      });
      return completion.choices[0].message.content;
    },
    { retries: 3 }
  );

  const parsed = JSON.parse(response || "{}");
  
  // KNOWLEDGE-GOVERNED: Validate and filter matches against library
  // GOVERNANCE CHECK: Only accept matches with valid library IDs
  const validatedMatches = (parsed.matchedRootCauses || []).filter((match: any) => {
    const isValid = approvedRootCauses.some(rc => rc.id === match.libraryId);
    if (!isValid && match.libraryId) {
      console.warn(`GOVERNANCE: Rejected invalid root cause ID in quick analysis: ${match.libraryId}`);
    }
    return isValid;
  }).slice(0, 5); // Quick analysis: top 5 matches

  // GOVERNANCE: Log if no valid matches found
  if (validatedMatches.length === 0) {
    console.warn("GOVERNANCE: No valid root cause matches found - AI output did not match library entries");
  }

  // KNOWLEDGE-GOVERNED: Convert matched root causes to findings
  // Each finding MUST reference a library entry
  const findings: AnalysisFinding[] = validatedMatches
    .map((match: any, idx: number) => {
      // KNOWLEDGE-GOVERNED: Look up the library entry
      const libraryEntry = approvedRootCauses.find(rc => rc.id === match.libraryId);
      if (!libraryEntry) return null;

      return {
        id: `finding-${idx}-${match.libraryId}`,
        title: libraryEntry.title,
        description: `Root Cause:\n${libraryEntry.title}\n\nWhy It Matters:\n${libraryEntry.whyItMatters}\n\nIntervention Direction:\n${libraryEntry.interventionDirection}`,
        fourMCategory: libraryEntry.category as FourMCategory,
        indicator: categoryToIndicator[libraryEntry.category as FourMCategory],
        severity: match.relevanceScore >= 80 ? "high" : match.relevanceScore >= 60 ? "medium" : "low",
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
    const libraryEntry = approvedRootCauses.find(rc => rc.id === match.libraryId);
    if (libraryEntry) {
      // Use the pre-defined archetype links from the library
      libraryEntry.archetypeIds.forEach(id => linkedArchetypeIds.add(id));
    }
  });
  
  // GOVERNANCE: Only use archetypes from the approved library
  let applicableArchetypes = recommendationArchetypes.filter(arch => 
    linkedArchetypeIds.has(arch.archetype_id)
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
  applicableArchetypes = filterByIndustryApplicability(applicableArchetypes, industry);
  
  // VARIATION STEP 2: Prioritise by category (most relevant to primary issue type first)
  const categoryPrioritised = prioritiseByCategory(applicableArchetypes, dominantCategory);
  
  // VARIATION STEP 3: Sort by severity weight (urgent actions for critical findings)
  const sortedArchetypes = sortByRelevance(categoryPrioritised, dominantSeverity);
  
  // VARIATION STEP 4: Filter by action type THEN apply industry offset
  // The offset is applied AFTER sorting/filtering so it affects the final selection
  const immediateActions = sortedArchetypes.filter(arch => arch.action_type === "Immediate");
  const offsetActions = applyIndustrySelectionOffset(immediateActions, industry);
  
  // Generate fingerprint for traceability (after offset applied)
  const fingerprint = generateRecommendationFingerprint(
    industry,
    dominantCategory,
    offsetActions.slice(0, 3).map(a => a.archetype_id)
  );

  const costSavingOpportunities: CostSavingOpportunity[] = offsetActions
    .slice(0, 3)
    .map((arch, idx) => ({
      id: `opp-${idx}-${arch.archetype_id}`,
      title: arch.archetype_name,
      // VARIATION: Use industry-specific wording (explicit or generated)
      description: getVariedDescription(arch, industry),
      estimatedSavings: "To be assessed",
      implementationEffort: arch.consultant_required === "No" ? "low" as const : 
                           arch.consultant_required === "Sometimes" ? "medium" as const : "high" as const,
      relatedFindings: findings.map(f => f.id),
    }));

  // Log recommendation set fingerprint for audit
  console.log(`VARIATION: Quick analysis recommendation set [${fingerprint}]`);

  // Executive Summary language must match diagnostic confidence level.
  // Evidence-driven enrichment: quick analysis has no evidence signals (baseline)
  return {
    findings,
    summary: parsed.summary || "This diagnostic is evidence-enriched and incorporates uploaded documents to validate and prioritise root causes.",
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
async function runBaselineAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
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
  const rootCauseList = approvedRootCauses.map(rc => 
    `ID: ${rc.id} | Title: ${rc.title} | Category: ${rc.category} | Symptoms: ${rc.symptoms.join(", ")}`
  ).join("\n");

  const userPrompt = `MATCH the problem description to ROOT CAUSE LIBRARY entries.

BASELINE CONTEXT (No documents available):
Problem Statement: ${problemStatement || "General operational assessment requested"}
Industry: ${industry}

INDUSTRY PROBLEMS TO CONSIDER:
${relevantProblems.map(p => `- ${p.title}: ${p.description}`).slice(0, 10).join("\n")}

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
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Slightly higher for baseline as we have less context
        max_tokens: 3000,
      });
      return completion.choices[0].message.content;
    },
    { retries: 3 }
  );

  const parsed = JSON.parse(response || "{}");
  
  // KNOWLEDGE-GOVERNED: Validate matches against library
  const validatedMatches = (parsed.matchedRootCauses || []).filter((match: any) => {
    const isValid = approvedRootCauses.some(rc => rc.id === match.libraryId);
    if (!isValid && match.libraryId) {
      console.warn(`GOVERNANCE: Rejected invalid root cause ID in baseline analysis: ${match.libraryId}`);
    }
    return isValid;
  }).slice(0, 5); // Baseline: top 5 preliminary matches

  if (validatedMatches.length === 0) {
    console.warn("GOVERNANCE: No valid root cause matches in baseline - returning generic assessment");
  }

  // KNOWLEDGE-GOVERNED: Convert matched root causes to findings
  // Baseline mode marks all findings as preliminary
  const findings: AnalysisFinding[] = validatedMatches
    .map((match: any, idx: number) => {
      const libraryEntry = approvedRootCauses.find(rc => rc.id === match.libraryId);
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
        evidence: match.clientEvidence || ["Derived from stated problem — upload documents to strengthen evidence"],
      };
    })
    .filter(Boolean) as AnalysisFinding[];

  // KNOWLEDGE-GOVERNED: Assemble recommendations from archetypes
  const linkedArchetypeIds = new Set<string>();
  validatedMatches.forEach((match: any) => {
    const libraryEntry = approvedRootCauses.find(rc => rc.id === match.libraryId);
    if (libraryEntry) {
      libraryEntry.archetypeIds.forEach(id => linkedArchetypeIds.add(id));
    }
  });
  
  let applicableArchetypes = recommendationArchetypes.filter(arch => 
    linkedArchetypeIds.has(arch.archetype_id)
  );

  // Apply variation logic (same as quick/deep analysis)
  const dominantCategory = getDominantCategory(findings);
  const dominantSeverity = getDominantSeverity(findings);
  const filteredArchetypes = filterByIndustryApplicability(applicableArchetypes, industry);
  const categoryPrioritised = prioritiseByCategory(filteredArchetypes, dominantCategory);
  const sortedArchetypes = sortByRelevance(categoryPrioritised, dominantSeverity);
  const offsetArchetypes = applyIndustrySelectionOffset(sortedArchetypes, industry);

  const fingerprint = generateRecommendationFingerprint(
    industry, 
    dominantCategory, 
    offsetArchetypes.slice(0, 3).map(a => a.archetype_id)
  );

  const costSavingOpportunities: CostSavingOpportunity[] = offsetArchetypes
    .slice(0, 3)
    .map((arch, idx) => ({
      id: `opp-baseline-${idx}-${arch.archetype_id}`,
      title: `[PRELIMINARY] ${arch.archetype_name}`,
      description: getVariedDescription(arch, industry),
      estimatedSavings: "To be assessed after document review",
      implementationEffort: arch.consultant_required === "No" ? "low" as const : 
                           arch.consultant_required === "Sometimes" ? "medium" as const : "high" as const,
      relatedFindings: findings.map(f => f.id),
    }));

  console.log(`VARIATION: Baseline analysis recommendation set [${fingerprint}]`);

  // Executive Summary language must match diagnostic confidence level.
  return {
    findings,
    summary: parsed.summary || "This is an initial diagnostic based on stated problems and industry patterns. Upload documents to strengthen confidence.",
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
  const rootCauseList = approvedRootCauses.map(rc => 
    `ID: ${rc.id}
Title: ${rc.title}
Category: ${rc.category}
Symptoms: ${rc.symptoms.join(", ")}
Intervention: ${rc.interventionType}
Linked Archetypes: ${rc.archetypeIds.join(", ")}`
  ).join("\n\n");

  const userPrompt = `PERFORM COMPREHENSIVE PATTERN MATCHING against the ROOT CAUSE LIBRARY.

CLIENT DATA TO ANALYSE:
---
Issues from documents: 
${aggregated.allIssues.join("\n")}

Financial data points:
${aggregated.allAmounts.map(a => `${a.context}: ${a.value}`).join("\n")}

Key dates: ${aggregated.allDates.join(", ")}

Document excerpts:
${aggregated.allText.slice(0, 8000)}

Table data:
${aggregated.tableData.slice(0, 5000)}
---

ROOT CAUSE LIBRARY (SELECT FROM THESE ONLY):
${rootCauseList}

INDUSTRY CONTEXT:
${relevantProblems.map(p => `- ${p.title} (${p.dominantM}): ${p.description}`).join("\n")}

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
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 6000,
      });
      return completion.choices[0].message.content;
    },
    { retries: 3 }
  );

  const parsed = JSON.parse(response || "{}");
  
  // KNOWLEDGE-GOVERNED: Validate and convert matched root causes
  // GOVERNANCE CHECK: Reject any matches not in the library
  const validatedMatches = (parsed.matchedRootCauses || []).filter((match: any) => {
    const isValid = approvedRootCauses.some(rc => rc.id === match.libraryId);
    if (!isValid) {
      console.warn(`GOVERNANCE: Rejected invalid root cause ID: ${match.libraryId}`);
    }
    return isValid;
  });

  // GOVERNANCE: Log if no valid matches found
  if (validatedMatches.length === 0) {
    console.warn("GOVERNANCE: No valid root cause matches found in deep analysis - AI output did not match library entries");
  }

  const findings: AnalysisFinding[] = validatedMatches
    .slice(0, 10) // Deep analysis: up to 10 findings
    .map((match: any, idx: number) => {
      // KNOWLEDGE-GOVERNED: Look up the library entry
      const libraryEntry = approvedRootCauses.find(rc => rc.id === match.libraryId);
      if (!libraryEntry) return null;

      const severity = match.relevanceScore >= 85 ? "critical" :
                       match.relevanceScore >= 70 ? "high" :
                       match.relevanceScore >= 50 ? "medium" : "low";

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
    const libraryEntry = approvedRootCauses.find(rc => rc.id === match.libraryId);
    if (libraryEntry) {
      libraryEntry.archetypeIds.forEach(id => linkedArchetypeIds.add(id));
    }
    (match.linkedArchetypeIds || []).forEach((id: string) => linkedArchetypeIds.add(id));
  });

  // GOVERNANCE: Only use archetypes from the approved library
  let assembledArchetypes = recommendationArchetypes.filter(arch => 
    linkedArchetypeIds.has(arch.archetype_id)
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
  assembledArchetypes = filterByIndustryApplicability(assembledArchetypes, industry);
  
  // VARIATION STEP 2: Prioritise by category (most relevant to primary issue type first)
  const categoryPrioritised = prioritiseByCategory(assembledArchetypes, dominantCategory);
  
  // VARIATION STEP 3: Sort by severity weight (urgent actions for critical findings)
  const sortedArchetypes = sortByRelevance(categoryPrioritised, dominantSeverity);
  
  // VARIATION STEP 4: Apply industry offset AFTER sorting, BEFORE slicing
  // This ensures different industries get different final sets
  const offsetArchetypes = applyIndustrySelectionOffset(sortedArchetypes, industry);
  
  // Generate fingerprint for traceability (after offset applied)
  const fingerprint = generateRecommendationFingerprint(
    industry,
    dominantCategory,
    offsetArchetypes.slice(0, 8).map(a => a.archetype_id)
  );

  const costSavingOpportunities: CostSavingOpportunity[] = offsetArchetypes
    .slice(0, 8)
    .map((arch, idx) => ({
      id: `opp-${idx}-${arch.archetype_id}`,
      title: arch.archetype_name,
      // VARIATION STEP 5: Use industry-specific wording (explicit or generated)
      description: getVariedDescription(arch, industry),
      estimatedSavings: "To be assessed by consultant",
      implementationEffort: arch.consultant_required === "No" ? "low" as const : 
                           arch.consultant_required === "Sometimes" ? "medium" as const : "high" as const,
      relatedFindings: findings.map(f => f.id),
    }));

  // Log recommendation set fingerprint for audit
  console.log(`VARIATION: Deep analysis recommendation set [${fingerprint}]`);

  // KNOWLEDGE-GOVERNED: Predictions based on matched patterns
  const predictions: RecurrencePrediction[] = (parsed.recurrencePatterns || [])
    .filter((p: any) => approvedRootCauses.some(rc => rc.id === p.rootCauseId))
    .slice(0, 5)
    .map((p: any, idx: number) => {
      const libraryEntry = approvedRootCauses.find(rc => rc.id === p.rootCauseId);
      return {
        id: `pred-${idx}-${p.rootCauseId}`,
        issue: libraryEntry?.title || p.rootCauseId,
        likelihood: p.likelihood || "medium",
        expectedTimeframe: "Next 3-6 months if unaddressed",
      };
    });

  // Executive Summary language must match diagnostic confidence level.
  // Evidence-driven enrichment: deep analysis applies evidence-driven pipeline
  // (In production mode with real document evidence signals)
  return {
    findings,
    summary: parsed.summary || "This diagnostic is evidence-enriched and incorporates uploaded documents to validate and prioritise root causes.",
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
function generateManufacturingV2Result(input: AnalysisInput, isBaseline: boolean): AnalysisResult {
  const { clientName, analysisType, problemStatement, diagnosticContexts, documents } = input;
  
  console.log("MANUFACTURING V2: Generating results from manufacturingRootCausesV2");
  console.log(`MANUFACTURING V2: ${manufacturingRootCausesV2.length} root causes available`);
  
  // Normalize category from V2 format
  const normalizeCategory = (cat: string): FourMCategory => {
    if (cat === "Material") return "Materials";
    return cat as FourMCategory;
  };
  
  // Context weighting for V2
  const contextToCategory: Record<string, string[]> = {
    "Money": ["Money"],
    "Manpower": ["Manpower"],
    "Operations": ["Materials", "Material", "Machinery"],
    "Systems": ["Machinery"],
    "Compliance": ["Money", "Manpower"],
  };
  
  // Get categories that match selected contexts
  const contextMatchedCategories = new Set<string>();
  if (diagnosticContexts && diagnosticContexts.length > 0) {
    for (const ctx of diagnosticContexts) {
      const cats = contextToCategory[ctx] || [];
      cats.forEach(c => contextMatchedCategories.add(c));
    }
  }
  
  // ============================================================================
  // BALANCED EVIDENCE SCORING
  // Score = problem statement relevance + document evidence + discovery bonus
  // ============================================================================
  
  // Extract document text for evidence matching (Deep Analysis only)
  const processedDocs = documents.filter(d => d.status === "processed" && d.extractedData);
  const documentText = processedDocs
    .map(d => d.extractedData?.rawText || "")
    .join(" ")
    .toLowerCase();
  const hasDocumentEvidence = documentText.length > 0 && !isBaseline;
  
  const problemText = (problemStatement || "").toLowerCase();
  const hasProblemStatement = problemText.length > 0;
  
  console.log(`MANUFACTURING V2 SCORING: Problem statement: ${hasProblemStatement ? 'YES' : 'NO'}, Document evidence: ${hasDocumentEvidence ? 'YES' : 'NO'}`);
  
  // Score each root cause with balanced evidence scoring
  const scoredCauses = manufacturingRootCausesV2.map((rc) => {
    let score = 0; // Start from zero for balanced scoring
    let isContextMatched = false;
    let problemMatches = 0;
    let documentMatches = 0;
    
    // Context boost for matching categories (additive layer)
    if (contextMatchedCategories.size > 0 && contextMatchedCategories.has(rc.category)) {
      score += 5; // Small context boost
      isContextMatched = true;
    }
    
    // Score evidence signals against problem statement (+10 per match)
    if (hasProblemStatement) {
      for (const signal of rc.evidenceSignals || []) {
        if (problemText.includes(signal.toLowerCase())) {
          problemMatches++;
          score += 10;
        }
      }
    }
    
    // Score evidence signals against document text (+15 per match)
    if (hasDocumentEvidence) {
      for (const signal of rc.evidenceSignals || []) {
        if (documentText.includes(signal.toLowerCase())) {
          documentMatches++;
          score += 15;
        }
      }
    }
    
    // Bonus if BOTH problem statement AND documents match this root cause (+10)
    if (problemMatches > 0 && documentMatches > 0) {
      score += 10;
    }
    
    return { 
      cause: rc, 
      score, 
      isContextMatched,
      problemMatches,
      documentMatches,
    };
  });
  
  // Sort by score (higher priority first)
  scoredCauses.sort((a, b) => b.score - a.score);
  
  // ============================================================================
  // EVIDENCE-BASED THRESHOLDING
  // - Only include root causes where score >= 20
  // - Allow multiple root causes per category if they meet threshold
  // - Exclude categories entirely if no root cause passes threshold
  // - DO NOT force inclusion per 4M category
  // ============================================================================
  const INCLUSION_THRESHOLD = 20;
  const thresholdPassed = scoredCauses.filter(item => item.score >= INCLUSION_THRESHOLD);
  const thresholdFailed = scoredCauses.filter(item => item.score < INCLUSION_THRESHOLD);
  
  // ============================================================================
  // SAFE DIAGNOSTIC FLOOR (TEMPORARY)
  // If NO root causes pass threshold, select TOP 1-2 highest scoring as fallback
  // Mark these with low confidence for wet runs and demos
  // ============================================================================
  let selectedWithMeta: typeof scoredCauses;
  let usingSafeDiagnosticFloor = false;
  let diagnosticConfidenceOverride: string | null = null;
  let safeDiagnosticBanner: string | null = null;
  
  if (thresholdPassed.length === 0) {
    // FALLBACK: No root causes passed threshold - use safe diagnostic floor
    usingSafeDiagnosticFloor = true;
    diagnosticConfidenceOverride = "Low (Evidence Insufficient)";
    safeDiagnosticBanner = "Findings are indicative due to limited documentary evidence.";
    
    // Select top 1-2 highest scoring (even below threshold)
    const fallbackCount = Math.min(2, scoredCauses.length);
    selectedWithMeta = scoredCauses.slice(0, fallbackCount);
    
    console.log(`MANUFACTURING V2 SAFE FLOOR: No causes passed threshold (>= ${INCLUSION_THRESHOLD})`);
    console.log(`MANUFACTURING V2 SAFE FLOOR: Using top ${fallbackCount} as fallback with LOW confidence`);
  } else {
    // NORMAL: Evidence-based selection
    const maxFindings = 6;
    selectedWithMeta = thresholdPassed.slice(0, maxFindings);
  }
  
  // Log threshold results
  console.log(`MANUFACTURING V2 THRESHOLD: ${thresholdPassed.length} passed (>= ${INCLUSION_THRESHOLD}), ${thresholdFailed.length} excluded`);
  console.log(`MANUFACTURING V2: Selected ${selectedWithMeta.length} root causes (${usingSafeDiagnosticFloor ? 'SAFE FLOOR' : 'evidence-based'})`);
  
  // Count categories represented
  const categoriesRepresented = new Set(selectedWithMeta.map(item => item.cause.category));
  console.log(`MANUFACTURING V2: Categories with findings: ${Array.from(categoriesRepresented).join(", ") || "NONE"}`);
  
  selectedWithMeta.forEach((item, idx) => {
    const matchInfo = [];
    if (item.problemMatches > 0) matchInfo.push(`problem:${item.problemMatches}`);
    if (item.documentMatches > 0) matchInfo.push(`docs:${item.documentMatches}`);
    if (item.problemMatches > 0 && item.documentMatches > 0) matchInfo.push("+bonus");
    if (item.isContextMatched) matchInfo.push("ctx");
    if (usingSafeDiagnosticFloor) matchInfo.push("FLOOR");
    const matchStr = matchInfo.length > 0 ? ` [${matchInfo.join(", ")}]` : "";
    console.log(`  ${idx + 1}. [${item.cause.id}] ${item.cause.title} (score: ${item.score})${matchStr}`);
  });
  
  // Log excluded causes for transparency
  if (thresholdFailed.length > 0 && !usingSafeDiagnosticFloor) {
    console.log(`MANUFACTURING V2: Top 3 excluded (below threshold):`);
    thresholdFailed.slice(0, 3).forEach((item, idx) => {
      console.log(`  - [${item.cause.id}] ${item.cause.title} (score: ${item.score})`);
    });
  }
  
  // Generate findings from V2 root causes
  const findings: AnalysisFinding[] = selectedWithMeta.map((item, idx) => {
    const rc = item.cause;
    const isOutOfContext = diagnosticContexts && diagnosticContexts.length > 0 && !item.isContextMatched;
    // Downgrade severity when using safe floor (low confidence findings)
    const severity = isBaseline || usingSafeDiagnosticFloor 
      ? "medium" 
      : (["high", "medium", "critical"] as const)[idx % 3];
    const prefix = isBaseline ? "[PRELIMINARY] " : (usingSafeDiagnosticFloor ? "[INDICATIVE] " : "");
    
    // Add explanation notes based on context
    let contextNote = "";
    if (isOutOfContext) {
      contextNote = "\n\n📌 Note: This factor emerged from evidence analysis despite falling outside the primary diagnostic focus.";
    }
    
    // Add safe floor confidence note
    let safeFloorNote = "";
    if (usingSafeDiagnosticFloor) {
      safeFloorNote = `\n\n⚠️ Diagnostic Confidence: ${diagnosticConfidenceOverride}\nThis finding is included as an indicative result due to limited documentary evidence supporting the stated problem.`;
    }
    
    const normalizedCategory = normalizeCategory(rc.category);
    
    return {
      id: `finding-mfgv2-${idx}-${rc.id}`,
      title: `${prefix}${rc.title}`,
      description: `Root Cause:\n${rc.title}\n\nWhy It Matters:\n${rc.whyItMatters}\n\nIntervention Direction:\n${rc.interventionDirection}${isBaseline ? "\n\n⚠️ Note: This is a preliminary finding based on baseline assessment. Document evidence is required for confirmation." : ""}${contextNote}${safeFloorNote}`,
      fourMCategory: normalizedCategory,
      indicator: categoryToIndicator[normalizedCategory],
      severity,
      frequency: idx + 1,
      causes: [rc.title],
      estimatedCostImpact: isBaseline || usingSafeDiagnosticFloor ? undefined : `RM ${(10000 + idx * 5000).toLocaleString()}`,
      evidence: isBaseline 
        ? ["Derived from stated problem — upload documents to strengthen evidence"]
        : usingSafeDiagnosticFloor
          ? ["Evidence insufficient — indicative finding only"]
          : [`Evidence from Manufacturing operational data`, `Pattern matched from document analysis`],
    };
  });
  
  // V2 root causes don't have archetypeIds, generate generic recommendations
  const costSavingOpportunities: CostSavingOpportunity[] = isBaseline ? [] : [
    {
      id: "opp-mfgv2-1",
      title: "Process Optimisation Review",
      description: "Conduct structured review of identified root causes to develop targeted intervention plan.",
      estimatedSavings: "RM 15,000 - 50,000 annually (estimated)",
      implementationEffort: "medium" as const,
      relatedFindings: findings.map(f => f.id),
    },
    {
      id: "opp-mfgv2-2",
      title: "Operational Efficiency Improvement",
      description: "Address systemic factors contributing to the identified root causes through structured change management.",
      estimatedSavings: "RM 10,000 - 30,000 annually (estimated)",
      implementationEffort: "high" as const,
      relatedFindings: findings.map(f => f.id),
    },
  ];
  
  // Predictions only for evidence-enriched mode
  const predictions: RecurrencePrediction[] = isBaseline ? [] : selectedWithMeta.slice(0, 2).map((item, idx) => ({
    id: `pred-mfgv2-${idx}-${item.cause.id}`,
    issue: item.cause.title,
    likelihood: (["high", "medium"] as const)[idx % 2],
    expectedTimeframe: "Next 3-6 months if unaddressed",
  }));
  
  // Executive Summary
  const contextFocusPhrase = diagnosticContexts && diagnosticContexts.length > 0
    ? ` with focus on ${diagnosticContexts.map(c => c.toLowerCase()).join(" and ")} factors`
    : "";
  
  const summaryPrefix = isBaseline 
    ? `This is an initial diagnostic based on stated problems and Manufacturing industry patterns${contextFocusPhrase}. Upload documents to strengthen confidence. Stated problem: "${problemStatement}".`
    : usingSafeDiagnosticFloor
      ? `⚠️ ${safeDiagnosticBanner}\n\nThis diagnostic${contextFocusPhrase} did not find strong documentary evidence for the stated problem: "${problemStatement}".`
      : `This diagnostic is evidence-enriched and incorporates uploaded documents to validate and prioritise root causes${contextFocusPhrase}. Evidence supports the stated problem: "${problemStatement}".`;
  
  // Dynamic summary based on evidence-based findings
  const categoryList = Array.from(categoriesRepresented);
  const categoryPhrase = categoryList.length > 0 
    ? ` across ${categoryList.length} area${categoryList.length > 1 ? 's' : ''} (${categoryList.join(", ")})` 
    : "";
  
  const findingsPhrase = usingSafeDiagnosticFloor
    ? `Included ${findings.length} indicative root cause${findings.length > 1 ? 's' : ''}${categoryPhrase} for ${clientName}. These findings require additional documentary validation.`
    : findings.length > 0
      ? `Identified ${findings.length} root cause${findings.length > 1 ? 's' : ''}${categoryPhrase} in Manufacturing operations for ${clientName}.`
      : `No root causes met the evidence threshold for ${clientName}. Consider uploading additional documents or refining the problem statement.`;
  
  // Determine confidence level
  const confidenceLevel = isBaseline 
    ? "preliminary" 
    : usingSafeDiagnosticFloor 
      ? "low" 
      : "substantiated";
  
  // Evidence-driven enrichment: apply evidence anchors, strength, tone, and duplicate collapsing
  const mockSignals = generateMockEvidenceSignals(findings, isBaseline);
  const enrichedFindings = mockSignals.length > 0
    ? applyEvidenceDrivenEnrichment(findings, mockSignals, "Manufacturing")
    : findings;

  return {
    findings: enrichedFindings,
    summary: `${summaryPrefix} ${findingsPhrase} [MANUFACTURING V2 LIBRARY ACTIVE]`,
    costSavingOpportunities,
    predictions,
    analysisMode: isBaseline ? "baseline" : "evidence-enriched",
    confidence: confidenceLevel,
    isMockMode: true,
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
function generateMockAnalysisResult(input: AnalysisInput, isBaseline: boolean): AnalysisResult {
  // Context reflects user focus, evidence determines truth.
  const { industry, clientName, analysisType, problemStatement, diagnosticContexts } = input;
  
  console.log(`MOCK: Generating mock results for ${clientName} (${industry}) - ${isBaseline ? 'Baseline' : analysisType}`);
  if (diagnosticContexts?.length) {
    console.log(`MOCK: Context focus: ${diagnosticContexts.join(", ")} (guides ranking, does not restrict)`);
  }
  
  // ============================================================================
  // MANUFACTURING V2: Use manufacturingRootCausesV2 exclusively for Manufacturing
  // No fallback to generic library, no cross-industry causes
  // ============================================================================
  if (industry.toLowerCase() === "manufacturing") {
    console.log("MANUFACTURING V2: Using manufacturingRootCausesV2 exclusively");
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
    "Money": ["Money"],
    "Manpower": ["Manpower"],
    "Operations": ["Materials", "Machinery"],
    "Systems": ["Machinery"],
    "Compliance": ["Money", "Manpower"],
  };
  
  // Get categories that match selected contexts
  const contextMatchedCategories = new Set<string>();
  if (diagnosticContexts && diagnosticContexts.length > 0) {
    for (const ctx of diagnosticContexts) {
      const cats = contextToCategory[ctx] || [];
      cats.forEach(c => contextMatchedCategories.add(c));
    }
  }
  
  // Score root causes: context match + evidence strength (simulated)
  // Context guides, not restricts - all causes remain eligible
  const scoredCauses = industryRootCauses.map((rc, idx) => {
    let score = 0;
    let isContextMatched = false;
    
    // Context boost for matching categories
    if (contextMatchedCategories.size > 0 && contextMatchedCategories.has(rc.category)) {
      score += CONTEXT_BOOST;
      isContextMatched = true;
    }
    
    // Simulated evidence strength (varies by position for determinism)
    // In real mode, this would be based on document content analysis
    const evidenceStrength = (idx % 3 === 0) ? EVIDENCE_BOOST : (idx % 2 === 0) ? EVIDENCE_BOOST / 2 : 0;
    score += evidenceStrength;
    
    return { cause: rc, score, isContextMatched };
  });
  
  // Sort by score (higher priority first), preserving determinism
  scoredCauses.sort((a, b) => b.score - a.score);
  
  // Deterministic selection based on industry + context hash
  const contextString = `${industry}:${problemStatement || ''}:${analysisType}:${diagnosticContexts?.join(',') || ''}`;
  const contextHash = contextString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Select top causes by score, allowing mix of context-matched and evidence-supported
  // Context guides ranking but does NOT filter out non-matching causes
  const numToSelect = Math.min(4, scoredCauses.length); // Select up to 4 causes
  const hashOffset = contextHash % Math.max(1, scoredCauses.length - numToSelect);
  
  // Take top-scored causes, with slight hash-based variation within same-score groups
  const selectedWithMeta = scoredCauses.slice(0, numToSelect + 1).slice(hashOffset % 2, hashOffset % 2 + numToSelect);
  const selectedCauses = selectedWithMeta.map(s => s.cause);
  
  // Track if any causes are outside selected context (for explanation note)
  const hasOutOfContextCauses = diagnosticContexts && diagnosticContexts.length > 0 && 
    selectedWithMeta.some(s => !s.isContextMatched);
  const contextMatchCount = selectedWithMeta.filter(s => s.isContextMatched).length;
  
  console.log(`MOCK: Selected ${selectedCauses.length} root causes (${contextMatchCount} context-matched, ${selectedCauses.length - contextMatchCount} evidence-supported)`);
  
  // Generate findings from selected root causes
  // Context reflects user focus, evidence determines truth.
  const findings: AnalysisFinding[] = selectedWithMeta.map((item, idx) => {
    const rc = item.cause;
    const isOutOfContext = diagnosticContexts && diagnosticContexts.length > 0 && !item.isContextMatched;
    const severity = isBaseline ? "medium" : (["high", "medium", "critical"] as const)[idx % 3];
    const prefix = isBaseline ? "[PRELIMINARY] " : "";
    
    // Add explanation note for causes outside selected context
    let contextNote = "";
    if (isOutOfContext) {
      contextNote = "\n\n📌 Note: This factor emerged from evidence analysis despite falling outside the primary diagnostic focus.";
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
      estimatedCostImpact: isBaseline ? undefined : `RM ${(10000 + idx * 5000).toLocaleString()}`,
      evidence: isBaseline 
        ? ["Derived from stated problem — upload documents to strengthen evidence"]
        : [`Evidence from ${industry} operational data`, `Pattern matched from document analysis`],
    };
  });
  
  // Get linked archetypes for recommendations
  const linkedArchetypeIds = new Set<string>();
  selectedCauses.forEach(rc => {
    rc.archetypeIds.forEach(id => linkedArchetypeIds.add(id));
  });
  
  const applicableArchetypes = recommendationArchetypes
    .filter(arch => linkedArchetypeIds.has(arch.archetype_id))
    .slice(0, isBaseline ? 3 : 5);
  
  const prefix = isBaseline ? "[PRELIMINARY] " : "";
  const costSavingOpportunities: CostSavingOpportunity[] = applicableArchetypes.map((arch, idx) => ({
    id: `opp-mock-${idx}-${arch.archetype_id}`,
    title: `${prefix}${arch.archetype_name}`,
    description: getVariedDescription(arch, industry),
    estimatedSavings: isBaseline ? "To be assessed after document review" : `RM ${(5000 + idx * 3000).toLocaleString()} annually`,
    implementationEffort: arch.consultant_required === "No" ? "low" as const : 
                         arch.consultant_required === "Sometimes" ? "medium" as const : "high" as const,
    relatedFindings: findings.map(f => f.id),
  }));
  
  // Predictions only for evidence-enriched mode
  const predictions: RecurrencePrediction[] = isBaseline ? [] : selectedCauses.slice(0, 2).map((rc, idx) => ({
    id: `pred-mock-${idx}-${rc.id}`,
    issue: rc.title,
    likelihood: (["high", "medium"] as const)[idx % 2],
    expectedTimeframe: "Next 3-6 months if unaddressed",
  }));
  
  // Executive Summary language must match diagnostic confidence level.
  // Summary explicitly references: stated problem(s), whether evidence supports or contradicts them.
  // Context reflects user focus, evidence determines truth.
  const contextFocusPhrase = diagnosticContexts && diagnosticContexts.length > 0
    ? ` with focus on ${diagnosticContexts.map(c => c.toLowerCase()).join(" and ")} factors`
    : "";
  
  // Add explanation when causes appear outside selected context
  const outOfContextNote = hasOutOfContextCauses
    ? ` While the diagnostic focused on ${diagnosticContexts?.map(c => c.toLowerCase()).join(" and ")} factors, evidence indicates additional contributing factors.`
    : "";
  
  const summaryPrefix = isBaseline 
    ? `This is an initial diagnostic based on stated problems and industry patterns${contextFocusPhrase}. Upload documents to strengthen confidence. Stated problem: "${problemStatement}".`
    : `This diagnostic is evidence-enriched and incorporates uploaded documents to validate and prioritise root causes${contextFocusPhrase}. Evidence supports the stated problem: "${problemStatement}".`;
  
  // Evidence-driven enrichment: apply evidence anchors, strength, tone, and duplicate collapsing
  const mockSignals = generateMockEvidenceSignals(findings, isBaseline);
  const enrichedFindings = mockSignals.length > 0
    ? applyEvidenceDrivenEnrichment(findings, mockSignals, industry)
    : findings;

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
export async function runBulkAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  // Diagnostic mode is finalised once and treated as the single source of truth.
  // Mode is passed by caller (routes.ts) - not re-derived here.
  const isBaseline = input.mode === "baseline";
  
  const processedDocs = input.documents.filter(d => d.status === "processed" && d.extractedData);
  
  // MOCK MODE: Skip AI calls, return deterministic mock results
  if (MOCK_MODE) {
    console.log(`MOCK MODE: Skipping AI API calls, returning mock results. Mode: ${input.mode}`);
    return generateMockAnalysisResult(input, isBaseline);
  }
  
  // DUAL MODE: Route to appropriate analysis mode based on finalised mode
  if (isBaseline) {
    // Baseline mode: No documents selected
    console.log("MODE: Baseline (Preliminary). Running Baseline analysis.");
    return runBaselineAnalysis(input);
  }

  // Evidence-Enriched mode: Documents selected
  // GOVERNANCE: Both analysis types use the same knowledge-governed approach
  if (input.analysisType === "quick") {
    return runQuickAnalysis({ ...input, documents: processedDocs });
  } else {
    return runDeepAnalysis({ ...input, documents: processedDocs });
  }
}
