import PDFDocument from "pdfkit";
import {
  type ClientAnalysis,
  type Client,
  type AnalysisFinding,
  type CostSavingOpportunity,
  type RecurrencePrediction,
  type FourMCategory,
} from "@shared/schema";
import type { ConsultingDiagnosticReport } from "../modules/diagnostics/engines/consulting-diagnostic-engine";

// ── Brand colour palette ──────────────────────────────────────────────────────
const C = {
  primary:   "#1a2f4a",
  secondary: "#2563eb",
  accent:    "#f59e0b",
  text:      "#1e293b",
  muted:     "#64748b",
  border:    "#e2e8f0",
  success:   "#16a34a",
  warning:   "#d97706",
  danger:    "#dc2626",
  light:     "#f8fafc",
  white:     "#ffffff",
  money:     "#16a34a",
  materials: "#d97706",
  manpower:  "#2563eb",
  machinery: "#7c3aed",
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
        margins: { top: 55, bottom: 65, left: 55, right: 55 },
        bufferPages: true,
        info: {
          Title: `${data.client.name} — Operational Diagnostic Report`,
          Author: "EDX Consulting — Efficiency, Deployment, Excellence",
          Subject: data.analysis.title || "RCI Diagnostic Report",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end",  () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pw = doc.page.width  - doc.page.margins.left - doc.page.margins.right;
      const ph = doc.page.height;
      const ml = doc.page.margins.left;
      const mb = doc.page.margins.bottom;

      // ─────────────────────────────────────────────────────────────────────
      // LAYOUT HELPERS
      // ─────────────────────────────────────────────────────────────────────

      // Safe uppercase — never throws on null / undefined
      const safeUpper = (value: unknown, fallback = "N/A"): string =>
        String(value ?? fallback).toUpperCase();

      // Check remaining page space; add page if needed
      const ensureSpace = (needed: number) => {
        if (doc.y > ph - mb - needed) doc.addPage();
      };

      // Section divider with numbered pill + title
      // Captures startY before drawing so pill and title share the same baseline.
      const SECTION_TOP_GAP    = 26; // space above section header
      const SECTION_RULE_GAP   = 12; // space between rule and first content
      const SECTION_PILL_H     = 20;
      const SECTION_PILL_W     = 28;

      const sectionHeader = (num: string, title: string) => {
        ensureSpace(75);
        doc.y += SECTION_TOP_GAP;
        const startY = doc.y;

        // Filled pill
        doc.save();
        doc.roundedRect(ml, startY, SECTION_PILL_W, SECTION_PILL_H, 3).fill(C.secondary);
        doc.fontSize(8.5).fillColor(C.white).font("Helvetica-Bold");
        doc.text(
          num.padStart(2, "0"),
          ml, startY + 5,
          { width: SECTION_PILL_W, align: "center" }
        );
        doc.restore();

        // Title — same Y baseline as pill, slightly larger and bolder
        doc.fontSize(15.5).fillColor(C.primary).font("Helvetica-Bold");
        doc.text(title, ml + SECTION_PILL_W + 10, startY, {
          width: pw - SECTION_PILL_W - 10,
        });

        // Advance cursor to below whichever element is taller
        const afterY = Math.max(doc.y, startY + SECTION_PILL_H + 5);
        doc.y = afterY;

        // Horizontal rule — slightly heavier
        doc.moveTo(ml, doc.y)
           .lineTo(ml + pw, doc.y)
           .strokeColor(C.border)
           .lineWidth(0.75)
           .stroke();

        doc.y += SECTION_RULE_GAP;
      };

      // Uppercase field label
      const fieldLabel = (text: string, indentX = ml) => {
        ensureSpace(24);
        doc.fontSize(7.5).fillColor(C.muted).font("Helvetica-Bold");
        doc.text(safeUpper(text), indentX, doc.y, { characterSpacing: 0.5 });
        doc.y += 4;
      };

      // Justified body paragraph
      const bodyText = (text: string, indentLeft = 0) => {
        doc.fontSize(10).fillColor(C.text).font("Helvetica");
        doc.text(
          String(text ?? ""),
          ml + indentLeft, doc.y,
          { width: pw - indentLeft, lineGap: 4.5, align: "justify" }
        );
        doc.y += 14;
      };

      // ─────────────────────────────────────────────────────────────────────
      // DATA SETUP
      // ─────────────────────────────────────────────────────────────────────

      const mgd         = (data.analysis as any).mgdAnalysis as Record<string, any> | null | undefined;
      const findings    = (data.analysis.findings              || []) as AnalysisFinding[];
      const costSavings = (data.analysis.costSavingOpportunities || []) as CostSavingOpportunity[];
      const predictions = (data.analysis.recurrencePredictions || []) as RecurrencePrediction[];
      const critCount   = findings.filter(f => f.severity === "critical" || f.severity === "high").length;
      const healthScore = mgd?.healthScore;

      const analysisDate = data.analysis.completedAt
        ? new Date(data.analysis.completedAt).toLocaleDateString("en-MY", {
            year: "numeric", month: "long", day: "numeric"
          })
        : new Date().toLocaleDateString("en-MY", {
            year: "numeric", month: "long", day: "numeric"
          });

      const analysisTypeLabel = data.analysis.analysisType === "quick"
        ? "Quick Analysis" : "Deep Diagnostic";
      const isBaseline = data.analysis.analysisMode === "baseline" || data.analysis.isMockMode;
      const modeLabel  = isBaseline
        ? "Baseline — Pattern Analysis"
        : "Evidence-Enriched — Signal Driven";

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 1 — COVER
      // ═══════════════════════════════════════════════════════════════════

      // Full-width header band (absolute, never moves cursor)
      doc.rect(0, 0, doc.page.width, 175).fill(C.primary);

      // EDX wordmark
      doc.fontSize(30).fillColor(C.white).font("Helvetica-Bold");
      doc.text("EDX", ml, 36, { width: pw, align: "center" });

      doc.fontSize(9).fillColor("#94a3b8").font("Helvetica");
      doc.text(
        "EFFICIENCY  ·  DEPLOYMENT  ·  EXCELLENCE",
        ml, 74,
        { width: pw, align: "center", characterSpacing: 1 }
      );

      doc.fontSize(8).fillColor("#cbd5e1").font("Helvetica");
      doc.text(
        "OPERATIONAL DIAGNOSTIC REPORT",
        ml, 98,
        { width: pw, align: "center", characterSpacing: 1.2 }
      );

      // Amber accent rule
      doc.moveTo(ml + pw / 2 - 55, 122).lineTo(ml + pw / 2 + 55, 122)
         .strokeColor(C.accent).lineWidth(1.5).stroke();

      doc.fontSize(7).fillColor("#94a3b8").font("Helvetica");
      doc.text("CONFIDENTIAL & PROPRIETARY", ml, 137, {
        width: pw, align: "center", characterSpacing: 0.8,
      });

      // ── Below header band ────────────────────────────────────────────
      doc.y = 200;

      doc.fontSize(8.5).fillColor(C.muted).font("Helvetica");
      doc.text("Prepared for", ml, doc.y, { width: pw, align: "center" });
      doc.y += 14;

      doc.fontSize(22).fillColor(C.primary).font("Helvetica-Bold");
      doc.text(data.client.name, ml, doc.y, { width: pw, align: "center" });
      doc.y += 26;

      const industryLabel = (data.client.industry || "General")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
      doc.fontSize(10).fillColor(C.muted).font("Helvetica");
      doc.text(industryLabel, ml, doc.y, { width: pw, align: "center" });
      doc.y += 30;

      // Divider rule
      doc.moveTo(ml + pw / 2 - 75, doc.y)
         .lineTo(ml + pw / 2 + 75, doc.y)
         .strokeColor(C.border).lineWidth(0.75).stroke();
      doc.y += 24;

      // Report title
      const reportTitle = data.analysis.title || `${analysisTypeLabel} — ${data.client.name}`;
      doc.fontSize(17).fillColor(C.primary).font("Helvetica-Bold");
      doc.text(reportTitle, ml, doc.y, { width: pw, align: "center" });
      doc.y += 18;

      doc.fontSize(10).fillColor(C.muted).font("Helvetica");
      doc.text(`${analysisTypeLabel}  ·  ${analysisDate}`, ml, doc.y, {
        width: pw, align: "center",
      });
      doc.y += 14;

      const modeColor = isBaseline ? C.muted : C.success;
      doc.fontSize(9).fillColor(modeColor).font("Helvetica-Bold");
      doc.text(modeLabel, ml, doc.y, { width: pw, align: "center" });
      doc.y += 30;

      // ── KPI boxes ─────────────────────────────────────────────────────
      const bw   = (pw - 18) / 3;
      const by   = doc.y;
      const bh   = 68;      // taller for better proportion
      const bgap = 9;

      // Helper: draw one KPI card
      const kpiCard = (x: number, fill: string, num: string, labelTop: string, labelBot: string, numColor: string, labelColor: string) => {
        doc.roundedRect(x, by, bw, bh, 4).fill(fill);
        // Number — large, centred, upper portion
        doc.fontSize(28).fillColor(numColor).font("Helvetica-Bold");
        doc.text(num, x, by + 10, { width: bw, align: "center" });
        // Separator rule between number and label
        doc.moveTo(x + bw * 0.25, by + 46).lineTo(x + bw * 0.75, by + 46)
           .strokeColor(labelColor + "44").lineWidth(0.5).stroke();
        // Label — two lines if needed
        doc.fontSize(7.5).fillColor(labelColor).font("Helvetica-Bold");
        doc.text(labelTop, x, by + 52, { width: bw, align: "center", characterSpacing: 0.3 });
        if (labelBot) {
          doc.fontSize(7).fillColor(labelColor).font("Helvetica");
          doc.text(labelBot, x, by + 62, { width: bw, align: "center" });
        }
      };

      kpiCard(ml,             C.primary, String(findings.length),    "ISSUES",      "IDENTIFIED",        C.white,   "#94a3b8");
      kpiCard(ml + bw + bgap, C.success, String(costSavings.length), "SAVING",      "OPPORTUNITIES",     C.white,   "#d1fae5");
      const b3c = critCount > 0 ? C.danger : C.muted;
      kpiCard(ml + (bw + bgap) * 2, b3c, String(critCount),         "CRITICAL",    "/ HIGH PRIORITY",   C.white,   "#fecaca");

      doc.y = by + bh + 24;

      // Health score on cover (optional)
      if (typeof healthScore === "number") {
        const hsc   = healthScore >= 70 ? C.success : healthScore >= 40 ? C.warning : C.danger;
        const hslbl = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "At Risk" : "Critical";
        doc.y += 6;
        doc.fontSize(8.5).fillColor(C.muted).font("Helvetica");
        doc.text("Operational Health Score", ml, doc.y, { width: pw, align: "center" });
        doc.y += 14;
        const scoreStr = `${healthScore} / 100  —  ${hslbl}`;
        doc.fontSize(20).fillColor(hsc).font("Helvetica-Bold");
        doc.text(scoreStr, ml, doc.y, { width: pw, align: "center" });
        doc.y += 26;
      }

      // ── Primary Diagnosis block ───────────────────────────────────────
      // The single most important insight — makes the cover feel complete
      // and immediately valuable rather than trailing off after the KPIs.
      {
        // Pick the most severe finding or the first finding
        const primaryFinding =
          findings.find(f => f.severity === "critical") ||
          findings.find(f => f.severity === "high") ||
          findings[0];

        // Build a 1–2 line insight string
        const insightText =
          mgd?.narrative?.keyInsight ||
          mgd?.narrative?.primaryDiagnosis ||
          (primaryFinding
            ? String(primaryFinding.description || primaryFinding.title || "").slice(0, 220)
            : data.analysis.summary
              ? String(data.analysis.summary).slice(0, 220)
              : null);

        if (insightText) {
          const pdBlockH = 92;
          const pdY      = doc.y;
          const pdPad    = 18; // inner horizontal padding

          // Outer card — navy background for premium feel
          doc.roundedRect(ml, pdY, pw, pdBlockH, 5).fill(C.primary);

          // Amber top accent strip (4px tall)
          doc.rect(ml, pdY, pw, 4).fill(C.accent);
          // Rounded corners back on top
          doc.roundedRect(ml, pdY, pw, 10, 5).fill(C.primary);
          doc.rect(ml, pdY + 4, pw, 6).fill(C.primary);

          // "PRIMARY DIAGNOSIS" eyebrow label
          doc.fontSize(7).fillColor(C.accent).font("Helvetica-Bold");
          doc.text("PRIMARY DIAGNOSIS", ml + pdPad, pdY + 14, {
            width: pw - pdPad * 2, characterSpacing: 1.2,
          });

          // Thin amber rule under label
          doc.moveTo(ml + pdPad, pdY + 24)
             .lineTo(ml + pdPad + 50, pdY + 24)
             .strokeColor(C.accent + "66").lineWidth(0.5).stroke();

          // Finding title
          const diagTitle = primaryFinding
            ? String(primaryFinding.title || "Key Finding")
            : "Key Insight";
          doc.fontSize(12).fillColor(C.white).font("Helvetica-Bold");
          doc.text(diagTitle, ml + pdPad, pdY + 30, { width: pw - pdPad * 2 });

          // Insight body — more chars, better line-height
          const insightSnippet = insightText.length > 200
            ? insightText.slice(0, 197) + "…"
            : insightText;
          doc.fontSize(9).fillColor("#94a3b8").font("Helvetica");
          doc.text(insightSnippet, ml + pdPad, pdY + 48, {
            width: pw - pdPad * 2, lineGap: 3,
          });

          doc.y = Math.max(doc.y, pdY + pdBlockH) + 18;
        }
      }

      // ── Cover footer — three-zone layout ─────────────────────────────
      // Zone left: brand identity  |  Zone centre: confidentiality  |  Zone right: ref
      const cfY = ph - mb - 54;
      doc.moveTo(ml, cfY).lineTo(ml + pw, cfY)
         .strokeColor(C.border).lineWidth(0.6).stroke();

      const cfZoneW = pw / 3;
      const cfTextY = cfY + 10;

      // Left zone — brand
      doc.fontSize(9.5).fillColor(C.primary).font("Helvetica-Bold");
      doc.text("EDX Consulting", ml, cfTextY, { width: cfZoneW });
      doc.fontSize(7).fillColor(C.muted).font("Helvetica");
      doc.text("Efficiency  ·  Deployment  ·  Excellence", ml, cfTextY + 14, { width: cfZoneW });
      doc.fontSize(7).fillColor(C.muted).font("Helvetica");
      doc.text("www.edx-consulting.com", ml, cfTextY + 25, { width: cfZoneW });

      // Centre zone — confidentiality notice
      doc.fontSize(7).fillColor(C.muted).font("Helvetica-Bold");
      doc.text(
        "CONFIDENTIAL & PROPRIETARY",
        ml + cfZoneW, cfTextY,
        { width: cfZoneW, align: "center", characterSpacing: 0.5 }
      );
      doc.fontSize(6.5).fillColor(C.muted).font("Helvetica");
      doc.text(
        "Prepared exclusively for the named client.\nDo not distribute without authorisation.",
        ml + cfZoneW, cfTextY + 12,
        { width: cfZoneW, align: "center", lineGap: 2 }
      );

      // Right zone — reference + date
      const refStr = `Ref: ${String(data.analysis.id ?? "").slice(0, 8).toUpperCase() || "N/A"}`;
      const genStr = `Generated ${new Date().toLocaleDateString("en-MY")}`;
      doc.fontSize(7.5).fillColor(C.muted).font("Helvetica");
      doc.text(refStr, ml + cfZoneW * 2, cfTextY, { width: cfZoneW, align: "right" });
      doc.fontSize(7).fillColor(C.muted).font("Helvetica");
      doc.text(genStr, ml + cfZoneW * 2, cfTextY + 14, { width: cfZoneW, align: "right" });
      doc.fontSize(7).fillColor(C.secondary).font("Helvetica-Bold");
      doc.text("consulting@edx.com", ml + cfZoneW * 2, cfTextY + 26, {
        width: cfZoneW, align: "right",
      });

      // ═══════════════════════════════════════════════════════════════════
      // PAGE 2+ — BODY
      // ═══════════════════════════════════════════════════════════════════
      doc.addPage();
      let sNum = 1;

      // ── Baseline Advisory Notice ──────────────────────────────────────
      // Shown for Quick Analysis / baseline mode. Designed advisory block,
      // not raw debug text.
      if (isBaseline) {
        const noticeY  = doc.y;
        const noticeH  = 54;
        // Very soft warm cream — informative, not alarming
        doc.roundedRect(ml, noticeY, pw, noticeH, 4).fill("#fefce8");
        // Muted amber left strip
        doc.roundedRect(ml, noticeY, 4, noticeH, 2).fill(C.warning + "cc");
        // Barely-there border
        doc.roundedRect(ml, noticeY, pw, noticeH, 4)
           .stroke(C.warning + "30").lineWidth(0.5);

        const nx = ml + 14;
        doc.fontSize(8.5).fillColor(C.warning).font("Helvetica-Bold");
        doc.text("Advisory  —  Baseline Pattern Analysis", nx, noticeY + 9, {
          width: pw - 20,
        });
        doc.fontSize(8.5).fillColor("#78350f").font("Helvetica");
        doc.text(
          "This report was prepared using baseline pattern analysis without uploaded documents. "
          + "For evidence-enriched findings, upload operational data to enable deep signal-driven diagnostics.",
          nx, doc.y + 4,
          { width: pw - 22, lineGap: 2.5 }
        );
        doc.y = Math.max(doc.y, noticeY + noticeH) + 18;
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 1 — EXECUTIVE SUMMARY
      // ─────────────────────────────────────────────────────────────────
      sectionHeader(String(sNum++), "Executive Summary");

      fieldLabel("Analysis Type & Mode");
      doc.fontSize(10).fillColor(C.text).font("Helvetica");
      doc.text(
        `${analysisTypeLabel}  ·  ${modeLabel}  ·  ${analysisDate}`,
        ml, doc.y,
        { width: pw }
      );
      doc.y += 14;

      fieldLabel("Summary");
      const summaryText = String(
        data.analysis.summary
        || mgd?.narrative?.executiveSummary
        || "The diagnostic analysis has been completed. Please review the detailed findings below for root causes and recommended actions."
      );
      bodyText(summaryText);

      // 4M distribution tiles
      if (findings.length > 0) {
        const cats: Record<FourMCategory, number> = {
          Money: 0, Materials: 0, Manpower: 0, Machinery: 0,
        };
        findings.forEach(f => { if (f.fourMCategory) cats[f.fourMCategory]++; });
        const populated = Object.entries(cats).filter(([, n]) => n > 0);

        if (populated.length > 0) {
          ensureSpace(56);
          fieldLabel("4M Category Distribution");
          const tileW   = Math.floor((pw - (populated.length - 1) * 8) / populated.length);
          const tileH   = 38;
          const tilesY  = doc.y;
          let tx = ml;

          populated.forEach(([cat, count]) => {
            const col = FOURM[cat as FourMCategory] || C.muted;
            doc.roundedRect(tx, tilesY, tileW, tileH, 4).fill(col + "14");
            doc.roundedRect(tx, tilesY, tileW, tileH, 4)
               .stroke(col + "55").lineWidth(0.5);
            doc.fontSize(16).fillColor(col).font("Helvetica-Bold");
            doc.text(String(count), tx, tilesY + 4, { width: tileW, align: "center" });
            doc.fontSize(7).fillColor(col).font("Helvetica-Bold");
            doc.text(cat.toUpperCase(), tx, tilesY + 24, { width: tileW, align: "center" });
            tx += tileW + 8;
          });
          doc.y = tilesY + tileH + 14;
        }
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 2 — DIAGNOSTIC FINDINGS
      // ─────────────────────────────────────────────────────────────────
      if (findings.length > 0) {
        sectionHeader(String(sNum++), "Diagnostic Findings");

        findings.forEach((finding, idx) => {
          const MIN_ROW_H = 84;
          ensureSpace(MIN_ROW_H + 18);

          const catColor = FOURM[finding.fourMCategory] || C.muted;
          const sevColor = SEV[String(finding.severity || "medium")] || C.muted;
          const rowStartY = doc.y;

          // Subtle background for alternating rows — improves scannability
          if (idx % 2 === 0) {
            doc.rect(ml, rowStartY, pw, MIN_ROW_H).fill(C.light);
          }

          // Left category colour bar
          doc.rect(ml, rowStartY, 4, MIN_ROW_H).fill(catColor);

          // Index circle — vertically centred
          doc.save();
          doc.circle(ml + 21, rowStartY + 14, 9.5).fill(C.primary);
          doc.fontSize(7.5).fillColor(C.white).font("Helvetica-Bold");
          doc.text(
            String(idx + 1).padStart(2, "0"),
            ml + 13, rowStartY + 9,
            { width: 16, align: "center" }
          );
          doc.restore();

          // Chip badges — fixed 60px width, consistently right-aligned
          // Both chips are identical width so column never shifts
          const chipW  = 60;
          const chipGap = 6;
          const chip2X = ml + pw - chipW;                 // category chip (rightmost)
          const chip1X = chip2X - chipW - chipGap;        // severity chip
          const chipY  = rowStartY + 6;
          const chipH  = 15;

          // Severity chip
          doc.save();
          doc.roundedRect(chip1X, chipY, chipW, chipH, 2).fill(sevColor + "15");
          doc.roundedRect(chip1X, chipY, chipW, chipH, 2)
             .stroke(sevColor + "44").lineWidth(0.5);
          doc.fontSize(6.5).fillColor(sevColor).font("Helvetica-Bold");
          doc.text(
            safeUpper(finding.severity, "medium"),
            chip1X, chipY + 4.5,
            { width: chipW, align: "center" }
          );
          doc.restore();

          // Category chip
          doc.save();
          doc.roundedRect(chip2X, chipY, chipW, chipH, 2).fill(catColor + "15");
          doc.roundedRect(chip2X, chipY, chipW, chipH, 2)
             .stroke(catColor + "44").lineWidth(0.5);
          doc.fontSize(6.5).fillColor(catColor).font("Helvetica-Bold");
          doc.text(
            safeUpper(finding.fourMCategory, "—"),
            chip2X, chipY + 4.5,
            { width: chipW, align: "center" }
          );
          doc.restore();

          // Content area — left of the two chips
          const cx = ml + 44;
          const cw = pw - 44 - chipW * 2 - chipGap - 10;

          doc.y = rowStartY + 11; // more top breathing room

          // Title
          doc.fontSize(11).fillColor(C.primary).font("Helvetica-Bold");
          doc.text(String(finding.title || "Untitled Finding"), cx, doc.y, { width: cw });

          // Description — comfortable line height, slightly larger
          doc.y += 6;
          const desc = String(finding.description || "").slice(0, 260)
            + (String(finding.description || "").length > 260 ? "…" : "");
          doc.fontSize(9.5).fillColor(C.text).font("Helvetica");
          doc.text(desc, cx, doc.y, { width: pw - 52, lineGap: 3.5 });

          // Meta line
          const costStr = finding.estimatedCostImpact
            ? `Est. Impact: ${finding.estimatedCostImpact}` : "";
          const evStr   = (finding as any).evidenceCount
            ? `  ·  ${(finding as any).evidenceCount} signal${(finding as any).evidenceCount !== 1 ? "s" : ""}` : "";
          if (costStr || evStr) {
            doc.y += 5;
            doc.fontSize(7.5).fillColor(C.muted).font("Helvetica");
            doc.text(`${costStr}${evStr}`, cx, doc.y, { width: pw - 52 });
          }

          // Advance cursor at least past minimum row height, then add gap
          doc.y = Math.max(doc.y, rowStartY + MIN_ROW_H) + 16;
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 3 — ROOT CAUSE ANALYSIS
      // ─────────────────────────────────────────────────────────────────
      const rootCauseTree = mgd?.rootCauseTree;

      if (rootCauseTree?.primary) {
        sectionHeader(String(sNum++), "Root Cause Analysis");

        // Primary
        fieldLabel("Primary Root Cause");
        ensureSpace(60);
        const rcStartY  = doc.y;
        const primaryCol = FOURM[rootCauseTree.primary.category as FourMCategory] || C.secondary;

        doc.rect(ml, rcStartY, 4, 56).fill(primaryCol);
        const rx = ml + 14;

        doc.y = rcStartY + 2;
        doc.fontSize(12).fillColor(C.primary).font("Helvetica-Bold");
        doc.text(String(rootCauseTree.primary.name || "Unknown Root Cause"), rx, doc.y, {
          width: pw - 18,
        });
        if (rootCauseTree.primary.description) {
          doc.y += 3;
          doc.fontSize(9).fillColor(C.text).font("Helvetica");
          doc.text(
            String(rootCauseTree.primary.description).slice(0, 220),
            rx, doc.y,
            { width: pw - 18, lineGap: 2 }
          );
        }
        doc.y += 3;
        doc.fontSize(7.5).fillColor(C.muted).font("Helvetica");
        const catStr  = String(rootCauseTree.primary.category || "");
        const tierStr = rootCauseTree.primary.tier ? `  ·  Tier ${rootCauseTree.primary.tier}` : "";
        doc.text(`${catStr}${tierStr}`, rx, doc.y);

        doc.y = Math.max(doc.y, rcStartY + 60) + 14;

        // Secondary root causes
        if (Array.isArray(rootCauseTree.secondary) && rootCauseTree.secondary.length > 0) {
          fieldLabel("Contributing Root Causes");
          rootCauseTree.secondary.slice(0, 5).forEach((rc: any, i: number) => {
            const MIN_SC_H = 44;
            ensureSpace(MIN_SC_H + 10);
            const scStart = doc.y;
            const scCol   = FOURM[rc.category as FourMCategory] || C.muted;

            doc.rect(ml, scStart, 3, MIN_SC_H).fill(scCol);
            const scx = ml + 11;
            doc.y = scStart + 2;

            doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
            doc.text(`${i + 1}. ${String(rc.name || "Unknown")}`, scx, doc.y, {
              width: pw - 15,
            });
            if (rc.description) {
              doc.y += 2;
              doc.fontSize(9).fillColor(C.text).font("Helvetica");
              doc.text(
                String(rc.description).slice(0, 160) + (String(rc.description).length > 160 ? "…" : ""),
                scx, doc.y,
                { width: pw - 15, lineGap: 2 }
              );
            }
            doc.y += 2;
            doc.fontSize(7.5).fillColor(C.muted).font("Helvetica");
            const scCat  = String(rc.category || "");
            const scTier = rc.tier ? `  ·  Tier ${rc.tier}` : "";
            doc.text(`${scCat}${scTier}`, scx, doc.y);
            doc.y = Math.max(doc.y, scStart + MIN_SC_H) + 10;
          });
        }
      } else if (data.consultingReport) {
        const cr = data.consultingReport;
        sectionHeader(String(sNum++), "Root Cause Analysis");

        fieldLabel("Primary Root Cause");
        ensureSpace(60);
        const rcStartY   = doc.y;
        const primaryCol = FOURM[cr.primaryRootCause.category as FourMCategory] || C.secondary;

        doc.rect(ml, rcStartY, 4, 56).fill(primaryCol);
        const rx = ml + 14;
        doc.y = rcStartY + 2;

        doc.fontSize(12).fillColor(C.primary).font("Helvetica-Bold");
        doc.text(String(cr.primaryRootCause.name || "Unknown"), rx, doc.y, {
          width: pw - 18,
        });
        doc.y += 3;
        doc.fontSize(9).fillColor(C.text).font("Helvetica");
        doc.text(
          String(cr.primaryRootCause.description || "").slice(0, 220),
          rx, doc.y,
          { width: pw - 18, lineGap: 2 }
        );
        doc.y = Math.max(doc.y, rcStartY + 60) + 14;

        if (cr.secondaryRootCauses.length > 0) {
          fieldLabel("Contributing Root Causes");
          cr.secondaryRootCauses.slice(0, 4).forEach((rc, i) => {
            const MIN_SC_H = 40;
            ensureSpace(MIN_SC_H + 10);
            const scStart = doc.y;
            doc.rect(ml, scStart, 3, MIN_SC_H).fill(FOURM[rc.category as FourMCategory] || C.muted);
            const scx = ml + 11;
            doc.y = scStart + 2;

            doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
            doc.text(`${i + 1}. ${String(rc.name || "Unknown")}`, scx, doc.y, {
              width: pw - 15,
            });
            doc.y += 2;
            doc.fontSize(9).fillColor(C.text).font("Helvetica");
            doc.text(
              String(rc.description || "").slice(0, 160)
              + (String(rc.description || "").length > 160 ? "…" : ""),
              scx, doc.y,
              { width: pw - 15, lineGap: 2 }
            );
            doc.y = Math.max(doc.y, scStart + MIN_SC_H) + 10;
          });
        }
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 4 — CAUSAL CHAIN
      // ─────────────────────────────────────────────────────────────────
      const causalChains = mgd?.causalChains;
      if (Array.isArray(causalChains) && causalChains.length > 0) {
        sectionHeader(String(sNum++), "Causal Chain");

        const chain = causalChains[0];
        fieldLabel("Primary Failure Path");
        doc.fontSize(9).fillColor(C.muted).font("Helvetica");
        doc.text(
          "The following path shows how the identified root cause propagates through operations to produce the observed symptoms.",
          ml, doc.y,
          { width: pw, lineGap: 3 }
        );
        doc.y += 10;

        const steps: string[] = chain.chain || chain.steps || [];
        steps.forEach((step: string, i: number) => {
          const isFirst = i === 0;
          const isLast  = i === steps.length - 1;
          const stepH   = 24;
          ensureSpace(stepH + (isLast ? 0 : 14));

          const stepY = doc.y;
          const stepW = pw - 22;

          doc.roundedRect(ml, stepY, stepW, stepH, 3)
             .fill(isFirst ? C.primary + "12" : C.light);
          doc.roundedRect(ml, stepY, stepW, stepH, 3)
             .stroke(isFirst ? C.secondary + "66" : C.border)
             .lineWidth(0.4);

          doc.fontSize(9)
             .fillColor(isFirst ? C.primary : C.text)
             .font(isFirst ? "Helvetica-Bold" : "Helvetica");
          doc.text(String(step || ""), ml + 9, stepY + 7, { width: stepW - 18 });

          // Arrow connector
          if (!isLast) {
            doc.fontSize(10).fillColor(C.muted).font("Helvetica");
            doc.text("↓", ml + pw - 18, stepY + 6, { width: 16, align: "center" });
          }

          doc.y = stepY + stepH + 6;
        });

        if (chain.description) {
          doc.y += 4;
          fieldLabel("Chain Description");
          bodyText(String(chain.description));
        }
        doc.y += 4;
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 5 — COST SAVING OPPORTUNITIES  (premium white card design)
      // ─────────────────────────────────────────────────────────────────
      if (costSavings.length > 0) {
        sectionHeader(String(sNum++), "Cost Saving Opportunities");

        const uniqueCats = [...new Set(costSavings.map(s => s.category).filter(Boolean))].length;
        doc.fontSize(9).fillColor(C.muted).font("Helvetica");
        doc.text(
          `${costSavings.length} opportunit${costSavings.length !== 1 ? "ies" : "y"} identified`
          + (uniqueCats > 0 ? ` across ${uniqueCats} operational categor${uniqueCats !== 1 ? "ies" : "y"}` : "") + ".",
          ml, doc.y,
          { width: pw }
        );
        doc.y += 14;

        costSavings.forEach((opp, i) => {
          const MIN_CARD_H = 68;
          ensureSpace(MIN_CARD_H + 10);

          const cardY = doc.y;

          // White card with subtle border
          doc.roundedRect(ml, cardY, pw, MIN_CARD_H, 4).fill(C.white);
          doc.roundedRect(ml, cardY, pw, MIN_CARD_H, 4)
             .stroke(C.border).lineWidth(0.5);

          // Green left accent strip
          doc.roundedRect(ml, cardY, 4, MIN_CARD_H, 2).fill(C.success);

          // Card content
          const kx = ml + 16;
          const kw = pw - 20;

          // Number + title (left) and savings amount (right) on same row
          const titleY = cardY + 10;
          doc.y = titleY;

          // Savings amount — right-aligned, drawn first (doesn't affect cursor)
          if (opp.estimatedSavings) {
            doc.fontSize(10).fillColor(C.success).font("Helvetica-Bold");
            doc.text(String(opp.estimatedSavings), ml, titleY, {
              width: pw, align: "right",
            });
          }

          // Title — left
          doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
          doc.text(
            `${i + 1}.  ${String(opp.title || "Opportunity")}`,
            kx, titleY,
            { width: kw - (opp.estimatedSavings ? 110 : 0) }
          );

          // Description
          if (opp.description) {
            doc.y += 3;
            doc.fontSize(9).fillColor(C.text).font("Helvetica");
            doc.text(
              String(opp.description).slice(0, 160) + (String(opp.description).length > 160 ? "…" : ""),
              kx, doc.y,
              { width: kw, lineGap: 2 }
            );
          }

          // Meta row
          const metaParts: string[] = [];
          if (opp.category)  metaParts.push(String(opp.category));
          if ((opp as any).effort)    metaParts.push(`Effort: ${(opp as any).effort}`);
          if (opp.timeframe) metaParts.push(`Timeframe: ${opp.timeframe}`);
          if (metaParts.length > 0) {
            doc.y += 3;
            doc.fontSize(7.5).fillColor(C.muted).font("Helvetica");
            doc.text(metaParts.join("  ·  "), kx, doc.y, { width: kw });
          }

          // Ensure cursor is past the card
          doc.y = Math.max(doc.y, cardY + MIN_CARD_H) + 7;
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 6 — RISK PREDICTIONS
      // ─────────────────────────────────────────────────────────────────
      if (predictions.length > 0) {
        sectionHeader(String(sNum++), "Risk Predictions");

        doc.fontSize(9).fillColor(C.muted).font("Helvetica");
        doc.text(
          "The following risks are predicted based on the identified root causes and current operational signals.",
          ml, doc.y,
          { width: pw, lineGap: 3 }
        );
        doc.y += 12;

        predictions.forEach((pred, i) => {
          const MIN_PRED_H = 58;
          ensureSpace(MIN_PRED_H + 10);

          const isHigh     = String(pred.likelihood || "").toLowerCase() === "high";
          const borderCol  = isHigh ? C.danger
            : String(pred.likelihood || "").toLowerCase() === "medium" ? C.warning : C.muted;

          const predStartY = doc.y;

          // Card
          doc.roundedRect(ml, predStartY, pw, MIN_PRED_H, 4)
             .fill(isHigh ? "#fef2f2" : C.light);
          doc.roundedRect(ml, predStartY, pw, MIN_PRED_H, 4)
             .stroke(isHigh ? C.danger + "44" : C.border).lineWidth(0.5);
          doc.rect(ml, predStartY, 4, MIN_PRED_H).fill(borderCol);

          // Likelihood chip — top right
          const chipW  = 76;
          const chipH  = 14;
          const chipX  = ml + pw - chipW - 6;
          const chipCY = predStartY + 6;
          doc.save();
          doc.roundedRect(chipX, chipCY, chipW, chipH, 2).fill(borderCol + "1a");
          doc.roundedRect(chipX, chipCY, chipW, chipH, 2)
             .stroke(borderCol + "55").lineWidth(0.4);
          doc.fontSize(6.5).fillColor(borderCol).font("Helvetica-Bold");
          doc.text(
            `${safeUpper(pred.likelihood)} RISK`,
            chipX, chipCY + 4,
            { width: chipW, align: "center" }
          );
          doc.restore();

          const px = ml + 14;
          doc.y = predStartY + 8;

          doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
          doc.text(
            `${i + 1}.  ${String(pred.title || "Risk")}`,
            px, doc.y,
            { width: pw - chipW - 22 }
          );

          if (pred.description) {
            doc.y += 3;
            doc.fontSize(9).fillColor(C.text).font("Helvetica");
            doc.text(
              String(pred.description).slice(0, 180) + (String(pred.description).length > 180 ? "…" : ""),
              px, doc.y,
              { width: pw - 20, lineGap: 2 }
            );
          }

          if (pred.timeframe) {
            doc.y += 2;
            doc.fontSize(7.5).fillColor(C.muted).font("Helvetica");
            doc.text(`Timeframe: ${pred.timeframe}`, px, doc.y);
          }

          doc.y = Math.max(doc.y, predStartY + MIN_PRED_H) + 10;
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 7 — FINANCIAL IMPACT
      // ─────────────────────────────────────────────────────────────────
      const financialImpact = mgd?.financialImpact ?? data.consultingReport?.financialImpact;
      if (financialImpact) {
        sectionHeader(String(sNum++), "Financial Impact");

        const sevRaw  = String(financialImpact.estimatedSeverity || "");
        const sevCol  = SEV[sevRaw.toLowerCase()] || C.muted;
        const MIN_F_H = 40;
        ensureSpace(MIN_F_H + 10);
        const fiY = doc.y;

        doc.roundedRect(ml, fiY, pw, MIN_F_H, 4).fill(sevCol + "0e");
        doc.roundedRect(ml, fiY, pw, MIN_F_H, 4)
           .stroke(sevCol + "44").lineWidth(0.5);
        doc.rect(ml, fiY, 4, MIN_F_H).fill(sevCol);

        doc.y = fiY + 8;
        doc.fontSize(12).fillColor(sevCol).font("Helvetica-Bold");
        doc.text(
          safeUpper(financialImpact.estimatedSeverity) + "  Financial Severity",
          ml + 14, doc.y,
          { continued: false, width: pw - 18 }
        );

        const affectedCats = Array.isArray(financialImpact.affectedCategories)
          ? financialImpact.affectedCategories.join(", ") : "";
        if (affectedCats) {
          doc.y += 2;
          doc.fontSize(8.5).fillColor(C.muted).font("Helvetica");
          doc.text(`Affected areas: ${affectedCats}`, ml + 14, doc.y, { width: pw - 18 });
        }

        doc.y = Math.max(doc.y, fiY + MIN_F_H) + 12;

        if (Array.isArray(financialImpact.costDrivers) && financialImpact.costDrivers.length > 0) {
          fieldLabel("Cost Drivers");
          const driverText = financialImpact.costDrivers
            .map((d: unknown) =>
              String(d ?? "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
            )
            .join(", ");
          bodyText(driverText);
        }
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 8 — OPERATIONAL HEALTH SCORE
      // ─────────────────────────────────────────────────────────────────
      if (typeof healthScore === "number") {
        sectionHeader(String(sNum++), "Operational Health Score");

        const hsc   = healthScore >= 70 ? C.success : healthScore >= 40 ? C.warning : C.danger;
        const hslbl = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "At Risk" : "Critical";
        const hsdsc = healthScore >= 70
          ? "The organisation demonstrates healthy operational fundamentals. Minor improvements may still deliver meaningful efficiency gains."
          : healthScore >= 40
          ? "The organisation is operating under stress in one or more key areas. Targeted intervention is recommended."
          : "The organisation shows critical operational vulnerabilities. Immediate action is required to prevent further deterioration.";

        const MIN_HS_H = 60;
        ensureSpace(MIN_HS_H + 10);
        const hsY = doc.y;

        doc.roundedRect(ml, hsY, pw, MIN_HS_H, 4).fill(hsc + "0c");
        doc.roundedRect(ml, hsY, pw, MIN_HS_H, 4)
           .stroke(hsc + "44").lineWidth(0.5);
        doc.rect(ml, hsY, 4, MIN_HS_H).fill(hsc);

        doc.y = hsY + 6;
        doc.fontSize(30).fillColor(hsc).font("Helvetica-Bold");
        doc.text(String(healthScore), ml + 18, hsY + 6, { continued: true });
        doc.fontSize(12).fillColor(C.muted).font("Helvetica");
        doc.text(" / 100", { continued: true });
        doc.fontSize(13).fillColor(hsc).font("Helvetica-Bold");
        doc.text(`   ${hslbl}`, { width: pw - 70 });

        doc.y += 4;
        doc.fontSize(9).fillColor(C.text).font("Helvetica");
        doc.text(hsdsc, ml + 18, doc.y, { width: pw - 22, lineGap: 3 });

        doc.y = Math.max(doc.y, hsY + MIN_HS_H) + 12;
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 9 — TRANSFORMATION ROADMAP
      // ─────────────────────────────────────────────────────────────────
      const roadmap = mgd?.roadmap;
      if (Array.isArray(roadmap) && roadmap.length > 0) {
        sectionHeader(String(sNum++), "Transformation Roadmap");

        const phaseColors = [C.danger, C.warning, C.secondary, C.success, C.muted];
        roadmap.slice(0, 5).forEach((item: any, i: number) => {
          const MIN_RM_H = 50;
          ensureSpace(MIN_RM_H + 10);

          const rmStartY = doc.y;
          const phCol    = phaseColors[i] || C.muted;

          doc.roundedRect(ml, rmStartY, pw, MIN_RM_H, 4).fill(C.light);
          doc.roundedRect(ml, rmStartY, pw, MIN_RM_H, 4)
             .stroke(C.border).lineWidth(0.4);
          doc.rect(ml, rmStartY, 4, MIN_RM_H).fill(phCol);

          const rmx = ml + 14;
          doc.y = rmStartY + 6;

          doc.fontSize(8).fillColor(phCol).font("Helvetica-Bold");
          const phLabel = String(item.phase || item.priority || `Phase ${i + 1}`);
          doc.text(safeUpper(phLabel, `Phase ${i + 1}`), rmx, doc.y, {
            characterSpacing: 0.4,
          });
          doc.y += 2;

          doc.fontSize(10).fillColor(C.primary).font("Helvetica-Bold");
          doc.text(
            String(item.title || item.name || "Intervention"),
            rmx, doc.y,
            { width: pw - 20 }
          );

          const desc = String(item.description || item.action || "").slice(0, 150);
          if (desc) {
            doc.y += 2;
            doc.fontSize(8.5).fillColor(C.text).font("Helvetica");
            doc.text(desc, rmx, doc.y, { width: pw - 20, lineGap: 2 });
          }

          doc.y = Math.max(doc.y, rmStartY + MIN_RM_H) + 8;
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // SECTION 10 — INDUSTRY BENCHMARKS
      // ─────────────────────────────────────────────────────────────────
      const benchmarks = mgd?.benchmarks;
      if (Array.isArray(benchmarks) && benchmarks.length > 0) {
        sectionHeader(String(sNum++), "Industry Benchmarks");

        fieldLabel("Performance vs. Industry Standard");
        doc.y += 2;

        benchmarks.slice(0, 6).forEach((bm: any) => {
          ensureSpace(36);
          const bmY    = doc.y;
          const label  = String(bm.metric || bm.name || "Metric");
          const status = String(bm.status || bm.rating || "");
          const bmCol  = status === "good"  || status === "above" ? C.success
            : status === "below" || status === "poor"  ? C.danger
            : C.warning;

          // Background row
          doc.rect(ml, bmY, pw, 28).fill(bmY % 56 < 28 ? C.light : C.white);

          const val = bm.clientValue ? `  —  ${bm.clientValue}` : "";
          doc.y = bmY + 5;
          doc.fontSize(9).fillColor(C.text).font("Helvetica-Bold");
          doc.text(label, ml + 6, doc.y, { continued: !!val });
          if (val) {
            doc.font("Helvetica").fillColor(C.muted);
            doc.text(val);
          } else {
            doc.text("");
          }

          const avg = bm.industryAverage || bm.benchmark;
          if (avg) {
            doc.y += 1;
            doc.fontSize(7.5).fillColor(C.muted).font("Helvetica");
            doc.text(`Industry avg: ${avg}`, ml + 12, doc.y);
          }

          if (status) {
            doc.fontSize(7.5).fillColor(bmCol).font("Helvetica-Bold");
            doc.text(safeUpper(status), ml, bmY + 8, {
              width: pw - 6, align: "right",
            });
          }

          doc.y = Math.max(doc.y, bmY + 28) + 4;
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // CONSULTANT RECOMMENDATION BOX
      // Deterministic action-oriented recommendation derived from findings.
      // No AI generation — driven entirely by 4M category of top finding.
      // ─────────────────────────────────────────────────────────────────
      {
        const topFinding =
          findings.find(f => f.severity === "critical") ||
          findings.find(f => f.severity === "high")     ||
          findings[0];

        const categoryRec: Record<FourMCategory, string> = {
          Machinery:
            "Schedule a preventive maintenance review on all critical assets within the next 30 days. "
            + "Establish a recurring reliability audit to reduce unplanned downtime and extend asset lifecycle.",
          Manpower:
            "Prioritise workforce capability assessment, structured on-the-job training, and retention planning. "
            + "Address identified skill gaps within the next 60 days to reduce operational dependency risk.",
          Materials:
            "Audit materials procurement, incoming quality inspection, and inventory buffer levels. "
            + "Establish supplier performance metrics to prevent supply chain disruptions from recurring.",
          Money:
            "Implement cost control disciplines and financial monitoring processes within the next 30 days. "
            + "Review identified cost drivers and establish accountability for corrective action on margin leakage.",
        };

        const fallbackRec =
          "Develop a structured 30–60 day corrective action plan addressing the highest-priority findings. "
          + "Assign accountable owners to each root cause and establish a monthly review cadence to track progress.";

        const recText = topFinding && topFinding.fourMCategory
          ? (categoryRec[topFinding.fourMCategory] || fallbackRec)
          : fallbackRec;

        const MIN_REC_H = 80;
        ensureSpace(MIN_REC_H + 16);
        doc.y += 12;
        const recY = doc.y;

        // Container — warm off-white, feels like premium notepaper
        doc.roundedRect(ml, recY, pw, MIN_REC_H, 4).fill("#f8f7f4");
        doc.roundedRect(ml, recY, pw, MIN_REC_H, 4)
           .stroke("#ddd9d2").lineWidth(0.5);
        // Left accent strip — muted slate, not a loud brand colour
        doc.roundedRect(ml, recY, 4, MIN_REC_H, 2).fill(C.muted);

        const rlx = ml + 18;
        // Eyebrow — muted slate label
        doc.fontSize(7).fillColor(C.muted).font("Helvetica-Bold");
        doc.text("CONSULTANT RECOMMENDATION", rlx, recY + 12, {
          width: pw - 22, characterSpacing: 0.8,
        });

        // Recommendation body
        doc.y = recY + 26;
        doc.fontSize(9.5).fillColor(C.primary).font("Helvetica-Bold");
        const recTitle = topFinding
          ? `Re: ${String(topFinding.title || "Primary Finding").slice(0, 70)}`
          : "Priority Action";
        doc.text(recTitle, rlx, doc.y, { width: pw - 26 });

        doc.y += 4;
        doc.fontSize(9).fillColor(C.text).font("Helvetica");
        doc.text(recText, rlx, doc.y, { width: pw - 26, lineGap: 3 });

        doc.y = Math.max(doc.y, recY + MIN_REC_H) + 18;
      }

      // ─────────────────────────────────────────────────────────────────
      // CLOSING CTA
      // ─────────────────────────────────────────────────────────────────
      ensureSpace(55);
      doc.y += 10;
      doc.moveTo(ml, doc.y).lineTo(ml + pw, doc.y)
         .strokeColor(C.border).lineWidth(0.5).stroke();
      doc.y += 10;

      doc.fontSize(11).fillColor(C.primary).font("Helvetica-Bold");
      doc.text("Contact EDX for Implementation Support", ml, doc.y);
      doc.y += 6;
      doc.fontSize(9).fillColor(C.text).font("Helvetica");
      doc.text(
        "Our consultants are available to support implementation, capability building, and follow-up diagnostics.",
        ml, doc.y,
        { width: pw, lineGap: 2 }
      );
      doc.y += 8;
      doc.fontSize(9).fillColor(C.secondary).font("Helvetica");
      doc.text("consulting@edx.com  ·  www.edx-consulting.com", ml);

      // ─────────────────────────────────────────────────────────────────
      // FOOTER — body pages only (cover page has its own footer above)
      // Three zones: Left brand | Centre confidentiality | Right page num
      // ─────────────────────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      const totalPages = range.count - 1; // body pages only (exclude cover)

      for (let i = range.start + 1; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const fzW     = pw / 3;
        // Pin to a fixed distance from the page bottom edge — well clear of content
        const footerY = ph - mb - 18;

        // Thin rule above the footer band
        doc.moveTo(ml, footerY - 6)
           .lineTo(ml + pw, footerY - 6)
           .strokeColor(C.border).lineWidth(0.4).stroke();

        // LEFT — brand (bold) + optional website (light, same Y offset)
        doc.fontSize(7).fillColor(C.muted).font("Helvetica-Bold");
        doc.text("EDX Consulting", ml, footerY, { width: fzW });

        // CENTRE — confidentiality label only, no multi-line
        doc.fontSize(6.5).fillColor(C.muted).font("Helvetica");
        doc.text(
          "Confidential & Proprietary",
          ml + fzW, footerY,
          { width: fzW, align: "center" }
        );

        // RIGHT — Ref ID on first body page, page number on all
        const bodyPageNum = i - range.start; // 1-based body page index
        doc.fontSize(6.5).fillColor(C.muted).font("Helvetica");
        doc.text(
          `Page ${bodyPageNum} of ${totalPages}`,
          ml + fzW * 2, footerY,
          { width: fzW, align: "right" }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
