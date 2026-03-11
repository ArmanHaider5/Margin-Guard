import { runMGDDiagnostic } from "./run-diagnostic";

export async function diagnosticHandler(req: any, res: any) {
  try {
    const { industry, signals, kpiData } = req.body;

    const result = await runMGDDiagnostic(
      industry,
      signals || [],
      kpiData || {}
    );

    res.json(result);
  } catch (error: any) {
    console.error("MGD Diagnostic Error:", error);
    res.status(500).json({ error: error.message });
  }
}
