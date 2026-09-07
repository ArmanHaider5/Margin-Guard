export interface RootCauseConfidence {
  id: string;
  probability: number;
}

export function calculateRootCauseConfidence(findings: any[]) {

  if (!findings || findings.length === 0) return [];

  const totalScore = findings.reduce((sum, f) => sum + (f.score || 0), 0);

  if (totalScore === 0) return [];

  const probabilities = findings.map(f => ({
    id: f.id,
    probability: Math.round((f.score / totalScore) * 100)
  }));

  return probabilities;
}
