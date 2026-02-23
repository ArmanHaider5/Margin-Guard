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
      "cash flow problem",
      "cost overrun",
      "over budget",
      "budget overrun",
      "budget variance",
      "gross margin",
      "profit erosion",
      "margin erosion",
      "profit decline",
      "revenue drop",
      "revenue decline",
      "write-off",
      "write off",
      "penalty",
      "financial loss",
      "operating loss",
      "cost increase",
      "expense increase",
      "interest expense",
      "debt service",
      "working capital",
      "liquidity",
      "cash position",
      "accounts payable",
      "accounts receivable",
      "margins shrinking",
      "gross margin down",
      "budget exceeded",
      "actual higher than budget",
      "cash flow tight",
      "liquidity pressure",
      "short-term funding",
      "funding gap",
      "credit line",
      "overdraft",
      "debt burden",
      "finance charge",
      "forex loss",
      "exchange loss",
      "cost of goods",
      "cogs",
      "operating cost",
      "overhead",
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
      "understaffed",
      "extra hours",
      "extended shift",
      "double shift",
      "mandatory overtime",
      "compulsory overtime",
      "weekend work",
      "night shift",
      "burnout",
      "fatigue",
      "morale",
      "low morale",
      "disengagement",
      "exit interview",
      "vacancy",
      "open position",
      "unfilled role",
      "talent gap",
      "knowledge loss",
      "key person risk",
      "succession",
      "onboarding",
      "retention",
      "attrition",
      "sick leave",
      "medical leave",
      "absent",
      "no show",
      "firefighting",
      "fire fighting",
      "constantly reacting",
      "overwhelmed",
      "stretched thin",
      "overworked",
      "undermanned",
      "always putting out fires",
      "reactive mode",
      "staff leaving",
      "people leaving",
      "talent drain",
      "high turnover",
      "chronic absenteeism",
      "manpower shortage",
      "hiring freeze",
      "insufficient headcount",
      "no backup",
      "single operator",
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
      "equipment aging",
      "line stoppage",
      "line stop",
      "unplanned stop",
      "machine idle",
      "idle hours",
      "idle time",
      "service backlog",
      "pending pm",
      "pm overdue",
      "pm backlog",
      "preventive maintenance",
      "corrective maintenance",
      "mttr",
      "mtbf",
      "mean time",
      "uptime",
      "availability",
      "oee",
      "machine utilisation",
      "machine utilization",
      "equipment downtime",
      "production halt",
      "production stop",
      "system down",
      "system outage",
      "software crash",
      "calibration",
      "wear and tear",
      "spare part",
      "spare parts",
      "machine stopped",
      "equipment stopped",
      "equipment failure",
      "plant shutdown",
      "emergency repair",
      "unplanned maintenance",
      "reactive maintenance",
      "breakdown maintenance",
      "run to failure",
      "no preventive maintenance",
      "overdue inspection",
      "asset utilization",
      "capacity loss",
      "cycle time",
      "changeover",
      "setup time",
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
      "procurement issue",
      "reject rate",
      "rejection rate",
      "scrap",
      "scrap rate",
      "wastage",
      "waste rate",
      "quality rework",
      "reprocessing",
      "rework",
      "re-work",
      "non-conformance",
      "ncr",
      "defect",
      "defective",
      "defect rate",
      "late shipment",
      "late delivery",
      "on-time delivery",
      "otd",
      "delivery performance",
      "fill rate",
      "backorder",
      "back order",
      "lead time",
      "lead-time",
      "supplier performance",
      "vendor rating",
      "incoming inspection",
      "goods return",
      "material variance",
      "yield loss",
      "yield",
      "first pass yield",
      "fpq",
      "customer complaint",
      "product return",
      "quality escapes",
      "quality escape",
      "escaped defect",
      "customer reject",
      "batch reject",
      "lot rejection",
      "material variance",
      "raw material issue",
      "specification deviation",
      "spec deviation",
      "out of spec",
      "off-spec",
      "delivery performance fell",
      "delivery performance dropped",
      "otd down",
      "otd dropped",
      "on-time delivery dropped",
      "late orders",
      "delayed orders",
      "order backlog",
      "inventory buildup",
      "excess stock",
      "obsolete stock",
      "slow moving",
      "dead stock",
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
    regex: /(?:overtime|OT)\s+(?:increase|increased|up|rose|grew)\s*(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Overtime increase ${m[1]}%`,
    category: "Manpower",
  },
  {
    regex: /(?:extra\s+hours?|extended\s+shift)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|%)/gi,
    formatter: (m) => `Extra hours ${m[1]}`,
    category: "Manpower",
  },
  {
    regex: /(?:absenteeism|absence(?:\s+rate)?)\s*[+↑]?\s*(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Absenteeism ${m[1]}%`,
    category: "Manpower",
  },
  {
    regex: /(?:sick\s+leave|medical\s+leave)\s*(?:[:=]\s*)?(\d+)\s*(?:days?|instances?|cases?)?/gi,
    formatter: (m) => `${m[1]} sick leave days`,
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
    regex: /(?:machine\s+idle|idle\s+time|idle\s+hours?)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|%)?/gi,
    formatter: (m) => `Machine idle ${m[1]} hours`,
    category: "Machinery",
  },
  {
    regex: /(?:line\s+stoppage|unplanned\s+stop)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|times?|incidents?)?/gi,
    formatter: (m) => `Line stoppage ${m[1]}`,
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
    regex: /(?:OEE|overall\s+equipment\s+effectiveness)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `OEE ${m[1]}%`,
    category: "Machinery",
  },
  {
    regex: /(?:availability|uptime)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Availability ${m[1]}%`,
    category: "Machinery",
  },
  {
    regex: /(?:MTTR|mean\s+time\s+to\s+repair)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|min)/gi,
    formatter: (m) => `MTTR ${m[1]} hours`,
    category: "Machinery",
  },
  {
    regex: /(?:MTBF|mean\s+time\s+between\s+failure)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|days?)/gi,
    formatter: (m) => `MTBF ${m[1]}`,
    category: "Machinery",
  },
  {
    regex: /(?:defect|reject(?:ion)?|rework)\s*(?:rate\s*)?[+↑]?\s*(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Defect/rework rate ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(?:reject\s+rate|rejection\s+rate)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Reject rate ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(?:scrap|scrap\s+rate)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Scrap rate ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(?:quality\s+rework|reprocessing)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*(?:%|units?|pcs|pieces?)?/gi,
    formatter: (m) => `Quality rework ${m[1]}`,
    category: "Materials",
  },
  {
    regex: /(?:first\s+pass\s+yield|FPY|FPQ)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `First pass yield ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(?:yield|yield\s+loss)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Yield ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(?:on-?time\s+delivery|OTD|delivery\s+performance)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `On-time delivery ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(?:late\s+shipment|late\s+delivery|delayed\s+shipment)s?\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} late shipments`,
    category: "Materials",
  },
  {
    regex: /(\d+)\s+(?:stockout|stock-out)s?\b/gi,
    formatter: (m) => `${m[1]} stockouts`,
    category: "Materials",
  },
  {
    regex: /(?:NCR|non-conformance|non-conformity)\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} non-conformances`,
    category: "Materials",
  },
  {
    regex: /(?:customer\s+complaint|complaint)s?\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} customer complaints`,
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
    regex: /(?:gross\s+margin|profit\s+margin|margin)\s+(?:decline|drop|decrease|erosion|fell|down)\s*(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Margin decline ${m[1]}%`,
    category: "Money",
  },
  {
    regex: /(?:cost|expense|spend)\s+(?:increase|up|rose|grew|overrun)\s*(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Cost increase ${m[1]}%`,
    category: "Money",
  },
  {
    regex: /(?:cost\s+overrun|budget\s+overrun|over\s+budget)\s*(?:[:=]\s*)?(?:\$|RM|USD|MYR)?\s*(\d[\d,]*(?:\.\d{2})?)/gi,
    formatter: (m) => `Cost overrun ${m[1]}`,
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
    regex: /(?:lead\s*time|lead-time)\s*(?:[:=]\s*)?(\d+)\s*(?:days?|weeks?)/gi,
    formatter: (m) => `Lead time ${m[1]} days`,
    category: "Materials",
  },
  {
    regex: /(?:inventory|stock)\s+(?:variance|discrepancy|mismatch)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%?/gi,
    formatter: (m) => `Inventory variance ${m[1]}%`,
    category: "Materials",
  },
  {
    regex: /(?:fill\s+rate)\s*(?:[:=]\s*)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Fill rate ${m[1]}%`,
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
    regex: /(?:pending\s+PM|PM\s+pending|maintenance\s+overdue|service\s+backlog)\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} maintenance items pending`,
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
    regex: /(?:product\s+return|goods\s+return)s?\s*(?:[:=]\s*)?(\d+)/gi,
    formatter: (m) => `${m[1]} product returns`,
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
  {
    regex: /(?:training|competency)\s+(?:gap|deficit|shortfall|backlog)\s*(?:[:=]\s*)?(\d+)?/gi,
    formatter: (m) => m[1] ? `${m[1]} training gaps` : `Training gap identified`,
    category: "Manpower",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*%\s+(?:overtime|OT)\s+(?:increase|growth|rise)/gi,
    formatter: (m) => `Overtime increase ${m[1]}%`,
    category: "Manpower",
  },
  {
    regex: /(?:downtime|stoppage)\s+(?:increase|increased|up|rose)\s*(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    formatter: (m) => `Downtime increase ${m[1]}%`,
    category: "Machinery",
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
    regex: /(?:machine|equipment)\s+(?:idle|idling|not\s+running|not\s+operational)/gi,
    formatter: () => "Machine idle event",
    category: "Machinery",
  },
  {
    regex: /(?:calibration|alignment)\s+(?:issue|problem|failure|needed|required)/gi,
    formatter: () => "Calibration issue",
    category: "Machinery",
  },
  {
    regex: /(?:spare\s+part|spare\s+parts)\s+(?:shortage|unavailable|out\s+of\s+stock|delay)/gi,
    formatter: () => "Spare parts shortage",
    category: "Machinery",
  },
  {
    regex: /(?:wear\s+and\s+tear|aging\s+equipment|old\s+machinery|obsolete\s+equipment)/gi,
    formatter: () => "Equipment aging detected",
    category: "Machinery",
  },
  {
    regex: /(?:rework|re-work|redo|repeat\s+work|reprocessing)/gi,
    formatter: () => "Rework activity detected",
    category: "Materials",
  },
  {
    regex: /(?:quality|QC|QA)\s+(?:reject(?:ion)?|failure|non-conformance|issue|problem)/gi,
    formatter: () => "Quality rejection events",
    category: "Materials",
  },
  {
    regex: /(?:non-conformance|NCR|non-conformity)\s+(?:report|raised|issued|logged)/gi,
    formatter: () => "Non-conformance reported",
    category: "Materials",
  },
  {
    regex: /(?:incoming|receiving)\s+(?:inspection|check)\s+(?:fail|reject|issue)/gi,
    formatter: () => "Incoming inspection failure",
    category: "Materials",
  },
  {
    regex: /(?:yield|yield\s+loss|low\s+yield)/gi,
    formatter: () => "Yield loss detected",
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
    regex: /(?:burnout|burn\s+out|burned\s+out|burnt\s+out)/gi,
    formatter: () => "Burnout indicators",
    category: "Manpower",
  },
  {
    regex: /(?:low\s+morale|poor\s+morale|morale\s+(?:issue|problem|decline|drop))/gi,
    formatter: () => "Low morale detected",
    category: "Manpower",
  },
  {
    regex: /(?:firefighting|fire\s+fighting|fire-fighting)/gi,
    formatter: () => "Fire-fighting culture",
    category: "Manpower",
  },
  {
    regex: /(?:constantly\s+reacting|reactive\s+mode|reactive\s+management|always\s+reacting)/gi,
    formatter: () => "Reactive management culture",
    category: "Manpower",
  },
  {
    regex: /(?:overwhelmed|stretched\s+thin|overworked|overloaded|under\s+pressure)/gi,
    formatter: () => "Workforce overwhelmed",
    category: "Manpower",
  },
  {
    regex: /(?:knowledge\s+loss|expertise\s+loss|institutional\s+knowledge|brain\s+drain)/gi,
    formatter: () => "Knowledge loss risk",
    category: "Manpower",
  },
  {
    regex: /(?:key\s+person\s+risk|single\s+point\s+of\s+failure|dependency\s+on\s+individual)/gi,
    formatter: () => "Key person dependency",
    category: "Manpower",
  },
  {
    regex: /(?:training\s+gap|skill\s+gap|competency\s+gap|capability\s+gap)/gi,
    formatter: () => "Training/skill gap",
    category: "Manpower",
  },
  {
    regex: /(?:late|delayed|overdue)\s+(?:payment|invoice|billing|collection)/gi,
    formatter: () => "Late payment events",
    category: "Money",
  },
  {
    regex: /(?:cash\s*flow|cashflow|liquidity)\s+(?:issue|problem|pressure|strain|crunch|tight|constrained)/gi,
    formatter: () => "Cash flow pressure",
    category: "Money",
  },
  {
    regex: /(?:cost\s+overrun|over\s+budget|budget\s+exceeded|budget\s+overrun)/gi,
    formatter: () => "Cost overrun",
    category: "Money",
  },
  {
    regex: /(?:profit|margin)\s+(?:erosion|pressure|decline|compression|squeeze|shrink)/gi,
    formatter: () => "Margin pressure",
    category: "Money",
  },
  {
    regex: /(?:supplier|vendor)\s+(?:delay|disruption|failure|issue|problem)/gi,
    formatter: () => "Supplier disruption",
    category: "Materials",
  },
  {
    regex: /(?:stock-?out|out\s+of\s+stock|inventory\s+shortage)/gi,
    formatter: () => "Stockout event",
    category: "Materials",
  },
  {
    regex: /(?:delivery|shipment)\s+(?:delay|failure|miss|late)/gi,
    formatter: () => "Delivery delay",
    category: "Materials",
  },
  {
    regex: /(?:late\s+shipment|delayed\s+delivery|missed\s+delivery|delivery\s+not\s+on\s+time)/gi,
    formatter: () => "Late shipment event",
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
    regex: /(?:exit\s+interview|leaving\s+the\s+company|tender\s+resignation)/gi,
    formatter: () => "Staff exit event",
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
    regex: /(?:overtime|OT)\s+(?:cost|expense)\s+(?:increase|rising|high|excessive)/gi,
    formatter: () => "Overtime cost escalation",
    category: "Money",
  },
  {
    regex: /(?:no\s+(?:standard|SOP|procedure)|lack\s+of\s+(?:SOP|procedure|standard))/gi,
    formatter: () => "Missing SOP/procedures",
    category: "Materials",
  },
  {
    regex: /(?:ad\s*hoc|manual\s+process|manual\s+workaround|no\s+system)/gi,
    formatter: () => "Ad-hoc/manual processes",
    category: "Machinery",
  },
  {
    regex: /(?:on[- ]?time\s+delivery\s+(?:dropped|fell|declined|down)|OTD\s+(?:dropped|fell|declined|down)|delivery\s+performance\s+(?:fell|dropped|declined|worsened))/gi,
    formatter: () => "OTD performance drop",
    category: "Materials",
  },
  {
    regex: /(?:overtime\s+(?:increased|rising|up)|OT\s+(?:increased|up|rising)|extended\s+shifts?\s+(?:required|needed|increased))/gi,
    formatter: () => "Overtime increase",
    category: "Manpower",
  },
  {
    regex: /(?:always\s+putting\s+out\s+fires|putting\s+out\s+fires|fire\s*-?\s*fighting\s+(?:mode|culture|mentality))/gi,
    formatter: () => "Fire-fighting culture",
    category: "Manpower",
  },
  {
    regex: /(?:machine\s+stopped|equipment\s+stopped|machine\s+down|equipment\s+down\b)/gi,
    formatter: () => "Machine stoppage",
    category: "Machinery",
  },
  {
    regex: /(?:quality\s+escapes?|escaped?\s+defects?|defects?\s+reached?\s+customer)/gi,
    formatter: () => "Quality escape",
    category: "Materials",
  },
  {
    regex: /(?:margins?\s+(?:shrinking|declining|eroding|falling)|gross\s+margin\s+(?:down|declining|fell|dropped))/gi,
    formatter: () => "Margin shrinkage",
    category: "Money",
  },
  {
    regex: /(?:actual\s+(?:higher|more|above|exceeded?)\s+(?:than\s+)?budget|spend(?:ing)?\s+(?:above|exceeded?|over)\s+budget)/gi,
    formatter: () => "Actual vs budget overrun",
    category: "Money",
  },
  {
    regex: /(?:cash\s+flow\s+tight|tight\s+cash\s*flow|cash\s+(?:crunch|squeeze)|short[- ]term\s+funding|funding\s+(?:gap|pressure|shortfall))/gi,
    formatter: () => "Cash flow stress",
    category: "Money",
  },
  {
    regex: /(?:plant\s+shutdown|factory\s+shutdown|facility\s+shutdown|emergency\s+shutdown)/gi,
    formatter: () => "Plant shutdown event",
    category: "Machinery",
  },
  {
    regex: /(?:overdue\s+service|service\s+overdue|overdue\s+maintenance|maintenance\s+overdue)/gi,
    formatter: () => "Overdue maintenance",
    category: "Machinery",
  },
  {
    regex: /(?:reprocessing|re-processing|repeat\s+production|double\s+handling)/gi,
    formatter: () => "Reprocessing activity",
    category: "Materials",
  },
  {
    regex: /(?:high\s+(?:reject|rejection|scrap|rework)\s+rate|reject\s+rate\s+(?:high|rising|increased))/gi,
    formatter: () => "High reject/rework rate",
    category: "Materials",
  },
  {
    regex: /(?:people\s+leaving|staff\s+leaving|employees?\s+leaving|talent\s+drain|brain\s+drain)/gi,
    formatter: () => "Talent attrition",
    category: "Manpower",
  },
  {
    regex: /(?:no\s+backup|single\s+operator|single\s+point\s+of\s+failure|one\s+person\s+(?:knows|handles|manages))/gi,
    formatter: () => "Key person dependency",
    category: "Manpower",
  },
  {
    regex: /(?:excess\s+(?:stock|inventory)|obsolete\s+(?:stock|inventory)|dead\s+stock|slow[- ]moving\s+(?:stock|inventory))/gi,
    formatter: () => "Excess/obsolete inventory",
    category: "Materials",
  },
  {
    regex: /(?:order\s+backlog|backlog\s+(?:growing|increasing|building)|order\s+(?:pile|piling)\s+up)/gi,
    formatter: () => "Order backlog buildup",
    category: "Materials",
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
    const metrics = extractMetricsFromDocument(doc);
    const events = extractEventsFromDocument(doc);
    if (metrics.length > 0 || events.length > 0) {
      console.log(`SIGNAL EXTRACTOR [${doc.name}]: ${metrics.length} metric(s), ${events.length} event(s)`);
      for (const s of metrics) console.log(`  METRIC: ${s.signal} [${s.category}]`);
      for (const s of events) console.log(`  EVENT:  ${s.signal} [${s.category}]`);
    } else {
      console.log(`SIGNAL EXTRACTOR [${doc.name}]: 0 signals (${doc.content?.length || 0} chars of content)`);
    }
    allSignals.push(...metrics);
    allSignals.push(...events);
  }

  const byCategory = { Money: 0, Manpower: 0, Machinery: 0, Materials: 0, general: 0 };
  for (const s of allSignals) byCategory[s.category as keyof typeof byCategory] = (byCategory[s.category as keyof typeof byCategory] || 0) + 1;
  console.log(`SIGNAL EXTRACTOR TOTAL: ${allSignals.length} signals — Money:${byCategory.Money} Manpower:${byCategory.Manpower} Machinery:${byCategory.Machinery} Materials:${byCategory.Materials}`);

  return allSignals;
}

function determineStrength(matchCount: number): EvidenceSignal["strength"] {
  if (matchCount >= 4) return "strong";
  if (matchCount >= 2) return "medium";
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
      const strength = determineStrength(count);
      const signal: EvidenceSignal = {
        signalId: `sig-${rule.category.toLowerCase()}-${count}-${termsKey}`,
        category: rule.category,
        description: rule.descriptionTemplate(matchedTerms),
        matchedTerms: sortedTerms,
        strength,
        sourceDocuments: categoryDocNames[rule.category] || [],
      };
      signals.push(signal);
      console.log(`EVIDENCE SIGNAL: [${rule.category}] strength=${strength} matches=${count} terms=${sortedTerms.slice(0, 3).join(", ")}`);
    }
  }

  console.log(`EVIDENCE SIGNALS TOTAL: ${signals.length} signals across ${new Set(signals.map(s => s.category)).size} categories`);

  return signals;
}
