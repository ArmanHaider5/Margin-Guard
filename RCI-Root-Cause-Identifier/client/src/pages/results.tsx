import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Home, AlertCircle, Clock, Target, TrendingUp, DollarSign, Gauge, Loader2 } from "lucide-react";
import { type DiagnosticSession, type ManagementIndicator, fourMCategoryColors, indicatorColors } from "@shared/schema";
import { AuthHeader } from "@/components/auth-header";
import MgdResults from "@/components/mgd-results";
import RootCauseGraph from "@/features/root-cause/root-cause-graph";
import RootCauseExplorer from "@/features/root-cause/root-cause-explorer";
import DiagnosticTimeline from "@/features/diagnostics/diagnostic-timeline";
import HealthScoreGauge from "@/features/diagnostics/health-score-gauge";
import BenchmarkChart from "@/features/benchmarks/benchmark-chart";
import RiskIndicators from "@/features/diagnostics/risk-indicators";
import { generateDiagnosticReport } from "@/features/reports/diagnostic-report-generator";
import FinancialImpactPanel from "@/features/diagnostics/financial-impact-panel";
import DiagnosticRunsPanel from "@/features/diagnostics/diagnostic-runs-panel";

export default function Results() {
  const [match, params] = useRoute("/results/:sessionId");
  const sessionId = params?.sessionId;

  const { data: session, isLoading } = useQuery<DiagnosticSession>({
    queryKey: [`/api/sessions/${sessionId}`],
    enabled: !!sessionId,
  });

  if (!match || !sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">Invalid session</p>
          <Link href="/">
            <Button data-testid="button-go-home">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading results...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">Could not load results</p>
          <Link href="/">
            <Button data-testid="button-go-home">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const mgd = (session as any)?.mgdAnalysis;

  const [selectedRun, setSelectedRun] = useState(session);

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground" data-testid="text-results-title">
                Analysis Complete
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date(session.createdAt).toLocaleDateString("en-MY", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-home">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>

          {/* CEO Summary Card */}
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-medium text-card-foreground">CEO Summary</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Primary Indicator */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Primary Indicator</p>
                  {session.primaryIndicator && (
                    <Badge 
                      className={`${indicatorColors[session.primaryIndicator as ManagementIndicator]?.bg || 'bg-primary'} ${indicatorColors[session.primaryIndicator as ManagementIndicator]?.text || 'text-white'}`}
                      data-testid="badge-primary-indicator"
                    >
                      {session.primaryIndicator}
                    </Badge>
                  )}
                </div>
                
                {/* Root Causes Found */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Root Causes Found</p>
                  <p className="text-2xl font-semibold text-card-foreground" data-testid="text-causes-count">
                    {session.rootCauses?.length || 0}
                  </p>
                </div>
                
                {/* Severity Level */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Top Severity</p>
                  <p className="text-2xl font-semibold text-card-foreground">
                    {session.rootCauses?.[0]?.severity === "high" ? "High" : session.rootCauses?.[0]?.severity === "medium" ? "Medium" : "Low"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <MgdResults mgd={(session as any)?.mgdAnalysis} />

          <DiagnosticRunsPanel
            runs={[session]}
            selectedRun={selectedRun}
            onSelect={setSelectedRun}
          />

          {mgd && (
            <div className="mb-6">

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => generateDiagnosticReport(mgd)}
              >
                Generate Consulting Report
              </button>

            </div>
          )}

          {mgd && (
            <div className="grid grid-cols-3 gap-6 mt-6">

              <HealthScoreGauge score={mgd.healthScore} />

              <RiskIndicators
                rootCauses={[
                  mgd.rootCauseTree?.primaryCause,
                  ...(mgd.rootCauseTree?.secondaryCauses || [])
                ]}
              />

              <BenchmarkChart data={mgd.benchmarks?.benchmarkResults || []} />

            </div>
          )}

          {mgd?.financialImpact && (
            <FinancialImpactPanel impact={mgd.financialImpact} />
          )}

          {mgd?.causalChains && (
            <div className="card mt-6">
              <h3 className="text-lg font-semibold mb-4">
                Root Cause Chain
              </h3>

              <RootCauseGraph chains={mgd.causalChains} />
            </div>
          )}

          {mgd && (
            <RootCauseExplorer
              rootCauseTree={mgd.rootCauseTree}
              causalChains={mgd.causalChains}
              savings={mgd.savings}
            />
          )}

          {mgd?.causalChains && (
            <DiagnosticTimeline chains={mgd.causalChains} />
          )}

          {/* Problem Summary */}
          <Card className="p-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Your Problem</h3>
              <p className="text-base text-card-foreground leading-relaxed" data-testid="text-symptom">
                {session.symptom}
              </p>
            </div>
          </Card>

          {/* Root Causes */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Root Causes Identified</h2>
            
            <Accordion type="single" collapsible className="space-y-3">
              {session.rootCauses?.map((rootCause, index) => {
                const categoryColors = fourMCategoryColors[rootCause.category] || fourMCategoryColors.Manpower;
                
                return (
                  <AccordionItem 
                    key={index} 
                    value={`cause-${index}`} 
                    className="border rounded-lg overflow-hidden"
                    data-testid={`accordion-cause-${index}`}
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-start gap-4 text-left w-full">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={`${categoryColors.bg} ${categoryColors.text} ${categoryColors.border}`}
                              data-testid={`badge-category-${index}`}
                            >
                              {rootCause.category}
                            </Badge>
                            {rootCause.indicator && (
                              <Badge variant="secondary" className="text-xs">
                                {rootCause.indicator}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {rootCause.severity === "high" ? "High" : rootCause.severity === "medium" ? "Medium" : "Low"} Severity
                            </Badge>
                          </div>
                          <p className="font-medium text-card-foreground" data-testid={`text-cause-${index}`}>
                            {rootCause.cause}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-6 pt-2">
                        {/* Explanation */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Why This Is Happening
                          </h4>
                          <p className="text-sm text-card-foreground leading-relaxed" data-testid={`text-explanation-${index}`}>
                            {rootCause.explanation}
                          </p>
                        </div>

                        <Separator />

                        {/* Estimated Impact */}
                        {rootCause.estimatedImpact && (
                          <>
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Estimated Impact
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {rootCause.estimatedImpact.cost && (
                                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <div className="flex items-center gap-2 mb-1">
                                      <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
                                      <span className="text-xs font-medium text-red-700 dark:text-red-300">Cost Impact</span>
                                    </div>
                                    <p className="text-sm text-red-900 dark:text-red-100">{rootCause.estimatedImpact.cost}</p>
                                  </div>
                                )}
                                {rootCause.estimatedImpact.time && (
                                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Time Impact</span>
                                    </div>
                                    <p className="text-sm text-amber-900 dark:text-amber-100">{rootCause.estimatedImpact.time}</p>
                                  </div>
                                )}
                                {rootCause.estimatedImpact.efficiency && (
                                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Efficiency Impact</span>
                                    </div>
                                    <p className="text-sm text-blue-900 dark:text-blue-100">{rootCause.estimatedImpact.efficiency}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Separator />
                          </>
                        )}

                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link href="/diagnose" className="flex-1">
              <Button variant="default" className="w-full" data-testid="button-new-diagnosis">
                Start New Diagnosis
              </Button>
            </Link>
            <Link href="/history" className="flex-1">
              <Button variant="outline" className="w-full" data-testid="button-view-history">
                View All Diagnoses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
