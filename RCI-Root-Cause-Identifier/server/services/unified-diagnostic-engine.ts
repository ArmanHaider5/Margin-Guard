import { runMGDDiagnostic } from "../api/run-diagnostic";

export async function runUnifiedDiagnostic({
  industry,
  signals,
  kpiData,
  baseFindings
}: {
  industry: string;
  signals: string[];
  kpiData: any;
  baseFindings: any[];
}) {

  const mgdAnalysis = await runMGDDiagnostic(
    industry,
    signals,
    kpiData
  );

  return {
    findings: baseFindings,
    mgdAnalysis
  };
}
