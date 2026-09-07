import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Home, Calendar } from "lucide-react";
import { type DiagnosticSession, type ManagementIndicator, fourMCategoryColors, indicatorColors } from "@shared/schema";
import { AuthHeader } from "@/components/auth-header";

export default function History() {
  const { data: sessions, isLoading } = useQuery<DiagnosticSession[]>({
    queryKey: ["/api/sessions"],
  });

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground" data-testid="text-title">
                Previous Diagnoses
              </h1>
              <p className="text-sm text-muted-foreground">
                Review your past problem analyses
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" size="default" data-testid="button-home">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && (!sessions || sessions.length === 0) && (
            <Card className="p-8">
              <div className="text-center space-y-4">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto" />
                <div className="space-y-2">
                  <h2 className="text-lg font-medium text-card-foreground" data-testid="text-empty">
                    No diagnoses yet
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Start your first problem analysis to see it here
                  </p>
                </div>
                <Link href="/diagnose">
                  <Button size="default" data-testid="button-start-diagnosis">
                    Start Your First Diagnosis
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Sessions List */}
          {!isLoading && sessions && sessions.length > 0 && (
            <div className="space-y-4">
              {sessions.map((session) => {
                const topCauses = [...(session.rootCauses || [])].slice(0, 3);
                
                return (
                  <Link key={session.id} href={`/results/${session.id}`}>
                    <Card className="p-6 hover-elevate transition-all duration-300 cursor-pointer" data-testid={`card-session-${session.id}`}>
                      <div className="space-y-4">
                        {/* Problem Description */}
                        <div className="space-y-2">
                          <p className="text-base font-medium text-card-foreground leading-relaxed line-clamp-2" data-testid={`text-symptom-${session.id}`}>
                            {session.symptom}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span data-testid={`text-date-${session.id}`}>{formatDate(session.createdAt)}</span>
                            </div>
                            {session.primaryIndicator && (
                              <Badge 
                                variant="secondary"
                                className={`text-xs ${indicatorColors[session.primaryIndicator as ManagementIndicator]?.bg || ''} ${indicatorColors[session.primaryIndicator as ManagementIndicator]?.text || ''}`}
                              >
                                {session.primaryIndicator}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Top Causes */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Top {topCauses.length} root {topCauses.length === 1 ? "cause" : "causes"}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {topCauses.map((cause, index) => {
                              const colors = fourMCategoryColors[cause.category] || fourMCategoryColors.Manpower;
                              return (
                                <Badge 
                                  key={index} 
                                  variant="outline"
                                  className={`${colors.bg} ${colors.text} ${colors.border}`}
                                >
                                  {cause.category}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* CTA */}
          {!isLoading && sessions && sessions.length > 0 && (
            <div className="text-center pt-4">
              <Link href="/diagnose">
                <Button size="default" data-testid="button-new-diagnosis">
                  Start New Diagnosis
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
