import React from "react";

export default function RootCausePanel({ result }: { result: any }) {
  const primary = result.rootCauseTree?.primary;

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Primary Root Cause</h2>
      <div style={{
        border: "1px solid #ddd",
        padding: 20,
        borderRadius: 8
      }}>
        <h3>{primary?.rootCause}</h3>
        <p>{primary?.description}</p>
      </div>
    </div>
  );
}
