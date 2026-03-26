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
  const healthScore = mgd?.healthScore ?? null;
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
    <div className="p-6 space-y-10">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Link href={`/admin/clients/${analysis.clientId}`}>
          <Button variant="ghost" size="icon" className="mt-1 shrink-0" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight" data-testid="text-analysis-title">
            {analysis.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
            {client && (
              <span className="text-base text-muted-foreground font-medium">{client.name}</span>
            )}
            <span className="text-muted-foreground/40 hidden sm:inline">·</span>
            <Badge variant="outline" className="capitalize text-xs px-2.5 py-0.5">
              {analysis.analysisType === "deep" ? "Deep Diagnostic" : "Quick Analysis"}
            </Badge>
            <Badge
              variant={analysis.status === "completed" ? "default" : "secondary"}
              className="capitalize text-xs px-2.5 py-0.5"
            >
              {analysis.status}
            </Badge>
            {analysis.confidence && (
              <Badge
                variant={analysis.confidence === "preliminary" ? "secondary" : analysis.confidence === "low" ? "outline" : "default"}
                className="text-xs px-2.5 py-0.5"
                data-testid="badge-confidence"
              >
                {analysis.confidence === "preliminary" ? "Preliminary" : analysis.confidence === "low" ? "Low Confidence" : "Substantiated"}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{formatDate(analysis.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {analysis.caseId && (
            <Link href={`/admin/cases/${analysis.caseId}`}>
              <Button variant="outline" size="sm" data-testid="button-view-case">
                <FolderOpen className="w-4 h-4 mr-2" />
                View Case
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            className={`font-semibold transition-all ${
              isDownloading ? "opacity-80" : ""
            } ${
              analysis.status !== "completed"
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            onClick={handleDownloadReport}
            disabled={analysis.status !== "completed" || isDownloading}
            data-testid="button-download-report"
            title={
              analysis.status !== "completed"
                ? "Report available once analysis is complete"
                : "Download PDF report"
            }
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── MODE INDICATOR ─────────────────────────────────────────── */}
      <Card className="border-l-4 border-l-primary bg-primary/[0.03]" data-testid="card-mode-indicator">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold" data-testid="text-mode-indicator">
              {analysis.analysisMode === "baseline"
                ? "Baseline — Preliminary Pattern Analysis"
                : "Deep Diagnostic — Evidence-Enriched Analysis"}
            </span>
          </div>
          {analysis.isMockMode ? (
            <div className="flex items-center gap-1.5 text-muted-foreground" data-testid="text-mock-mode">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">Baseline pattern mode. Upload documents for signal-driven analysis.</span>
            </div>
          ) : analysis.analysisMode === "evidence-enriched" ? (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400" data-testid="text-signal-mode">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">Document-derived signals active.</span>
            </div>
          ) : null}
        </div>
      </Card>

      {/* ── EXECUTIVE SUMMARY ──────────────────────────────────────── */}
      {analysis.summary && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20">
          <div className="p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2 className="text-base font-semibold text-foreground uppercase tracking-wide">
                Executive Summary
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80 pl-7" data-testid="text-summary">
              {analysis.summary}
            </p>
          </div>
        </Card>
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
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 w-full">

              {/* Total Issues */}
              <div className="bg-background/70 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Issues</p>
                <p className="text-5xl font-extrabold text-orange-600 dark:text-orange-400 leading-none" data-testid="text-findings-count">
                  {findings.length}
                </p>
                <p className="text-xs text-muted-foreground">root causes identified</p>
              </div>

              {/* Critical Issues */}
              <div className="bg-background/70 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Critical Issues</p>
                <p className="text-5xl font-extrabold text-red-600 dark:text-red-400 leading-none">
                  {criticalCount}
                </p>
                <p className="text-xs text-muted-foreground">{highCount} high severity</p>
              </div>

              {/* Saving Opportunities */}
              <div className="bg-background/70 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Saving Opportunities</p>
                <p className="text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none" data-testid="text-savings-count">
                  {costSavings.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {predictions.length > 0 ? `${predictions.length} risk forecast${predictions.length !== 1 ? "s" : ""}` : "see breakdown below"}
                </p>
              </div>

              {/* Primary Category */}
              <div className="bg-background/70 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Category</p>
                {primaryCategory ? (
                  <>
                    <p className={`text-2xl font-extrabold leading-tight ${fourMColors[primaryCategory as FourMCategory]?.text ?? "text-foreground"}`}>
                      {primaryCategory}
                    </p>
                    <p className="text-xs text-muted-foreground">highest-impact 4M domain</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-extrabold text-muted-foreground/40 leading-tight">—</p>
                    <p className="text-xs text-muted-foreground">no findings yet</p>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── CAUSAL CHAIN ───────────────────────────────────────────── */}
      <Card data-testid="card-causal-chain">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
            <h2 className="text-base font-semibold text-foreground uppercase tracking-wide">
              Causal Chain
            </h2>
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No causal chain available for this analysis.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Run a Deep Diagnostic with uploaded documents to generate causal chains.</p>
            </div>
          )}
        </div>
      </Card>


      <div>
        <div className="flex items-center gap-2.5 mb-5">
          <AlertTriangle className="w-5 h-5 text-muted-foreground shrink-0" />
          <h2 className="text-base font-semibold text-foreground uppercase tracking-wide">
            Diagnostic Findings
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">{findings.length} finding{findings.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="space-y-5">
          {findings.map((finding, idx) => {
            const colors = fourMColors[finding.fourMCategory] || fourMColors.Money;
            const isIndicative = finding.collapsedNote?.includes("guided validation") || finding.title?.startsWith("[NEEDS VALIDATION]");
            const evidenceStrengthColors: Record<string, { bg: string; text: string; label: string }> = {
              STRONG: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Strong" },
              MODERATE: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Moderate" },
              WEAK: { bg: isIndicative ? "bg-orange-100 dark:bg-orange-900/30" : "bg-gray-100 dark:bg-gray-800", text: isIndicative ? "text-orange-700 dark:text-orange-300" : "text-gray-600 dark:text-gray-400", label: isIndicative ? "Needs Validation" : "Weak" },
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
              finding.severity === "critical" ? "bg-red-50/60 dark:bg-red-950/20" :
              finding.severity === "high" ? "bg-orange-50/60 dark:bg-orange-950/20" :
              finding.severity === "medium" ? "bg-yellow-50/40 dark:bg-yellow-950/10" :
              "bg-card";
            const evidenceCount = finding.evidenceAnchors?.length ?? 0;
            return (
              <div
                key={finding.id || idx}
                className={`rounded-xl border shadow-sm overflow-hidden ${severityTintBg}`}
                style={{ borderLeftWidth: "4px", borderLeftColor: severityBorderColor }}
              >
                <div className="p-5">
                  <div className="flex items-start gap-2 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 shrink-0">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-semibold text-sm leading-snug">{finding.evidenceLedTitle || finding.title}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`${colors.bg} ${colors.text} text-[11px]`}>{finding.fourMCategory}</Badge>
                        <Badge className={`${severityBadgeClass} text-[11px]`}>{finding.severity}</Badge>
                        {esStyle && (
                          <Badge className={`${esStyle.bg} ${esStyle.text} text-[11px]`}>
                            {esStyle.label}
                          </Badge>
                        )}
                        {evidenceCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/80 text-[11px] text-muted-foreground font-medium">
                            <FileText className="w-2.5 h-2.5" />
                            {evidenceCount} evidence
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

                  <div className="space-y-3 text-sm">
                    {hasSignals && (
                      <div>
                        <p className="font-medium mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Supporting Evidence
                        </p>
                        <ul className="space-y-1 ml-5">
                          {finding.evidenceAnchors!.map((anchor: any, i: number) => (
                            <li key={i} className="list-disc text-muted-foreground">
                              <span className="font-medium text-foreground">{anchor.signal}</span>
                              <span className="text-xs ml-1">({anchor.documentName})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {finding.insightNote && (
                      <div>
                        <p className="font-medium mb-1 flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-muted-foreground" /> Insight
                        </p>
                        <p className="text-muted-foreground ml-5">{finding.insightNote}</p>
                      </div>
                    )}

                    {!finding.insightNote && finding.causes && finding.causes.length > 0 && (
                      <div>
                        <p className="font-medium mb-1 flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-muted-foreground" /> Insight
                        </p>
                        <ul className="ml-5">
                          {finding.causes.map((cause: string, i: number) => (
                            <li key={i} className="list-disc text-muted-foreground">{cause}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {finding.impactObserved && finding.impactObserved.length > 0 && (
                      <div>
                        <p className="font-medium mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" /> Estimated Impact
                        </p>
                        <ul className="space-y-1 ml-5">
                          {finding.impactObserved.map((bullet: string, i: number) => (
                            <li key={i} className="list-disc text-muted-foreground">{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {finding.estimatedCostImpact && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-medium">Estimated Impact:</span>
                        <span className="text-muted-foreground">{finding.estimatedCostImpact}</span>
                      </div>
                    )}

                    {finding.whatToValidateNext && finding.whatToValidateNext.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="font-medium mb-1 flex items-center gap-1">
                          <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" /> What to Validate Next
                        </p>
                        <ul className="space-y-1 ml-5">
                          {finding.whatToValidateNext.map((doc: string, i: number) => (
                            <li key={i} className="list-disc text-muted-foreground text-xs">{doc}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {noSignalsFallback && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-amber-600 dark:text-amber-400 ml-5 italic">
                          No concrete operational or financial signals extracted yet. Upload Ops, Finance, or Maintenance records to strengthen this finding.
                        </p>
                      </div>
                    )}

                    {finding.collapsedNote && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 italic ml-5">
                        {finding.collapsedNote}
                      </p>
                    )}
                  </div>
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
          <div className="flex items-center gap-2.5 mb-5">
            <DollarSign className="w-5 h-5 text-muted-foreground shrink-0" />
            <h2 className="text-base font-semibold text-foreground uppercase tracking-wide">
              Cost Saving Opportunities
            </h2>
            <span className="ml-auto text-xs text-muted-foreground">{costSavings.length} identified</span>
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
                        <h3 className="font-semibold text-sm leading-snug">{opp.title}</h3>
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
                      <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{opp.estimatedSavings}</p>
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
          <div className="flex items-center gap-2.5 mb-5">
            <TrendingUp className="w-5 h-5 text-muted-foreground shrink-0" />
            <h2 className="text-base font-semibold text-foreground uppercase tracking-wide">
              Risk Predictions
            </h2>
            <span className="ml-auto text-xs text-muted-foreground" data-testid="text-predictions-count">{predictions.length} forecast{predictions.length !== 1 ? "s" : ""}</span>
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
                        <h3 className="font-semibold text-sm leading-snug mb-2.5">{pred.issue}</h3>
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

      {/* FINANCIAL IMPACT */}
      <Card className="overflow-hidden" data-testid="card-financial-impact">
        <div className="px-6 pt-6 pb-1 flex items-center gap-2.5">
          <DollarSign className="w-5 h-5 text-muted-foreground shrink-0" />
          <h2 className="text-base font-semibold text-foreground uppercase tracking-wide">Financial Impact</h2>
        </div>
        <div className="p-6 pt-4">
        {mgd?.financialImpact ? (
          <div className="space-y-4">
            {mgd.financialImpact.estimatedSeverity && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-40 shrink-0">Estimated Severity</span>
                <Badge variant={
                  mgd.financialImpact.estimatedSeverity === "critical" ? "destructive" :
                  mgd.financialImpact.estimatedSeverity === "high" ? "default" : "secondary"
                }>
                  {mgd.financialImpact.estimatedSeverity}
                </Badge>
              </div>
            )}
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
            {mgd.financialImpact.downtimeLoss != null && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                {mgd.financialImpact.downtimeLoss != null && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Downtime Loss</p>
                    <p className="font-semibold text-sm">RM {Number(mgd.financialImpact.downtimeLoss).toLocaleString()}</p>
                  </div>
                )}
                {mgd.financialImpact.scrapLoss != null && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Scrap Loss</p>
                    <p className="font-semibold text-sm">RM {Number(mgd.financialImpact.scrapLoss).toLocaleString()}</p>
                  </div>
                )}
                {mgd.financialImpact.overtimeCost != null && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Overtime Cost</p>
                    <p className="font-semibold text-sm">RM {Number(mgd.financialImpact.overtimeCost).toLocaleString()}</p>
                  </div>
                )}
                {mgd.financialImpact.totalLoss != null && (
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3">
                    <p className="text-xs text-orange-600 dark:text-orange-400">Total Estimated Loss</p>
                    <p className="font-bold text-sm text-orange-700 dark:text-orange-300">RM {Number(mgd.financialImpact.totalLoss).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Not available</p>
        )}
        </div>
      </Card>

      {/* TRANSFORMATION ROADMAP */}
      {mgd?.roadmap && (
        <Card data-testid="card-roadmap">
          <div className="px-6 pt-6 pb-1 flex items-center gap-2.5">
            <Map className="w-5 h-5 text-muted-foreground shrink-0" />
            <h2 className="text-base font-semibold text-foreground uppercase tracking-wide">Transformation Roadmap</h2>
          </div>
          <div className="p-6 pt-4">
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
          <div className="px-6 pt-6 pb-1 flex items-center gap-2.5">
            <BarChart2 className="w-5 h-5 text-muted-foreground shrink-0" />
            <h2 className="text-base font-semibold text-foreground uppercase tracking-wide">Industry Benchmarks</h2>
          </div>
          <div className="p-6 pt-4">
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
          <div className="px-6 pt-6 pb-1 flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-muted-foreground shrink-0" />
            <h2 className="text-base font-semibold text-foreground uppercase tracking-wide">MGD Cost Savings</h2>
          </div>
          <div className="p-6 pt-4">
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

      <div className="text-center text-sm text-muted-foreground">
        Analysis completed: {formatDate(analysis.completedAt)}
      </div>
    </div>
  );
}
