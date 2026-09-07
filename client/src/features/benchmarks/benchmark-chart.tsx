import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function BenchmarkChart({ data }: { data: any[] }) {

  if (!data || data.length === 0) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">
        Benchmark Comparison
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="kpi" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="company" />
          <Bar dataKey="industry" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
