import React from "react";

export default function HealthScoreCards({ result }: { result: any }) {
  return (
    <div style={{
      display: "flex",
      gap: 20,
      marginTop: 20
    }}>
      <div style={{
        border: "1px solid #ddd",
        padding: 20,
        borderRadius: 8,
        width: 200
      }}>
        <h3>Health Score</h3>
        <div style={{ fontSize: 32, fontWeight: "bold" }}>
          {result.healthScore?.overallScore}
        </div>
      </div>

      <div style={{
        border: "1px solid #ddd",
        padding: 20,
        borderRadius: 8,
        width: 200
      }}>
        <h3>Risk Level</h3>
        <div>{result.healthScore?.riskLevel}</div>
      </div>

      <div style={{
        border: "1px solid #ddd",
        padding: 20,
        borderRadius: 8,
        width: 200
      }}>
        <h3>Estimated Savings</h3>
        <div>{result.savings?.estimatedSavings}</div>
      </div>
    </div>
  );
}
