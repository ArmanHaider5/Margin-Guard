import { runUnifiedDiagnostic } from "../services/unified-diagnostic-engine";

export async function runDiagnosticPipeline({
  industry,
  signals,
  kpiData,
  findings
}: {
  industry: string;
  signals: string[];
  kpiData: any;
  findings: any[];
}) {

  const finalFindings = findings;

  const unified = await runUnifiedDiagnostic({
    industry,
    signals,
    kpiData,
    baseFindings: finalFindings
  });

  return {
    findings: unified.findings,
    mgdAnalysis: unified.mgdAnalysis
  };
}
