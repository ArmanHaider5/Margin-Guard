import { runDiagnosticPipeline } from "../pipelines/run-diagnostic-pipeline";

export async function runMGDDiagnostic(industry: string, signals: string[], kpiData: any) {
  const result = await runDiagnosticPipeline({
    industry,
    signals,
    kpiData,
    findings: []
  });

  return result;
}
