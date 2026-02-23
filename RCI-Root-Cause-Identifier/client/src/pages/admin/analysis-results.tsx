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
  CheckCircle2
} from "lucide-react";
import type { ClientAnalysis, Client, FourMCategory } from "@shared/schema";
import { DiagnosticReportView } from "@/components/diagnostic-report-view";
import { composeDiagnosticReport } from "@shared/diagnostic-composer";
import type { RootCauseSelection, PrimaryContext } from "@shared/root-cause-library";

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
              <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto mb-4 text-sm">
                <div className="text-left text-muted-foreground">Ops signals:</div><div className="text-right font-mono">0</div>
                <div className="text-left text-muted-foreground">Maintenance signals:</div><div className="text-right font-mono">0</div>
                <div className="text-left text-muted-foreground">QC signals:</div><div className="text-right font-mono">0</div>
                <div className="text-left text-muted-foreground">Finance signals:</div><div className="text-right font-mono">0</div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Try uploading reports with metrics, trends, or performance summaries.
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/clients/${analysis.clientId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold" data-testid="text-analysis-title">{analysis.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {client && <span className="text-muted-foreground">{client.name}</span>}
            <Badge variant="outline">{analysis.analysisType}</Badge>
            <Badge variant={analysis.status === "completed" ? "default" : "secondary"}>
              {analysis.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis.caseId && (
            <Link href={`/admin/cases/${analysis.caseId}`}>
              <Button variant="outline" data-testid="button-view-case">
                <FolderOpen className="w-4 h-4 mr-2" />
                View Case
              </Button>
            </Link>
          )}
          {/* Export enables offline review and institutional reporting. */}
          <Button 
            variant="outline" 
            onClick={handleDownloadReport}
            disabled={analysis.status !== "completed" || isDownloading}
            data-testid="button-download-report"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isDownloading ? "Generating..." : "Download Report"}
          </Button>
        </div>
      </div>

      <Card className="p-4 border-l-4 border-l-primary" data-testid="card-mode-indicator">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold" data-testid="text-mode-indicator">
              Mode: {analysis.analysisMode === "baseline" 
                ? "Baseline (Preliminary)" 
                : "Deep Diagnostic (Evidence-Enriched)"
              }
            </span>
            {analysis.confidence && (
              <Badge 
                variant={analysis.confidence === "preliminary" ? "secondary" : analysis.confidence === "low" ? "outline" : "default"}
                data-testid="badge-confidence"
              >
                {analysis.confidence === "preliminary" ? "Preliminary" : analysis.confidence === "low" ? "Low Confidence" : "Substantiated"}
              </Badge>
            )}
          </div>
          {analysis.isMockMode ? (
            <div className="flex items-center gap-2 text-muted-foreground" data-testid="text-mock-mode">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Running in baseline pattern mode. Upload documents for signal-driven analysis.</span>
            </div>
          ) : analysis.analysisMode === "evidence-enriched" ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400" data-testid="text-signal-mode">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Using document-derived signals and observed symptoms.</span>
            </div>
          ) : null}
        </div>
      </Card>

      {analysis.summary && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Target className="w-6 h-6 text-primary mt-0.5" />
            <div>
              <h2 className="font-semibold mb-2">Executive Summary</h2>
              <p className="text-muted-foreground" data-testid="text-summary">{analysis.summary}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-findings-count">{findings.length}</p>
              <p className="text-sm text-muted-foreground">Issues Found</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-savings-count">{costSavings.length}</p>
              <p className="text-sm text-muted-foreground">Saving Opportunities</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-predictions-count">{predictions.length}</p>
              <p className="text-sm text-muted-foreground">Predictions</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Findings
        </h2>
        <div className="space-y-4">
          {findings.map((finding, idx) => {
            const colors = fourMColors[finding.fourMCategory] || fourMColors.Money;
            const severity = severityColors[finding.severity] || severityColors.medium;
            const evidenceStrengthColors: Record<string, { bg: string; text: string; label: string }> = {
              STRONG: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Strong" },
              MODERATE: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Moderate" },
              WEAK: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", label: "Weak" },
            };
            const esStyle = finding.evidenceStrength ? evidenceStrengthColors[finding.evidenceStrength] : null;
            const hasSignals = finding.evidenceAnchors && finding.evidenceAnchors.length > 0;
            const hasAnyConcreteOutput = hasSignals || (finding.impactObserved && finding.impactObserved.length > 0);
            const noSignalsFallback = !hasAnyConcreteOutput && finding.evidenceStrength === "WEAK";
            return (
              <Card key={finding.id || idx} className="p-4 border-l-4" style={{ borderLeftColor: 'currentColor' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <h3 className="font-semibold">{finding.evidenceLedTitle || finding.title}</h3>
                    <Badge className={`${colors.bg} ${colors.text}`}>{finding.fourMCategory}</Badge>
                    <Badge className={`${severity.bg} ${severity.text}`}>{finding.severity}</Badge>
                    {esStyle && (
                      <Badge className={`${esStyle.bg} ${esStyle.text}`}>
                        {esStyle.label}
                      </Badge>
                    )}
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
              </Card>
            );
          })}
          {findings.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No findings available</p>
          )}
        </div>
      </Card>

      {costSavings.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cost Saving Opportunities
          </h2>
          <div className="space-y-4">
            {costSavings.map((opp, idx) => (
              <Card key={opp.id || idx} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{opp.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{opp.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">{opp.estimatedSavings}</p>
                    <Badge variant="outline">{opp.implementationEffort} effort</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {predictions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Predictions
          </h2>
          <div className="space-y-4">
            {predictions.map((pred, idx) => (
              <Card key={pred.id || idx} className="p-4">
                <div className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{pred.issue}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={
                        pred.likelihood === "high" ? "destructive" : 
                        pred.likelihood === "medium" ? "default" : "secondary"
                      }>
                        {pred.likelihood} likelihood
                      </Badge>
                      <span className="text-sm text-muted-foreground">{pred.expectedTimeframe}</span>
                    </div>
                                      </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Analysis completed: {formatDate(analysis.completedAt)}
      </div>
    </div>
  );
}
