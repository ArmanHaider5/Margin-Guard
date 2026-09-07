import React from "react";

const severityConfig: Record<string, { label: string; icon: string; color: string }> = {
  Critical: { label: "Critical", icon: "🔴", color: "text-red-600" },
  High: { label: "High", icon: "🟠", color: "text-orange-600" },
  Moderate: { label: "Moderate", icon: "🟡", color: "text-amber-600" },
  Low: { label: "Stable", icon: "🟢", color: "text-green-600" }
};

function classifyCategorySeverity(score: number): string {
  if (score >= 70) return "Critical";
  if (score >= 50) return "High";
  if (score >= 30) return "Moderate";
  return "Low";
}

export default function RiskMap({ result }: { result: any }) {
  const findings = [
    ...(result?.rootCauseTree?.primary ? [result.rootCauseTree.primary] : []),
    ...(result?.rootCauseTree?.secondary || []),
    ...(result?.rootCauseTree?.contributing || [])
  ];

  const categoryScores: Record<string, number> = {};
  for (const f of findings) {
    const cat = f.category || "Other";
    const score = f.score || 0;
    if (!categoryScores[cat] || score > categoryScores[cat]) {
      categoryScores[cat] = score;
    }
  }

  const categories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])
    .map(([category, score]) => ({
      category,
      score,
      severity: classifyCategorySeverity(score)
    }));

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Operational Risk Areas</h2>
      {categories.length > 0 ? (
        <div className="space-y-2">
          {categories.map((item, i) => {
            const config = severityConfig[item.severity] || severityConfig.Low;
            return (
              <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                <span className="text-sm font-medium">{item.category}</span>
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.icon} {config.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No risk areas detected</p>
      )}
    </div>
  );
}
