import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, TrendingUp, CheckCircle2, Target, BarChart3, Clock, ArrowRight, Building2 } from "lucide-react";
import { fourMCategoryColors, type DiagnosticSession, type FourMCategory } from "@shared/schema";
import { AuthHeader } from "@/components/auth-header";
import { useAuth } from "@/hooks/useAuth";

interface RootCause {
  category?: FourMCategory;
  cause?: string;
  severity?: "low" | "medium" | "high";
}

function parseRootCauses(rootCauses: unknown): RootCause[] {
  if (!rootCauses) return [];
  if (!Array.isArray(rootCauses)) return [];
  return rootCauses.filter((rc): rc is RootCause => 
    rc && typeof rc === 'object' && 'category' in rc
  );
}

const industryLabels: Record<string, string> = {
  event_management: "Event Management",
  retail: "Retail",
  logistics: "Logistics",
};

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const { data: sessions, isLoading: sessionsLoading } = useQuery<DiagnosticSession[]>({
    queryKey: ["/api/sessions"],
    enabled: !!user,
  });

  const recentSessions = sessions?.slice(0, 3) || [];
  const totalDiagnoses = sessions?.length || 0;

  const getMostCommonCategory = (): { category: FourMCategory; count: number } | null => {
    if (!sessions || sessions.length === 0) return null;
    const categoryCount: Record<string, number> = {};
    sessions.forEach(s => {
      const rootCauses = parseRootCauses(s.rootCauses);
      rootCauses.forEach(rc => {
        if (rc.category) {
          categoryCount[rc.category] = (categoryCount[rc.category] || 0) + 1;
        }
      });
    });
    const entries = Object.entries(categoryCount);
    if (entries.length === 0) return null;
    const [category, count] = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    return { category: category as FourMCategory, count };
  };

  const mostCommon = getMostCommonCategory();

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Personalized Header */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground" data-testid="text-title">
                  {user ? `Welcome back, ${user.firstName || 'there'}` : 'Margin Guard Dashboard'}
                </h1>
                {user?.companyName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm" data-testid="text-dashboard-company">{user.companyName}</span>
                    {user.industry && (
                      <Badge variant="secondary" className="text-xs" data-testid="badge-industry">
                        {industryLabels[user.industry] || user.industry}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Link href="/diagnose">
                <Button size="default" data-testid="button-start-diagnosis">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Analyze New Problem
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          {user && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Diagnoses</p>
                  {sessionsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold text-foreground" data-testid="text-total-diagnoses">
                      {totalDiagnoses}
                    </p>
                  )}
                </div>
              </Card>
              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Most Common Issue</p>
                  {sessionsLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : mostCommon ? (
                    <Badge 
                      className={`${fourMCategoryColors[mostCommon.category].bg} ${fourMCategoryColors[mostCommon.category].text} ${fourMCategoryColors[mostCommon.category].border} border`}
                      data-testid="badge-common-category"
                    >
                      {mostCommon.category} ({mostCommon.count})
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </div>
              </Card>
              <Card className="p-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  {sessionsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold text-foreground" data-testid="text-month-diagnoses">
                      {sessions?.filter(s => {
                        const date = new Date(s.createdAt);
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                      }).length || 0}
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Recent Diagnoses */}
          {user && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-card-foreground">Recent Diagnoses</h2>
                  <Link href="/history">
                    <Button variant="ghost" size="sm" data-testid="button-view-all-history">
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                
                {sessionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSessions.map((session) => {
                      const rootCauses = parseRootCauses(session.rootCauses);
                      const uniqueCategories = new Set(rootCauses.map(rc => rc.category).filter(Boolean));
                      const topCategories = Array.from(uniqueCategories).slice(0, 2) as FourMCategory[];
                      
                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => navigate(`/results/${session.id}`)}
                          className="w-full flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer text-left"
                          data-testid={`card-session-${session.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {session.symptom || 'Diagnosis'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(session.createdAt).toLocaleDateString("en-MY", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-4">
                            {topCategories.map((cat) => (
                              <Badge 
                                key={cat}
                                variant="secondary"
                                className={`text-xs ${fourMCategoryColors[cat]?.bg} ${fourMCategoryColors[cat]?.text}`}
                              >
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground" data-testid="text-no-recent">
                      No diagnoses yet. Start your first analysis to see results here.
                    </p>
                    <Link href="/diagnose">
                      <Button variant="outline" size="sm" className="mt-4">
                        Start First Diagnosis
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* How It Works */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground text-center">
              How It Works
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Step 1</Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-card-foreground">
                      Describe Your Problem
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Choose from 8 diagnostic categories or select from our library of 80+ common SME problems.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Step 2</Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-card-foreground">
                      Answer Smart Questions
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Our guided questionnaire asks the right follow-up questions to understand your situation.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Step 3</Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-card-foreground">
                      Get Clear Actions
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Receive ranked root causes, estimated impact, and prevention steps you can implement today.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* 4M Framework Preview */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium text-card-foreground">
                  Powered by the 4M Framework
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our analysis examines four key areas to pinpoint where problems originate, linked to CEO Management Indicators:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-3 rounded-lg ${fourMCategoryColors.Money.bg} ${fourMCategoryColors.Money.border} border`}>
                  <p className={`text-sm font-medium ${fourMCategoryColors.Money.text}`}>Money</p>
                  <p className="text-xs text-muted-foreground mt-1">Financial health</p>
                </div>
                <div className={`p-3 rounded-lg ${fourMCategoryColors.Materials.bg} ${fourMCategoryColors.Materials.border} border`}>
                  <p className={`text-sm font-medium ${fourMCategoryColors.Materials.text}`}>Materials</p>
                  <p className="text-xs text-muted-foreground mt-1">Inventory & supply</p>
                </div>
                <div className={`p-3 rounded-lg ${fourMCategoryColors.Manpower.bg} ${fourMCategoryColors.Manpower.border} border`}>
                  <p className={`text-sm font-medium ${fourMCategoryColors.Manpower.text}`}>Manpower</p>
                  <p className="text-xs text-muted-foreground mt-1">Staff & skills</p>
                </div>
                <div className={`p-3 rounded-lg ${fourMCategoryColors.Machinery.bg} ${fourMCategoryColors.Machinery.border} border`}>
                  <p className={`text-sm font-medium ${fourMCategoryColors.Machinery.text}`}>Machinery</p>
                  <p className="text-xs text-muted-foreground mt-1">Equipment & efficiency</p>
                </div>
              </div>
            </div>
          </Card>

          {/* CEO Dashboard Preview */}
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium text-card-foreground">
                  CEO Weekly Management Indicators
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every problem is linked to a Management Indicator for your weekly CEO report. Track what matters: Money, Material, Manpower, and Machine performance.
              </p>
            </div>
          </Card>

          {/* Previous Diagnoses Link */}
          <div className="text-center">
            <Link href="/history">
              <Button variant="outline" size="default" data-testid="button-view-history">
                View All Previous Diagnoses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
