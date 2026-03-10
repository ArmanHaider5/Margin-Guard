import PDFDocument from "pdfkit";
import { 
  type ClientAnalysis, 
  type Client,
  type AnalysisFinding,
  type CostSavingOpportunity,
  type RecurrencePrediction,
  type FourMCategory
} from "@shared/schema";
import type { ConsultingDiagnosticReport } from "../diagnostics/consulting-diagnostic-engine";

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
  consultingReport?: ConsultingDiagnosticReport | null;
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

      // ========== CONSULTING DIAGNOSTIC SECTIONS ==========
      if (data.consultingReport) {
        const cr = data.consultingReport;

        // --- Primary Root Cause ---
        ensureSpace(80);
        doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text("Primary Root Cause", marginLeft);
        doc.moveDown(0.3);
        doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        const primaryColor = FOURM_COLORS[cr.primaryRootCause.category as FourMCategory] || EDX_COLORS.muted;
        doc.rect(marginLeft, doc.y, 4, 55).fill(primaryColor);
        const primaryX = marginLeft + 12;

        doc.fontSize(12).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text(cr.primaryRootCause.name, primaryX, doc.y, { width: pageWidth - 20 });
        doc.fontSize(9).fillColor(EDX_COLORS.text).font("Helvetica");
        doc.text(cr.primaryRootCause.description, primaryX, doc.y + 2, { width: pageWidth - 20, lineGap: 2 });
        doc.fontSize(8).fillColor(EDX_COLORS.muted);
        doc.text(`Category: ${cr.primaryRootCause.category} | Tier ${cr.primaryRootCause.tier} | ID: ${cr.primaryRootCause.id}`, primaryX, doc.y + 2);
        doc.moveDown(1.5);

        // --- Secondary Root Causes ---
        ensureSpace(60);
        doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text("Secondary Root Causes", marginLeft);
        doc.moveDown(0.3);
        doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        if (cr.secondaryRootCauses.length > 0) {
          cr.secondaryRootCauses.forEach((rc, i) => {
            ensureSpace(50);
            const color = FOURM_COLORS[rc.category as FourMCategory] || EDX_COLORS.muted;
            doc.rect(marginLeft, doc.y, 4, 40).fill(color);
            const rcX = marginLeft + 12;

            doc.fontSize(11).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
            doc.text(`${i + 1}. ${rc.name}`, rcX, doc.y, { width: pageWidth - 20 });
            doc.fontSize(9).fillColor(EDX_COLORS.text).font("Helvetica");
            const descSlice = rc.description.slice(0, 160) + (rc.description.length > 160 ? "..." : "");
            doc.text(descSlice, rcX, doc.y + 2, { width: pageWidth - 20, lineGap: 2 });
            doc.fontSize(8).fillColor(EDX_COLORS.muted);
            doc.text(`${rc.category} | Tier ${rc.tier}`, rcX, doc.y + 2);
            doc.moveDown(1);
          });
        } else {
          doc.fontSize(10).fillColor(EDX_COLORS.muted).font("Helvetica");
          doc.text("No secondary root causes identified.", marginLeft);
          doc.moveDown(1);
        }

        // --- Operational Symptoms ---
        ensureSpace(60);
        doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text("Operational Symptoms", marginLeft);
        doc.moveDown(0.3);
        doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        if (cr.operationalSymptoms.length > 0) {
          const uniqueSymptoms = cr.operationalSymptoms.filter((s, i, arr) => arr.indexOf(s) === i);
          const symptomText = uniqueSymptoms
            .map(s => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
            .join(", ");

          doc.fontSize(10).fillColor(EDX_COLORS.text).font("Helvetica");
          doc.text(symptomText, marginLeft, doc.y, { width: pageWidth, lineGap: 3 });
          doc.moveDown(0.3);
          doc.fontSize(8).fillColor(EDX_COLORS.muted);
          doc.text(`${uniqueSymptoms.length} operational signals detected from documents`, marginLeft);
          doc.moveDown(1);
        } else {
          doc.fontSize(10).fillColor(EDX_COLORS.muted).font("Helvetica");
          doc.text("No operational symptoms detected.", marginLeft);
          doc.moveDown(1);
        }

        // --- Financial Impact ---
        ensureSpace(80);
        doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text("Financial Impact", marginLeft);
        doc.moveDown(0.3);
        doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        const severityColorMap: Record<string, string> = {
          critical: EDX_COLORS.danger,
          high: EDX_COLORS.warning,
          moderate: EDX_COLORS.accent,
          low: EDX_COLORS.success,
        };
        const sevColor = severityColorMap[cr.financialImpact.estimatedSeverity] || EDX_COLORS.muted;

        doc.fontSize(11).fillColor(EDX_COLORS.text).font("Helvetica-Bold");
        doc.text("Estimated Severity: ", marginLeft, doc.y, { continued: true });
        doc.fillColor(sevColor).font("Helvetica-Bold");
        doc.text(cr.financialImpact.estimatedSeverity.toUpperCase());
        doc.moveDown(0.5);

        if (cr.financialImpact.affectedCategories.length > 0) {
          doc.fontSize(10).fillColor(EDX_COLORS.text).font("Helvetica");
          doc.text(`Affected Categories: ${cr.financialImpact.affectedCategories.join(", ")}`, marginLeft);
          doc.moveDown(0.3);
        }

        if (cr.financialImpact.costDrivers.length > 0) {
          doc.fontSize(10).fillColor(EDX_COLORS.text).font("Helvetica");
          const driverLabels = cr.financialImpact.costDrivers
            .map(d => d.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
          doc.text(`Cost Drivers: ${driverLabels.join(", ")}`, marginLeft, doc.y, { width: pageWidth });
          doc.moveDown(1);
        }

        // --- Evidence From Documents ---
        ensureSpace(60);
        doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text("Evidence From Documents", marginLeft);
        doc.moveDown(0.3);
        doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        doc.fontSize(10).fillColor(EDX_COLORS.text).font("Helvetica");
        doc.text(`The diagnostic engine detected ${cr.operationalSymptoms.length} signal matches from uploaded documents. `, marginLeft, doc.y, { width: pageWidth, continued: true });
        doc.text(`These signals were scored against ${cr.secondaryRootCauses.length + 1} root causes across the 4M framework.`, { width: pageWidth });
        doc.moveDown(0.5);

        if (cr.confidence.chainMatchCount > 0) {
          doc.fontSize(9).fillColor(EDX_COLORS.text).font("Helvetica");
          doc.text(`${cr.confidence.chainMatchCount} diagnostic failure chain(s) matched, strengthening causal linkage.`, marginLeft);
          doc.moveDown(0.3);
        }

        doc.fontSize(9).fillColor(EDX_COLORS.muted).font("Helvetica");
        doc.text(`Signal-to-trigger coverage: ${cr.confidence.signalCoverage}%`, marginLeft);
        doc.moveDown(1);

        // --- Recommended Actions ---
        ensureSpace(80);
        doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text("Recommended Actions", marginLeft);
        doc.moveDown(0.3);
        doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        if (cr.recommendations.length > 0) {
          const priorityColors: Record<string, string> = {
            immediate: EDX_COLORS.danger,
            "short-term": EDX_COLORS.warning,
            "medium-term": EDX_COLORS.secondary,
          };

          cr.recommendations.forEach((rec, i) => {
            ensureSpace(30);
            const pColor = priorityColors[rec.priority] || EDX_COLORS.muted;
            doc.fontSize(10).fillColor(EDX_COLORS.text).font("Helvetica-Bold");
            doc.text(`${i + 1}. `, marginLeft, doc.y, { continued: true });
            doc.font("Helvetica").text(rec.action, { width: pageWidth - 20 });
            doc.fontSize(8).fillColor(pColor).font("Helvetica-Bold");
            doc.text(`   Priority: ${rec.priority.toUpperCase()}`, marginLeft + 15, doc.y, { continued: true });
            doc.fillColor(EDX_COLORS.muted).font("Helvetica");
            doc.text(` | Target: ${rec.targetCategory}`);
            doc.moveDown(0.5);
          });
          doc.moveDown(0.5);
        } else {
          doc.fontSize(10).fillColor(EDX_COLORS.muted).font("Helvetica");
          doc.text("No specific recommendations generated.", marginLeft);
          doc.moveDown(1);
        }

        // --- Confidence Level ---
        ensureSpace(60);
        doc.fontSize(16).fillColor(EDX_COLORS.primary).font("Helvetica-Bold");
        doc.text("Confidence Level", marginLeft);
        doc.moveDown(0.3);
        doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + pageWidth, doc.y).strokeColor(EDX_COLORS.accent).lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        const confColorMap: Record<string, string> = {
          high: EDX_COLORS.success,
          moderate: EDX_COLORS.warning,
          low: EDX_COLORS.danger,
        };
        const confColor = confColorMap[cr.confidence.level] || EDX_COLORS.muted;

        doc.fontSize(22).fillColor(confColor).font("Helvetica-Bold");
        doc.text(`${cr.confidence.score}%`, marginLeft, doc.y, { continued: true });
        doc.fontSize(12).fillColor(EDX_COLORS.text).font("Helvetica");
        doc.text(`  ${cr.confidence.level.toUpperCase()} CONFIDENCE`);
        doc.moveDown(0.5);

        doc.fontSize(9).fillColor(EDX_COLORS.text).font("Helvetica");
        doc.text(`Signal Coverage: ${cr.confidence.signalCoverage}% of root cause triggers matched by document signals`, marginLeft, doc.y, { width: pageWidth });
        doc.moveDown(0.2);
        doc.text(`Chain Matches: ${cr.confidence.chainMatchCount} diagnostic failure chains confirmed`, marginLeft, doc.y, { width: pageWidth });
        doc.moveDown(1.5);
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
