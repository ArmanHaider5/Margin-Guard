import PDFDocument from "pdfkit";
import { 
  type ClientAnalysis, 
  type Client,
  type AnalysisFinding,
  type CostSavingOpportunity,
  type RecurrencePrediction,
  type FourMCategory
} from "@shared/schema";

// PDF export must be robust regardless of content length.

const EDX_COLORS = {
  primary: "#1a365d",
  secondary: "#2b6cb0",
  accent: "#ed8936",
  text: "#2d3748",
  muted: "#718096",
  success: "#38a169",
  warning: "#d69e2e",
  danger: "#e53e3e",
  money: "#38a169",
  materials: "#d69e2e",
  manpower: "#3182ce",
  machinery: "#805ad5",
};

const FOURM_COLORS: Record<FourMCategory, string> = {
  Money: EDX_COLORS.money,
  Materials: EDX_COLORS.materials,
  Manpower: EDX_COLORS.manpower,
  Machinery: EDX_COLORS.machinery,
};

interface ReportData {
  analysis: ClientAnalysis;
  client: Client;
}

// PDF export must be robust regardless of content length.
export function generateAnalysisReport(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: `EDX Analysis Report - ${data.client.name}`,
          Author: "EDX - Efficiency, Deployment, Excellence",
          Subject: data.analysis.title,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const pageHeight = doc.page.height;
      const marginLeft = doc.page.margins.left;
      const marginBottom = doc.page.margins.bottom;

      // Helper to check if we need a new page
      const ensureSpace = (requiredSpace: number) => {
        if (doc.y > pageHeight - marginBottom - requiredSpace) {
          doc.addPage();
        }
      };

      // ========== TITLE SECTION ==========
      doc.rect(0, 0, doc.page.width, 120).fill(EDX_COLORS.primary);
      
      doc.fontSize(28).fillColor("#ffffff").font("Helvetica-Bold");
      doc.text("EDX", marginLeft, 30, { width: pageWidth, align: "center" });
      
      doc.fontSize(10).font("Helvetica");
      doc.text("Efficiency • Deployment • Excellence", marginLeft, 65, { width: pageWidth, align: "center" });

      doc.fontSize(9).fillColor("#ffffff");
      doc.text("Operational Analysis Report", marginLeft, 90, { width: pageWidth, align: "center" });

      doc.y = 140;

      // Client name and analysis title
      doc.fontSize(18).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
      doc.text(data.client.name, marginLeft, doc.y, { width: pageWidth, align: "center" });
      doc.moveDown(0.3);

      doc.fontSize(12).fillColor(EDX_COLORS.muted).font("Helvetica");
      doc.text(data.analysis.title, marginLeft, doc.y, { width: pageWidth, align: "center" });
      doc.moveDown(0.3);

      // Analysis metadata
      const analysisDate = data.analysis.completedAt 
        ? new Date(data.analysis.completedAt).toLocaleDateString("en-MY", { 
            year: "numeric", 
            month: "long", 
            day: "numeric" 
          })
        : new Date().toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" });
      
      doc.fontSize(10).fillColor(EDX_COLORS.text);
      doc.text(`Analysis Date: ${analysisDate}`, marginLeft, doc.y, { width: pageWidth, align: "center" });
      doc.moveDown(0.2);

      const analysisTypeLabel = data.analysis.analysisType === "quick" ? "Quick Analysis" : "Deep Analysis";
      doc.text(`Analysis Type: ${analysisTypeLabel}`, marginLeft, doc.y, { width: pageWidth, align: "center" });
      doc.moveDown(1);

      // Statistics boxes
      const findings = data.analysis.findings || [];
      const costSavings = data.analysis.costSavingOpportunities || [];
      const criticalCount = findings.filter(f => f.severity === "critical" || f.severity === "high").length;

      const boxWidth = (pageWidth - 30) / 3;
      const boxY = doc.y;
      const boxHeight = 50;

      doc.rect(marginLeft, boxY, boxWidth, boxHeight).fill(EDX_COLORS.primary);
      doc.fontSize(18).fillColor("#ffffff").font("Helvetica-Bold");
      doc.text(String(findings.length), marginLeft, boxY + 10, { width: boxWidth, align: "center" });
      doc.fontSize(8).font("Helvetica");
      doc.text("Issues Found", marginLeft, boxY + 32, { width: boxWidth, align: "center" });

      doc.rect(marginLeft + boxWidth + 15, boxY, boxWidth, boxHeight).fill(EDX_COLORS.accent);
      doc.fontSize(18).fillColor("#ffffff").font("Helvetica-Bold");
      doc.text(String(costSavings.length), marginLeft + boxWidth + 15, boxY + 10, { width: boxWidth, align: "center" });
      doc.fontSize(8).font("Helvetica");
      doc.text("Opportunities", marginLeft + boxWidth + 15, boxY + 32, { width: boxWidth, align: "center" });

      doc.rect(marginLeft + (boxWidth + 15) * 2, boxY, boxWidth, boxHeight).fill(criticalCount > 0 ? EDX_COLORS.danger : EDX_COLORS.success);
      doc.fontSize(18).fillColor("#ffffff").font("Helvetica-Bold");
      doc.text(String(criticalCount), marginLeft + (boxWidth + 15) * 2, boxY + 10, { width: boxWidth, align: "center" });
      doc.fontSize(8).font("Helvetica");
      doc.text("Critical/High", marginLeft + (boxWidth + 15) * 2, boxY + 32, { width: boxWidth, align: "center" });

      doc.y = boxY + boxHeight + 25;

      // ========== EXECUTIVE SUMMARY ==========
      ensureSpace(100);
      
      doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
      doc.text("Executive Summary", marginLeft);
      doc.moveDown(0.3);

      doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
      doc.moveDown(0.5);

      // Mode label
      const modeLabel = data.analysis.analysisMode === "baseline" 
        ? "Baseline (Preliminary)" 
        : "Deep Diagnostic (Evidence-Enriched)";
      
      doc.fontSize(9).fillColor(EDX_COLORS.muted).font("Helvetica-Bold");
      doc.text(`Mode: ${modeLabel}`, marginLeft);
      doc.moveDown(0.3);

      // Mock mode indicator
      if (data.analysis.isMockMode) {
        doc.fontSize(8).fillColor(EDX_COLORS.warning).font("Helvetica");
        doc.text("[MOCK MODE] This report was generated using simulated diagnostic data.", marginLeft);
        doc.moveDown(0.3);
      }

      // Summary text
      doc.fontSize(10).fillColor(EDX_COLORS.text).font("Helvetica");
      const summary = data.analysis.summary || "Analysis has been completed. Please review the detailed findings below.";
      doc.text(summary, marginLeft, doc.y, { width: pageWidth, align: "justify", lineGap: 4 });
      doc.moveDown(1);

      // 4M Distribution (compact inline version)
      if (findings.length > 0) {
        ensureSpace(60);
        
        const categoryCounts: Record<FourMCategory, number> = {
          Money: 0,
          Materials: 0,
          Manpower: 0,
          Machinery: 0,
        };
        findings.forEach(f => {
          if (f.fourMCategory && categoryCounts[f.fourMCategory] !== undefined) {
            categoryCounts[f.fourMCategory]++;
          }
        });

        doc.fontSize(11).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text("4M Distribution: ", marginLeft, doc.y, { continued: true });
        
        doc.font("Helvetica").fontSize(10).fillColor(EDX_COLORS.text);
        const distText = Object.entries(categoryCounts)
          .filter(([_, count]) => count > 0)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join(" | ");
        doc.text(distText || "No categorized findings");
        doc.moveDown(1);
      }

      // ========== FINDINGS ==========
      if (findings.length > 0) {
        ensureSpace(80);
        
        doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text("Detailed Findings", marginLeft);
        doc.moveDown(0.3);

        doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        findings.forEach((finding, index) => {
          ensureSpace(70);

          const color = FOURM_COLORS[finding.fourMCategory] || EDX_COLORS.muted;
          doc.rect(marginLeft, doc.y, 4, 50).fill(color);

          const findingX = marginLeft + 12;
          const findingY = doc.y;

          doc.fontSize(11).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
          doc.text(`${index + 1}. ${finding.title}`, findingX, findingY, { width: pageWidth - 20 });
          
          doc.fontSize(9).fillColor(EDX_COLORS.text).font("Helvetica");
          const descPreview = finding.description.slice(0, 180) + (finding.description.length > 180 ? "..." : "");
          doc.text(descPreview, findingX, doc.y + 2, { width: pageWidth - 20, lineGap: 2 });

          doc.fontSize(8).fillColor(EDX_COLORS.muted);
          doc.text(`${finding.fourMCategory} | ${finding.severity} | ${finding.estimatedCostImpact || "Impact TBD"}`, findingX, doc.y + 2);
          
          doc.moveDown(1);
        });
      }

      // ========== RECOMMENDATIONS ==========
      ensureSpace(100);
      
      doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
      doc.text("Recommendations", marginLeft);
      doc.moveDown(0.3);

      doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
      doc.moveDown(0.5);

      const criticalFindings = findings.filter(f => f.severity === "critical" || f.severity === "high");
      
      doc.fontSize(11).fillColor(EDX_COLORS.text).font("Helvetica-Bold");
      doc.text("Immediate Actions:", marginLeft);
      doc.moveDown(0.3);

      if (criticalFindings.length > 0) {
        criticalFindings.slice(0, 3).forEach((f, i) => {
          ensureSpace(25);
          doc.font("Helvetica").fontSize(9).fillColor(EDX_COLORS.text);
          const rec = f.causes?.[0] ? `Address: ${f.causes[0]}` : "Review and implement corrective measures";
          doc.text(`${i + 1}. ${f.title} - ${rec}`, marginLeft + 10, doc.y, { width: pageWidth - 20 });
          doc.moveDown(0.4);
        });
      } else {
        doc.font("Helvetica").fontSize(9).fillColor(EDX_COLORS.muted);
        doc.text("No critical issues requiring immediate attention.", marginLeft + 10);
        doc.moveDown(0.4);
      }

      doc.moveDown(0.5);

      // Cost savings section (compact)
      if (costSavings.length > 0) {
        ensureSpace(60);
        
        doc.fontSize(11).fillColor(EDX_COLORS.text).font("Helvetica-Bold");
        doc.text("Cost Saving Opportunities:", marginLeft);
        doc.moveDown(0.3);

        costSavings.slice(0, 3).forEach((opp, i) => {
          ensureSpace(25);
          doc.font("Helvetica").fontSize(9).fillColor(EDX_COLORS.text);
          doc.text(`${i + 1}. ${opp.title} - ${opp.estimatedSavings}`, marginLeft + 10, doc.y, { width: pageWidth - 20 });
          doc.moveDown(0.3);
        });
        
        doc.moveDown(0.5);
      }

      // Contact section
      ensureSpace(60);
      
      doc.fontSize(11).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
      doc.text("Contact EDX for Implementation Support", marginLeft);
      doc.moveDown(0.3);
      
      doc.fontSize(9).fillColor(EDX_COLORS.text).font("Helvetica");
      doc.text("Our consultants can help implement these recommendations.", marginLeft);
      doc.moveDown(0.3);
      
      doc.fontSize(9).fillColor(EDX_COLORS.secondary);
      doc.text("www.edx-consulting.com | consulting@edx.com", marginLeft);

      // ========== FOOTER (on all pages) ==========
      // PDF export must be robust regardless of content length.
      const range = doc.bufferedPageRange();
      const totalPages = range.count;
      
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        doc.fontSize(7).fillColor(EDX_COLORS.muted).font("Helvetica");
        doc.text(
          `Page ${i + 1} of ${totalPages} | EDX - Efficiency, Deployment, Excellence | Confidential`,
          marginLeft,
          pageHeight - 35,
          { align: "center", width: pageWidth }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
