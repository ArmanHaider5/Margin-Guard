import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { 
  Building2, 
  ChevronRight,
  BarChart3,
  Users,
  FileText,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Client, DiagnosticCase } from "@shared/schema";

interface AdminStats {
  totalClients: number;
  activeClients: number;
  totalAnalyses: number;
  totalDocuments: number;
}

interface RootCauseDistribution {
  category: string;
  count: number;
  percentage: number;
}

export default function ManagementDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  const { data: cases, isLoading: casesLoading } = useQuery<DiagnosticCase[]>({
    queryKey: ["/api/admin/cases"],
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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-7 h-7" />
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-management-title">Management View</h1>
                <p className="text-sm text-muted-foreground">Read-only diagnostics summary</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-clients">
                  {stats?.totalClients || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-active-clients">
                  {stats?.activeClients || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Diagnostics</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-diagnostics">
                  {cases?.length || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Root Causes Identified</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-root-causes">
                  {totalRootCauses}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Client Organizations</CardTitle>
              </CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : clients && clients.length > 0 ? (
                  <div className="space-y-2">
                    {clients.map((client) => (
                      <Link key={client.id} href={`/management/clients/${client.id}`}>
                        <div 
                          className="flex items-center justify-between p-3 rounded border hover-elevate cursor-pointer"
                          data-testid={`card-client-${client.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{client.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.industry?.replace(/_/g, " ")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={client.status === "active" ? "default" : "secondary"}>
                              {client.status}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No clients found
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">4M Root Cause Distribution</CardTitle>
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
                      <div key={dist.category} data-testid={`distribution-${dist.category.toLowerCase()}`}>
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
                    No diagnostic data available
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Recent Diagnostics</CardTitle>
              </CardHeader>
              <CardContent>
                {casesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : cases && cases.length > 0 ? (
                  <div className="space-y-2">
                    {cases.slice(0, 5).map((c, index) => (
                      <Link key={c.id} href={`/management/cases/${c.id}`}>
                        <div 
                          className="flex items-center justify-between py-2 px-2 rounded hover-elevate cursor-pointer"
                          data-testid={`recent-case-${c.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              Diagnostic #{index + 1}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.industry?.replace(/_/g, " ") || "General"} • {formatDistanceToNow(new Date(c.createdAt!), { addSuffix: true })}
                            </p>
                          </div>
                          <Badge variant={c.status === "finalised" ? "default" : "outline"} className="ml-2">
                            {c.status === "finalised" ? "Final" : "Draft"}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No diagnostics yet
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
