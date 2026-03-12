import React from "react";

export default function RiskIndicators({ rootCauses }: { rootCauses: any[] }) {

  if (!rootCauses || rootCauses.length === 0) return null;

  const top = rootCauses.slice(0, 3);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">
        Top Operational Risks
      </h3>

      <ul className="space-y-2">
        {top.map((rc, i) => (
          <li key={i}>
            ⚠ {rc.title || rc.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
