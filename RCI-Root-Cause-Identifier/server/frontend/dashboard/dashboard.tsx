import React, { useEffect, useState } from "react";

import HealthScoreCards from "./health-score-cards";
import RiskHeatmap from "./risk-heatmap";
import RootCausePanel from "./root-cause-panel";
import BenchmarkTable from "./benchmark-table";
import RoadmapPanel from "./roadmap-panel";

export default function MGDDashboard() {
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function runDiagnostic() {
      const response = await fetch("/api/diagnostic-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: "manufacturing",
          signals: ["machine_breakdown", "downtime", "overtime"],
          kpiData: { downtime: 18, otd: 70 }
        })
      });

      const data = await response.json();
      setResult(data);
    }

    runDiagnostic();
  }, []);

  if (!result) return <div style={{ padding: 40 }}>Running MGD Diagnostic...</div>;

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>MGD Operational Diagnostic</h1>
      <HealthScoreCards result={result} />
      <RiskHeatmap result={result} />
      <RootCausePanel result={result} />
      <BenchmarkTable result={result} />
      <RoadmapPanel result={result} />
    </div>
  );
}
