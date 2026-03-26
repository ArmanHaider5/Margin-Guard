import PDFDocument from "pdfkit";
import { 
  type ClientAnalysis, 
  type Client,
  type AnalysisFinding,
  type CostSavingOpportunity,
  type RecurrencePrediction,
  type FourMCategory
} from "@shared/schema";
import type { ConsultingDiagnosticReport } from "../modules/diagnostics/engines/consulting-diagnostic-engine";

// PDF export must be robust regardless of content length.

const C = {
  primary:    "#1a2f4a",   // deep navy — main brand
  secondary:  "#2563eb",   // blue accent
  accent:     "#f59e0b",   // amber highlight
  text:       "#1e293b",   // near-black body
  muted:      "#64748b",   // slate muted
  border:     "#e2e8f0",   // light rule
  success:    "#16a34a",   // green
  warning:    "#d97706",   // amber
  danger:     "#dc2626",   // red
  light:      "#f8fafc",   // near-white background
  white:      "#ffffff",
  money:      "#16a34a",
  materials:  "#d97706",
  manpower:   "#2563eb",
  machinery:  "#7c3aed",
};

const FOURM: Record<FourMCategory, string> = {
  Money:     C.money,
  Materials: C.materials,
  Manpower:  C.manpower,
  Machinery: C.machinery,
};

