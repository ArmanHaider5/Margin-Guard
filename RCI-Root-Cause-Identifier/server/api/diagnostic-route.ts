import { normalizeSignals } from "../signals/signal-normalizer";
import { queueDiagnosticJob } from "../queues/diagnostic-queue";

export async function diagnosticHandler(req: any, res: any) {
  try {
    const { industry, signals, kpiData } = req.body;

    let signalIds: string[];

    if (Array.isArray(signals)) {
      // Signals already provided as IDs
      signalIds = signals;
    } else {
      // Signals provided as free-form text
      const normalizedSignals = normalizeSignals(signals);
      signalIds = normalizedSignals.map(s => s.signalId);
    }

    const result = await queueDiagnosticJob({
      industry,
      signals: signalIds,
      kpiData
    });

    res.json(result);
  } catch (error: any) {
    console.error("MGD Diagnostic Error:", error);
    res.status(500).json({ error: error.message });
  }
}
