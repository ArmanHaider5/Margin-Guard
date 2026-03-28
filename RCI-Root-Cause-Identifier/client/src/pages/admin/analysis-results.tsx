import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  Clock,
  FileText,
  Lightbulb,
  Shield,
  Target,
  FolderOpen,
  Loader2,
  Download,
  ClipboardCheck,
  CheckCircle2,
  Activity,
  ArrowRight,
  Map,
  BarChart2,
  Layers,
  ChevronDown,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import type { ClientAnalysis, Client, FourMCategory } from "@shared/schema";
import { DiagnosticReportView } from "@/components/diagnostic-report-view";
import { composeDiagnosticReport } from "@shared/diagnostic-composer";
import type { RootCauseSelection, PrimaryContext } from "@shared/root-cause-library";
import HealthScoreGauge from "@/features/diagnostics/health-score-gauge";

const fourMColors: Record<FourMCategory, { bg: string; text: string; border: string }> = {
  Money: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  Materials: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  Manpower: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  Machinery: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
};

const severityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" },
  medium: { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-700 dark:text-yellow-300" },
  high: { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-300" },
  critical: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-700 dark:text-red-300" },
};

export default function AnalysisResults() {
  const { id } = useParams();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: analysis, isLoading } = useQuery<ClientAnalysis>({
    queryKey: ["/api/admin/analyses", id],
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/admin/clients", analysis?.clientId],
    enabled: !!analysis?.clientId,
  });

  // Export enables offline review and institutional reporting.
  const handleDownloadReport = async () => {
    if (!id || !client) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/admin/analyses/${id}/report`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate report");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const disposition = response.headers.get("Content-Disposition");
      let filename = `${client.name.replace(/[^a-zA-Z0-9]/g, '_')}_${analysis?.analysisType === "quick" ? "QuickAnalysis" : "DeepAnalysis"}_${new Date().toISOString().split('T')[0]}.pdf`;
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Report downloaded", description: filename });
    } catch (error) {
      toast({ 
        title: "Export failed", 
        description: error instanceof Error ? error.message : "Failed to download report",
        variant: "destructive" 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Derived data - safe to compute even if analysis is null
  const findings = analysis?.findings || [];
  const costSavings = analysis?.costSavingOpportunities || [];
  const predictions = analysis?.predictions || [];
  const mgd = (analysis as any)?.mgdAnalysis;

  // Compose diagnostic report from root cause selection for structured rendering
  // MUST be called unconditionally to satisfy React's rules of hooks
  const diagnosticReport = useMemo(() => {
    // Return null if no findings available
    if (!analysis || findings.length === 0) {
      return null;
    }

    // Build RootCauseSelection from findings for the composer
    const rootCauseSelection: RootCauseSelection = {
      categories: Object.entries(
        findings.reduce((acc, f) => {
          const cat = f.fourMCategory;
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push({
            id: f.id,
            title: f.title,
            category: cat,
            confidence: f.severity === "critical" ? 95 : f.severity === "high" ? 85 : f.severity === "medium" ? 70 : 55,
            intervention: "advisory" as const,
            symptoms: f.causes || [],
            archetypeIds: [],
            whyItMatters: f.description || "",
            interventionDirection: "",
            isOverridden: false,
          });
          return acc;
        }, {} as Record<string, any[]>)
      ).map(([name, causes]) => ({
        id: name.toLowerCase(),
        name: name as FourMCategory,
        causes,
      })),
      totalMatches: findings.length,
    };

    // Determine if documents were present based on documentIds array
    const hasDocuments = !!(analysis.documentIds && analysis.documentIds.length > 0);
    
    return composeDiagnosticReport({
      analysisMode: analysis.analysisType === "deep" ? "deep" : "quick",
      selectedRootCauses: rootCauseSelection,
      industry: client?.industry || "General",
      selectedContext: undefined,
      documentsPresent: hasDocuments,
    });
  }, [analysis, findings, client]);

  // Early returns AFTER all hooks are declared
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Analysis not found</h2>
          <Link href="/admin/clients">
            <Button variant="outline">Back to Clients</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isPipelineBlocked = findings.length === 0 && analysis.summary?.includes("Evidence pipeline not active");
  const isNoSignals = findings.length === 0 && analysis.summary?.includes("No operational or financial signals detected");

  if (!diagnosticReport && findings.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          {isPipelineBlocked ? (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Deep Diagnostic Blocked</h2>
              <p className="text-muted-foreground mb-4">
                Evidence pipeline not active. Connect signal extractor to enable Deep Diagnostic.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload processed documents and re-run this analysis to activate signal-driven diagnostics.
              </p>
            </>
          ) : isNoSignals ? (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Signals Detected</h2>
              <p className="text-muted-foreground mb-4">
                The signal extractor scanned your documents but found no actionable operational or financial signals.
              </p>
              <div className="text-left max-w-md mx-auto mb-4">
                <p className="text-sm font-medium mb-2">Categories scanned:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
                  <div>Ops — OTD, overtime, backlog</div>
                  <div>Maintenance — downtime, PM overdue</div>
                  <div>QC — rework, scrap, rejects</div>
                  <div>Finance — margin, cost overrun, cash flow</div>
                </div>
                <p className="text-sm font-medium mb-2">Example phrases that trigger detection:</p>
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded p-3 font-mono">
                  <div>"On-time delivery dropped to 72%"</div>
                  <div>"Overtime increased by 35%"</div>
                  <div>"Unplanned downtime — 14 hours last week"</div>
                  <div>"Reject rate at 8.2%"</div>
                  <div>"Margins shrinking due to raw material costs"</div>
                  <div>"Cash flow tight, short-term funding needed"</div>
                  <div>"PM overdue on 12 machines"</div>
                  <div>"Staff leaving — 5 resignations this quarter"</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Upload documents containing metrics, trends, or performance summaries to activate signal-driven diagnostics.
              </p>
            </>
          ) : (
            <>
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No diagnostic findings</h2>
              <p className="text-muted-foreground mb-4">This analysis has not produced any findings yet.</p>
            </>
          )}
          <Link href={`/admin/clients/${analysis.clientId}`}>
            <Button variant="outline">Back to Client</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const highCount = findings.filter(f => f.severity === "high").length;
  // mgdAnalysis.healthScore is { overallScore: number, riskLevel: string } — extract the numeric value
  const healthScore: number | null = mgd?.healthScore?.overallScore ?? null;
  const healthStatus = healthScore == null ? null : healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "At Risk" : "Critical";
  const healthStatusColors = {
    Healthy: { bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", score: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
    "At Risk": { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800", score: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
    Critical: { bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-800", score: "text-red-700 dark:text-red-300", badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  };
  const hc = healthStatus ? healthStatusColors[healthStatus] : null;
  const primaryCategory = findings[0]?.fourMCategory ?? null;
  const heroGradientStyle = healthStatus === "Healthy"
    ? { background: "linear-gradient(135deg, #ecfdf5 0%, #f8fafc 55%, #f0fdf4 100%)" }
    : healthStatus === "At Risk"
    ? { background: "linear-gradient(135deg, #fffbeb 0%, #f8fafc 55%, #fef9c3 100%)" }
    : healthStatus === "Critical"
    ? { background: "linear-gradient(135deg, #fef2f2 0%, #f8fafc 55%, #fff1f2 100%)" }
    : { background: "linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%)" };
  const healthStatusSubtext: Record<string, string> = {
    Healthy: "Operations within acceptable parameters.",
    "At Risk": "Moderate concerns require attention.",
    Critical: "Immediate intervention required.",
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-5xl mx-auto space-y-8">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Top bar: back nav + actions */}
        <div className="px-5 py-3 border-b bg-muted/20 flex items-center justify-between gap-3">
          <Link href={`/admin/clients/${analysis.clientId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-muted-foreground hover:text-foreground" data-testid="button-back">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Client
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {analysis.caseId && (
              <Link href={`/admin/cases/${analysis.caseId}`}>
                <Button variant="outline" size="sm" className="h-8" data-testid="button-view-case">
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                  View Case
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              onClick={handleDownloadReport}
              disabled={analysis.status !== "completed" || isDownloading}
              data-testid="button-download-report"
              title={analysis.status !== "completed" ? "Report available once analysis is complete" : "Download PDF report"}
              className={`h-8 gap-1.5 ${isDownloading ? "opacity-80" : ""}`}
            >
              {isDownloading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
              ) : (
                <><Download className="w-3.5 h-3.5" />Download Report</>
              )}
            </Button>
          </div>
        </div>

        {/* Report identity block */}
        <div className="px-6 pt-6 pb-5">
          {/* Eyebrow */}
          {client && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                {client.name}
              </span>
              {client.industry && (
                <>
                  <span className="text-muted-foreground/25">·</span>
                  <span className="text-[10px] font-medium text-muted-foreground/60 capitalize">
                    {client.industry.replace(/_/g, " ")}
                  </span>
                </>
              )}
              <span className="text-muted-foreground/25">·</span>
              <span className="text-[10px] font-medium text-muted-foreground/50">
                {formatDate(analysis.completedAt || analysis.createdAt)}
              </span>
            </div>
          )}
          <h1 className="text-[26px] font-bold tracking-tight text-foreground leading-tight mb-4" data-testid="text-analysis-title">
            {analysis.title}
          </h1>
          {/* Status chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border ${
              analysis.analysisType === "deep"
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-border"
            }`}>
              {analysis.analysisType === "deep" ? "Deep Diagnostic" : "Quick Analysis"}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border ${
              analysis.status === "completed"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                : "bg-muted text-muted-foreground border-border"
            }`} data-testid="text-mode-indicator">
              {analysis.status === "completed"
                ? <CheckCircle2 className="w-3 h-3" />
                : <Clock className="w-3 h-3" />}
              <span className="capitalize">{analysis.status}</span>
            </span>
            {analysis.isMockMode ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium border border-amber-200/60 dark:border-amber-800/40 px-2.5 py-1 rounded-md bg-amber-50/60 dark:bg-amber-950/20" data-testid="text-mock-mode">
                <AlertCircle className="w-3 h-3" />
                Baseline mode
              </span>
            ) : analysis.analysisMode === "evidence-enriched" ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-md bg-emerald-50/60 dark:bg-emerald-950/20" data-testid="text-signal-mode">
                <CheckCircle2 className="w-3 h-3" />
                Signal-driven
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── EXECUTIVE SUMMARY ──────────────────────────────────────── */}
      {analysis.summary && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Executive Summary</p>
          </div>
          <div className="px-6 py-6">
            <p className="text-[15px] leading-[1.75] text-foreground/90 font-medium border-l-2 border-primary/25 pl-4" data-testid="text-summary">
              {analysis.summary}
            </p>
          </div>
        </div>
      )}

      {/* ── HERO: HEALTH + KEY METRICS ─────────────────────────────── */}
      <div
        className={`rounded-2xl border-2 shadow-lg overflow-hidden ${hc ? hc.border : "border-border"}`}
        style={heroGradientStyle}
        data-testid="card-hero"
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-10">

            {/* LEFT — Health Score */}
            <div className="flex flex-col items-center gap-3 lg:w-64 shrink-0">
              <div className="scale-110 origin-top">
                <HealthScoreGauge score={healthScore ?? 0} />
              </div>
              {healthScore != null ? (
                <div className="text-center space-y-1.5">
                  <p className={`text-7xl font-black leading-none tracking-tight ${hc?.score ?? ""}`}>
                    {healthScore}
                    <span className="text-3xl font-bold opacity-40">/100</span>
                  </p>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold ${hc?.badge ?? ""}`}>
                      <span className={`w-2 h-2 rounded-full ${
                        healthStatus === "Healthy" ? "bg-emerald-500" :
                        healthStatus === "At Risk" ? "bg-amber-500" : "bg-red-500"
                      }`} />
                      {healthStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    {healthStatus ? healthStatusSubtext[healthStatus] : ""}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground font-medium">Health score unavailable</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Run Deep Diagnostic with documents</p>
                </div>
              )}
            </div>

            {/* DIVIDER */}
            <div className="hidden lg:block w-px self-stretch bg-border/50" />

            {/* RIGHT — KPI cards grid */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 w-full">

              {/* Total Issues */}
              <div className="bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="h-0.5 bg-orange-500" />
                <div className="p-5 flex flex-col gap-1 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Total Issues</p>
                  <p className="text-5xl font-black text-orange-600 dark:text-orange-400 leading-none tabular-nums" data-testid="text-findings-count">
                    {findings.length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2">root causes identified</p>
                </div>
              </div>

              {/* Critical Issues */}
              <div className="bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className={`h-0.5 ${criticalCount > 0 ? "bg-red-500" : "bg-border"}`} />
                <div className="p-5 flex flex-col gap-1 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Critical</p>
                  <p className={`text-5xl font-black leading-none tabular-nums ${criticalCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground/40"}`}>
                    {criticalCount}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2">{highCount} high severity</p>
                </div>
              </div>

              {/* Saving Opportunities */}
              <div className="bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className={`h-0.5 ${costSavings.length > 0 ? "bg-emerald-500" : "bg-border"}`} />
                <div className="p-5 flex flex-col gap-1 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Savings Found</p>
                  <p className={`text-5xl font-black leading-none tabular-nums ${costSavings.length > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/40"}`} data-testid="text-savings-count">
                    {costSavings.length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {predictions.length > 0 ? `${predictions.length} risk forecast${predictions.length !== 1 ? "s" : ""}` : "opportunities"}
                  </p>
                </div>
              </div>

              {/* Lead Category */}
              <div className="bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className={`h-0.5 ${
                  primaryCategory === "Money" ? "bg-amber-500" :
                  primaryCategory === "Manpower" ? "bg-blue-500" :
                  primaryCategory === "Materials" ? "bg-purple-500" :
                  primaryCategory === "Machinery" ? "bg-slate-500" : "bg-border"
                }`} />
                <div className="p-5 flex flex-col gap-1 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Lead Category</p>
                  {primaryCategory ? (
                    <>
                      <p className={`text-2xl font-black leading-tight ${fourMColors[primaryCategory as FourMCategory]?.text ?? "text-foreground"}`}>
                        {primaryCategory}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-2">highest-impact 4M domain</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-black text-muted-foreground/30 leading-tight">—</p>
                      <p className="text-[11px] text-muted-foreground mt-2">no findings yet</p>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* PRIMARY SECTION HEADER — Diagnostic Findings */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Root Cause Analysis</p>
            </div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Diagnostic Findings</h2>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-foreground tabular-nums">{findings.length}</p>
            <p className="text-[11px] text-muted-foreground">finding{findings.length !== 1 ? "s" : ""} identified</p>
          </div>
        </div>
        <div className="space-y-4">
          {findings.map((finding, idx) => {
            const colors = fourMColors[finding.fourMCategory] || fourMColors.Money;
            const isIndicative = finding.collapsedNote?.includes("guided validation") || finding.title?.startsWith("[NEEDS VALIDATION]");
            const evidenceStrengthColors: Record<string, { bg: string; text: string; label: string }> = {
              STRONG: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Strong evidence" },
              MODERATE: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Moderate evidence" },
              WEAK: { bg: isIndicative ? "bg-orange-100 dark:bg-orange-900/30" : "bg-gray-100 dark:bg-gray-800", text: isIndicative ? "text-orange-700 dark:text-orange-300" : "text-gray-600 dark:text-gray-400", label: isIndicative ? "Needs Validation" : "Weak evidence" },
            };
            const esStyle = finding.evidenceStrength ? evidenceStrengthColors[finding.evidenceStrength] : null;
            const hasSignals = finding.evidenceAnchors && finding.evidenceAnchors.length > 0;
            const hasAnyConcreteOutput = hasSignals || (finding.impactObserved && finding.impactObserved.length > 0);
            const noSignalsFallback = !hasAnyConcreteOutput && finding.evidenceStrength === "WEAK";
            const severityBorderColor =
              finding.severity === "critical" ? "#ef4444" :
              finding.severity === "high" ? "#f97316" :
              finding.severity === "medium" ? "#eab308" : "#9ca3af";
            const severityBadgeClass =
              finding.severity === "critical" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" :
              finding.severity === "high" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
              finding.severity === "medium" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" :
              "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
            const severityTintBg =
              finding.severity === "critical" ? "bg-red-50/40 dark:bg-red-950/20" :
              finding.severity === "high" ? "bg-orange-50/40 dark:bg-orange-950/20" :
              finding.severity === "medium" ? "bg-yellow-50/30 dark:bg-yellow-950/10" :
              "bg-card";
            const evidenceCount = finding.evidenceAnchors?.length ?? 0;
            return (
              <div
                key={finding.id || idx}
                className={`rounded-xl border shadow-sm overflow-hidden ${severityTintBg}`}
                style={{ borderLeftWidth: "4px", borderLeftColor: severityBorderColor }}
              >
                {/* Card header band */}
                <div className="px-5 pt-4 pb-3 border-b border-border/60 bg-muted/20 flex items-start gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40 pt-0.5 shrink-0 w-7 text-right">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[16px] leading-snug text-foreground mb-2">{finding.evidenceLedTitle || finding.title}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={`${colors.bg} ${colors.text} text-[11px] font-semibold`}>{finding.fourMCategory}</Badge>
                      <Badge className={`${severityBadgeClass} text-[11px] font-semibold uppercase`}>{finding.severity}</Badge>
                      {esStyle && (
                        <Badge className={`${esStyle.bg} ${esStyle.text} text-[11px]`}>
                          {esStyle.label}
                        </Badge>
                      )}
                      {evidenceCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/80 text-[11px] text-muted-foreground font-medium">
                          <FileText className="w-2.5 h-2.5" />
                          {evidenceCount} evidence signal{evidenceCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {(finding as any).confidence && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/80 text-[11px] text-muted-foreground font-medium">
                          {Math.round((finding as any).confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-5 py-4 space-y-3.5 text-sm">
                  {hasSignals && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> Supporting Evidence
                      </p>
                      <ul className="space-y-1.5 ml-4">
                        {finding.evidenceAnchors!.map((anchor: any, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                            <span>
                              <span className="font-medium text-foreground">{anchor.signal}</span>
                              <span className="text-xs text-muted-foreground/60 ml-1.5">({anchor.documentName})</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {finding.insightNote && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Target className="w-3 h-3" /> Insight
                      </p>
                      <p className="text-muted-foreground leading-relaxed ml-4">{finding.insightNote}</p>
                    </div>
                  )}

                  {!finding.insightNote && finding.causes && finding.causes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Target className="w-3 h-3" /> Insight
                      </p>
                      <ul className="space-y-1 ml-4">
                        {finding.causes.map((cause: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                            <span className="text-muted-foreground">{cause}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {finding.impactObserved && finding.impactObserved.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" /> Estimated Impact
                      </p>
                      <ul className="space-y-1 ml-4">
                        {finding.impactObserved.map((bullet: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                            <span className="text-muted-foreground">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {finding.estimatedCostImpact && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Estimated Impact:</span>
                      <span className="text-sm font-semibold text-foreground">{finding.estimatedCostImpact}</span>
                    </div>
                  )}

                    {finding.whatToValidateNext && finding.whatToValidateNext.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 flex items-center gap-1.5">
                          <ClipboardCheck className="w-3 h-3" /> What to Validate Next
                        </p>
                        <ul className="space-y-1 ml-4">
                          {finding.whatToValidateNext.map((doc: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                              <span className="text-xs text-muted-foreground">{doc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {noSignalsFallback && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                          No concrete operational or financial signals extracted yet. Upload Ops, Finance, or Maintenance records to strengthen this finding.
                        </p>
                      </div>
                    )}

                    {finding.collapsedNote && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                        {finding.collapsedNote}
                      </p>
                    )}
                  </div>
              </div>
            );
          })}
          {findings.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No findings available</p>
          )}
        </div>
      </div>

      {costSavings.length > 0 && (
        <div>
          <div className="flex items-center justify-between pb-3 border-b mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Cost Saving Opportunities</h2>
            </div>
            <span className="text-xs text-muted-foreground">{costSavings.length} identified</span>
          </div>
          <div className="space-y-4">
            {costSavings.map((opp, idx) => (
              <div key={opp.id || idx} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                          <Lightbulb className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="font-bold text-[15px] leading-snug">{opp.title}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-2.5 pl-9">{opp.description}</p>
                      <div className="flex items-center gap-2 pl-9">
                        <Badge
                          variant="outline"
                          className={
                            opp.implementationEffort === "low" ? "border-emerald-300 text-emerald-700 dark:text-emerald-400 text-[11px]" :
                            opp.implementationEffort === "high" ? "border-orange-300 text-orange-700 dark:text-orange-400 text-[11px]" :
                            "text-[11px]"
                          }
                        >
                          {opp.implementationEffort} effort
                        </Badge>
                        {(opp as any).category && (
                          <Badge variant="secondary" className="text-[11px]">{(opp as any).category}</Badge>
                        )}
                        {(opp as any).type && (
                          <Badge variant="secondary" className="text-[11px]">{(opp as any).type}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-4 border-l border-border/60 ml-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Est. Annual Savings</p>
                      <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{opp.estimatedSavings}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {predictions.length > 0 && (
        <div>
          <div className="flex items-center justify-between pb-3 border-b mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Risk Predictions</h2>
            </div>
            <span className="text-xs text-muted-foreground" data-testid="text-predictions-count">{predictions.length} forecast{predictions.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-4">
            {predictions.map((pred, idx) => {
              const isHighRisk = pred.likelihood === "high";
              const isMedRisk = pred.likelihood === "medium";
              const likelihoodBadge =
                isHighRisk ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200" :
                isMedRisk ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200" :
                "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200";
              const iconBg =
                isHighRisk ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" :
                isMedRisk ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" :
                "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400";
              const cardBorder = isHighRisk ? "border-red-200/60 dark:border-red-800/40" : "border-border";
              const cardBg = isHighRisk ? "bg-red-50/30 dark:bg-red-950/10" : "bg-card";
              return (
                <div key={pred.id || idx} className={`rounded-xl border shadow-sm overflow-hidden ${cardBorder} ${cardBg}`}>
                  {isHighRisk && <div className="h-0.5 bg-gradient-to-r from-red-400 to-red-600" />}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                        <AlertTriangle className="w-4.5 h-4.5" style={{ width: "1.125rem", height: "1.125rem" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[15px] leading-snug mb-2.5">{pred.issue}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${likelihoodBadge} text-[11px] font-semibold`}>
                            {isHighRisk ? "⚠ " : ""}{pred.likelihood} likelihood
                          </Badge>
                          {pred.expectedTimeframe && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/80 text-[11px] text-muted-foreground font-medium">
                              <Clock className="w-2.5 h-2.5" />
                              {pred.expectedTimeframe}
                            </span>
                          )}
                        </div>
                        {(pred as any).description && (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {(pred as any).description}
                          </p>
                        )}
                        {(pred as any).notes && (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">
                            {(pred as any).notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RECOMMENDED NEXT ACTIONS ────────────────────────────────── */}
      {mgd?.nextActions && (mgd.nextActions.immediate?.length > 0 || mgd.nextActions.thirtyDay?.length > 0) && (
        <Card data-testid="card-next-actions">
          <div className="px-6 pt-5 pb-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Recommended Next Actions</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {(mgd.nextActions.immediate?.length ?? 0) + (mgd.nextActions.thirtyDay?.length ?? 0) + (mgd.nextActions.sixtyNinetyDay?.length ?? 0)} actions across 90 days
            </span>
          </div>
          <div className="p-6 space-y-6">
            {mgd.nextActions.summary && (
              <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/25 pl-4">
                {mgd.nextActions.summary}
              </p>
            )}

            {/* This Week */}
            {mgd.nextActions.immediate?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-600 dark:text-red-400">This Week</span>
                  <div className="flex-1 h-px bg-red-200 dark:bg-red-900/50" />
                  <span className="text-[10px] text-muted-foreground">{mgd.nextActions.immediate.length} action{mgd.nextActions.immediate.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2.5">
                  {mgd.nextActions.immediate.map((action: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg border border-border/60 bg-red-50/30 dark:bg-red-950/10" style={{ borderLeftWidth: "3px", borderLeftColor: action.priority === "critical" ? "#ef4444" : "#f97316" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <Badge className={`text-[10px] font-semibold ${action.priority === "critical" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"}`}>
                            {action.priority}
                          </Badge>
                          {action.category && (
                            <Badge variant="outline" className="text-[10px]">{action.category}</Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] capitalize">{action.type?.replace(/-/g, " ")}</Badge>
                        </div>
                        <p className="font-semibold text-sm text-foreground leading-snug mb-1">{action.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 30-Day Actions */}
            {mgd.nextActions.thirtyDay?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">30-Day Stabilisation</span>
                  <div className="flex-1 h-px bg-amber-200 dark:bg-amber-900/50" />
                  <span className="text-[10px] text-muted-foreground">{mgd.nextActions.thirtyDay.length} action{mgd.nextActions.thirtyDay.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2.5">
                  {mgd.nextActions.thirtyDay.map((action: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg border border-border/60 bg-amber-50/20 dark:bg-amber-950/10" style={{ borderLeftWidth: "3px", borderLeftColor: "#f59e0b" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <Badge className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">high</Badge>
                          {action.category && (
                            <Badge variant="outline" className="text-[10px]">{action.category}</Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] capitalize">{action.type?.replace(/-/g, " ")}</Badge>
                        </div>
                        <p className="font-semibold text-sm text-foreground leading-snug mb-1">{action.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 60-90-Day Actions */}
            {mgd.nextActions.sixtyNinetyDay?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">60–90 Day Structural Fixes</span>
                  <div className="flex-1 h-px bg-blue-200 dark:bg-blue-900/50" />
                  <span className="text-[10px] text-muted-foreground">{mgd.nextActions.sixtyNinetyDay.length} action{mgd.nextActions.sixtyNinetyDay.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2.5">
                  {mgd.nextActions.sixtyNinetyDay.map((action: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg border border-border/60 bg-blue-50/20 dark:bg-blue-950/10" style={{ borderLeftWidth: "3px", borderLeftColor: "#3b82f6" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <Badge className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">medium</Badge>
                          {action.category && (
                            <Badge variant="outline" className="text-[10px]">{action.category}</Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] capitalize">{action.type?.replace(/-/g, " ")}</Badge>
                        </div>
                        <p className="font-semibold text-sm text-foreground leading-snug mb-1">{action.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── CAUSAL CHAIN ───────────────────────────────────────────── */}
      <Card data-testid="card-causal-chain">
        <div className="p-6">
          <div className="flex items-center justify-between pb-3 border-b mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Causal Chain</h2>
            </div>
          </div>
          {mgd?.causalChains?.length > 0 ? (
            <div className="space-y-4">
              {mgd.causalChains.map((c: any, i: number) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  {c.chain.map((step: string, j: number) => (
                    <span key={j} className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3.5 py-2 rounded-lg border border-border bg-muted/60 text-sm font-medium text-foreground shadow-sm">
                        {step}
                      </span>
                      {j < c.chain.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-primary/60 shrink-0" />
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-8 text-center">
              <div className="w-10 h-10 rounded-xl border border-border bg-background flex items-center justify-center mx-auto mb-4 shadow-sm">
                <ArrowRight className="w-4.5 h-4.5 text-muted-foreground/60" style={{ width: "1.125rem", height: "1.125rem" }} />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Causal Chain Not Generated</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Causal chains are derived from real signal extraction across uploaded operational documents. They show how individual root causes connect and compound.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60 bg-muted/40 border border-border/50 px-3 py-1 rounded-full">
                <span>Available with Deep Diagnostic + Document Upload</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* FINANCIAL IMPACT */}
      <Card className="overflow-hidden" data-testid="card-financial-impact">
        <div className="px-6 pt-5 pb-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Financial Impact</h2>
          </div>
        </div>
        <div className="p-6">
        {mgd?.financialImpact ? (
          <div className="space-y-4">
            {/* Confidence / severity badge row */}
            {(mgd.financialImpact.confidenceLevel || mgd.financialImpact.estimatedSeverity) && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-40 shrink-0">Estimate Confidence</span>
                {mgd.financialImpact.confidenceLevel ? (
                  <Badge variant={
                    mgd.financialImpact.confidenceLevel === "estimated"  ? "default" :
                    mgd.financialImpact.confidenceLevel === "indicative" ? "secondary" : "outline"
                  }>
                    {mgd.financialImpact.confidenceLevel === "estimated"  ? "Signal-Driven Estimate" :
                     mgd.financialImpact.confidenceLevel === "indicative" ? "Indicative Range" : "Modelled Estimate"}
                  </Badge>
                ) : (
                  <Badge variant={
                    mgd.financialImpact.estimatedSeverity === "critical" ? "destructive" :
                    mgd.financialImpact.estimatedSeverity === "high" ? "default" : "secondary"
                  }>
                    {mgd.financialImpact.estimatedSeverity}
                  </Badge>
                )}
              </div>
            )}

            {/* Legacy: affected categories */}
            {mgd.financialImpact.affectedCategories?.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-sm text-muted-foreground w-40 shrink-0">Affected Categories</span>
                <div className="flex flex-wrap gap-2">
                  {mgd.financialImpact.affectedCategories.map((cat: string, i: number) => {
                    const catColors = fourMColors[cat as FourMCategory] || { bg: "bg-muted", text: "text-muted-foreground", border: "" };
                    return (
                      <Badge key={i} className={`${catColors.bg} ${catColors.text}`}>{cat}</Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legacy: cost drivers */}
            {mgd.financialImpact.costDrivers?.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Cost Drivers</p>
                <ul className="space-y-1">
                  {mgd.financialImpact.costDrivers.map((driver: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>{driver}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cost breakdown grid */}
            {(mgd.financialImpact.totalLoss != null && mgd.financialImpact.totalLoss > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                {/* Downtime loss */}
                {(mgd.financialImpact.downtimeLoss ?? 0) > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Downtime Loss</p>
                    <p className="font-semibold text-sm">RM {Number(mgd.financialImpact.downtimeLoss).toLocaleString()}</p>
                  </div>
                )}
                {/* Quality loss (new) or legacy scrap loss */}
                {((mgd.financialImpact.qualityLoss ?? mgd.financialImpact.scrapLoss) ?? 0) > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Quality / Scrap Loss</p>
                    <p className="font-semibold text-sm">RM {Number(mgd.financialImpact.qualityLoss ?? mgd.financialImpact.scrapLoss).toLocaleString()}</p>
                  </div>
                )}
                {/* Workforce loss (new) or legacy overtime cost */}
                {((mgd.financialImpact.workforceLoss ?? mgd.financialImpact.overtimeCost) ?? 0) > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Workforce / Overtime</p>
                    <p className="font-semibold text-sm">RM {Number(mgd.financialImpact.workforceLoss ?? mgd.financialImpact.overtimeCost).toLocaleString()}</p>
                  </div>
                )}
                {/* Supply chain loss (new) */}
                {(mgd.financialImpact.supplyChainLoss ?? 0) > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Supply Chain Loss</p>
                    <p className="font-semibold text-sm">RM {Number(mgd.financialImpact.supplyChainLoss).toLocaleString()}</p>
                  </div>
                )}
                {/* Total */}
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3">
                  <p className="text-xs text-orange-600 dark:text-orange-400">Total Estimated Loss</p>
                  <p className="font-bold text-sm text-orange-700 dark:text-orange-300">RM {Number(mgd.financialImpact.totalLoss).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-8 text-center">
            <div className="w-10 h-10 rounded-xl border border-border bg-background flex items-center justify-center mx-auto mb-4 shadow-sm">
              <DollarSign className="w-4.5 h-4.5 text-muted-foreground/60" style={{ width: "1.125rem", height: "1.125rem" }} />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Financial Impact Not Quantified</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Financial impact data is generated from uploaded Finance, Maintenance, or Production records. This includes downtime losses, scrap costs, and total estimated impact.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60 bg-muted/40 border border-border/50 px-3 py-1 rounded-full">
              <span>Available with Deep Diagnostic + Financial Documents</span>
            </div>
          </div>
        )}
        </div>
      </Card>

      {/* TRANSFORMATION ROADMAP */}
      {mgd?.roadmap && (
        <Card data-testid="card-roadmap">
          <div className="px-6 pt-5 pb-3 border-b flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
              <Map className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Transformation Roadmap</h2>
          </div>
          <div className="p-6">
          {Array.isArray(mgd.roadmap) ? (
            <div className="space-y-3">
              {mgd.roadmap.map((step: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    {typeof step === "string" ? (
                      <p className="text-sm">{step}</p>
                    ) : (
                      <>
                        {step.phase && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{step.phase}</p>}
                        {step.title && <p className="font-medium text-sm">{step.title}</p>}
                        {step.description && <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>}
                        {step.actions?.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {step.actions.map((a: string, j: number) => (
                              <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="mt-0.5 shrink-0">•</span>{a}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : typeof mgd.roadmap === "object" ? (
            <div className="space-y-4">
              {Object.entries(mgd.roadmap).map(([phase, content]: [string, any]) => (
                <div key={phase} className="border rounded-lg p-4">
                  <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">{phase}</p>
                  {Array.isArray(content) ? (
                    <ul className="space-y-1">
                      {content.map((item: any, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-1.5">
                          <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
                          {typeof item === "string" ? item : item.title || item.action || JSON.stringify(item)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{String(content)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{String(mgd.roadmap)}</p>
          )}
          </div>
        </Card>
      )}

      {/* INDUSTRY BENCHMARKS */}
      {mgd?.benchmarks && (
        <Card data-testid="card-benchmarks">
          <div className="px-6 pt-5 pb-3 border-b flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
              <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Industry Benchmarks</h2>
          </div>
          <div className="p-6">
          {Array.isArray(mgd.benchmarks) && mgd.benchmarks.length > 0 ? (
            <div className="space-y-3">
              {mgd.benchmarks.map((bm: any, i: number) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{bm.kpi || bm.name || bm.metric || Object.keys(bm)[0]}</p>
                    {bm.description && <p className="text-xs text-muted-foreground mt-0.5">{bm.description}</p>}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {bm.company != null && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Company</p>
                        <p className="text-sm font-semibold">{bm.company}{bm.unit || ""}</p>
                      </div>
                    )}
                    {bm.industry != null && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Industry</p>
                        <p className="text-sm font-semibold text-primary">{bm.industry}{bm.unit || ""}</p>
                      </div>
                    )}
                    {bm.gap != null && (
                      <Badge variant={Number(bm.gap) < 0 ? "destructive" : "secondary"} className="text-xs">
                        Gap: {bm.gap}{bm.unit || ""}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : typeof mgd.benchmarks === "object" ? (
            <div className="space-y-2">
              {Object.entries(mgd.benchmarks).map(([key, val]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{key}</span>
                  <span className="text-sm font-medium">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No benchmark data available</p>
          )}
          </div>
        </Card>
      )}

      {/* MGD COST SAVINGS */}
      {mgd?.savings && (
        <Card data-testid="card-mgd-savings">
          <div className="px-6 pt-5 pb-3 border-b flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight">MGD Cost Savings</h2>
          </div>
          <div className="p-6">
          {Array.isArray(mgd.savings) && mgd.savings.length > 0 ? (
            <div className="space-y-3">
              {mgd.savings.map((s: any, i: number) => (
                <div key={i} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/40">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.title || s.description || s.area || `Saving opportunity ${i + 1}`}</p>
                    {s.description && s.title && (
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                    )}
                    {s.category && (
                      <Badge variant="outline" className="mt-1 text-xs">{s.category}</Badge>
                    )}
                  </div>
                  {s.estimatedSavings && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{s.estimatedSavings}</p>
                      {s.implementationEffort && (
                        <p className="text-xs text-muted-foreground">{s.implementationEffort} effort</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : typeof mgd.savings === "object" ? (
            <div className="space-y-2">
              {Object.entries(mgd.savings).map(([key, val]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{key}</span>
                  <span className="text-sm font-medium">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No savings data available</p>
          )}
          </div>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground/50 pt-2">
        Analysis completed: {formatDate(analysis.completedAt)}
      </div>
    </div>
  );
}
