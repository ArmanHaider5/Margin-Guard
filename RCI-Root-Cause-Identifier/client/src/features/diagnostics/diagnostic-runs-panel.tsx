import React from "react";

export default function DiagnosticRunsPanel({
  runs,
  selectedRun,
  onSelect
}: any) {

  if (!runs) return null;

  return (
    <div className="card">

      <h3 className="text-lg font-semibold mb-4">
        Diagnostic Runs
      </h3>

      <div className="space-y-2">

        {runs.map((run: any, i: number) => (

          <div
            key={run.id}
            className={`p-2 cursor-pointer border rounded ${
              selectedRun?.id === run.id ? "bg-gray-200" : ""
            }`}
            onClick={() => onSelect(run)}
          >
            Run #{runs.length - i} — {new Date(run.createdAt).toLocaleString()}
          </div>

        ))}

      </div>

    </div>
  );
}
