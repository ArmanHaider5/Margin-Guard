import React, { useEffect, useState } from "react";

const placeholderData = {
  healthScore: { overallScore: 0, riskLevel: "Unknown" },
  rootCauseTree: { primary: null, secondary: [], contributing: [] },
  causalChains: [],
  patterns: [],
  benchmarks: { benchmarkResults: [] },
  savings: { opportunities: [], estimatedSavings: "N/A" },
  roadmap: [],
  narrative: { summary: "" }
};

export default function MGDDashboard() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDiagnostic() {
      try {
        const diagnosticId = "9b24bd79-febd-4ac2-90d8-566fc49b87f7";

        const response = await fetch(`/api/diagnostics/${diagnosticId}`);

        const data = await response.json();

        console.log("Loaded diagnostic:", data);

        setResult(data);
      } catch (err: any) {
        setError(err.message);
        setResult(placeholderData);
      } finally {
        setLoading(false);
      }
    }

    loadDiagnostic();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-foreground border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Running MGD Diagnostic...</p>
        </div>
      </div>
    );
  }

  const data = result || placeholderData;
  const healthScore = data.healthScore || placeholderData.healthScore;
  const rootCauseTree = data.rootCauseTree || placeholderData.rootCauseTree;
  const benchmarkResults = data.benchmarks?.benchmarkResults || [];
  const roadmap = data.roadmap || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">

        <h1 className="text-2xl font-semibold mb-8">MGD Operational Diagnostic</h1>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Health Score</p>
            <p className="text-4xl font-bold">{healthScore.overallScore}</p>
          </div>
          <div className="border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
            <p className="text-xl font-semibold">{healthScore.riskLevel}</p>
          </div>
          <div className="border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Estimated Savings</p>
            <p className="text-xl font-semibold">{data.savings?.estimatedSavings || "N/A"}</p>
          </div>
        </div>

        <div className="border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Operational Risk Areas</h2>
          {(rootCauseTree.secondary || []).length > 0 ? (
            <ul className="space-y-2">
              {rootCauseTree.secondary.map((cause: any, i: number) => (
                <li key={i} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                  <span className="text-sm">{cause.rootCause}</span>
                  <span className="text-sm font-medium">Score {cause.score}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No secondary risk areas detected</p>
          )}
        </div>

        <div className="border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Primary Root Cause</h2>
          {rootCauseTree.primary ? (
            <div>
              <h3 className="text-base font-medium">{rootCauseTree.primary.rootCause}</h3>
              <p className="text-sm text-muted-foreground mt-1">{rootCauseTree.primary.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No primary root cause identified</p>
          )}
        </div>

        <div className="border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Benchmark Comparison</h2>
          {benchmarkResults.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">KPI</th>
                  <th className="text-left py-2 font-medium">Actual</th>
                  <th className="text-left py-2 font-medium">Benchmark</th>
                  <th className="text-left py-2 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {benchmarkResults.map((b: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{b.kpi}</td>
                    <td className="py-2">{b.actual}</td>
                    <td className="py-2">{b.benchmark}</td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        b.severity === "Critical" ? "bg-red-100 text-red-700" :
                        b.severity === "High" ? "bg-amber-100 text-amber-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {b.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No benchmark data available</p>
          )}
        </div>

        <div className="border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Transformation Roadmap</h2>
          {roadmap.length > 0 ? (
            <div className="space-y-4">
              {roadmap.map((phase: any, i: number) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-2">{phase.phase}</h3>
                  <ul className="space-y-1">
                    {phase.actions.map((a: string, j: number) => (
                      <li key={j} className="text-sm text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0">
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No transformation roadmap available</p>
          )}
        </div>

      </div>
    </div>
  );
}
