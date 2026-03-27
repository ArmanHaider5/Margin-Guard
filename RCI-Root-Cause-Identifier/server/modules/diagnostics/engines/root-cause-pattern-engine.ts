// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE PATTERN ENGINE
//
// Detects diagnostic patterns from the set of active signals.
// Uses substring/fuzzy matching rather than exact signal IDs so patterns
// are detected across different signal naming conventions.
// ─────────────────────────────────────────────────────────────────────────────

interface DiagnosticPattern {
  pattern: string;
  description: string;
  category: string;
  severity: "high" | "moderate" | "informational";
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN DEFINITIONS
// Each pattern: list of signal fragments that must all be present (AND logic).
// Fragments use lowercase, space-separated keywords — matched against
// normalised incoming signals (underscores → spaces, lowercased).
// ─────────────────────────────────────────────────────────────────────────────

const PATTERN_RULES: {
  pattern: string;
  description: string;
  category: string;
  severity: "high" | "moderate" | "informational";
  requiredSignals: string[][];  // OR groups — any group fully matching triggers the pattern
}[] = [

  {
    pattern: "Reactive Maintenance Culture",
    description: "Deferred maintenance is driving recurring equipment failures and unplanned downtime, creating a reactive cycle that erodes both reliability and production capacity.",
    category: "Machinery",
    severity: "high",
    requiredSignals: [
      ["maintenance", "breakdown"],
      ["pm overdue", "downtime"],
      ["maintenance backlog", "breakdown"],
      ["pm", "machine breakdown"],
    ],
  },

  {
    pattern: "Production Planning Instability",
    description: "Unstable production scheduling — driven by material shortages or last-minute changes — is creating a pattern of reactive firefighting that compounds delivery failures.",
    category: "Materials",
    severity: "high",
    requiredSignals: [
      ["production", "schedule", "shortage"],
      ["planning", "delay", "reschedule"],
      ["inventory", "production", "overtime"],
      ["material shortage", "production"],
    ],
  },

  {
    pattern: "Workforce Overload Pattern",
    description: "Chronic overtime and extended shift patterns are masking an underlying workforce capacity deficit, driving fatigue-related errors and accelerating attrition.",
    category: "Manpower",
    severity: "high",
    requiredSignals: [
      ["overtime", "fatigue"],
      ["overtime", "backlog"],
      ["extended shift", "error"],
      ["overtime", "turnover"],
    ],
  },

  {
    pattern: "Quality Degradation Loop",
    description: "Rising defect rates are creating a rework and scrap loop that is compounding cost and consuming production capacity without generating customer value.",
    category: "Quality",
    severity: "high",
    requiredSignals: [
      ["defect", "rework"],
      ["scrap", "quality"],
      ["defect", "scrap"],
      ["rework", "rejection"],
    ],
  },

  {
    pattern: "Supply Chain Vulnerability",
    description: "Single-source dependency or chronically unreliable suppliers are creating material availability risk that directly threatens production continuity.",
    category: "Materials",
    severity: "moderate",
    requiredSignals: [
      ["supplier delay", "shortage"],
      ["supplier", "material shortage"],
      ["lead time", "shortage"],
      ["supplier", "production halt"],
    ],
  },

  {
    pattern: "Workforce Attrition Cycle",
    description: "High turnover is creating a self-reinforcing cycle where experienced staff losses widen skills gaps, increase errors, and drive further dissatisfaction among remaining employees.",
    category: "Manpower",
    severity: "high",
    requiredSignals: [
      ["turnover", "skill gap"],
      ["high turnover", "training"],
      ["attrition", "competency"],
      ["turnover", "knowledge loss"],
    ],
  },

  {
    pattern: "Cost Escalation Pattern",
    description: "Multiple simultaneous cost pressures — including overtime, scrap, and downtime — are compounding into a cost structure that is eroding operational profitability.",
    category: "Money",
    severity: "moderate",
    requiredSignals: [
      ["overtime", "cost overrun"],
      ["downtime", "cost"],
      ["scrap", "overtime", "cost"],
      ["energy", "overtime", "cost"],
    ],
  },

  {
    pattern: "Capacity Bottleneck",
    description: "Production capacity is running at or near its limit, creating bottlenecks that amplify any operational disruption into delivery failures.",
    category: "Machinery",
    severity: "moderate",
    requiredSignals: [
      ["capacity", "bottleneck"],
      ["line bottleneck", "delay"],
      ["utilization", "overtime"],
      ["capacity utilization", "production delay"],
    ],
  },

];

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function signalMatchesFragment(signal: string, fragment: string): boolean {
  const sig = normalise(signal);
  const frag = normalise(fragment);
  return sig.includes(frag) || frag.includes(sig);
}

function groupMatches(signals: string[], group: string[]): boolean {
  // Every fragment in the group must be matched by at least one signal
  return group.every((fragment) =>
    signals.some((signal) => signalMatchesFragment(signal, fragment))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function detectRootCausePatterns(
  signals: string[],
  findings?: any[]
): DiagnosticPattern[] {

  const detected: DiagnosticPattern[] = [];
  const normalised = signals.map(normalise);

  // Supplement signals with finding titles for broader matching
  const findingSignals = (findings ?? []).map((f) =>
    normalise(f.title ?? f.name ?? "")
  );
  const allSignals = [...normalised, ...findingSignals].filter(Boolean);

  for (const rule of PATTERN_RULES) {
    // Check if any required signal group is fully matched
    const matched = rule.requiredSignals.some((group) =>
      groupMatches(allSignals, group)
    );

    if (matched) {
      detected.push({
        pattern: rule.pattern,
        description: rule.description,
        category: rule.category,
        severity: rule.severity,
      });
    }
  }

  console.log(
    `🔎 PATTERNS DETECTED: ${detected.length}/${PATTERN_RULES.length}`,
    detected.map(p => p.pattern)
  );

  return detected;
}
