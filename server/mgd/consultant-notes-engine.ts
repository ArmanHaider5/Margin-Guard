// Consultant Observation (human-origin context) — distinct from Business
// Concern (a plain string, see MGDRunParams.businessConcerns in
// mgd-pipeline.ts) and from Documentary/System Evidence (FindingEvidence,
// evidence-engine.ts). Neither this type nor businessConcerns may ever
// become a FindingEvidence or influence findings/root-cause/recommendation/
// benchmark/health scoring — see
// docs/MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md for the full
// four-class model and the future work this boundary is designed to support.
export interface ConsultantNote {
  title:       string;
  category:    string;
  observation: string;

  /**
   * Diagnostic area the CONSULTANT explicitly selected for this observation
   * — never inferred from `title`/`observation`/`category`. Restricted to
   * the Finding Category vocabulary (finding-categories.ts), validated at
   * the point of entry (mgd-routes.ts). Distinct from `category` above,
   * which is this note's own, unrelated, informal bucketing vocabulary
   * (Logistics/Inventory/Finance/…) used only by generateConsultantInsights
   * below — the two are deliberately never merged. See
   * docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md. Optional: a note with no
   * `relatedArea` remains a fully valid, purely contextual observation.
   */
  relatedArea?: string;
}

interface ConsultantInsights {
  executiveObservations: string[];
  operationalConcerns:   string[];
}

// ── Category → operational domain mapping ─────────────────────────────────────

const OPERATIONAL_CATEGORIES = new Set([
  "Logistics", "Inventory", "Operations", "Procurement", "Technology",
]);

const EXECUTIVE_CATEGORIES = new Set([
  "Finance", "Manpower", "Sales", "Other",
]);

// ── Keyword signals that promote a note to an operational concern ─────────────

const OPERATIONAL_KEYWORDS = [
  "shortage", "loss", "reject", "delay", "bottleneck", "breakdown",
  "missing", "error", "failure", "capacity", "utilisation", "utilization",
  "backlog", "damage", "discrepancy", "reconciliation", "escalation",
  "inefficiency", "waste", "overstock", "understock", "constraint",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function deduplicate(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isOperationalSignal(note: ConsultantNote): boolean {
  if (OPERATIONAL_CATEGORIES.has(note.category)) return true;
  const text = `${note.title} ${note.observation}`.toLowerCase();
  return OPERATIONAL_KEYWORDS.some(kw => text.includes(kw));
}

function formatNoteAsObservation(note: ConsultantNote): string {
  const cat = note.category ? `[${note.category}] ` : "";
  const title = note.title.trim();
  const obs   = note.observation.trim();
  if (!obs) return `${cat}${title}`.trim();
  if (title && !obs.toLowerCase().startsWith(title.toLowerCase())) {
    return `${cat}${title}: ${obs}`;
  }
  return `${cat}${obs}`;
}

function formatConcernAsObservation(concern: string): string {
  const c = concern.trim();
  if (!c) return "";
  const upper = c.charAt(0).toUpperCase() + c.slice(1);
  return upper.endsWith(".") ? upper : `${upper}.`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateConsultantInsights(params: {
  consultantNotes?:  ConsultantNote[];
  businessConcerns?: string[];
}): ConsultantInsights {
  try {
    const notes    = params.consultantNotes  ?? [];
    const concerns = params.businessConcerns ?? [];

    const executiveObservations: string[] = [];
    const operationalConcerns:   string[] = [];

    // ── Process consultant notes ───────────────────────────────────────────────
    for (const note of notes) {
      if (!note.observation?.trim() && !note.title?.trim()) continue;
      const formatted = formatNoteAsObservation(note);
      if (!formatted) continue;
      if (isOperationalSignal(note)) {
        operationalConcerns.push(formatted);
      } else {
        executiveObservations.push(formatted);
      }
    }

    // ── Promote EXECUTIVE_CATEGORY notes that contain operational keywords ─────
    // (already handled in isOperationalSignal — Finance/Manpower with keywords
    //  will end up in operationalConcerns, which is correct)

    // ── Process business concerns ──────────────────────────────────────────────
    for (const concern of concerns) {
      const formatted = formatConcernAsObservation(concern);
      if (!formatted) continue;
      operationalConcerns.push(formatted);
    }

    return {
      executiveObservations: deduplicate(executiveObservations),
      operationalConcerns:   deduplicate(operationalConcerns),
    };
  } catch {
    return { executiveObservations: [], operationalConcerns: [] };
  }
}
