import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { 
  ArrowLeft, 
  Building2, 
  Calendar,
  FileText,
  BarChart3,
  Eye,
  Trash2,
  Loader2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, ClientAnalysis, DiagnosticCase } from "@shared/schema";

interface RootCauseDistribution {
  category: string;
  count: number;
  percentage: number;
}

export default function ManagementClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  // Client deletion is restricted to authorised roles for data hygiene.
  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      return await apiRequest("DELETE", `/api/admin/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Client deleted" });
      navigate("/management");
    },
    onError: (error) => {
      toast({ 
        title: "Deletion failed", 
        description: error instanceof Error ? error.message : "Failed to delete client",
        variant: "destructive" 
      });
    },
    onSettled: () => {
      setIsDeleting(false);
    }
  });

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["/api/admin/clients", id],
    enabled: !!id,
  });

  const { data: analyses, isLoading: analysesLoading } = useQuery<ClientAnalysis[]>({
    queryKey: ["/api/admin/clients", id, "analyses"],
    enabled: !!id,
  });

  const { data: cases, isLoading: casesLoading } = useQuery<DiagnosticCase[]>({
    queryKey: ["/api/admin/clients", id, "cases"],
    enabled: !!id,
  });

  const calculateRootCauseDistribution = (): RootCauseDistribution[] => {
    if (!cases || cases.length === 0) return [];

    const categoryCounts: Record<string, number> = {
      Money: 0,
      Manpower: 0,
      Material: 0,
      Machinery: 0,
    };

    let totalFindings = 0;

    cases.forEach(c => {
      const outputs = c.diagnosticOutputs as any;
      if (outputs?.findings) {
        outputs.findings.forEach((finding: any) => {
          const category = finding.category || finding.name;
          if (category && categoryCounts.hasOwnProperty(category)) {
            categoryCounts[category]++;
            totalFindings++;
          }
        });
      }
      if (outputs?.rootCauses) {
        outputs.rootCauses.forEach((cat: any) => {
          const categoryName = cat.name;
          if (categoryName && categoryCounts.hasOwnProperty(categoryName)) {
            const causeCount = cat.causes?.length || 0;
            categoryCounts[categoryName] += causeCount;
            totalFindings += causeCount;
          }
        });
      }
    });

    return Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: totalFindings > 0 ? Math.round((count / totalFindings) * 100) : 0,
    }));
  };

  const rootCauseDistribution = calculateRootCauseDistribution();
  const totalRootCauses = rootCauseDistribution.reduce((sum, d) => sum + d.count, 0);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Money": return "bg-emerald-500";
      case "Manpower": return "bg-blue-500";
      case "Material": return "bg-amber-500";
      case "Machinery": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const completedAnalyses = analyses?.filter(a => a.status === "completed") || [];
  const finalisedCases = cases?.filter(c => c.status === "finalised") || [];

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Client not found</p>
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
              <Building2 className="w-6 h-6 text-muted-foreground" />
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-client-name">
                  {client.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {client.industry?.replace(/_/g, " ")} • {client.programme || "No programme"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Read-Only
              </Badge>
              <ViewModeToggle />
              
              {/* Client deletion is restricted to authorised roles for data hygiene. */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive"
                    data-testid="button-delete-client"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-testid="dialog-delete-client">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Client</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the client, diagnostics, and documents.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteClientMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                      data-testid="button-confirm-delete"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={client.status === "active" ? "default" : "secondary"}>
                {client.status}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Analyses</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {analysesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-analyses-count">
                  {completedAnalyses.length}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Finalised Cases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-finalised-cases">
                  {finalisedCases.length}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Root Causes</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-root-causes">
                  {totalRootCauses}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Diagnostics Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {casesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : cases && cases.length > 0 ? (
                  <div className="space-y-3">
                    {cases.map((c, index) => {
                      const outputs = c.diagnosticOutputs as any;
                      const findingsCount = outputs?.findings?.length || 
                        outputs?.rootCauses?.reduce((sum: number, cat: any) => sum + (cat.causes?.length || 0), 0) || 0;
                      
                      return (
                        <div 
                          key={c.id}
                          className="p-4 rounded border"
                          data-testid={`case-summary-${c.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">
                                Diagnostic #{index + 1}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {format(new Date(c.createdAt!), "dd MMM yyyy")}
                                </span>
                                <span className="mx-1">•</span>
                                <span>{findingsCount} root causes identified</span>
                              </div>
                            </div>
                            <Badge variant={c.status === "finalised" ? "default" : "outline"}>
                              {c.status === "finalised" ? "Final" : "Draft"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No diagnostics for this client
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Analysis History</CardTitle>
              </CardHeader>
              <CardContent>
                {analysesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : completedAnalyses.length > 0 ? (
                  <div className="space-y-2">
                    {completedAnalyses.map((analysis, index) => (
                      <div 
                        key={analysis.id}
                        className="flex items-center justify-between py-2 px-3 rounded border"
                        data-testid={`analysis-${analysis.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">Analysis #{index + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(analysis.createdAt!), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {analysis.analysisType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No completed analyses
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">4M Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {casesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : totalRootCauses > 0 ? (
                  <div className="space-y-4">
                    {rootCauseDistribution.map((dist) => (
                      <div key={dist.category} data-testid={`client-distribution-${dist.category.toLowerCase()}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{dist.category}</span>
                          <span className="text-sm text-muted-foreground">
                            {dist.count} ({dist.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getCategoryColor(dist.category)} transition-all`}
                            style={{ width: `${dist.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No diagnostic data
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
