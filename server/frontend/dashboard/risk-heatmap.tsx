import React from "react";

export default function RiskHeatmap({ result }: { result: any }) {
  const causes = result.rootCauseTree?.secondary || [];

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Operational Risk Areas</h2>
      <ul>
        {causes.map((cause: any, i: number) => (
          <li key={i}>{cause.rootCause} — Score {cause.score}</li>
        ))}
      </ul>
    </div>
  );
}
