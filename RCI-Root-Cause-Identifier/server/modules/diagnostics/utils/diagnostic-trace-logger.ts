export interface DiagnosticTrace {
  signals: string[];
  rootCauses: any[];
  causalChains: any[];
  recommendations: any[];
}

export function logDiagnosticTrace(trace: DiagnosticTrace) {

  console.log("========== DIAGNOSTIC TRACE ==========");

  console.log("Signals:");
  trace.signals.forEach(s => console.log(" -", s));

  console.log("\nRoot Causes:");
  trace.rootCauses.forEach(rc =>
    console.log(` - ${rc.title || rc.name || rc.id}`)
  );

  console.log("\nCausal Chains:");
  trace.causalChains.forEach(chain =>
    console.log(" -", chain.chain?.join(" → "))
  );

  console.log("\nRecommendations:");
  trace.recommendations.forEach(r =>
    console.log(" -", r.title || r.action || r)
  );

  console.log("======================================");
}
