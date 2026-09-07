// ─────────────────────────────────────────────────────────────────────────────
// MGD DOCUMENT CLASSIFIER
//
// Classifies uploaded documents into operational categories using filename and
// content keyword matching. Fully deterministic — no AI, no randomness.
//
// Scoring:
//   Filename keyword match → +40 per rule group matched (applied once)
//   Content keyword match  → +10 per distinct keyword hit
//   Cap at 95
//   Unknown baseline       → 20
//
// Never throws. All inputs are null-safe.
// ─────────────────────────────────────────────────────────────────────────────

// ── Exported types ─────────────────────────────────────────────────────────────

export type DocumentCategory =
  | "inventory_movement"
  | "inventory_summary"
  | "lost_items"
  | "damaged_items"
  | "logistics_schedule"
  | "driver_assignment"
  | "invoice_register"
  | "quotation_register"
  | "sales_report"
  | "hr_document"
  | "job_description"
  | "unknown";

export interface ClassifiedDocument {
  fileName:        string;
  category:        DocumentCategory;
  confidence:      number;
  matchedKeywords: string[];
}

// ── Classification rules ───────────────────────────────────────────────────────
//
// Each rule defines:
//   categories  — one or more candidate DocumentCategory values; the first is
//                 used as the primary match, the second (if any) as a sub-match
//                 when a more specific signal is also present.
//   keywords    — terms to search for in the normalised text corpus
//
// Rules are evaluated in order; the rule with the highest score wins.

interface ClassificationRule {
  category:   DocumentCategory;
  subRules?:  { keywords: string[]; category: DocumentCategory }[];
  keywords:   string[];
}

const RULES: ClassificationRule[] = [
  // ── Lost items (before generic inventory — more specific) ──────────────────
  {
    category: "lost_items",
    keywords: ["lost", "shortage", "missing"],
  },

  // ── Damaged items ──────────────────────────────────────────────────────────
  {
    category: "damaged_items",
    keywords: ["damage", "broken", "pecah"],
  },

  // ── Inventory — split into movement vs summary via sub-keywords ─────────────
  {
    category: "inventory_movement",
    subRules: [
      { keywords: ["movement", "opening", "closing", "transfer", "in", "out"], category: "inventory_movement" },
      { keywords: ["balance", "summary", "stock count", "on hand"],           category: "inventory_summary"  },
    ],
    keywords: ["inventory", "stock", "movement", "balance", "opening", "closing"],
  },

  // ── Driver assignment (before generic logistics — more specific) ────────────
  {
    category: "driver_assignment",
    keywords: ["driver", "assignment", "assign"],
  },

  // ── Logistics schedule ─────────────────────────────────────────────────────
  {
    category: "logistics_schedule",
    keywords: ["lorry", "driver", "dispatch", "delivery", "schedule"],
  },

  // ── Quotation (before generic sales — more specific) ───────────────────────
  {
    category: "quotation_register",
    keywords: ["quotation", "quote", "proposal"],
  },

  // ── Invoice ────────────────────────────────────────────────────────────────
  {
    category: "invoice_register",
    keywords: ["invoice", "bil", "receipt"],
  },

  // ── Sales report ───────────────────────────────────────────────────────────
  {
    category: "sales_report",
    keywords: ["sales", "revenue", "transaction", "payment"],
  },

  // ── Job description (before generic HR — more specific) ────────────────────
  {
    category: "job_description",
    keywords: ["job description", "job desc", "jd", "position", "vacancy", "role"],
  },

  // ── HR document ────────────────────────────────────────────────────────────
  {
    category: "hr_document",
    keywords: ["employee", "staff", "hr", "human resource", "payroll", "attendance", "leave"],
  },
];

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Normalise text for matching: lowercase, replace underscores/hyphens with
 *  spaces, collapse whitespace. This ensures filename slugs like
 *  `job_description` match the keyword `"job description"`. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[_\-]/g, " ").replace(/\s+/g, " ").trim();
}

/** Return the list of keywords from `terms` that appear in `text`. */
function matchKeywords(text: string, terms: string[]): string[] {
  return terms.filter(kw => text.includes(kw));
}