const SEV: Record<string, string> = {
  critical: C.danger,
  high:     C.warning,
  medium:   C.secondary,
  low:      C.muted,
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
        margins: { top: 50, bottom: 60, left: 55, right: 55 },
        bufferPages: true,
        info: {
          Title: `${data.client.name} — Operational Diagnostic Report`,
          Author: "EDX Consulting — Efficiency, Deployment, Excellence",
          Subject: data.analysis.title || "RCI Diagnostic Report",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pw  = doc.page.width  - doc.page.margins.left - doc.page.margins.right;
      const ph  = doc.page.height;
      const ml  = doc.page.margins.left;
      const mb  = doc.page.margins.bottom;

      // ── Convenience helpers ─────────────────────────────────────────
      const ensureSpace = (h: number) => {
        if (doc.y > ph - mb - h) doc.addPage();
      };

      const sectionHeader = (num: string, title: string) => {
        ensureSpace(60);
        // Number pill
        doc.save();
        doc.roundedRect(ml, doc.y, 26, 16, 3).fill(C.secondary);
        doc.fontSize(8).fillColor(C.white).font("Helvetica-Bold");
        doc.text(num.padStart(2, "0"), ml + 1, doc.y - 15, { width: 26, align: "center" });
        doc.restore();

        doc.fontSize(15).fillColor(C.primary).font("Helvetica-Bold");
        doc.text(title, ml + 32, doc.y - 16, { width: pw - 32 });
        doc.moveDown(0.15);
        doc.moveTo(ml, doc.y).lineTo(ml + pw, doc.y).strokeColor(C.border).lineWidth(0.75).stroke();
        doc.moveDown(0.8);
      };

      const fieldLabel = (text: string) => {
        doc.fontSize(8).fillColor(C.muted).font("Helvetica-Bold");
        doc.text(text.toUpperCase(), ml, doc.y, { characterSpacing: 0.4 });
        doc.moveDown(0.2);
      };

      const bodyText = (text: string, indent = 0) => {
        doc.fontSize(10).fillColor(C.text).font("Helvetica");
        doc.text(text, ml + indent, doc.y, { width: pw - indent, lineGap: 3, align: "justify" });
        doc.moveDown(0.8);
      };

      const pill = (label: string, color: string, x: number, y: number, w = 70, h = 16) => {
        doc.save();
        doc.roundedRect(x, y, w, h, 3).fill(color + "22");
        doc.roundedRect(x, y, w, h, 3).stroke(color);
        doc.fontSize(8).fillColor(color).font("Helvetica-Bold");
        doc.text(label.toUpperCase(), x, y + 4, { width: w, align: "center" });
        doc.restore();
      };

      // ── Safe mgdAnalysis access ──────────────────────────────────────
      const mgd = (data.analysis as any).mgdAnalysis as Record<string, any> | null | undefined;

      const findings           = (data.analysis.findings || []) as AnalysisFinding[];
      const costSavings        = (data.analysis.costSavingOpportunities || []) as CostSavingOpportunity[];
      const predictions        = (data.analysis.recurrencePredictions || []) as RecurrencePrediction[];
      const criticalCount      = findings.filter(f => f.severity === "critical" || f.severity === "high").length;

      const analysisDate = data.analysis.completedAt
        ? new Date(data.analysis.completedAt).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })
        : new Date().toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" });

      const analysisTypeLabel = data.analysis.analysisType === "quick" ? "Quick Analysis" : "Deep Diagnostic";
      const modeLabel = data.analysis.analysisMode === "baseline"
        ? "Baseline — Pattern Analysis"
        : "Evidence-Enriched — Signal Driven";

      // ═══════════════════════════════════════════════════════════════
      // PAGE 1 — COVER PAGE
      // ═══════════════════════════════════════════════════════════════

      // Full-width dark header band
      doc.rect(0, 0, doc.page.width, 180).fill(C.primary);

      // EDX wordmark
      doc.fontSize(30).fillColor(C.white).font("Helvetica-Bold");
      doc.text("EDX", ml, 38, { width: pw, align: "center" });

      doc.fontSize(9).fillColor("#94a3b8").font("Helvetica");
      doc.text("EFFICIENCY  ·  DEPLOYMENT  ·  EXCELLENCE", ml, 76, { width: pw, align: "center", characterSpacing: 1 });

      doc.fontSize(8).fillColor("#cbd5e1").font("Helvetica");
      doc.text("OPERATIONAL DIAGNOSTIC REPORT", ml, 100, { width: pw, align: "center", characterSpacing: 1.2 });

      // Accent rule inside header
      const ruleY = 125;
      doc.moveTo(ml + pw / 2 - 60, ruleY).lineTo(ml + pw / 2 + 60, ruleY)
        .strokeColor(C.accent).lineWidth(1.5).stroke();

      // Confidential tag inside header
      doc.fontSize(7).fillColor("#94a3b8").font("Helvetica");
      doc.text("CONFIDENTIAL & PROPRIETARY", ml, 140, { width: pw, align: "center", characterSpacing: 0.8 });

      // Client name — below header
      doc.y = 208;
      doc.fontSize(9).fillColor(C.muted).font("Helvetica");
      doc.text("Prepared for", ml, doc.y, { width: pw, align: "center" });
      doc.moveDown(0.4);

      doc.fontSize(22).fillColor(C.primary).font("Helvetica-Bold");
      doc.text(data.client.name, ml, doc.y, { width: pw, align: "center" });
      doc.moveDown(0.5);

      // Industry badge area
      const industryLabel = (data.client.industry || "General").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      doc.fontSize(10).fillColor(C.muted).font("Helvetica");
      doc.text(industryLabel, ml, doc.y, { width: pw, align: "center" });
      doc.moveDown(1.5);

      // Title divider
      doc.moveTo(ml + pw / 2 - 80, doc.y).lineTo(ml + pw / 2 + 80, doc.y)
        .strokeColor(C.border).lineWidth(0.75).stroke();
      doc.moveDown(1.5);

      // Report title
      doc.fontSize(18).fillColor(C.primary).font("Helvetica-Bold");
      const reportTitle = data.analysis.title || `${analysisTypeLabel} — ${data.client.name}`;
      doc.text(reportTitle, ml, doc.y, { width: pw, align: "center" });
      doc.moveDown(0.6);

      doc.fontSize(10).fillColor(C.muted).font("Helvetica");
      doc.text(`${analysisTypeLabel}  ·  ${analysisDate}`, ml, doc.y, { width: pw, align: "center" });
      doc.moveDown(0.35);

      // Mode label
      const modeColor = data.analysis.analysisMode === "baseline" ? C.muted : C.success;
      doc.fontSize(9).fillColor(modeColor).font("Helvetica-Bold");
      doc.text(modeLabel, ml, doc.y, { width: pw, align: "center" });

      doc.moveDown(2);

      // ── KPI BOXES ──────────────────────────────────────────────────
      const bw = (pw - 20) / 3;
      const by = doc.y;
      const bh = 56;

      // Box 1: Issues found
      doc.rect(ml, by, bw, bh).fill(C.primary);
      doc.fontSize(22).fillColor(C.white).font("Helvetica-Bold");
      doc.text(String(findings.length), ml, by + 8, { width: bw, align: "center" });
      doc.fontSize(8).font("Helvetica").fillColor("#94a3b8");
      doc.text("Issues Found", ml, by + 36, { width: bw, align: "center" });

      // Box 2: Savings
      doc.rect(ml + bw + 10, by, bw, bh).fill(C.success);
      doc.fontSize(22).fillColor(C.white).font("Helvetica-Bold");
      doc.text(String(costSavings.length), ml + bw + 10, by + 8, { width: bw, align: "center" });
      doc.fontSize(8).font("Helvetica").fillColor("#d1fae5");
      doc.text("Saving Opportunities", ml + bw + 10, by + 36, { width: bw, align: "center" });

      // Box 3: Critical
      const box3Color = criticalCount > 0 ? C.danger : C.muted;
      doc.rect(ml + (bw + 10) * 2, by, bw, bh).fill(box3Color);
      doc.fontSize(22).fillColor(C.white).font("Helvetica-Bold");
      doc.text(String(criticalCount), ml + (bw + 10) * 2, by + 8, { width: bw, align: "center" });
      doc.fontSize(8).font("Helvetica").fillColor("#f1f5f9");
      doc.text("Critical / High Issues", ml + (bw + 10) * 2, by + 36, { width: bw, align: "center" });

      doc.y = by + bh + 20;

      // Optional MGD health score on cover
      const healthScore = mgd?.healthScore;
      if (typeof healthScore === "number") {
        const hsColor = healthScore >= 70 ? C.success : healthScore >= 40 ? C.warning : C.danger;
        const hsLabel = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "At Risk" : "Critical";
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor(C.muted).font("Helvetica");
        doc.text("Operational Health Score", ml, doc.y, { width: pw, align: "center" });
        doc.moveDown(0.2);
        doc.fontSize(28).fillColor(hsColor).font("Helvetica-Bold");
        doc.text(`${healthScore}`, ml, doc.y, { continued: true, width: pw / 2 + 30, align: "right" });
        doc.fontSize(11).font("Helvetica").fillColor(C.muted);
        doc.text(`  / 100  —  ${hsLabel}`, { width: pw / 2 - 30, align: "left" });
        doc.moveDown(0.5);
      }

      // ── Cover footer ───────────────────────────────────────────────
      const coverFooterY = ph - mb - 48;
      doc.moveTo(ml, coverFooterY).lineTo(ml + pw, coverFooterY).strokeColor(C.border).lineWidth(0.5).stroke();

      doc.fontSize(8).fillColor(C.muted).font("Helvetica");
      doc.text("Prepared by", ml, coverFooterY + 8);
      doc.fontSize(10).fillColor(C.text).font("Helvetica-Bold");
      doc.text("EDX Consulting", ml, coverFooterY + 20);
      doc.fontSize(8).fillColor(C.muted).font("Helvetica");
      doc.text("www.edx-consulting.com", ml, coverFooterY + 34);

      doc.fontSize(8).fillColor(C.muted).font("Helvetica");
      doc.text(`Ref: ${data.analysis.id?.slice(0, 8).toUpperCase() || "N/A"}  ·  Generated ${new Date().toLocaleDateString("en-MY")}`, ml, coverFooterY + 8, { width: pw, align: "right" });
      doc.text("This document contains confidential information prepared exclusively for the named client.", ml, coverFooterY + 34, { width: pw, align: "right" });

      // ═══════════════════════════════════════════════════════════════
      // PAGE 2+ — BODY
      // ═══════════════════════════════════════════════════════════════
      doc.addPage();
      let sectionNum = 1;

      // Mock mode notice
      if (data.analysis.isMockMode) {
        doc.rect(ml, doc.y, pw, 26).fill("#fef9c3");
        doc.fontSize(9).fillColor("#92400e").font("Helvetica-Bold");
        doc.text("⚠  BASELINE MODE — This report was produced from pattern analysis without uploaded documents. Upload operational data for evidence-enriched findings.", ml + 6, doc.y - 20, { width: pw - 12 });
        doc.moveDown(1.2);
      }

      // ── SECTION 1: EXECUTIVE SUMMARY ──────────────────────────────
      sectionHeader(String(sectionNum++), "Executive Summary");

      fieldLabel("Analysis Type & Mode");
      doc.fontSize(10).fillColor(C.text).font("Helvetica");
      doc.text(`${analysisTypeLabel}  ·  ${modeLabel}  ·  ${analysisDate}`, ml, doc.y, { width: pw });
      doc.moveDown(0.8);

      fieldLabel("Summary");
      const summaryText = data.analysis.summary
        || (mgd?.narrative?.executiveSummary)
        || "The diagnostic analysis has been completed. Please review the detailed findings below for root causes and recommended actions.";
      bodyText(summaryText);

      // 4M category distribution
      if (findings.length > 0) {
        const cats: Record<FourMCategory, number> = { Money: 0, Materials: 0, Manpower: 0, Machinery: 0 };
        findings.forEach(f => { if (f.fourMCategory) cats[f.fourMCategory]++; });
        const populated = Object.entries(cats).filter(([, n]) => n > 0);
        if (populated.length > 0) {
          fieldLabel("4M Category Distribution");
          let cx = ml;
          const catW = pw / populated.length - 6;
          const catY = doc.y;
          populated.forEach(([cat, count]) => {
            const col = FOURM[cat as FourMCategory] || C.muted;
            doc.rect(cx, catY, catW, 36).fill(col + "15");
            doc.roundedRect(cx, catY, catW, 36, 3).stroke(col + "55");
            doc.fontSize(16).fillColor(col).font("Helvetica-Bold");
            doc.text(String(count), cx, catY + 4, { width: catW, align: "center" });
            doc.fontSize(7).fillColor(col).font("Helvetica-Bold");
            doc.text(cat.toUpperCase(), cx, catY + 24, { width: catW, align: "center" });
            cx += catW + 6;
          });
          doc.y = catY + 46;
          doc.moveDown(0.8);
        }
      }

      // ── SECTION 2: DIAGNOSTIC FINDINGS ─────────────────────────────
      if (findings.length > 0) {
        sectionHeader(String(sectionNum++), "Diagnostic Findings");

        findings.forEach((finding, idx) => {
          ensureSpace(80);

          const catColor = FOURM[finding.fourMCategory] || C.muted;
          const sevColor = SEV[finding.severity] || C.muted;
          const rowY = doc.y;

          // Left category bar
          doc.rect(ml, rowY, 4, 64).fill(catColor);

          // Index circle
          doc.save();
          doc.circle(ml + 20, rowY + 10, 9).fill(C.primary);
          doc.fontSize(8).fillColor(C.white).font("Helvetica-Bold");
          doc.text(String(idx + 1).padStart(2, "0"), ml + 12, rowY + 5, { width: 16, align: "center" });
          doc.restore();

          const fx = ml + 36;
          const fw = pw - 40;

          // Severity + category chips — top right
          const chips: { label: string; color: string }[] = [
            { label: finding.severity.toUpperCase(), color: sevColor },
            { label: finding.fourMCategory, color: catColor },
          ];
          let chipX = ml + pw - 110;
          chips.forEach(ch => {
            doc.save();
            doc.roundedRect(chipX, rowY + 1, 52, 13, 2).fill(ch.color + "18");
            doc.fontSize(6.5).fillColor(ch.color).font("Helvetica-Bold");
            doc.text(ch.label, chipX + 1, rowY + 4, { width: 50, align: "center" });
            doc.restore();
            chipX += 56;
          });

          // Title
          doc.fontSize(11).fillColor(C.primary).font("Helvetica-Bold");
          doc.text(finding.title, fx, rowY + 2, { width: fw - 120 });

          // Description
          const descY = doc.y + 2;
          const desc = finding.description?.slice(0, 220) + (finding.description?.length > 220 ? "…" : "");
          doc.fontSize(9).fillColor(C.text).font("Helvetica");
          doc.text(desc, fx, descY, { width: fw, lineGap: 2 });

          // Cost impact + evidence count
          const metaY = doc.y + 2;
          doc.fontSize(8).fillColor(C.muted).font("Helvetica");
          const costStr = finding.estimatedCostImpact ? `Est. Impact: ${finding.estimatedCostImpact}` : "";
          const evidStr = (finding as any).evidenceCount ? `  ·  ${(finding as any).evidenceCount} evidence signal${(finding as any).evidenceCount !== 1 ? "s" : ""}` : "";
          if (costStr || evidStr) {
            doc.text(`${costStr}${evidStr}`, fx, metaY);
            doc.moveDown(0.3);
          }

          doc.moveDown(1);
        });
      }

      // ── SECTION 3: ROOT CAUSE ANALYSIS (MGD) ───────────────────────
      const rootCauseTree = mgd?.rootCauseTree;
      if (rootCauseTree?.primary) {
        sectionHeader(String(sectionNum++), "Root Cause Analysis");

        fieldLabel("Primary Root Cause");
        ensureSpace(50);
        const rcY = doc.y;
        const primaryColor = FOURM[rootCauseTree.primary.category as FourMCategory] || C.secondary;
        doc.rect(ml, rcY, 4, 50).fill(primaryColor);

        doc.fontSize(12).fillColor(C.primary).font("Helvetica-Bold");
        doc.text(rootCauseTree.primary.name, ml + 12, rcY, { width: pw - 16 });
        doc.fontSize(9).fillColor(C.text).font("Helvetica");
        if (rootCauseTree.primary.description) {
          doc.text(rootCauseTree.primary.description.slice(0, 200), ml + 12, doc.y + 2, { width: pw - 16, lineGap: 2 });
        }
        doc.fontSize(8).fillColor(C.muted);
        doc.text(`${rootCauseTree.primary.category || ""}${rootCauseTree.primary.tier ? "  ·  Tier " + rootCauseTree.primary.tier : ""}`, ml + 12, doc.y + 2);
        doc.moveDown(1);

        if (rootCauseTree.secondary?.length > 0) {
          fieldLabel("Contributing Root Causes");
          rootCauseTree.secondary.slice(0, 5).forEach((rc: any, i: number) => {
            ensureSpace(45);
            const scY = doc.y;
            const scColor = FOURM[rc.category as FourMCategory] || C.muted;
            doc.rect(ml, scY, 3, 38).fill(scColor);

            doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
            doc.text(`${i + 1}. ${rc.name}`, ml + 10, scY, { width: pw - 14 });
            doc.fontSize(9).fillColor(C.text).font("Helvetica");
            if (rc.description) {
              doc.text(rc.description.slice(0, 160) + (rc.description.length > 160 ? "…" : ""), ml + 10, doc.y + 1, { width: pw - 14, lineGap: 2 });
            }
            doc.fontSize(8).fillColor(C.muted);
            doc.text(`${rc.category || ""}${rc.tier ? "  ·  Tier " + rc.tier : ""}`, ml + 10, doc.y + 1);
            doc.moveDown(0.9);
          });
        }
      } else if (data.consultingReport) {
        // Fallback to consultingReport if mgdAnalysis not present
        const cr = data.consultingReport;
        sectionHeader(String(sectionNum++), "Root Cause Analysis");

        fieldLabel("Primary Root Cause");
        const primaryColor = FOURM[cr.primaryRootCause.category as FourMCategory] || C.secondary;
        const rcY = doc.y;
        doc.rect(ml, rcY, 4, 50).fill(primaryColor);
        doc.fontSize(12).fillColor(C.primary).font("Helvetica-Bold");
        doc.text(cr.primaryRootCause.name, ml + 12, rcY, { width: pw - 16 });
        doc.fontSize(9).fillColor(C.text).font("Helvetica");
        doc.text(cr.primaryRootCause.description.slice(0, 200), ml + 12, doc.y + 2, { width: pw - 16, lineGap: 2 });
        doc.moveDown(1);

        if (cr.secondaryRootCauses.length > 0) {
          fieldLabel("Contributing Root Causes");
          cr.secondaryRootCauses.slice(0, 4).forEach((rc, i) => {
            ensureSpace(40);
            const scY = doc.y;
            doc.rect(ml, scY, 3, 34).fill(FOURM[rc.category as FourMCategory] || C.muted);
            doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
            doc.text(`${i + 1}. ${rc.name}`, ml + 10, scY, { width: pw - 14 });
            doc.fontSize(9).fillColor(C.text).font("Helvetica");
            doc.text(rc.description.slice(0, 140) + (rc.description.length > 140 ? "…" : ""), ml + 10, doc.y + 1, { width: pw - 14, lineGap: 2 });
            doc.moveDown(0.8);
          });
        }
      }

      // ── SECTION 4: CAUSAL CHAIN ─────────────────────────────────────
      const causalChains = mgd?.causalChains;
      if (causalChains?.length > 0) {
        sectionHeader(String(sectionNum++), "Causal Chain");

        const chain = causalChains[0];
        fieldLabel("Primary Failure Path");
        doc.fontSize(9).fillColor(C.muted).font("Helvetica");
        doc.text("The following causal chain describes how the identified root cause propagates through operations to produce the observed symptoms.", ml, doc.y, { width: pw, lineGap: 3 });
        doc.moveDown(0.6);

        // Chain steps as horizontal flow
        const steps: string[] = chain.chain || chain.steps || [];
        if (steps.length > 0) {
          steps.forEach((step: string, i: number) => {
            ensureSpace(30);
            const stepY = doc.y;
            const isLast = i === steps.length - 1;

            doc.save();
            doc.roundedRect(ml, stepY, pw - 20, 22, 3).fill(i === 0 ? C.primary + "12" : C.light);
            doc.roundedRect(ml, stepY, pw - 20, 22, 3).stroke(C.border);
            doc.fontSize(9).fillColor(i === 0 ? C.primary : C.text).font(i === 0 ? "Helvetica-Bold" : "Helvetica");
            doc.text(step, ml + 8, stepY + 6, { width: pw - 36 });
            doc.restore();

            if (!isLast) {
              doc.fontSize(10).fillColor(C.muted);
              doc.text("↓", ml + pw - 18, stepY + 4, { width: 16, align: "center" });
            }

            doc.y = stepY + 28;
          });
        }

        if (chain.description) {
          doc.moveDown(0.5);
          fieldLabel("Chain Description");
          bodyText(chain.description);
        }
        doc.moveDown(0.5);
      }

      // ── SECTION 5: COST SAVING OPPORTUNITIES ───────────────────────
      if (costSavings.length > 0) {
        sectionHeader(String(sectionNum++), "Cost Saving Opportunities");

        doc.fontSize(9).fillColor(C.muted).font("Helvetica");
        doc.text(`${costSavings.length} opportunity${costSavings.length !== 1 ? "ies" : ""} identified across ${[...new Set(costSavings.map(s => s.category))].length} operational category${[...new Set(costSavings.map(s => s.category))].length !== 1 ? "ies" : ""}.`, ml, doc.y, { width: pw });
        doc.moveDown(0.6);

        costSavings.forEach((opp, i) => {
          ensureSpace(55);
          const oppY = doc.y;
          const catColor = FOURM[opp.category as FourMCategory] || C.secondary;

          doc.rect(ml, oppY, pw, 46).fill(C.success + "08");
          doc.rect(ml, oppY, 4, 46).fill(C.success);

          const ox = ml + 12;
          doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
          doc.text(`${i + 1}. ${opp.title}`, ox, oppY + 4, { width: pw - 100 });

          // Savings amount — top right
          if (opp.estimatedSavings) {
            doc.fontSize(10).fillColor(C.success).font("Helvetica-Bold");
            doc.text(opp.estimatedSavings, ml, oppY + 4, { width: pw, align: "right" });
          }

          doc.fontSize(9).fillColor(C.text).font("Helvetica");
          if (opp.description) {
            doc.text(opp.description.slice(0, 160) + (opp.description.length > 160 ? "…" : ""), ox, doc.y + 1, { width: pw - 16, lineGap: 2 });
          }
          doc.fontSize(8).fillColor(C.muted);
          doc.text(`Category: ${opp.category || "N/A"}${opp.timeframe ? "  ·  Timeframe: " + opp.timeframe : ""}`, ox, doc.y + 1);

          doc.y = oppY + 50;
          doc.moveDown(0.5);
        });
      }

      // ── SECTION 6: RISK PREDICTIONS ─────────────────────────────────
      if (predictions.length > 0) {
        sectionHeader(String(sectionNum++), "Risk Predictions");

        doc.fontSize(9).fillColor(C.muted).font("Helvetica");
        doc.text("The following risks are predicted based on the identified root causes and current operational signals.", ml, doc.y, { width: pw, lineGap: 3 });
        doc.moveDown(0.6);

        predictions.forEach((pred, i) => {
          ensureSpace(55);
          const predY = doc.y;
          const isHigh = pred.likelihood === "high";
          const borderColor = isHigh ? C.danger : pred.likelihood === "medium" ? C.warning : C.muted;

          doc.rect(ml, predY, pw, 46).fill(isHigh ? C.danger + "08" : C.light);
          doc.rect(ml, predY, 4, 46).fill(borderColor);

          const px = ml + 12;
          doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
          doc.text(`${i + 1}. ${pred.title}`, px, predY + 4, { width: pw - 90 });

          // Likelihood chip
          doc.save();
          doc.roundedRect(ml + pw - 75, predY + 5, 68, 14, 2).fill(borderColor + "22");
          doc.fontSize(7.5).fillColor(borderColor).font("Helvetica-Bold");
          doc.text(`${(pred.likelihood || "N/A").toUpperCase()} RISK`, ml + pw - 74, predY + 9, { width: 66, align: "center" });
          doc.restore();

          doc.fontSize(9).fillColor(C.text).font("Helvetica");
          if (pred.description) {
            doc.text(pred.description.slice(0, 160) + (pred.description.length > 160 ? "…" : ""), px, doc.y + 1, { width: pw - 16, lineGap: 2 });
          }
          doc.fontSize(8).fillColor(C.muted);
          if (pred.timeframe) doc.text(`Timeframe: ${pred.timeframe}`, px, doc.y + 1);

          doc.y = predY + 50;
          doc.moveDown(0.5);
        });
      }

      // ── SECTION 7: FINANCIAL IMPACT (MGD) ──────────────────────────
      const financialImpact = mgd?.financialImpact ?? data.consultingReport?.financialImpact;
      if (financialImpact) {
        sectionHeader(String(sectionNum++), "Financial Impact");

        const sevColor = SEV[financialImpact.estimatedSeverity] || C.muted;
        const impactY = doc.y;
        doc.rect(ml, impactY, pw, 36).fill(sevColor + "10");
        doc.rect(ml, impactY, 4, 36).fill(sevColor);
        doc.fontSize(12).fillColor(sevColor).font("Helvetica-Bold");
        doc.text(financialImpact.estimatedSeverity?.toUpperCase() || "N/A", ml + 12, impactY + 5, { continued: true });
        doc.fontSize(10).fillColor(C.text).font("Helvetica");
        doc.text("  Estimated Financial Severity", { width: pw - 16 });
        doc.fontSize(9).fillColor(C.muted).font("Helvetica");
        const affectedCats = financialImpact.affectedCategories?.join(", ");
        if (affectedCats) doc.text(`Affected: ${affectedCats}`, ml + 12, doc.y + 2);
        doc.y = impactY + 40;
        doc.moveDown(0.5);

        if (financialImpact.costDrivers?.length > 0) {
          fieldLabel("Cost Drivers");
          const driverText = financialImpact.costDrivers
            .map((d: string) => d.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()))
            .join(", ");
          bodyText(driverText);
        }
      }

      // ── SECTION 8: OPERATIONAL HEALTH SCORE ────────────────────────
      if (typeof healthScore === "number") {
        sectionHeader(String(sectionNum++), "Operational Health Score");

        const hsColor = healthScore >= 70 ? C.success : healthScore >= 40 ? C.warning : C.danger;
        const hsLabel = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "At Risk" : "Critical";
        const hsDesc = healthScore >= 70
          ? "The organisation demonstrates healthy operational fundamentals. Minor improvements may still deliver meaningful efficiency gains."
          : healthScore >= 40
          ? "The organisation is operating under stress in one or more key areas. Targeted intervention is recommended."
          : "The organisation shows critical operational vulnerabilities. Immediate action is required to prevent further deterioration.";

        ensureSpace(70);
        const hsY = doc.y;
        doc.rect(ml, hsY, pw, 56).fill(hsColor + "0C");
        doc.rect(ml, hsY, 4, 56).fill(hsColor);

        doc.fontSize(32).fillColor(hsColor).font("Helvetica-Bold");
        doc.text(`${healthScore}`, ml + 16, hsY + 5, { continued: true });
        doc.fontSize(12).fillColor(C.muted).font("Helvetica");
        doc.text(" / 100", { continued: true });
        doc.fontSize(13).fillColor(hsColor).font("Helvetica-Bold");
        doc.text(`   ${hsLabel}`, { width: pw - 60 });
        doc.fontSize(9).fillColor(C.text).font("Helvetica");
        doc.text(hsDesc, ml + 16, doc.y + 2, { width: pw - 20, lineGap: 3 });
        doc.y = hsY + 60;
        doc.moveDown(0.5);
      }

      // ── SECTION 9: TRANSFORMATION ROADMAP ──────────────────────────
      const roadmap = mgd?.roadmap;
      if (Array.isArray(roadmap) && roadmap.length > 0) {
        sectionHeader(String(sectionNum++), "Transformation Roadmap");

        roadmap.slice(0, 5).forEach((item: any, i: number) => {
          ensureSpace(50);
          const rmY = doc.y;
          const phaseColors = [C.danger, C.warning, C.secondary, C.success, C.muted];
          const phColor = phaseColors[i] || C.muted;

          doc.rect(ml, rmY, pw, 44).fill(C.light);
          doc.rect(ml, rmY, 4, 44).fill(phColor);

          const rmx = ml + 14;
          doc.fontSize(9).fillColor(phColor).font("Helvetica-Bold");
          const phaseLabel = item.phase || item.priority || `Phase ${i + 1}`;
          doc.text(phaseLabel.toUpperCase(), rmx, rmY + 4, { characterSpacing: 0.5 });

          doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
          doc.text(item.title || item.name || "Intervention", rmx, doc.y + 1, { width: pw - 50 });

          doc.fontSize(8.5).fillColor(C.text).font("Helvetica");
          if (item.description || item.action) {
            doc.text(
              (item.description || item.action || "").slice(0, 140),
              rmx, doc.y + 1, { width: pw - 18, lineGap: 2 }
            );
          }

          doc.y = rmY + 48;
          doc.moveDown(0.4);
        });
      }

      // ── SECTION 10: INDUSTRY BENCHMARKS ────────────────────────────
      const benchmarks = mgd?.benchmarks;
      if (Array.isArray(benchmarks) && benchmarks.length > 0) {
        sectionHeader(String(sectionNum++), "Industry Benchmarks");

        fieldLabel("Performance vs. Industry Standard");
        benchmarks.slice(0, 6).forEach((bm: any) => {
          ensureSpace(30);
          const bmY = doc.y;
          const label = bm.metric || bm.name || "Metric";
          const status = bm.status || bm.rating || "";
          const bmColor = status === "good" || status === "above" ? C.success
            : status === "below" || status === "poor" ? C.danger
            : C.warning;

          doc.fontSize(9).fillColor(C.text).font("Helvetica-Bold");
          doc.text(label, ml, bmY, { continued: true });
          doc.font("Helvetica").fillColor(C.muted);
          if (bm.clientValue) doc.text(`  —  ${bm.clientValue}`);
          else doc.text("");

          if (bm.industryAverage || bm.benchmark) {
            doc.fontSize(8).fillColor(C.muted);
            doc.text(`Industry avg: ${bm.industryAverage || bm.benchmark}`, ml + 10, doc.y);
          }
          if (status) {
            doc.fontSize(8).fillColor(bmColor).font("Helvetica-Bold");
            doc.text(status.toUpperCase(), ml + pw - 60, bmY, { width: 58, align: "right" });
          }
          doc.moveDown(0.5);
        });
      }

      // ── CLOSING ─────────────────────────────────────────────────────
      ensureSpace(80);
      doc.moveDown(1);
      doc.moveTo(ml, doc.y).lineTo(ml + pw, doc.y).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.moveDown(0.8);

      doc.fontSize(11).fillColor(C.primary).font("Helvetica-Bold");
      doc.text("Contact EDX for Implementation Support", ml);
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor(C.text).font("Helvetica");
      doc.text("Our consultants are available to support implementation, capability building, and follow-up diagnostics.", ml, doc.y, { width: pw });
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor(C.secondary).font("Helvetica");
      doc.text("consulting@edx.com  ·  www.edx-consulting.com", ml);

      // ── FOOTER on all pages ─────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.moveTo(ml, ph - mb - 12).lineTo(ml + pw, ph - mb - 12).strokeColor(C.border).lineWidth(0.4).stroke();
        doc.fontSize(7).fillColor(C.muted).font("Helvetica");
        doc.text(
          `Page ${i + 1} of ${range.count}  ·  EDX Consulting — Efficiency, Deployment, Excellence  ·  Confidential`,
          ml, ph - mb - 6,
          { width: pw, align: "center" }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
