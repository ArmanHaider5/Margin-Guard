import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveIcon, RefreshCw, Play, Search, Filter, Trash2,
  Eye, Monitor, FileDown, Calendar, Building2,
  TrendingUp, Users, AlertTriangle, AlertCircle, CheckCircle2,
  ChevronUp, ChevronDown, ChevronsUpDown, FileText, Clock,
  BarChart3, Layers,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoredMGDReport {
  id:          string;
  clientId?:   string;
  clientName?: string;
  industry?:   string;
  createdAt:   string;
  runtimeMs:   number;
  report: {
    metadata: {
      generatedAt:             string;
      clientName?:             string;
      industry?:               string;
      operationalHealthScore?: number;
      reportVersion:           string;
    };
    visualMetrics: {
      operationalHealthLabel: string;
      operationalRiskLevel:   string;
      benchmarkStatusBreakdown: { healthy: number; watchlist: number; elevated: number; critical: number };
    };
    summary: {
      criticalFindings:            number;
      highFindings:                number;
      criticalRootCauses:          number;
      highPriorityRecommendations: number;
      benchmarkAlerts:             number;
    };
  };
}

type SortKey = "newest" | "oldest";

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthScore(r: StoredMGDReport): number {
  return r.report?.metadata?.operationalHealthScore ?? 0;
}

function riskLevel(r: StoredMGDReport): string {
  return r.report?.visualMetrics?.operationalRiskLevel ?? "unknown";
}

function industryLabel(raw?: string): string {
  return (raw ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Fnb/g, "F&B")
    .replace(/Qsr/g, "QSR") || "—";
}

function relTime(iso: string): string {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return "—"; }
}

function fmtDate(iso: string): string {
  try { return format(new Date(iso), "dd MMM yyyy, HH:mm"); } catch { return "—"; }
}

// ── Health score config ───────────────────────────────────────────────────────

function healthConfig(score: number) {
  if (score >= 80) return { label: "Healthy",       color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", bar: "bg-emerald-500" };
  if (score >= 65) return { label: "Watchlist",     color: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/30",    bar: "bg-blue-500"    };
  if (score >= 50) return { label: "Elevated Risk", color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/30",   bar: "bg-amber-500"   };
  return               { label: "Critical",        color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/30",     bar: "bg-red-500"     };
}

function HealthBadge({ score }: { score: number }) {
  const { label, color, bg, border } = healthConfig(score);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${bg} ${color} ${border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${healthConfig(score).bar}`} />
      {score > 0 ? `${score}  ${label}` : label}
    </span>
  );
}

function HealthBar({ score }: { score: number }) {
  const { bar } = healthConfig(score);
  return (
    <div className="flex items-center gap-2 mt-0.5">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-white/40">{score || "—"}</span>
    </div>
  );
}

// ── Glass building blocks ─────────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, accent = "#3b82f6", loading = false,
}: {
  label: string; value: string | number; icon: React.ElementType; accent?: string; loading?: boolean;
}) {
  return (
    <GlassCard className="p-5 relative overflow-hidden group hover:bg-white/[0.07] transition-all duration-300">
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)`, transform: "translate(30%,-30%)" }}
      />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-20 rounded bg-white/10 animate-pulse mb-1" />
      ) : (
        <div className="text-3xl font-bold text-white tracking-tight leading-none mb-1">{value}</div>
      )}
      <div className="text-[11px] text-white/40 uppercase tracking-widest">{label}</div>
    </GlassCard>
  );
}

// ── Sort header cell ──────────────────────────────────────────────────────────

