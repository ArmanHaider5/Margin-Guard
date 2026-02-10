import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  FileSearch, 
  TrendingUp, 
  ChevronRight,
  Building2,
  Calendar,
  CheckCircle2
} from "lucide-react";
import type { Client, ClientAnalysis } from "@shared/schema";

interface DashboardData {
  organization: Client;
  stats: {
    totalAnalyses: number;
    totalIssues: number;
    criticalIssues: number;
  };
  recentAnalyses: ClientAnalysis[];
}

const fourMColors = {
  Money: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  Materials: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  Manpower: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  Machinery: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
};

const severityColors = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
};

export default function ClientDashboard() {
  const { data: dashboard, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/client/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !dashboard) {
    const errorMessage = error instanceof Error ? error.message : "";
    const isNotLinked = errorMessage.includes("Not linked") || errorMessage.includes("400");
    
    return (
      <div className="p-6">
        <Card className="p-8 text-center max-w-lg mx-auto">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {isNotLinked ? "Welcome to EDX" : "Unable to Load Dashboard"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {isNotLinked 
              ? "Your account is not yet linked to a client organization. Please contact your EDX consultant to get access to your company's operational insights."
              : "Please contact your administrator for assistance."}
          </p>
          {isNotLinked && (
            <>
              <div className="bg-muted p-4 rounded-lg text-left mb-6">
                <h3 className="font-medium mb-2">What happens next?</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Your consultant will create your organization profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>They will link your account to your organization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>You'll be able to view your operational analysis here</span>
                  </li>
                </ul>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">Are you a consultant?</p>
                <Button 
                  data-testid="button-go-to-admin"
                  onClick={async () => {
                    await fetch("/api/auth/become-admin", { method: "POST" });
                    window.location.href = "/";
                  }}
                >
                  Switch to Admin Console
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  const { organization, stats, recentAnalyses } = dashboard;

  return (
    <div className="p-6 space-y-6" data-testid="client-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">{organization.industry}</span>
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-org-name">{organization.name}</h1>
        </div>
        <Link href="/client/issues">
          <Button data-testid="button-view-all-issues">
            View All Issues
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-analyses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-analyses">{stats.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground">Completed assessments</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-issues">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Issues Identified</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-issues">{stats.totalIssues}</div>
            <p className="text-xs text-muted-foreground">Across all analyses</p>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-issues">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Critical/High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600" data-testid="text-critical-issues">{stats.criticalIssues}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Recent Analyses</CardTitle>
          <Link href="/client/analyses">
            <Button variant="ghost" size="sm" data-testid="button-view-all-analyses">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentAnalyses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No analyses completed yet.</p>
              <p className="text-sm">Your consultant will share results here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentAnalyses.map((analysis) => {
                const findings = analysis.findings || [];
                const criticalCount = findings.filter(f => f.severity === "critical" || f.severity === "high").length;
                
                return (
                  <Link key={analysis.id} href={`/client/analyses/${analysis.id}`}>
                    <div 
                      className="p-4 border rounded-lg hover-elevate cursor-pointer"
                      data-testid={`card-analysis-${analysis.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium" data-testid={`text-analysis-title-${analysis.id}`}>
                            {analysis.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {analysis.completedAt 
                                ? new Date(analysis.completedAt).toLocaleDateString()
                                : "Processing..."}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {analysis.analysisType === "quick" ? "Quick" : "Deep"} Analysis
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-semibold">{findings.length}</div>
                            <div className="text-xs text-muted-foreground">issues</div>
                          </div>
                          {criticalCount > 0 && (
                            <Badge className={severityColors.critical}>
                              {criticalCount} critical
                            </Badge>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {recentAnalyses.length > 0 && recentAnalyses[0].findings && recentAnalyses[0].findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Findings Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAnalyses[0].findings.slice(0, 5).map((finding, index) => (
                <div 
                  key={finding.id || index}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                  data-testid={`finding-preview-${finding.id || index}`}
                >
                  <div className={`w-1 h-full min-h-[40px] rounded-full ${
                    finding.severity === "critical" ? "bg-red-500" :
                    finding.severity === "high" ? "bg-orange-500" :
                    finding.severity === "medium" ? "bg-yellow-500" : "bg-gray-400"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">{finding.title}</h4>
                      <div className="flex gap-1">
                        <Badge className={fourMColors[finding.fourMCategory]} variant="secondary">
                          {finding.fourMCategory}
                        </Badge>
                        <Badge className={severityColors[finding.severity]} variant="secondary">
                          {finding.severity}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {finding.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
