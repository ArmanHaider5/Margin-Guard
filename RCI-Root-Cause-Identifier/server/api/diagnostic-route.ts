import { normalizeSignals } from "../signals/signal-normalizer";
import { runDiagnosticPipeline } from "../pipelines/run-diagnostic-pipeline";

export async function diagnosticHandler(req: any, res: any) {
  try {
    const { industry, signals, kpiData } = req.body;

    const normalizedSignals = normalizeSignals(signals);

    const result = await runDiagnosticPipeline({
      industry,
      signals: normalizedSignals.map(s => s.signalId),
      kpiData,
      findings: []
    });

    res.json(result);
  } catch (error: any) {
    console.error("MGD Diagnostic Error:", error);
    res.status(500).json({ error: error.message });
  }
}
