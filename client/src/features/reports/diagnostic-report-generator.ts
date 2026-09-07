import jsPDF from "jspdf";

export function generateDiagnosticReport(mgd: any) {

  const doc = new jsPDF();

  let y = 20;

  const addLine = (text: string) => {
    doc.text(text, 20, y);
    y += 10;
  };

  doc.setFontSize(18);
  doc.text("Operational Diagnostic Report", 20, y);
  y += 20;

  doc.setFontSize(12);

  addLine("Executive Summary");

  addLine(
    mgd?.narrative?.summary ||
    "Operational issues identified through diagnostic analysis."
  );

  y += 10;

  addLine("Primary Root Cause");

  addLine(
    mgd?.rootCauseTree?.primaryCause?.title ||
    mgd?.rootCauseTree?.primaryCause?.name ||
    "Not identified"
  );

  y += 10;

  addLine("Secondary Causes");

  mgd?.rootCauseTree?.secondaryCauses?.forEach((rc: any) => {
    addLine("- " + (rc.title || rc.name));
  });

  y += 10;

  addLine("Causal Chain");

  mgd?.causalChains?.[0]?.chain?.forEach((step: string) => {
    addLine("→ " + step);
  });

  y += 10;

  addLine("Recommended Actions");

  mgd?.savings?.forEach((s: any) => {
    addLine("- " + (s.title || s.description));
  });

  doc.save("diagnostic-report.pdf");
}
