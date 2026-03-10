import React from "react";

export default function BenchmarkTable({ result }: { result: any }) {
  const benchmarkResults = result?.benchmarks?.benchmarkResults || [];

  return (
    <div className="border rounded-lg p-6">
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
                <td className="py-2">{b.actual}{b.unit ? ` ${b.unit}` : ""}</td>
                <td className="py-2">{b.benchmark}{b.unit ? ` ${b.unit}` : ""}</td>
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
  );
}
