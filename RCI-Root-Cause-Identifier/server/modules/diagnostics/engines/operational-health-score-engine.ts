// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL HEALTH SCORE ENGINE
//
// Produces a 0–100 score (higher = healthier) and a risk level label.
// Works with two data sources:
//   (a) rootCauses — array of findings/root-cause objects (may have .score,
//       .finalScore, .severity, or .evidenceStrength)
//   (b) benchmarkResults — array of KPI benchmark results (may have .severity)
// ─────────────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low";
type EvidenceStrength = "STRONG" | "MODERATE" | "WEAK";

interface RootCauseLike {
  score?: number;
  finalScore?: number;
  severity?: string;
  evidenceStrength?: string;
  category?: string;
}

interface BenchmarkResultLike {
  severity?: string;
}

// Map text-based severity to an equivalent numeric score for deduction logic
function severityToNumericScore(severity: string): number {
  switch ((severity ?? "").toLowerCase()) {
    case "critical":  return 85;
    case "high":      return 68;
    case "medium":    return 45;
    case "low":       return 22;
    default:          return 0;
  }
}

// Map evidence strength → modifier applied on top of severity score
function evidenceStrengthMultiplier(strength: string): number {
  switch ((strength ?? "").toUpperCase()) {
    case "STRONG":   return 1.2;
    case "MODERATE": return 1.0;
    case "WEAK":     return 0.7;
    default:         return 1.0;
  }
}

// Resolve a numeric score from a finding object that may use any shape
function resolveScore(cause: RootCauseLike): number {
  // Prefer explicit numeric score
  if (typeof cause.score === "number" && cause.score > 0) {
    return cause.score;
  }
  if (typeof cause.finalScore === "number" && cause.finalScore > 0) {
    return cause.finalScore;
  }

  // Fallback: derive from text severity + evidence strength
  const baseScore = severityToNumericScore(cause.severity ?? "");
  if (baseScore > 0) {
    const multiplier = evidenceStrengthMultiplier(cause.evidenceStrength ?? "");
    return Math.min(100, Math.round(baseScore * multiplier));
  }

  return 0;
}

// Deduction per finding, scaled by score band and capped to prevent runaway
function deductionForScore(score: number): number {
  if (score >= 80) return 16;
  if (score >= 65) return 12;
  if (score >= 45) return 8;
  if (score >= 20) return 4;
  return 0;
}

export function calculateOperationalHealthScore(
  rootCauses: RootCauseLike[],
  benchmarkResults: BenchmarkResultLike[]
): { overallScore: number; riskLevel: string } {

  let score = 100;

  // ── Deduct for each root cause finding ──────────────────────────────────
  const deductionCap = 70; // never deduct more than 70 pts from findings alone
  let findingDeductions = 0;

  for (const cause of rootCauses ?? []) {
    const numericScore = resolveScore(cause);
    const deduction = deductionForScore(numericScore);
    findingDeductions = Math.min(findingDeductions + deduction, deductionCap);
  }

  score -= findingDeductions;

  // ── Deduct for benchmark KPI deviations ─────────────────────────────────
  for (const metric of benchmarkResults ?? []) {
    const sev = (metric.severity ?? "").toLowerCase();
    if (sev === "critical") score -= 14;
    else if (sev === "high") score -= 8;
    else if (sev === "moderate" || sev === "medium") score -= 4;
  }

  // ── Clamp ────────────────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  // ── Risk level ───────────────────────────────────────────────────────────
  let riskLevel: string;
  if (score >= 80)      riskLevel = "Low";
  else if (score >= 60) riskLevel = "Moderate";
  else if (score >= 35) riskLevel = "High";
  else                  riskLevel = "Critical";

  console.log(
    `🏥 HEALTH SCORE: ${score} (${riskLevel}) | findings=${rootCauses?.length ?? 0}, benchmarks=${benchmarkResults?.length ?? 0}`
  );

  return { overallScore: score, riskLevel };
}
