import React from "react";

export default function BenchmarkTable({ result }: { result: any }) {
  const benchmarks = result.benchmarks || [];

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Benchmark Comparison</h2>
      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>KPI</th>
            <th>Actual</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          {benchmarks.map((b: any, i: number) => (
            <tr key={i}>
              <td>{b.kpi}</td>
              <td>{b.actual}</td>
              <td>{b.severity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
