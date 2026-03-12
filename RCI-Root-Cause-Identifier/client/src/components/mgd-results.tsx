import React from "react";

export default function MgdResults({ mgd }: { mgd: any }) {
  if (!mgd) return null;

  return (
    <div className="space-y-6 mt-6">

      {/* Health Score */}
      {mgd.healthScore !== undefined && (
        <div className="card">
          <h3 className="text-lg font-semibold">Operational Health Score</h3>
          <p className="text-3xl font-bold">{mgd.healthScore}</p>
        </div>
      )}

      {/* Root Cause */}
      {mgd.rootCauseTree?.primary && (
        <div className="card">
          <h3 className="text-lg font-semibold">Primary Root Cause</h3>
          <p>{mgd.rootCauseTree.primary.name || mgd.rootCauseTree.primary}</p>
        </div>
      )}

      {/* Benchmarks */}
      {Array.isArray(mgd.benchmarks) && mgd.benchmarks.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold">Industry Benchmarks</h3>
          <pre>{JSON.stringify(mgd.benchmarks, null, 2)}</pre>
        </div>
      )}

      {/* Cost Savings */}
      {mgd.savings && (
        <div className="card">
          <h3 className="text-lg font-semibold">Cost Saving Opportunities</h3>
          <pre>{JSON.stringify(mgd.savings, null, 2)}</pre>
        </div>
      )}

      {/* Roadmap */}
      {Array.isArray(mgd.roadmap) && mgd.roadmap.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold">Recovery Roadmap</h3>
          <pre>{JSON.stringify(mgd.roadmap, null, 2)}</pre>
        </div>
      )}

      {/* Narrative */}
      {mgd.narrative && (
        <div className="card">
          <h3 className="text-lg font-semibold">Consulting Narrative</h3>
          <p>{mgd.narrative.summary || mgd.narrative}</p>
        </div>
      )}

    </div>
  );
}
