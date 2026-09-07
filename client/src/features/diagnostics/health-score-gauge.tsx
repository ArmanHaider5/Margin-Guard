import React from "react";

export default function HealthScoreGauge({ score }: { score: number }) {

  if (!score && score !== 0) return null;

  let color = "#22c55e";

  if (score < 70) color = "#f59e0b";
  if (score < 40) color = "#ef4444";

  return (
    <div className="card text-center">
      <h3 className="text-lg font-semibold mb-4">
        Operational Health
      </h3>

      <div
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          color
        }}
      >
        {score}%
      </div>
    </div>
  );
}
