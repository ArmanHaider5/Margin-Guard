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
 * - Concrete signals (metrics, events) are extracted per-document
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
  sourceDocuments?: string[];
};

export interface ProcessedDocument {
  id: string;
  name: string;
  content: string;
  type: string;
}

export interface ExtractedSignal {
  documentName: string;
  signal: string;
  rawText: string;
}

export type ExtractedSignalCategory = FourMCategory | "general";

export interface CategorisedExtractedSignal extends ExtractedSignal {
  category: ExtractedSignalCategory;
  signalType: "metric" | "event";
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

/**
 * ============================================================================
 * METRIC EXTRACTOR
 * ============================================================================
 * 
 * Extracts concrete metrics from document text:
 * - Percentages: "38%", "+12.5%", "-7%"
 * - Hours/time: "19 hours", "4.5 hrs", "120 minutes"
 * - Counts with units: "12 units", "350 items", "5 incidents"
 * - Deltas: "↑ 38%", "↓ 12%", "+15", "-8"
 * - Currency amounts: "$12,500", "RM 45,000", "USD 8,200"
 * 
 * Returns concrete signal strings like "Overtime +38%" or "19 hours downtime"
 */

interface MetricPattern {
  regex: RegExp;
  formatter: (match: RegExpMatchArray) => string;
  category: ExtractedSignalCategory;
}

const METRIC_PATTERNS: MetricPattern[] = [
  {
    regex: /(?:overtime|OT)\s*[+↑]?\s*(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Overtime +${m[1]}%`,
    category: "Manpower",
  },
  {
    regex: /(?:absenteeism|absence(?:\s+rate)?)\s*[+↑]?\s*(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Absenteeism ${m[1]}%`,
    category: "Manpower",
  },
  {
    regex: /(?:turnover|attrition)\s*(?:rate\s*)?[+↑]?\s*(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Turnover ${m[1]}%`,
    category: "Manpower",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+(?:of\s+)?(?:unplanned\s+)?(?:downtime|stoppage)/gi,
    formatter: (m) => `${m[1]} hours unplanned downtime`,
    category: "Machinery",
  },
  {
    regex: /(?:downtime|stoppage)\s*(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/gi,
    formatter: (m) => `${m[1]} hours downtime`,
    category: "Machinery",
  },
  {
    regex: /(\d+)\s+(?:breakdown|failure|malfunction)s?\b/gi,
    formatter: (m) => `${m[1]} breakdowns reported`,
    category: "Machinery",
  },
  {
    regex: /(?:breakdown|failure|malfunction)s?\s*[:=]\s*(\d+)/gi,
    formatter: (m) => `${m[1]} breakdowns reported`,
    category: "Machinery",
  },
  {
    regex: /(?:defect|reject(?:ion)?|rework)\s*(?:rate\s*)?[+↑]?\s*(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Defect/rework rate ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(\d+)\s+(?:stockout|stock-out)s?\b/gi,
    formatter: (m) => `${m[1]} stockouts`,
    category: "Materials",
  },
  {
    regex: /(?:overdue|outstanding|aged)\s+(?:receivable|invoice|debt)s?\s*(?:[:=]\s*)?(?:\$|RM|USD|MYR)?\s*(\d[\d,]*(?:\.\d{2})?)/gi,
    formatter: (m) => `Overdue receivables ${m[1]}`,
    category: "Money",
  },
  {
    regex: /(?:cash\s*flow|cashflow)\s+(?:gap|shortfall|deficit)\s*(?:[:=]\s*)?(?:\$|RM|USD|MYR)?\s*(\d[\d,]*(?:\.\d{2})?)/gi,
    formatter: (m) => `Cash flow gap ${m[1]}`,
    category: "Money",
  },
  {
    regex: /(?:revenue|sales|margin)\s+(?:decline|drop|decrease|fell|down)\s*(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Revenue decline ${m[1]}%`,
    category: "Money",
  },
  {
    regex: /(?:cost|expense|spend)\s+(?:increase|up|rose|grew)\s*(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Cost increase ${m[1]}%`,
    category: "Money",
  },
  {
    regex: /(?:SLA|service\s+level)\s+(?:penalty|breach|miss|violation)(?:es|s)?\s*(?:[:=]\s*)?(?:\$|RM|USD|MYR)?\s*(\d[\d,]*)/gi,
    formatter: (m) => `SLA penalties ${m[1]}`,
    category: "Money",
  },
  {
    regex: /(?:fuel|transport)\s+cost\s+(?:increase|up|rose)\s*(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Fuel/transport cost +${m[1]}%`,
    category: "Money",
  },
  {
    regex: /(?:supplier|delivery|lead\s*time)\s+delay(?:s|ed)?\s*(?:[:=]\s*)?(\d+)\s*(?:days?|weeks?)/gi,
    formatter: (m) => `Supplier delay ${m[1]} days`,
    category: "Materials",
  },
  {
    regex: /(?:inventory|stock)\s+(?:variance|discrepancy|mismatch)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%?/gi,
    formatter: (m) => `Inventory variance ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(?:vacancy|vacancies|open\s+position)s?\s*[:=]?\s*(\d+)/gi,
    formatter: (m) => `${m[1]} open positions`,
    category: "Manpower",
  },
  {
    regex: /(?:reimbursement|claim)\s+(?:delay|backlog|denial)s?\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} reimbursement delays`,
    category: "Money",
  },
  {
    regex: /(\d+)\s+(?:line\s+stop|line\s+stoppage|production\s+stop)s?\b/gi,
    formatter: (m) => `${m[1]} line stops`,
    category: "Machinery",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+(?:of\s+)?(?:line\s+stop|line\s+stoppage)/gi,
    formatter: (m) => `${m[1]} hours line stoppage`,
    category: "Machinery",
  },
  {
    regex: /(?:PM|preventive\s+maintenance)\s+(?:overdue|backlog|pending|deferred)\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} PM tasks overdue`,
    category: "Machinery",
  },
  {
    regex: /(?:open|outstanding|pending)\s+(?:maintenance\s+)?(?:ticket|work\s+order)s?\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} open maintenance tickets`,
    category: "Machinery",
  },
  {
    regex: /(?:maintenance|repair)\s+(?:backlog|overdue)\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} maintenance items overdue`,
    category: "Machinery",
  },
  {
    regex: /(?:scrap|wastage|waste)\s*(?:rate\s*)?[+↑]?\s*(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Scrap rate ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(\d+)\s+(?:scrap|waste)\s+(?:units?|items?|pieces?)/gi,
    formatter: (m) => `${m[1]} scrap units`,
    category: "Materials",
  },
  {
    regex: /(?:return|returns|customer\s+return)s?\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} returns`,
    category: "Materials",
  },
  {
    regex: /(?:overtime|OT)\s+(?:cost|expense|spend)\s*(?:[:=]\s*)?(?:\$|RM|USD|MYR)?\s*(\d[\d,]*(?:\.\d{2})?)/gi,
    formatter: (m) => `Overtime cost ${m[1]}`,
    category: "Money",
  },
  {
    regex: /(?:margin|gross\s+margin|profit\s+margin)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Margin at ${m[1]}%`,
    category: "Money",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+(?:overtime|OT)/gi,
    formatter: (m) => `${m[1]} hours overtime`,
    category: "Manpower",
  },
  {
    regex: /(?:resignation|quit|left)s?\s*(?:[:=]\s*)?(\d+)\s*(?:staff|employee|worker|people)?/gi,
    formatter: (m) => `${m[1]} resignations`,
    category: "Manpower",
  },
];

function extractMetricsFromDocument(doc: ProcessedDocument): CategorisedExtractedSignal[] {
  const content = doc.content || "";
  if (!content.trim()) return [];

  const results: CategorisedExtractedSignal[] = [];
  const seen = new Set<string>();

  for (const pattern of METRIC_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const signal = pattern.formatter(match);
      const key = `${signal}-${doc.name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const startIdx = Math.max(0, match.index - 40);
      const endIdx = Math.min(content.length, match.index + match[0].length + 40);
      const rawText = content.substring(startIdx, endIdx).replace(/\n/g, " ").trim();

      results.push({
        documentName: doc.name,
        signal,
        rawText,
        category: pattern.category,
        signalType: "metric",
      });
    }
  }

  return results;
}

/**
 * ============================================================================
 * EVENT EXTRACTOR
 * ============================================================================
 * 
 * Extracts operational events from document text:
 * - Breakdowns, downtime, backlog, rework, overtime, absenteeism
 * - Contextual phrases indicating operational disruption
 * 
 * Returns event signals like "Equipment breakdown reported" or "Backlog accumulation noted"
 */

interface EventPattern {
  regex: RegExp;
  formatter: (match: RegExpMatchArray) => string;
  category: ExtractedSignalCategory;
}

const EVENT_PATTERNS: EventPattern[] = [
  {
    regex: /(?:unplanned|unexpected|emergency)\s+(?:breakdown|downtime|stoppage|outage)/gi,
    formatter: () => "Unplanned downtime event",
    category: "Machinery",
  },
  {
    regex: /(?:equipment|machine|system)\s+(?:breakdown|failure|malfunction|fault)/gi,
    formatter: () => "Equipment breakdown reported",
    category: "Machinery",
  },
  {
    regex: /(?:maintenance|repair)\s+(?:backlog|overdue|deferred|pending)/gi,
    formatter: () => "Maintenance backlog",
    category: "Machinery",
  },
  {
    regex: /(?:production|order|work)\s+(?:backlog|bottleneck|congestion)/gi,
    formatter: () => "Production backlog noted",
    category: "Machinery",
  },
  {
    regex: /(?:rework|re-work|redo|repeat\s+work)/gi,
    formatter: () => "Rework activity detected",
    category: "Materials",
  },
  {
    regex: /(?:quality|QC|QA)\s+(?:reject(?:ion)?|failure|non-conformance)/gi,
    formatter: () => "Quality rejection events",
    category: "Materials",
  },
  {
    regex: /(?:excessive|high|increased|frequent)\s+(?:overtime|OT)/gi,
    formatter: () => "Excessive overtime reported",
    category: "Manpower",
  },
  {
    regex: /(?:staff|employee|worker)\s+(?:shortage|shortfall|gap)/gi,
    formatter: () => "Staff shortage reported",
    category: "Manpower",
  },
  {
    regex: /(?:high|rising|increased|frequent)\s+(?:absenteeism|absence|sick\s+leave)/gi,
    formatter: () => "High absenteeism noted",
    category: "Manpower",
  },
  {
    regex: /(?:late|delayed|overdue)\s+(?:payment|invoice|billing|collection)/gi,
    formatter: () => "Late payment events",
    category: "Money",
  },
  {
    regex: /(?:cash\s*flow|cashflow|liquidity)\s+(?:issue|problem|pressure|strain|crunch)/gi,
    formatter: () => "Cash flow pressure",
    category: "Money",
  },
  {
    regex: /(?:supplier|vendor)\s+(?:delay|disruption|failure|issue)/gi,
    formatter: () => "Supplier disruption",
    category: "Materials",
  },
  {
    regex: /(?:stock-?out|out\s+of\s+stock|inventory\s+shortage)/gi,
    formatter: () => "Stockout event",
    category: "Materials",
  },
  {
    regex: /(?:delivery|shipment)\s+(?:delay|failure|miss)/gi,
    formatter: () => "Delivery delay",
    category: "Materials",
  },
  {
    regex: /(?:SLA|service\s+level)\s+(?:breach|miss|violation|penalty)/gi,
    formatter: () => "SLA breach event",
    category: "Money",
  },
  {
    regex: /(?:staff|employee)\s+(?:resignation|turnover|attrition)/gi,
    formatter: () => "Staff turnover event",
    category: "Manpower",
  },
  {
    regex: /(?:line\s+stop|line\s+stoppage|production\s+halt|production\s+stop)/gi,
    formatter: () => "Line stop event",
    category: "Machinery",
  },
  {
    regex: /\bPM\s+(?:overdue|missed|skipped)\b/g,
    formatter: () => "PM schedule overdue",
    category: "Machinery",
  },
  {
    regex: /(?:open|outstanding|pending)\s+(?:maintenance\s+)?(?:tickets?|work\s+orders?)/gi,
    formatter: () => "Open maintenance tickets",
    category: "Machinery",
  },
  {
    regex: /(?:scrap|wastage|waste)\s+(?:increase|rising|high|excessive)/gi,
    formatter: () => "Scrap/waste issue",
    category: "Materials",
  },
  {
    regex: /(?:customer|product)\s+(?:return|rejection|complaint)s?/gi,
    formatter: () => "Customer returns/complaints",
    category: "Materials",
  },
  {
    regex: /(?:margin|profit)\s+(?:pressure|erosion|decline|compression)/gi,
    formatter: () => "Margin pressure",
    category: "Money",
  },
  {
    regex: /(?:overtime|OT)\s+(?:cost|expense)\s+(?:increase|rising|high|excessive)/gi,
    formatter: () => "Overtime cost escalation",
    category: "Money",
  },
];

function extractEventsFromDocument(doc: ProcessedDocument): CategorisedExtractedSignal[] {
  const content = doc.content || "";
  if (!content.trim()) return [];

  const results: CategorisedExtractedSignal[] = [];
  const seen = new Set<string>();

  for (const pattern of EVENT_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const signal = pattern.formatter(match);
      const key = `${signal}-${doc.name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const startIdx = Math.max(0, match.index - 40);
      const endIdx = Math.min(content.length, match.index + match[0].length + 40);
      const rawText = content.substring(startIdx, endIdx).replace(/\n/g, " ").trim();

      results.push({
        documentName: doc.name,
        signal,
        rawText,
        category: pattern.category,
        signalType: "event",
      });
    }
  }

  return results;
}

/**
 * Extract all concrete signals (metrics + events) from a set of documents.
 * Returns per-document signals with { documentName, signal, rawText }.
 */
export function extractConcreteSignals(
  documents: ProcessedDocument[]
): CategorisedExtractedSignal[] {
  if (!documents || documents.length === 0) return [];

  const allSignals: CategorisedExtractedSignal[] = [];
  for (const doc of documents) {
    allSignals.push(...extractMetricsFromDocument(doc));
    allSignals.push(...extractEventsFromDocument(doc));
  }

  return allSignals;
}

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

  const categoryDocNames: Record<string, string[]> = {};
  for (const doc of documents) {
    const docContent = (doc.content || "").toLowerCase();
    if (!docContent.trim()) continue;
    for (const rule of SIGNAL_RULES) {
      const hasMatch = rule.terms.some(term => docContent.includes(term.toLowerCase()));
      if (hasMatch) {
        if (!categoryDocNames[rule.category]) categoryDocNames[rule.category] = [];
        if (!categoryDocNames[rule.category].includes(doc.name)) {
          categoryDocNames[rule.category].push(doc.name);
        }
      }
    }
  }

  for (const rule of SIGNAL_RULES) {
    const { count, matchedTerms } = countTermOccurrences(combinedContent, rule.terms);

    if (count > 0 && matchedTerms.length > 0) {
      const sortedTerms = [...matchedTerms].sort();
      const termsKey = sortedTerms.slice(0, 3).join("-").replace(/\s+/g, "_");
      const signal: EvidenceSignal = {
        signalId: `sig-${rule.category.toLowerCase()}-${count}-${termsKey}`,
        category: rule.category,
        description: rule.descriptionTemplate(matchedTerms),
        matchedTerms: sortedTerms,
        strength: determineStrength(count),
        sourceDocuments: categoryDocNames[rule.category] || [],
      };
      signals.push(signal);
    }
  }

  return signals;
}
