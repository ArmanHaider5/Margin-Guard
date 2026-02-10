import PDFDocument from "pdfkit";

const PERNAS_COLORS = {
  primary: "#1a365d",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
  sectionBg: "#f7fafc",
};

const FOURM_LABELS: Record<string, string> = {
  Money: "Financial / Cost",
  Materials: "Materials / Inventory",
  Manpower: "Human Resource",
  Machinery: "Equipment / Systems",
};

interface RootCauseItem {
  category: string;
  cause: string;
  whyItMatters?: string;
  severity?: string;
  interventionDirection?: string;
}

interface RecommendationItem {
  category: string;
  recommendation: string;
  timeline?: string;
  priority?: string;
}

interface DiagnosticExportData {
  clientName: string;
  industry: string;
  problemStatement: string;
  createdAt: string;
  status: string;
  executiveSummary?: string;
  diagnosticOutputs: {
    rootCauses?: Array<{
      category: string;
      causes: RootCauseItem[];
    }>;
    recommendations?: Array<{
      category: string;
      recommendations: RecommendationItem[];
    }>;
    findings?: Array<{
      title: string;
      description: string;
      fourMCategory: string;
      severity: string;
      causes?: string[];
      solutions?: string[];
    }>;
  };
}

export function generateDiagnosticExport(data: DiagnosticExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        info: {
          Title: `Diagnostic Export - ${data.clientName}`,
          Author: "RCI Diagnostic System",
          Subject: "Institutional Diagnostic Report",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      renderHeader(doc, data, pageWidth);
      renderExecutiveSummary(doc, data, pageWidth);
      renderKeyRootCauses(doc, data, pageWidth);
      renderInterventionDirections(doc, data, pageWidth);
      renderGovernanceNotes(doc, pageWidth);
      renderFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function renderHeader(doc: PDFKit.PDFDocument, data: DiagnosticExportData, pageWidth: number) {
  doc.rect(0, 0, doc.page.width, 100).fill(PERNAS_COLORS.primary);

  doc.fontSize(18).fillColor("#ffffff").font("Helvetica-Bold");
  doc.text("DIAGNOSTIC EXPORT", 60, 35);
  
  doc.fontSize(10).font("Helvetica");
  doc.text("For Internal Circulation", 60, 60);

  const formattedDate = new Date(data.createdAt).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  doc.text(formattedDate, doc.page.width - 160, 60, { width: 100, align: "right" });

  doc.y = 120;

  doc.fontSize(12).fillColor(PERNAS_COLORS.text).font("Helvetica-Bold");
  doc.text(data.clientName, 60);
  
  doc.fontSize(10).font("Helvetica").fillColor(PERNAS_COLORS.muted);
  const industryLabel = data.industry?.replace(/_/g, " ") || "General";
  doc.text(`Industry: ${industryLabel}`, 60);
  doc.moveDown(0.5);

  doc.moveTo(60, doc.y).lineTo(60 + pageWidth, doc.y).strokeColor(PERNAS_COLORS.border).lineWidth(1).stroke();
  doc.y += 20;
}

function renderExecutiveSummary(doc: PDFKit.PDFDocument, data: DiagnosticExportData, pageWidth: number) {
  renderSectionHeader(doc, "1. Executive Diagnostic Summary", pageWidth);

  const summary = generateDefaultSummary(data);
  
  doc.fontSize(10).fillColor(PERNAS_COLORS.text).font("Helvetica");
  doc.text(summary, 60, doc.y, { 
    width: pageWidth, 
    align: "left",
    lineGap: 4,
  });
  
  doc.moveDown(1.5);
}

function generateDefaultSummary(data: DiagnosticExportData): string {
  const rootCauseCount = countRootCauses(data);
  const categories = getActiveCategories(data);
  const industryLabel = data.industry?.replace(/_/g, " ") || "general";
  
  const lines = [
    `Client: ${data.clientName} (${industryLabel} sector).`,
    `Root causes documented: ${rootCauseCount}.`,
    categories.length > 0 ? `Categories affected: ${categories.join(", ")}.` : "",
    `Review date: ${new Date(data.createdAt).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}.`,
    `For internal review and follow-up.`,
  ].filter(Boolean);
  
  return lines.slice(0, 5).join("\n");
}

function countRootCauses(data: DiagnosticExportData): number {
  if (data.diagnosticOutputs?.rootCauses) {
    return data.diagnosticOutputs.rootCauses.reduce((sum, cat) => sum + (cat.causes?.length || 0), 0);
  }
  if (data.diagnosticOutputs?.findings) {
    return data.diagnosticOutputs.findings.length;
  }
  return 0;
}

function getActiveCategories(data: DiagnosticExportData): string[] {
  const categories = new Set<string>();
  
  if (data.diagnosticOutputs?.rootCauses) {
    data.diagnosticOutputs.rootCauses.forEach(cat => {
      if (cat.causes?.length > 0) {
        categories.add(FOURM_LABELS[cat.category] || cat.category);
      }
    });
  }
  
  if (data.diagnosticOutputs?.findings) {
    data.diagnosticOutputs.findings.forEach(f => {
      if (f.fourMCategory) {
        categories.add(FOURM_LABELS[f.fourMCategory] || f.fourMCategory);
      }
    });
  }
  
  return Array.from(categories);
}

function renderKeyRootCauses(doc: PDFKit.PDFDocument, data: DiagnosticExportData, pageWidth: number) {
  renderSectionHeader(doc, "2. Key Root Causes", pageWidth);

  const rootCauses = extractRootCauses(data);
  
  if (rootCauses.length === 0) {
    doc.fontSize(10).fillColor(PERNAS_COLORS.muted).font("Helvetica-Oblique");
    doc.text("No root causes identified.", 60);
    doc.moveDown(1.5);
    return;
  }

  doc.fontSize(8).fillColor(PERNAS_COLORS.muted).font("Helvetica");
  doc.text("Format: Root Cause / Why It Matters / Intervention Direction", 60);
  doc.moveDown(0.8);

  rootCauses.forEach((rc, index) => {
    const categoryLabel = FOURM_LABELS[rc.category] || rc.category;
    const whyText = rc.whyItMatters || "—";
    const interventionText = rc.interventionDirection || "—";
    const detailText = `${whyText} → ${interventionText}`;
    
    doc.fontSize(10).font("Helvetica-Bold");
    const causeHeight = doc.heightOfString(`${index + 1}. ${rc.cause}`, { width: pageWidth - 20 });
    doc.fontSize(9).font("Helvetica");
    const detailHeight = doc.heightOfString(detailText, { width: pageWidth - 20 });
    
    const blockHeight = 22 + causeHeight + 6 + detailHeight + 10;
    
    if (doc.y + blockHeight > doc.page.height - 60) {
      doc.addPage();
      doc.y = 60;
    }

    const startY = doc.y;
    
    doc.rect(60, startY, pageWidth, blockHeight).fill(PERNAS_COLORS.sectionBg);
    
    doc.fontSize(9).fillColor(PERNAS_COLORS.muted).font("Helvetica");
    doc.text(`[${categoryLabel}]`, 70, startY + 8, { continued: false });
    
    doc.fontSize(10).fillColor(PERNAS_COLORS.text).font("Helvetica-Bold");
    doc.text(`${index + 1}. ${rc.cause}`, 70, startY + 22, { width: pageWidth - 20, continued: false });
    
    const detailY = startY + 22 + causeHeight + 4;
    doc.fontSize(9).fillColor(PERNAS_COLORS.text).font("Helvetica");
    doc.text(detailText, 70, detailY, { width: pageWidth - 20, continued: false });
    
    doc.y = startY + blockHeight + 8;
  });

  doc.moveDown(1);
}

function extractRootCauses(data: DiagnosticExportData): RootCauseItem[] {
  const causes: RootCauseItem[] = [];
  
  if (data.diagnosticOutputs?.rootCauses) {
    data.diagnosticOutputs.rootCauses.forEach(cat => {
      cat.causes?.forEach(c => {
        const causeLabel = c.cause || (c as any).title;
        if (!causeLabel) return;
        causes.push({
          category: cat.category,
          cause: causeLabel,
          whyItMatters: c.whyItMatters || (c as any).description || "—",
          severity: c.severity,
          interventionDirection: c.interventionDirection || (c as any).intervention || "—",
        });
      });
    });
  }
  
  if (causes.length === 0 && data.diagnosticOutputs?.findings) {
    data.diagnosticOutputs.findings.forEach(f => {
      if (!f.title?.trim()) return;
      causes.push({
        category: f.fourMCategory || "General",
        cause: f.title.trim(),
        whyItMatters: f.description?.trim() || "—",
        severity: f.severity,
        interventionDirection: f.solutions?.[0]?.trim() || "—",
      });
    });
  }
  
  return causes;
}

function renderInterventionDirections(doc: PDFKit.PDFDocument, data: DiagnosticExportData, pageWidth: number) {
  if (doc.y > doc.page.height - 200) {
    doc.addPage();
    doc.y = 60;
  }
  
  renderSectionHeader(doc, "3. Intervention Directions", pageWidth);

  const { immediate, structural, prevention } = categorizeInterventions(data);

  renderInterventionGroup(doc, "Immediate (Within 2 weeks)", immediate, pageWidth);
  renderInterventionGroup(doc, "Structural (1-3 months)", structural, pageWidth);
  renderInterventionGroup(doc, "Prevention (Ongoing)", prevention, pageWidth);

  doc.moveDown(1);
}

function categorizeInterventions(data: DiagnosticExportData): {
  immediate: string[];
  structural: string[];
  prevention: string[];
} {
  const immediate: string[] = [];
  const structural: string[] = [];
  const prevention: string[] = [];
  
  if (data.diagnosticOutputs?.recommendations) {
    data.diagnosticOutputs.recommendations.forEach(cat => {
      cat.recommendations?.forEach(r => {
        const timeline = (r.timeline || r.priority || "").toLowerCase();
        const text = r.recommendation;
        
        if (timeline.includes("immediate") || timeline.includes("urgent") || timeline.includes("high")) {
          immediate.push(text);
        } else if (timeline.includes("structural") || timeline.includes("medium") || timeline.includes("month")) {
          structural.push(text);
        } else if (timeline.includes("prevention") || timeline.includes("ongoing") || timeline.includes("low")) {
          prevention.push(text);
        } else {
          structural.push(text);
        }
      });
    });
  }
  
  if (immediate.length === 0 && structural.length === 0 && prevention.length === 0) {
    if (data.diagnosticOutputs?.findings) {
      const criticalFindings = data.diagnosticOutputs.findings.filter(
        f => f.severity === "critical" || f.severity === "high"
      );
      const mediumFindings = data.diagnosticOutputs.findings.filter(
        f => f.severity === "medium"
      );
      const lowFindings = data.diagnosticOutputs.findings.filter(
        f => f.severity === "low"
      );
      
      criticalFindings.forEach(f => {
        if (f.solutions?.[0]) immediate.push(f.solutions[0]);
      });
      mediumFindings.forEach(f => {
        if (f.solutions?.[0]) structural.push(f.solutions[0]);
      });
      lowFindings.forEach(f => {
        if (f.solutions?.[0]) prevention.push(f.solutions[0]);
      });
    }
  }
  
  return { immediate, structural, prevention };
}

function renderInterventionGroup(doc: PDFKit.PDFDocument, title: string, items: string[], pageWidth: number) {
  if (doc.y > doc.page.height - 100) {
    doc.addPage();
    doc.y = 60;
  }
  
  doc.fontSize(10).fillColor(PERNAS_COLORS.primary).font("Helvetica-Bold");
  doc.text(title, 60);
  doc.moveDown(0.3);
  
  if (items.length === 0) {
    doc.fontSize(9).fillColor(PERNAS_COLORS.muted).font("Helvetica-Oblique");
    doc.text("None specified.", 70);
  } else {
    doc.fontSize(9).fillColor(PERNAS_COLORS.text).font("Helvetica");
    items.slice(0, 5).forEach((item, i) => {
      doc.text(`${i + 1}. ${item}`, 70, doc.y, { width: pageWidth - 20 });
      doc.moveDown(0.5);
    });
  }
  
  doc.moveDown(0.8);
}

function renderGovernanceNotes(doc: PDFKit.PDFDocument, pageWidth: number) {
  if (doc.y > doc.page.height - 180) {
    doc.addPage();
    doc.y = 60;
  }
  
  renderSectionHeader(doc, "4. Governance & Follow-Up Notes", pageWidth);

  doc.rect(60, doc.y, pageWidth, 100).fill(PERNAS_COLORS.sectionBg);
  
  const startY = doc.y + 15;
  
  doc.fontSize(9).fillColor(PERNAS_COLORS.text).font("Helvetica");
  
  const fields = [
    "Review Committee: _______________________________________________",
    "Review Date: ____________________________________________________",
    "Next Review: ____________________________________________________",
    "Action Owner: ___________________________________________________",
    "Remarks: ________________________________________________________",
  ];
  
  fields.forEach((field, i) => {
    doc.text(field, 70, startY + (i * 16), { width: pageWidth - 20 });
  });
  
  doc.y += 120;
}

function renderSectionHeader(doc: PDFKit.PDFDocument, title: string, pageWidth: number) {
  doc.fontSize(12).fillColor(PERNAS_COLORS.primary).font("Helvetica-Bold");
  doc.text(title, 60);
  doc.moveDown(0.3);
  doc.moveTo(60, doc.y).lineTo(60 + pageWidth * 0.3, doc.y).strokeColor(PERNAS_COLORS.primary).lineWidth(2).stroke();
  doc.moveDown(0.8);
}

function renderFooter(doc: PDFKit.PDFDocument) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    
    doc.fontSize(8).fillColor(PERNAS_COLORS.muted).font("Helvetica");
    doc.text(
      `Page ${i + 1} of ${pages.count} | Internal Document | RCI Diagnostic System`,
      60,
      doc.page.height - 40,
      { align: "center", width: doc.page.width - 120 }
    );
  }
}
