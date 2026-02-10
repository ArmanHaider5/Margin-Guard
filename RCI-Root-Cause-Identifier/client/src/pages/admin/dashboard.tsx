import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { RoleSwitcher } from "@/components/role-switcher";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { useRole } from "@/contexts/role-context";
import { 
  AlertTriangle,
  Building2, 
  ChevronRight,
  Brain,
  FolderOpen
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Client } from "@shared/schema";

interface AdminStats {
  totalClients: number;
  activeClients: number;
  totalAnalyses: number;
  totalDocuments: number;
  recentActivity: Array<{
    type: "client" | "analysis" | "document";
    id: string;
    name: string;
    date: string;
  }>;
}

export default function AdminDashboard() {
  const { isConsultant, isClient } = useRole();
  
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  const activeClients = clients?.filter(c => c.status === "active") || [];
  const recentAnalyses = stats?.recentActivity?.filter(a => a.type === "analysis") || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Brain className="w-7 h-7" />
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-admin-title">RCI Diagnostic Console</h1>
                <p className="text-sm text-muted-foreground">Counsellor View - Full Access</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ViewModeToggle />
              <RoleSwitcher />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2">
            {isConsultant && (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="w-full max-w-3xl mx-auto" data-testid="diagnostic-client-required">
                    <div className="flex items-center gap-3 mb-4">
                      <Brain className="w-8 h-8 text-foreground" />
                      <h2 className="text-2xl font-semibold tracking-tight">Run Diagnostic</h2>
                    </div>
                    <div className="bg-muted/50 border rounded-lg p-6 text-center">
                      <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Diagnostics must be run within a Client context.
                      </p>
                      <Link href="/admin/clients">
                        <Button data-testid="button-go-to-clients">
                          Select a Client to Continue
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isClient && (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Your Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View your diagnostic assessments in the Cases section.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Case Memory is displayed ONLY within the Client Overview - institutional rule */}
              <Link href="/knowledge">
                <Card className="cursor-pointer hover-elevate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                    <CardTitle className="text-sm font-medium">Knowledge Library</CardTitle>
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Root causes and recommendations</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Intelligence Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Active Diagnoses</span>
                    <span className="text-sm font-medium">{stats?.totalAnalyses || 0}</span>
                  </div>
                  {clientsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : activeClients.length > 0 ? (
                    <div className="space-y-1">
                      {activeClients.slice(0, 4).map((client) => (
                        <Link key={client.id} href={`/admin/clients/${client.id}`}>
                          <div className="flex items-center justify-between py-2 px-2 rounded hover-elevate cursor-pointer">
                            <span className="text-sm truncate">{client.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {client.industry?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">No active clients</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Awaiting Review</span>
                  </div>
                  {recentAnalyses.length > 0 ? (
                    <div className="space-y-1">
                      {recentAnalyses.slice(0, 3).map((activity, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-2 rounded">
                          <span className="text-sm truncate">{activity.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">No pending reviews</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isConsultant && (
                  <>
                    <Link href="/admin/knowledge">
                      <Button variant="outline" className="w-full justify-start" data-testid="button-rci-brain">
                        <Brain className="w-4 h-4 mr-2" />
                        RCI Brain
                      </Button>
                    </Link>
                    <Link href="/admin/cases">
                      <Button variant="outline" className="w-full justify-start" data-testid="button-case-memory">
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Case Memory
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
