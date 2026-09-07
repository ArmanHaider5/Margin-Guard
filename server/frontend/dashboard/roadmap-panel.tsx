import React from "react";

export default function RoadmapPanel({ result }: { result: any }) {
  const roadmap = result.roadmap || [];

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Transformation Roadmap</h2>
      {roadmap.map((phase: any, i: number) => (
        <div key={i} style={{
          border: "1px solid #eee",
          padding: 20,
          marginBottom: 10
        }}>
          <h3>{phase.phase}</h3>
          <ul>
            {phase.actions.map((a: string, j: number) => (
              <li key={j}>{a}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
