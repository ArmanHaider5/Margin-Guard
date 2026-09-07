import PQueue from "p-queue";
import { runDiagnosticPipeline } from "../modules/diagnostics/pipelines/run-diagnostic-pipeline";

const queue = new PQueue({
  concurrency: 2
});

export async function queueDiagnosticJob(payload: {
  industry: string;
  signals: string[];
  kpiData: any;
}) {

  return queue.add(async () => {
    return await runDiagnosticPipeline({
      industry: payload.industry,
      signals: payload.signals,
      kpiData: payload.kpiData,
      findings: []
    });
  });
}