function SortCell({
  label, active, dir, onSort,
}: { label: string; active: boolean; dir: "asc" | "desc"; onSort: () => void }) {
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <button
      onClick={onSort}
      className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest transition-colors
        ${active ? "text-white" : "text-white/35 hover:text-white/60"}`}
    >
      {label}
      <Icon className="w-3 h-3" />
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <ArchiveIcon className="w-7 h-7 text-white/25" />
      </div>
      <div className="text-center">
        <p className="text-white/50 text-sm font-medium">No reports available yet</p>
        <p className="text-white/25 text-xs mt-1">Run a diagnostic to generate your first report</p>
      </div>
      <Link href="/mgd/run">
        <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium hover:bg-blue-500/30 transition-all">
          <Play className="w-3.5 h-3.5" />
          Run First Diagnostic
        </a>
      </Link>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "All Industries",
  "event_management", "manufacturing", "retail", "logistics",
  "food_and_beverage", "healthcare", "construction",
];

export default function MGDReportArchive() {
  const [, navigate]      = useLocation();
  const queryClient       = useQueryClient();
  const [search, setSearch]     = useState("");
  const [industry, setIndustry] = useState("All Industries");
  const [sort, setSort]         = useState<SortKey>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const { data, isLoading, refetch, isFetching } = useQuery<{ success: boolean; reports: StoredMGDReport[] }>({
    queryKey: ["/api/mgd/reports"],
    queryFn: async () => {
      const res = await fetch("/api/mgd/reports");
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    refetchInterval: false,
  });

  const reports: StoredMGDReport[] = data?.reports ?? [];

  // ── Delete mutation ────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      const res = await fetch(`/api/mgd/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mgd/reports"] });
      setConfirmId(null);
    },
    onSettled: () => setDeletingId(null),
  });

  // ── PDF export ─────────────────────────────────────────────────────────────

  async function handleExportPdf(r: StoredMGDReport) {
    try {
      setPdfLoadingId(r.id);
      const res = await fetch("/api/mgd/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findings:        r.report.summary ? [] : [],
          rootCauses:      [],
          recommendations: [],
          benchmarks:      [],
          narrative:       null,
          report:          r.report,
        }),
      });
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `MGD-Report-${r.clientName ?? r.id.slice(0, 8)}-${r.createdAt.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[MGD][ARCHIVE] PDF export failed:", e);
    } finally {
      setPdfLoadingId(null);
    }
  }

  // ── View / Present — store in sessionStorage then navigate ─────────────────

  function handleView(r: StoredMGDReport) {
    try { sessionStorage.setItem("mgd-selected-report", JSON.stringify(r.report)); } catch {}
    navigate("/mgd/report");
  }

  function handlePresent(r: StoredMGDReport) {
    try { sessionStorage.setItem("mgd-selected-report", JSON.stringify(r.report)); } catch {}
    navigate("/mgd/present");
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...reports];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        (r.clientName ?? "").toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }

    if (industry !== "All Industries") {
      list = list.filter(r => r.industry === industry);
    }

    list.sort((a, b) =>
      sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt)
    );

    return list;
  }, [reports, search, industry, sort]);

  const stats = useMemo(() => {
    const total   = reports.length;
    const latest  = reports.length ? reports.reduce((a, b) => a.createdAt > b.createdAt ? a : b).createdAt : null;
    const clients = new Set(reports.map(r => r.clientId ?? r.clientName ?? r.id)).size;
    const scores  = reports.map(healthScore).filter(s => s > 0);
    const avg     = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    return { total, latest, clients, avg };
  }, [reports]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #060a13 0%, #070b14 50%, #060c15 100%)" }}>
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-7">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <ArchiveIcon className="w-4 h-4 text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">MGD Report Archive</h1>
            </div>
            <p className="text-sm text-white/40">Historical diagnostics, reports and operational reviews.</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link href="/mgd/run">
              <a className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/35 text-blue-300 text-sm font-medium hover:bg-blue-500/30 transition-all">
                <Play className="w-3.5 h-3.5" />
                Run New Diagnostic
              </a>
            </Link>
          </div>
        </div>

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-1.5 text-[11px] text-white/30">
          <Link href="/mgd"><a className="hover:text-white/60 transition-colors">Dashboard</a></Link>
          <span>/</span>
          <span className="text-white/50">Report Archive</span>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Reports"      value={isLoading ? "…" : stats.total}                                      icon={FileText}  accent="#8b5cf6" loading={isLoading} />
          <StatCard label="Latest Report"      value={isLoading ? "…" : (stats.latest ? relTime(stats.latest) : "None")} icon={Calendar}  accent="#3b82f6" loading={isLoading} />
          <StatCard label="Unique Clients"     value={isLoading ? "…" : stats.clients}                                    icon={Users}     accent="#10b981" loading={isLoading} />
          <StatCard label="Avg Health Score"   value={isLoading ? "…" : (stats.avg ? `${stats.avg}` : "N/A")}            icon={BarChart3} accent="#f59e0b" loading={isLoading} />
        </div>

        {/* ── Search & Filter Bar ── */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by client name or report ID…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Industry filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 focus:outline-none focus:border-white/25 transition-all appearance-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                {INDUSTRIES.map(i => (
                  <option key={i} value={i} style={{ background: "#0a0f1c" }}>
                    {i === "All Industries" ? "All Industries" : industryLabel(i)}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1 rounded-lg border border-white/10 overflow-hidden">
              {(["newest", "oldest"] as SortKey[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all
                    ${sort === s ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60 hover:bg-white/5"}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Result count */}
            {!isLoading && (
              <span className="text-[11px] text-white/30 ml-auto">
                {filtered.length} of {reports.length} report{reports.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </GlassCard>

        {/* ── Reports Table ── */}
        <GlassCard className="overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.07]">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Client</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Industry</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Created</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Health Score</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Risk Level</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Actions</span>
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="divide-y divide-white/[0.05]">
              {[1, 2, 3].map(i => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 animate-pulse">
                  <div className="h-4 rounded bg-white/10 w-3/4" />
                  <div className="h-4 rounded bg-white/10 w-1/2" />
                  <div className="h-4 rounded bg-white/10 w-2/3" />
                  <div className="h-4 rounded bg-white/10 w-1/2" />
                  <div className="h-4 rounded bg-white/10 w-1/2" />
                  <div className="h-4 rounded bg-white/10 w-20" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filtered.length === 0 && <EmptyState />}

          {/* Rows */}
          {!isLoading && filtered.length > 0 && (
            <div className="divide-y divide-white/[0.05]">
              {filtered.map(r => {
                const score = healthScore(r);
                const risk  = riskLevel(r);
                const { color, bg, border } = healthConfig(score);
                const isDeleting = deletingId === r.id;
                const isPdfLoading = pdfLoadingId === r.id;

                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 hover:bg-white/[0.035] transition-all group"
                  >
                    {/* Client */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {r.clientName ?? <span className="text-white/30 italic">Unnamed Client</span>}
                      </p>
                      <p className="text-[10px] text-white/25 font-mono mt-0.5">{r.id.slice(0, 12)}…</p>
                    </div>

                    {/* Industry */}
                    <div className="flex items-center">
                      <span className="text-[12px] text-white/50">{industryLabel(r.industry)}</span>
                    </div>

                    {/* Created */}
                    <div className="min-w-0">
                      <p className="text-[12px] text-white/60">{relTime(r.createdAt)}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{fmtDate(r.createdAt)}</p>
                    </div>

                    {/* Health Score */}
                    <div className="min-w-0 flex flex-col justify-center">
                      {score > 0 ? (
                        <>
                          <span className={`text-sm font-bold ${color}`}>{score}</span>
                          <HealthBar score={score} />
                        </>
                      ) : (
                        <span className="text-[12px] text-white/25 italic">N/A</span>
                      )}
                    </div>

                    {/* Risk Level */}
                    <div className="flex items-center">
                      {risk && risk !== "unknown" ? (
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${bg} ${color} ${border}`}>
                          {risk.charAt(0).toUpperCase() + risk.slice(1)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/25">—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* View */}
                      <button
                        onClick={() => handleView(r)}
                        title="View Report"
                        className="w-7 h-7 rounded flex items-center justify-center text-white/40 hover:text-blue-400 hover:bg-blue-500/15 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Present */}
                      <button
                        onClick={() => handlePresent(r)}
                        title="Present"
                        className="w-7 h-7 rounded flex items-center justify-center text-white/40 hover:text-violet-400 hover:bg-violet-500/15 transition-all"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>

                      {/* Export PDF */}
                      <button
                        onClick={() => handleExportPdf(r)}
                        disabled={isPdfLoading}
                        title="Export PDF"
                        className="w-7 h-7 rounded flex items-center justify-center text-white/40 hover:text-emerald-400 hover:bg-emerald-500/15 transition-all disabled:opacity-40"
                      >
                        {isPdfLoading
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <FileDown className="w-3.5 h-3.5" />
                        }
                      </button>

                      {/* Delete */}
                      {confirmId === r.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => deleteMutation.mutate(r.id)}
                            disabled={isDeleting}
                            className="px-2 py-1 rounded text-[10px] font-semibold bg-red-500/20 border border-red-500/35 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50"
                          >
                            {isDeleting ? "…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-2 py-1 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(r.id)}
                          title="Delete Report"
                          className="w-7 h-7 rounded flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/15 transition-all ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between text-[11px] text-white/20 pt-2">
          <span>MGD Report Archive · Scope Optix Sdn. Bhd.</span>
          <span>{reports.length} report{reports.length !== 1 ? "s" : ""} stored locally</span>
        </div>

      </div>
    </div>
  );
}
