import PDFDocument from "pdfkit";
import type {
  RCICoverPage,
  ExecutiveSummaryData,
  InterventionAssessmentData,
  ConsultingScopeData,
  EvidenceTraceabilityData,
  ExportType,
} from "@shared/export-types";

const COLORS = {
  primary: "#1a365d",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

const FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
};

interface ExportPDFData {
  exportType: ExportType;
  coverPage: RCICoverPage;
  executiveSummary?: ExecutiveSummaryData;
  interventionAssessment?: InterventionAssessmentData;
  consultingScope?: ConsultingScopeData;
  evidenceTraceability?: EvidenceTraceabilityData;
  interventionRequired?: boolean;
  includeAppendix?: boolean;
}

export function generateExportPDF(data: ExportPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `${data.coverPage.engagementTitle} - ${data.coverPage.clientName}`,
          Author: data.coverPage.preparedBy.firmName,
          Subject: data.coverPage.engagementTitle,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      renderCoverPage(doc, data.coverPage, pageWidth);

      if (data.executiveSummary) {
        doc.addPage();
        renderExecutiveSummary(doc, data.executiveSummary, pageWidth);
      }

      if (data.interventionAssessment && data.exportType === "consulting_proposal_pack") {
        doc.addPage();
        renderInterventionAssessment(doc, data.interventionAssessment, pageWidth);
      }

      if (data.consultingScope && data.interventionRequired && data.exportType === "consulting_proposal_pack") {
        doc.addPage();
        renderConsultingScope(doc, data.consultingScope, pageWidth);
      }

      if (data.evidenceTraceability && data.includeAppendix) {
        doc.addPage();
        renderEvidenceTraceability(doc, data.evidenceTraceability, pageWidth);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function renderCoverPage(doc: PDFKit.PDFDocument, coverPage: RCICoverPage, pageWidth: number) {
  const centerX = doc.page.margins.left + pageWidth / 2;
  const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

  doc.y = 150;

  doc.fontSize(12).fillColor(COLORS.muted).font(FONTS.regular);
  doc.text("Prepared for", 50, doc.y, { width: pageWidth, align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(24).fillColor(COLORS.primary).font(FONTS.bold);
  doc.text(coverPage.clientName, 50, doc.y, { width: pageWidth, align: "center" });
  doc.moveDown(2);

  doc.moveTo(centerX - 50, doc.y).lineTo(centerX + 50, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(2);

  doc.fontSize(28).fillColor(COLORS.primary).font(FONTS.bold);
  doc.text(coverPage.engagementTitle, 50, doc.y, { width: pageWidth, align: "center" });

  if (coverPage.engagementSubtitle) {
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor(COLORS.muted).font(FONTS.regular);
    doc.text(coverPage.engagementSubtitle, 50, doc.y, { width: pageWidth, align: "center" });
  }

  doc.moveDown(2);

  doc.fontSize(12).fillColor(COLORS.muted).font(FONTS.regular);
  doc.text(coverPage.assessmentDate, 50, doc.y, { width: pageWidth, align: "center" });

  if (coverPage.documentReference) {
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(COLORS.muted);
    doc.text(`Ref: ${coverPage.documentReference}`, 50, doc.y, { width: pageWidth, align: "center" });
  }

  const footerY = doc.page.height - doc.page.margins.bottom - 120;
  doc.y = footerY;

  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(1);

  doc.fontSize(10).fillColor(COLORS.muted).font(FONTS.regular);
  doc.text("Prepared by", 50, doc.y);
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor(COLORS.text).font(FONTS.bold);
  doc.text(coverPage.preparedBy.firmName, 50, doc.y);

  if (coverPage.preparedBy.consultantName) {
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(COLORS.muted).font(FONTS.regular);
    doc.text(coverPage.preparedBy.consultantName, 50, doc.y);
  }

  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(0.5);

  doc.fontSize(8).fillColor(COLORS.muted).font(FONTS.regular);
  doc.text(coverPage.confidentialityNotice, 50, doc.y, { width: pageWidth, align: "left" });
}

function renderSectionHeader(doc: PDFKit.PDFDocument, title: string, sectionNumber: string, pageWidth: number) {
  doc.fontSize(10).fillColor(COLORS.muted).font(FONTS.regular);
  doc.text(`Section ${sectionNumber}`, 50, doc.y);
  doc.moveDown(0.3);

  doc.fontSize(20).fillColor(COLORS.primary).font(FONTS.bold);
  doc.text(title, 50, doc.y);
  doc.moveDown(0.5);

  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(1);
}

function renderFieldLabel(doc: PDFKit.PDFDocument, label: string) {
  doc.fontSize(9).fillColor(COLORS.muted).font(FONTS.bold);
  doc.text(label.toUpperCase(), 50, doc.y);
  doc.moveDown(0.3);
}

function renderFieldContent(doc: PDFKit.PDFDocument, content: string, pageWidth: number) {
  doc.fontSize(11).fillColor(COLORS.text).font(FONTS.regular);
  doc.text(content, 50, doc.y, { width: pageWidth });
  doc.moveDown(1);
}

function renderExecutiveSummary(doc: PDFKit.PDFDocument, summary: ExecutiveSummaryData, pageWidth: number) {
  renderSectionHeader(doc, "Executive Summary", "1", pageWidth);

  renderFieldLabel(doc, "Situation Overview");
  renderFieldContent(doc, summary.situationOverview, pageWidth);

  renderFieldLabel(doc, "Key Findings");
  summary.keyFindings.forEach((finding, idx) => {
    doc.fontSize(11).fillColor(COLORS.text).font(FONTS.regular);
    doc.text(`• ${finding}`, 60, doc.y, { width: pageWidth - 10 });
    doc.moveDown(0.3);
  });
  doc.moveDown(0.7);

  renderFieldLabel(doc, "Business Impact");
  renderFieldContent(doc, summary.businessImpact, pageWidth);

  renderFieldLabel(doc, "Recommended Direction");
  renderFieldContent(doc, summary.recommendedDirection, pageWidth);

  renderFieldLabel(doc, "Next Step Options");
  summary.nextStepOptions.forEach((option, idx) => {
    doc.fontSize(11).fillColor(COLORS.text).font(FONTS.regular);
    doc.text(`${idx + 1}. ${option}`, 60, doc.y, { width: pageWidth - 10 });
    doc.moveDown(0.3);
  });
}

function renderInterventionAssessment(doc: PDFKit.PDFDocument, assessment: InterventionAssessmentData, pageWidth: number) {
  renderSectionHeader(doc, "Intervention Assessment", "2", pageWidth);

  const getSeverityLabel = (level: string) => {
    const labels: Record<string, string> = {
      low: "Low",
      medium: "Moderate",
      high: "Significant",
    };
    return labels[level] || level;
  };

  const getCapabilityLabel = (level: string) => {
    const labels: Record<string, string> = {
      low: "Limited internal capacity",
      medium: "Partial internal capacity",
      high: "Strong internal capacity",
    };
    return labels[level] || level;
  };

  const colWidth = (pageWidth - 20) / 3;
  const startY = doc.y;

  doc.fontSize(9).fillColor(COLORS.muted).font(FONTS.bold);
  doc.text("ISSUE SEVERITY", 50, startY);
  doc.fontSize(12).fillColor(COLORS.text).font(FONTS.regular);
  doc.text(getSeverityLabel(assessment.severity), 50, startY + 15);

  doc.fontSize(9).fillColor(COLORS.muted).font(FONTS.bold);
  doc.text("BUSINESS IMPACT", 50 + colWidth, startY);
  doc.fontSize(12).fillColor(COLORS.text).font(FONTS.regular);
  doc.text(getSeverityLabel(assessment.businessImpact), 50 + colWidth, startY + 15);

  doc.fontSize(9).fillColor(COLORS.muted).font(FONTS.bold);
  doc.text("INTERNAL CAPABILITY", 50 + colWidth * 2, startY);
  doc.fontSize(12).fillColor(COLORS.text).font(FONTS.regular);
  doc.text(getCapabilityLabel(assessment.clientCapability), 50 + colWidth * 2, startY + 15);

  doc.y = startY + 50;
  doc.moveDown(1);

  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(1);

  renderFieldLabel(doc, "Assessment Summary");
  const interventionRequired = assessment.severity === "high" && assessment.businessImpact === "high" && assessment.clientCapability === "low";
  const summaryText = interventionRequired
    ? "Based on the assessment criteria, structured professional support is recommended to address the identified issues effectively."
    : "The organization may address identified issues through internal resources with periodic advisory support.";
  renderFieldContent(doc, summaryText, pageWidth);
}

function renderConsultingScope(doc: PDFKit.PDFDocument, scope: ConsultingScopeData, pageWidth: number) {
  renderSectionHeader(doc, "Consulting Scope", "3", pageWidth);

  const renderPhase = (title: string, phase: { objectives: string; activities: string; outputs: string }) => {
    doc.fontSize(14).fillColor(COLORS.primary).font(FONTS.bold);
    doc.text(title, 50, doc.y);
    doc.moveDown(0.5);

    doc.rect(55, doc.y, 2, 80).fill(COLORS.border);

    const contentX = 65;

    doc.fontSize(9).fillColor(COLORS.muted).font(FONTS.bold);
    doc.text("OBJECTIVES", contentX, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(COLORS.text).font(FONTS.regular);
    doc.text(phase.objectives, contentX, doc.y, { width: pageWidth - 20 });
    doc.moveDown(0.7);

    doc.fontSize(9).fillColor(COLORS.muted).font(FONTS.bold);
    doc.text("ACTIVITIES", contentX, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(COLORS.text).font(FONTS.regular);
    doc.text(phase.activities, contentX, doc.y, { width: pageWidth - 20 });
    doc.moveDown(0.7);

    doc.fontSize(9).fillColor(COLORS.muted).font(FONTS.bold);
    doc.text("OUTPUTS", contentX, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(COLORS.text).font(FONTS.regular);
    doc.text(phase.outputs, contentX, doc.y, { width: pageWidth - 20 });
    doc.moveDown(1.5);
  };

  renderPhase("Phase 1: Diagnostic Validation", scope.phase1);
  renderPhase("Phase 2: Solution Design", scope.phase2);
  renderPhase("Phase 3: Implementation Support", scope.phase3);

  doc.moveDown(0.5);
  doc.rect(50, doc.y, pageWidth, 30).fill("#f7fafc");
  doc.fontSize(9).fillColor(COLORS.muted).font(FONTS.regular);
  doc.text("Note: Pricing and commercial terms are excluded from this document. Add separately after client review.", 55, doc.y + 10, { width: pageWidth - 10 });
}

function renderEvidenceTraceability(doc: PDFKit.PDFDocument, evidence: EvidenceTraceabilityData, pageWidth: number) {
  renderSectionHeader(doc, "Evidence & Traceability", "Appendix", pageWidth);

  renderFieldLabel(doc, "Client Inputs");
  doc.rect(55, doc.y, 2, 60).fill(COLORS.border);
  const contentX = 65;

  doc.fontSize(10).fillColor(COLORS.muted).font(FONTS.regular);
  doc.text("Documents Reviewed: ", contentX, doc.y, { continued: true });
  doc.fillColor(COLORS.text).text(evidence.clientInputs.documentsReviewed);
  doc.moveDown(0.3);

  doc.fillColor(COLORS.muted).text("Interviews Conducted: ", contentX, doc.y, { continued: true });
  doc.fillColor(COLORS.text).text(evidence.clientInputs.interviewsConducted);
  doc.moveDown(0.3);

  doc.fillColor(COLORS.muted).text("Observations: ", contentX, doc.y, { continued: true });
  doc.fillColor(COLORS.text).text(evidence.clientInputs.observationsNoted);
  doc.moveDown(1.5);

  renderFieldLabel(doc, "Knowledge References");
  doc.rect(55, doc.y, 2, 60).fill(COLORS.border);

  doc.fontSize(10).fillColor(COLORS.muted).font(FONTS.regular);
  doc.text("Patterns Applied: ", contentX, doc.y, { continued: true });
  doc.fillColor(COLORS.text).text(evidence.knowledgeReferences.rootCausePatterns);
  doc.moveDown(0.3);

  doc.fillColor(COLORS.muted).text("Historical Cases: ", contentX, doc.y, { continued: true });
  doc.fillColor(COLORS.text).text(evidence.knowledgeReferences.historicalCases);
  doc.moveDown(0.3);

  doc.fillColor(COLORS.muted).text("Frameworks: ", contentX, doc.y, { continued: true });
  doc.fillColor(COLORS.text).text(evidence.knowledgeReferences.frameworksApplied);
  doc.moveDown(1.5);

  renderFieldLabel(doc, "Analysis Approach");
  renderFieldContent(doc, evidence.reasoningTrace, pageWidth);

  renderFieldLabel(doc, "Assumptions & Limitations");
  renderFieldContent(doc, evidence.assumptionsLimitations, pageWidth);
}