interface ScoreEntry {
  category:        DocumentCategory;
  score:           number;
  matchedKeywords: string[];
}

/**
 * Score a single rule against normalised filename and content.
 * Returns null if no keywords matched at all.
 */
function scoreRule(
  rule:             ClassificationRule,
  normFileName:     string,
  normContent:      string,
): ScoreEntry | null {
  let score = 0;
  const matched = new Set<string>();

  // Filename match (+40 if any keyword hit in filename)
  const fileHits = matchKeywords(normFileName, rule.keywords);
  if (fileHits.length > 0) {
    score += 40;
    fileHits.forEach(k => matched.add(k));
  }

  // Content match (+10 per distinct keyword hit)
  const contentHits = matchKeywords(normContent, rule.keywords);
  contentHits.forEach(k => {
    matched.add(k);
    score += 10;
  });

  if (matched.size === 0) return null;

  // Sub-rule refinement: if both filename and content contain sub-specific
  // terms, override the category to a more precise one.
  let category = rule.category;
  if (rule.subRules) {
    let bestSubScore = 0;
    for (const sub of rule.subRules) {
      const subFileHits    = matchKeywords(normFileName, sub.keywords).length;
      const subContentHits = matchKeywords(normContent,  sub.keywords).length;
      const subScore       = subFileHits * 2 + subContentHits; // weight filename more
      if (subScore > bestSubScore) {
        bestSubScore = subScore;
        category = sub.category;
      }
    }
  }

  return {
    category,
    score: Math.min(95, score),
    matchedKeywords: Array.from(matched),
  };
}

// ── Main exports ───────────────────────────────────────────────────────────────

/**
 * Classify a single document by its filename and/or text content.
 * Never throws. Returns `"unknown"` with confidence 20 if no rules match.
 */
export function classifyDocument(params: {
  fileName?: string;
  content?:  string;
}): ClassifiedDocument {
  try {
    const rawName    = typeof params?.fileName === "string" ? params.fileName : "";
    const rawContent = typeof params?.content  === "string" ? params.content  : "";

    const normFileName = normalise(rawName);
    const normContent  = normalise(rawContent);

    // No usable input → unknown
    if (!normFileName && !normContent) {
      return { fileName: rawName, category: "unknown", confidence: 20, matchedKeywords: [] };
    }

    // Score every rule
    const scores: ScoreEntry[] = [];
    for (const rule of RULES) {
      const entry = scoreRule(rule, normFileName, normContent);
      if (entry) scores.push(entry);
    }

    // Unknown: no rule matched
    if (scores.length === 0) {
      return { fileName: rawName, category: "unknown", confidence: 20, matchedKeywords: [] };
    }

    // Pick highest-scoring rule (stable sort: higher score wins; on tie, first rule wins)
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    return {
      fileName:        rawName,
      category:        best.category,
      confidence:      best.score,
      matchedKeywords: best.matchedKeywords,
    };
  } catch (err) {
    console.error("[MGD][CLASSIFIER] classifyDocument error:", (err as Error)?.message ?? err);
    return {
      fileName:        params?.fileName ?? "",
      category:        "unknown",
      confidence:      20,
      matchedKeywords: [],
    };
  }
}

/**
 * Classify an array of documents. Each element may have `fileName`, `content`,
 * `text`, `name`, or `originalname` fields — the classifier adapts to common
 * upload/parser shapes. Never throws.
 */
export function classifyDocuments(documents: unknown[]): ClassifiedDocument[] {
  try {
    if (!Array.isArray(documents)) return [];
    return documents.map((doc) => {
      try {
        const d = (doc ?? {}) as Record<string, unknown>;
        const fileName = String(
          d.fileName ?? d.name ?? d.originalname ?? d.filename ?? "",
        );
        const content = String(
          d.content ?? d.text ?? d.parsedText ?? d.body ?? "",
        );
        return classifyDocument({ fileName, content });
      } catch {
        return { fileName: "", category: "unknown", confidence: 20, matchedKeywords: [] };
      }
    });
  } catch (err) {
    console.error("[MGD][CLASSIFIER] classifyDocuments error:", (err as Error)?.message ?? err);
    return [];
  }
}
