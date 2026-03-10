import React from "react";

export default function Roadmap({ result }: { result: any }) {
  const roadmap = result?.roadmap || [];

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Transformation Roadmap</h2>
      {roadmap.length > 0 ? (
        <div className="space-y-4">
          {roadmap.map((phase: any, i: number) => (
            <div key={i} className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">
                Phase {i + 1} — {phase.phase}
              </h3>
              <ul className="space-y-1">
                {phase.actions.map((a: string, j: number) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No transformation roadmap available</p>
      )}
    </div>
  );
}
