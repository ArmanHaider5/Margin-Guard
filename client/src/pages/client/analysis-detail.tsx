import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft,
  AlertTriangle,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  Shield
} from "lucide-react";
import type { ClientAnalysis, FourMCategory } from "@shared/schema";

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

export default function ClientAnalysisDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: analysis, isLoading, error } = useQuery<ClientAnalysis>({
    queryKey: ["/api/client/analyses", id],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Analysis Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Unable to load this analysis."}
          </p>
          <Link href="/client">
            <Button>Return to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const findings = analysis.findings || [];
  const costSavings = analysis.costSavingOpportunities || [];
  const predictions = analysis.predictions || [];

  const categoryCounts: Record<FourMCategory, number> = {
    Money: 0,
    Materials: 0,
    Manpower: 0,
    Machinery: 0,
  };
  findings.forEach(f => {
    if (categoryCounts[f.fourMCategory] !== undefined) {
      categoryCounts[f.fourMCategory]++;
    }
  });

  return (
    <div className="p-6 space-y-6" data-testid="client-analysis-detail">
      <div className="flex items-center gap-4">
        <Link href="/client">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-analysis-title">
            {analysis.title}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {analysis.completedAt 
                ? new Date(analysis.completedAt).toLocaleDateString()
                : "In Progress"}
            </span>
            <Badge variant="outline">
              {analysis.analysisType === "quick" ? "Quick Analysis" : "Deep Analysis"}
            </Badge>
          </div>
        </div>
      </div>

      {analysis.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-summary">
              {analysis.summary}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(categoryCounts) as [FourMCategory, number][]).map(([category, count]) => (
          <Card key={category}>
            <CardContent className="p-4 text-center">
              <Badge className={fourMColors[category]} variant="secondary">
                {category}
              </Badge>
              <div className="text-2xl font-bold mt-2">{count}</div>
              <div className="text-xs text-muted-foreground">issues</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Identified Issues ({findings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No issues identified in this analysis.
            </p>
          ) : (
            <div className="space-y-4">
              {findings.map((finding, index) => (
                <div 
                  key={finding.id || index}
                  className="p-4 border rounded-lg"
                  data-testid={`finding-${finding.id || index}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <h4 className="font-semibold">{finding.title}</h4>
                    <div className="flex gap-2">
                      <Badge className={fourMColors[finding.fourMCategory]} variant="secondary">
                        {finding.fourMCategory}
                      </Badge>
                      <Badge className={severityColors[finding.severity]} variant="secondary">
                        {finding.severity}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{finding.description}</p>

                  {finding.estimatedCostImpact && (
                    <div className="text-sm text-green-600 font-medium mb-3">
                      Estimated Impact: {finding.estimatedCostImpact}
                    </div>
                  )}

                  {finding.solutions && finding.solutions.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium mb-2">Recommended Actions:</h5>
                      <ul className="space-y-1">
                        {finding.solutions.map((sol, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            {sol}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {costSavings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Cost Saving Opportunities ({costSavings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {costSavings.map((saving, index) => (
                <div 
                  key={saving.id || index}
                  className="p-4 border rounded-lg bg-green-50 dark:bg-green-950"
                  data-testid={`saving-${saving.id || index}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h4 className="font-semibold">{saving.title}</h4>
                    <div className="text-lg font-bold text-green-600">
                      {saving.estimatedSavings}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{saving.description}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Implementation Effort: <span className="font-medium">{saving.implementationEffort}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Predictions & Risks ({predictions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictions.map((pred, index) => (
                <div 
                  key={pred.id || index}
                  className="p-4 border rounded-lg"
                  data-testid={`prediction-${pred.id || index}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h4 className="font-semibold">{pred.issue}</h4>
                    <Badge variant={
                      pred.likelihood === "high" ? "destructive" :
                      pred.likelihood === "medium" ? "secondary" : "outline"
                    }>
                      {pred.likelihood} likelihood
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Expected: {pred.expectedTimeframe}
                  </p>
                  {pred.preventionRecommendation && (
                    <div className="mt-3 flex items-start gap-2 text-sm">
                      <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{pred.preventionRecommendation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
