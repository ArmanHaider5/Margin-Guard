import React from "react";

export default function RootCauseTree({ result }: { result: any }) {
  const primary = result?.rootCauseTree?.primary;
  const secondary = result?.rootCauseTree?.secondary || [];
  const contributing = result?.rootCauseTree?.contributing || [];

  const supportingCauses = [...secondary, ...contributing];

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Root Cause Tree</h2>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Primary Cause</p>
        {primary ? (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-base font-semibold">{primary.rootCause}</h3>
            {primary.description && (
              <p className="text-sm text-muted-foreground mt-1">{primary.description}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No primary root cause identified</p>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Supporting Causes</p>
        {supportingCauses.length > 0 ? (
          <ul className="space-y-1">
            {supportingCauses.map((cause: any, i: number) => (
              <li key={i} className="flex items-center gap-2 py-1.5 px-3 bg-muted/30 rounded text-sm">
                <span className="text-muted-foreground">•</span>
                <span>{cause.rootCause}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No supporting causes identified</p>
        )}
      </div>
    </div>
  );
}
