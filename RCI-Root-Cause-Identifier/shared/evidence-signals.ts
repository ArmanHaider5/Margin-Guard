/**
 * Evidence Signal Extraction Layer
 * 
 * Converts uploaded documents into structured evidence signals
 * that can influence root cause confidence and dominance.
 * 
 * RULES:
 * - Deterministic and rule-based (NO AI-generated language)
 * - Each signal belongs to ONE 4M category only
 * - Signals are extracted from document content via term matching
 * 
 * NOTE: Uses "Materials" (plural) to align with FourMCategory in schema.ts
 */

import type { FourMCategory } from "./schema";

export type EvidenceSignal = {
  signalId: string;
  category: FourMCategory;
  description: string;
  matchedTerms: string[];
  strength: "weak" | "medium" | "strong";
};

export interface ProcessedDocument {
  id: string;
  name: string;
  content: string;
  type: string;
}

type SignalRule = {
  category: EvidenceSignal["category"];
  terms: string[];
  descriptionTemplate: (matchedTerms: string[]) => string;
};

const SIGNAL_RULES: SignalRule[] = [
  {
    category: "Money",
    terms: [
      "overdue",
      "receivable",
      "late payment",
      "cash shortfall",
      "aged debt",
      "unpaid invoice",
      "collection issue",
      "bad debt",
      "payment delay",
      "cash flow problem"
    ],
    descriptionTemplate: (matched) => 
      `Repeated mentions of ${matched.slice(0, 3).join(", ")}${matched.length > 3 ? " and related terms" : ""}`
  },
  {
    category: "Manpower",
    terms: [
      "turnover",
      "resignation",
      "short staffed",
      "training gap",
      "headcount issue",
      "staff shortage",
      "skill gap",
      "absenteeism",
      "overtime",
      "understaffed"
    ],
    descriptionTemplate: (matched) =>
      `Evidence of workforce issues: ${matched.slice(0, 3).join(", ")}${matched.length > 3 ? " and related terms" : ""}`
  },
  {
    category: "Machinery",
    terms: [
      "breakdown",
      "downtime",
      "machine failure",
      "maintenance overdue",
      "equipment fault",
      "system error",
      "technical issue",
      "repair needed",
      "malfunction",
      "equipment aging"
    ],
    descriptionTemplate: (matched) =>
      `Equipment and system issues detected: ${matched.slice(0, 3).join(", ")}${matched.length > 3 ? " and related terms" : ""}`
  },
  {
    category: "Materials",
    terms: [
      "supplier delay",
      "stockout",
      "inventory mismatch",
      "quality rejection",
      "material shortage",
      "delivery delay",
      "stock discrepancy",
      "damaged goods",
      "expired stock",
      "procurement issue"
    ],
    descriptionTemplate: (matched) =>
      `Supply and inventory issues found: ${matched.slice(0, 3).join(", ")}${matched.length > 3 ? " and related terms" : ""}`
  }
];

function determineStrength(matchCount: number): EvidenceSignal["strength"] {
  if (matchCount >= 5) return "strong";
  if (matchCount >= 3) return "medium";
  return "weak";
}

function countTermOccurrences(
  content: string,
  terms: string[]
): { count: number; matchedTerms: string[] } {
  const lowerContent = content.toLowerCase();
  let totalCount = 0;
  const matchedTerms: string[] = [];

  for (const term of terms) {
    const lowerTerm = term.toLowerCase();
    const regex = new RegExp(`\\b${lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lowerContent.match(regex);
    if (matches && matches.length > 0) {
      totalCount += matches.length;
      if (!matchedTerms.includes(term)) {
        matchedTerms.push(term);
      }
    }
  }

  return { count: totalCount, matchedTerms };
}

/**
 * Extract evidence signals from processed documents.
 * 
 * This function is deterministic and rule-based.
 * It scans document content for predefined terms and
 * produces structured signals for each 4M category.
 * 
 * @param documents - Array of processed documents with content
 * @returns Array of evidence signals extracted from documents
 */
export function extractEvidenceSignalsFromDocuments(
  documents: ProcessedDocument[]
): EvidenceSignal[] {
  if (!documents || documents.length === 0) {
    return [];
  }

  const combinedContent = documents
    .map(doc => doc.content || "")
    .join(" ");

  if (!combinedContent.trim()) {
    return [];
  }

  const signals: EvidenceSignal[] = [];

  for (const rule of SIGNAL_RULES) {
    const { count, matchedTerms } = countTermOccurrences(combinedContent, rule.terms);

    if (count > 0 && matchedTerms.length > 0) {
      // Deterministic signalId: category + count + first 3 sorted terms
      const sortedTerms = [...matchedTerms].sort();
      const termsKey = sortedTerms.slice(0, 3).join("-").replace(/\s+/g, "_");
      const signal: EvidenceSignal = {
        signalId: `sig-${rule.category.toLowerCase()}-${count}-${termsKey}`,
        category: rule.category,
        description: rule.descriptionTemplate(matchedTerms),
        matchedTerms: sortedTerms,
        strength: determineStrength(count)
      };
      signals.push(signal);
    }
  }

  return signals;
}
