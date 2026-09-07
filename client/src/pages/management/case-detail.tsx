import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { 
  ArrowLeft, 
  Calendar,
  FileText,
  Eye,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import type { DiagnosticCase } from "@shared/schema";

export default function ManagementCaseDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: diagnosticCase, isLoading } = useQuery<DiagnosticCase>({
    queryKey: ["/api/admin/cases", id],
    enabled: !!id,
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Money": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400";
      case "Manpower": return "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400";
      case "Material": return "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400";
      case "Machinery": return "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-950 dark:text-gray-400";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "high": return <Badge variant="destructive">High</Badge>;
      case "medium": return <Badge variant="secondary">Medium</Badge>;
      case "low": return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!diagnosticCase) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Case not found</p>
          <Link href="/management">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const outputs = diagnosticCase.diagnosticOutputs as any;
  const findings = outputs?.findings || [];
  const rootCauses = outputs?.rootCauses || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/management">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <FileText className="w-6 h-6 text-muted-foreground" />
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-case-title">
                  Diagnostic Summary
                </h1>
                <p className="text-sm text-muted-foreground">
                  {diagnosticCase.industry?.replace(/_/g, " ") || "General Industry"} • {format(new Date(diagnosticCase.createdAt!), "dd MMM yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={diagnosticCase.status === "finalised" ? "default" : "outline"}>
                {diagnosticCase.status === "finalised" ? "Finalised" : "Draft"}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Read-Only
              </Badge>
              <ViewModeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Diagnostic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {format(new Date(diagnosticCase.createdAt!), "dd MMM yyyy, HH:mm")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">
                      {diagnosticCase.industry?.replace(/_/g, " ") || "Not specified"}
                    </p>
                  </div>
                </div>
                {/* Note: Executive summary and consultant notes are excluded from Management View */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Root Causes Identified
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rootCauses.length > 0 ? (
                  <div className="space-y-4">
                    {rootCauses.map((category: any, catIndex: number) => (
                      <div key={catIndex} className="space-y-2">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(category.name)}`}>
                          {category.name} ({category.causes?.length || 0})
                        </div>
                        <div className="space-y-2 pl-4">
                          {category.causes?.map((cause: any, causeIndex: number) => (
                            <div 
                              key={causeIndex}
                              className="flex items-center justify-between p-2 rounded border"
                              data-testid={`root-cause-${catIndex}-${causeIndex}`}
                            >
                              <p className="font-medium text-sm">{cause.title}</p>
                              {getSeverityBadge(cause.severity)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : findings.length > 0 ? (
                  <div className="space-y-3">
                    {findings.map((finding: any, index: number) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 rounded border"
                        data-testid={`finding-${index}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(finding.category)}`}>
                            {finding.category}
                          </div>
                          <p className="font-medium text-sm">{finding.title}</p>
                        </div>
                        {getSeverityBadge(finding.severity)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No root causes recorded
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">4M Category Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const categoryCounts: Record<string, number> = {
                    Money: 0,
                    Manpower: 0,
                    Material: 0,
                    Machinery: 0,
                  };

                  if (rootCauses.length > 0) {
                    rootCauses.forEach((cat: any) => {
                      if (categoryCounts.hasOwnProperty(cat.name)) {
                        categoryCounts[cat.name] += cat.causes?.length || 0;
                      }
                    });
                  } else if (findings.length > 0) {
                    findings.forEach((f: any) => {
                      if (f.category && categoryCounts.hasOwnProperty(f.category)) {
                        categoryCounts[f.category]++;
                      }
                    });
                  }

                  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

                  if (total === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No category data
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {Object.entries(categoryCounts).map(([cat, count]) => (
                        <div key={cat} className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium">{cat}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                      <div className="border-t pt-3 flex items-center justify-between">
                        <span className="text-sm font-medium">Total</span>
                        <Badge>{total}</Badge>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
