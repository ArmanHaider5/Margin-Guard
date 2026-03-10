import { runMGDDiagnostic } from "./run-diagnostic";

export async function diagnosticHandler(req: any, res: any) {
  const { industry, signals, kpiData } = req.body;

  try {
    const result = await runMGDDiagnostic(industry, signals, kpiData);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
