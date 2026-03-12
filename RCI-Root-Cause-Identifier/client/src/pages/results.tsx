import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Home, AlertCircle, Clock, Target, TrendingUp, DollarSign, Gauge, Loader2, Activity, GitBranch, BarChart2, Map } from "lucide-react";
import { type DiagnosticSession, type ManagementIndicator, fourMCategoryColors, indicatorColors } from "@shared/schema";
import { AuthHeader } from "@/components/auth-header";

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

          {/* MGD Analysis — only rendered when present */}
          {mgd && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">MGD Analysis</h2>

              {/* Health Score */}
              {mgd?.healthScore !== undefined && (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Operational Health Score</h3>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-foreground">{mgd.healthScore}</span>
                    <span className="text-sm text-muted-foreground mb-1">/ 100</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${mgd.healthScore >= 70 ? "bg-green-500" : mgd.healthScore >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, Math.max(0, mgd.healthScore))}%` }}
                    />
                  </div>
                </Card>
              )}

              {/* Root Cause Tree — primary */}
              {mgd?.rootCauseTree?.primary && (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <GitBranch className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Primary Root Cause</h3>
                  </div>
                  <p className="text-base font-medium text-foreground">
                    {mgd.rootCauseTree.primary?.name ?? mgd.rootCauseTree.primary}
                  </p>
                  {mgd.rootCauseTree.primary?.category && (
                    <Badge variant="outline" className="mt-2">{mgd.rootCauseTree.primary.category}</Badge>
                  )}
                </Card>
              )}

              {/* Benchmarks */}
              {Array.isArray(mgd?.benchmarks) && mgd.benchmarks.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Industry Benchmarks</h3>
                  </div>
                  <div className="space-y-3">
                    {mgd.benchmarks.map((b: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{b.kpi ?? b.metric ?? b.name ?? `KPI ${i + 1}`}</span>
                        <div className="flex items-center gap-2">
                          {b.value !== undefined && <span className="font-medium text-foreground">{b.value}</span>}
                          {b.status && (
                            <Badge
                              variant="outline"
                              className={b.status === "above" ? "border-green-500 text-green-700" : b.status === "below" ? "border-red-500 text-red-700" : ""}
                            >
                              {b.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Cost Savings */}
              {mgd?.savings && (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Cost Saving Opportunities</h3>
                  </div>
                  {mgd.savings.totalEstimate !== undefined && (
                    <p className="text-2xl font-bold text-foreground mb-3">
                      {typeof mgd.savings.totalEstimate === "number"
                        ? `RM ${mgd.savings.totalEstimate.toLocaleString()}`
                        : mgd.savings.totalEstimate}
                    </p>
                  )}
                  {Array.isArray(mgd.savings.opportunities) && mgd.savings.opportunities.length > 0 && (
                    <ul className="space-y-2">
                      {mgd.savings.opportunities.map((opp: any, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {typeof opp === "string" ? opp : opp.description ?? opp.label ?? JSON.stringify(opp)}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}

              {/* Roadmap */}
              {Array.isArray(mgd?.roadmap) && mgd.roadmap.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Map className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recovery Roadmap</h3>
                  </div>
                  <ol className="space-y-3">
                    {mgd.roadmap.map((step: any, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-foreground leading-relaxed">
                          {typeof step === "string" ? step : step.action ?? step.description ?? step.label ?? JSON.stringify(step)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}

              {/* Narrative */}
              {mgd?.narrative && (
                <Card className="p-6 bg-muted/30">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Consulting Narrative</h3>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {typeof mgd.narrative === "string" ? mgd.narrative : mgd.narrative?.summary ?? JSON.stringify(mgd.narrative)}
                  </p>
                </Card>
              )}
            </div>
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
