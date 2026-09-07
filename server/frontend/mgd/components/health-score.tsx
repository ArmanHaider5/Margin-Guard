import React from "react";

export default function HealthScore({ result }: { result: any }) {
  const healthScore = result?.healthScore || {};
  const score = healthScore.overallScore ?? 0;
  const riskLevel = healthScore.riskLevel || "Unknown";
  const savings = result?.savings?.estimatedSavings || "N/A";

  const scoreColor =
    score >= 70 ? "text-green-600" :
    score >= 50 ? "text-amber-600" :
    score >= 30 ? "text-orange-600" :
    "text-red-600";

  const riskColor =
    riskLevel === "Low" ? "bg-green-100 text-green-700" :
    riskLevel === "Moderate" ? "bg-amber-100 text-amber-700" :
    riskLevel === "High" ? "bg-orange-100 text-orange-700" :
    riskLevel === "Critical" ? "bg-red-100 text-red-700" :
    "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex-1 min-w-[200px] border rounded-lg p-6">
        <p className="text-sm text-muted-foreground mb-1">Operational Health Score</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
      </div>

      <div className="flex-1 min-w-[200px] border rounded-lg p-6">
        <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${riskColor}`}>
          {riskLevel}
        </span>
      </div>

      <div className="flex-1 min-w-[200px] border rounded-lg p-6">
        <p className="text-sm text-muted-foreground mb-1">Estimated Savings</p>
        <p className="text-xl font-semibold">{savings}</p>
      </div>
    </div>
  );
}
