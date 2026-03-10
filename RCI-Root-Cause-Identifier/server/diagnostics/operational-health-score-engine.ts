export function calculateOperationalHealthScore(rootCauses: any[], benchmarkResults: any[]) {
  let score = 100;

  rootCauses.forEach(cause => {
    if (cause.score >= 70) score -= 15;
    else if (cause.score >= 50) score -= 10;
    else if (cause.score >= 30) score -= 5;
  });

  benchmarkResults.forEach(metric => {
    if (metric.severity === "Critical") score -= 15;
    if (metric.severity === "High") score -= 8;
  });

  if (score < 0) score = 0;

  let riskLevel = "Low";
  if (score < 70) riskLevel = "Moderate";
  if (score < 50) riskLevel = "High";
  if (score < 30) riskLevel = "Critical";

  return {
    overallScore: score,
    riskLevel
  };
}
