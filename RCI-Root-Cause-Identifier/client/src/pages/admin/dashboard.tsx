import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
  Brain,
  FolderOpen,
  BarChart3,
  Users,
  FileSearch,
  ChevronRight,
  Activity,
  Clock,
  BookOpen,
  ArrowRight,
  Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Client } from "@shared/schema";
import HealthScoreCards from "../../../../server/frontend/dashboard/health-score-cards";
import RiskHeatmap from "../../../../server/frontend/dashboard/risk-heatmap";
import RootCausePanel from "../../../../server/frontend/dashboard/root-cause-panel";
import BenchmarkTable from "../../../../server/frontend/dashboard/benchmark-table";
import RoadmapPanel from "../../../../server/frontend/dashboard/roadmap-panel";

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
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

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

      {/* ── COMMAND CENTER HEADER ─────────────────────────────────── */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-foreground leading-tight" data-testid="text-admin-title">
                  Margin Guard Console
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isConsultant ? "Consultant View · Full Access" : "Client View"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ViewModeToggle />
              <RoleSwitcher />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">

        {/* ── KPI STAT STRIP ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Clients",
              value: statsLoading ? null : (stats?.totalClients ?? 0),
              icon: Users,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-900/20",
            },
            {
              label: "Active Clients",
              value: statsLoading ? null : (stats?.activeClients ?? 0),
              icon: Activity,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
            },
            {
              label: "Total Analyses",
              value: statsLoading ? null : (stats?.totalAnalyses ?? 0),
              icon: FileSearch,
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-50 dark:bg-violet-900/20",
            },
            {
              label: "Documents",
              value: statsLoading ? null : (stats?.totalDocuments ?? 0),
              icon: Layers,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 dark:bg-amber-900/20",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="p-5 shadow-sm border-border/80">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              {value === null ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground leading-none mb-1">{value}</p>
              )}
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
            </Card>
          ))}
        </div>

        {/* ── MAIN GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — main action area */}
          <div className="lg:col-span-2 space-y-6">

            {/* Run Diagnostic — Consultant view */}
            {isConsultant && (
              <Card className="overflow-hidden shadow-sm border-border/80" data-testid="diagnostic-client-required">
                <div className="px-6 py-5 border-b bg-muted/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Diagnostic Engine</p>
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Brain className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold tracking-tight text-foreground mb-1.5">Launch Diagnostic</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                        All diagnostics are run within a client context. Select an active client to begin evidence-driven root cause analysis.
                      </p>
                      <div className="flex items-center gap-3">
                        <Link href="/admin/clients">
                          <Button size="lg" className="font-semibold" data-testid="button-go-to-clients">
                            <Building2 className="w-4 h-4 mr-2" />
                            Select a Client
                            <ChevronRight className="w-4 h-4 ml-1.5 opacity-70" />
                          </Button>
                        </Link>
                        {activeClients.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {activeClients.length} active client{activeClients.length !== 1 ? "s" : ""} available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active clients quick-pick */}
                {!clientsLoading && activeClients.length > 0 && (
                  <div className="border-t bg-muted/10">
                    <div className="px-6 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Active Clients</p>
                      <div className="space-y-1">
                        {activeClients.slice(0, 4).map((client) => (
                          <Link key={client.id} href={`/admin/clients/${client.id}`}>
                            <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <span className="flex-1 text-sm font-medium truncate">{client.name}</span>
                              <Badge variant="outline" className="text-[10px] font-medium shrink-0">
                                {client.industry?.replace(/_/g, " ")}
                              </Badge>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Client view */}
            {isClient && (
              <Card className="overflow-hidden shadow-sm border-border/80">
                <div className="px-6 py-5 border-b bg-muted/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Dashboard</p>
                </div>
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">
                    View your diagnostic assessments in the Cases section.
                  </p>
                </div>
              </Card>
            )}

            {/* Diagnostic result panels */}
            {diagnosticResult && (
              <>
                <HealthScoreCards result={diagnosticResult} />
                <RiskHeatmap result={diagnosticResult} />
                <RootCausePanel result={diagnosticResult} />
                <BenchmarkTable result={diagnosticResult} />
                <RoadmapPanel result={diagnosticResult} />
              </>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">

            {/* Awaiting Review — priority queue */}
            <Card className="overflow-hidden shadow-sm border-border/80">
              <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Awaiting Review</p>
                  {recentAnalyses.length > 0 && (
                    <p className="text-sm font-semibold text-foreground">
                      {recentAnalyses.length} item{recentAnalyses.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                {recentAnalyses.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {recentAnalyses.length}
                  </span>
                )}
              </div>

              {recentAnalyses.length > 0 ? (
                <div className="divide-y">
                  {recentAnalyses.slice(0, 4).map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                      <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 mt-0.5">
                        <FileSearch className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate leading-tight">{activity.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <FileSearch className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-0.5">All clear</p>
                  <p className="text-xs text-muted-foreground">No analyses awaiting review</p>
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            {isConsultant && (
              <Card className="overflow-hidden shadow-sm border-border/80">
                <div className="px-5 py-4 border-b bg-muted/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</p>
                </div>
                <div className="p-3 space-y-1.5">

                  <Link href="/admin/knowledge">
                    <div
                      className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors group"
                      data-testid="button-rci-brain"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Brain className="w-4.5 h-4.5 text-primary" style={{ width: "1.125rem", height: "1.125rem" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">Margin Guard Brain</p>
                        <p className="text-xs text-muted-foreground">Knowledge base & root causes</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </div>
                  </Link>

                  <Link href="/admin/cases">
                    <div
                      className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors group"
                      data-testid="button-case-memory"
                    >
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <FolderOpen className="w-4.5 h-4.5 text-muted-foreground" style={{ width: "1.125rem", height: "1.125rem" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">Case Memory</p>
                        <p className="text-xs text-muted-foreground">Saved diagnostic cases</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </div>
                  </Link>

                  <Link href="/mgd">
                    <div
                      className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors group"
                      data-testid="button-mgd-diagnostics"
                    >
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <BarChart3 className="w-4.5 h-4.5 text-muted-foreground" style={{ width: "1.125rem", height: "1.125rem" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">MGD Diagnostics</p>
                        <p className="text-xs text-muted-foreground">Management growth dashboard</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </div>
                  </Link>

                  <Link href="/admin/clients">
                    <div
                      className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Users className="w-4.5 h-4.5 text-muted-foreground" style={{ width: "1.125rem", height: "1.125rem" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">Client Directory</p>
                        <p className="text-xs text-muted-foreground">Manage clients & organisations</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </div>
                  </Link>

                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
