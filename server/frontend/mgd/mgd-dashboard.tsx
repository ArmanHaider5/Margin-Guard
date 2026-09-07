import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, BarChart3, Building2,
  ChevronRight, FileText, Layers,
  Monitor, Play, Plus,
  Users,
  Circle, ArrowRight,
  Database, Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalClients:   number;
  activeClients:  number;
  totalAnalyses:  number;
  totalDocuments: number;
  recentActivity: Array<{ type: "client" | "analysis" | "document"; id: string; name: string; date: string; }>;
}

interface Client {
  id:           string;
  clientName:   string;
  industry:     string;
  status:       string;
  createdAt:    string;
  updatedAt?:   string;
}

// ── Utility helpers ───────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return "—"; }
}

function industryLabel(raw: string): string {
  return (raw ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Fnb/g, "F&B")
    .replace(/Qsr/g, "QSR") || "—";
}

const ACT_ICONS: Record<string, React.ElementType> = {
  analysis: BarChart3,
  document: FileText,
  client:   Users,
};

const ACT_COLORS: Record<string, string> = {
  analysis: "text-blue-400 bg-blue-500/15",
  document: "text-violet-400 bg-violet-500/15",
  client:   "text-emerald-400 bg-emerald-500/15",
};

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return <>{val}</>;
}

// ── Helper components ─────────────────────────────────────────────────────────

function GlassCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function ExecutiveStatCard({
  label, value, sub, icon: Icon, accent = "#3b82f6", loading = false,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; accent?: string; loading?: boolean;
}) {
  return (
    <GlassCard className="p-5 relative overflow-hidden group hover:bg-white/8 transition-all duration-300">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-15 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)`, transform: "translate(30%, -30%)" }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
          <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 rounded bg-white/10 animate-pulse mb-1" />
      ) : (
        <div className="text-3xl font-bold text-white tracking-tight leading-none mb-1">
          {typeof value === "number" ? <AnimCounter target={value} /> : value}
        </div>
      )}
      <div className="text-[10px] font-medium uppercase tracking-widest text-white/35">{label}</div>
      {sub && <div className="text-[10px] text-white/20 mt-1">{sub}</div>}
    </GlassCard>
  );
}

function ClientHealthCard({ client }: { client: Client }) {
  // No live per-client health score exists yet outside a completed
  // diagnostic run (server/mgd/report-store.ts holds one per report, not
  // per client) — shown honestly as "not yet assessed" rather than a
  // fabricated number. This card previously showed Math.random()-generated
  // placeholder score; a real per-client rollup is future work, not
  // invented here.
  return (
    <Link href="/mgd/diagnostic">
      <GlassCard className="p-4 cursor-pointer hover:bg-white/8 hover:border-white/20 transition-all duration-300 group relative overflow-hidden">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-semibold text-sm text-white leading-snug mb-0.5 group-hover:text-blue-200 transition-colors">
              {client.clientName}
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-white/40">
              {industryLabel(client.industry)}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-medium text-white/25 italic">Not yet assessed</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${client.status === "active" ? "bg-emerald-400" : "bg-white/20"}`} />
            <span className="text-[10px] text-white/30 capitalize">{client.status}</span>
          </div>
          <span className="text-[9px] text-white/20">{relativeTime(client.updatedAt ?? client.createdAt)}</span>
        </div>
        <ChevronRight className="absolute bottom-4 right-4 w-3.5 h-3.5 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
      </GlassCard>
    </Link>
  );
}

function ActivityTimeline({ items }: { items: AdminStats["recentActivity"] }) {
  // Only real activity from GET /api/admin/stats is shown — this used to
  // unconditionally append three fixed, fictional entries ("PDF Report
  // generated — Acme Events Sdn. Bhd." etc.) to every render, interleaved
  // with genuine activity so the two were visually indistinguishable.
  if (items.length === 0) {
    return (
      <div className="py-6 flex flex-col items-center gap-2 text-center">
        <Circle className="w-5 h-5 text-white/15" />
        <p className="text-xs text-white/25">No recent activity yet.</p>
      </div>
    );
  }

  const augmented = items
    .map(i => ({ ...i, icon: ACT_ICONS[i.type] ?? Activity, colorCls: ACT_COLORS[i.type] ?? "text-blue-400 bg-blue-500/15" }))
    .slice(0, 8);

  return (
    <div className="space-y-1">
      {augmented.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="flex items-start gap-3 py-2 group">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${item.colorCls}`}>
                <Icon className="w-3 h-3" />
              </div>
              {i < augmented.length - 1 && <div className="w-px h-3 bg-white/10 mt-1" />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="text-xs text-white/55 leading-snug truncate group-hover:text-white/75 transition-colors">
                {item.name}
              </div>
              <div className="text-[9px] text-white/20 mt-0.5">{relativeTime(item.date)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── First-Client Empty State ──────────────────────────────────────────────────
// Shown in place of the Intelligence Run Panel when the consultant/admin has
// zero client organizations — deterministic on `clients.length === 0` from
// the real GET /api/admin/clients response, never a first-login flag or any
// invented state. A diagnostic genuinely cannot run without a client to
// attach it to (server/system/routes.ts's own institutional rule), so an
// enabled-looking run panel with a disabled selector is actively misleading
// here; this replaces it with an honest, intentional empty state instead.

function FirstClientEmptyState() {
  return (
    <GlassCard className="p-8 sm:p-10 h-full relative overflow-hidden text-center">
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }} />
      <div className="relative z-10 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Your diagnostic workspace is ready.</h2>
        <p className="text-sm text-white/40 mb-6">No client organizations have been created yet.</p>
        <Link href="/admin/clients/new">
          <button className="inline-flex items-center gap-2 py-3 px-6 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300">
            <Plus className="w-4 h-4" />
            Create Your First Client
          </button>
        </Link>
        <p className="text-xs text-white/25 mt-5 leading-relaxed">
          Create a client organization to begin collecting evidence, capturing observations, and running a diagnostic.
        </p>
      </div>
    </GlassCard>
  );
}

// ── Intelligence Run Panel ────────────────────────────────────────────────────

function IntelligenceRunPanel({ clients }: { clients: Client[] }) {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const activeClient = clients.find(c => c.id === selectedClient);

  return (
    <GlassCard className="p-6 h-full relative overflow-hidden">
      {/* Ambient gradient */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }} />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-5 pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }} />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ boxShadow: "0 0 6px #60a5fa" }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70">Intelligence Engine</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Launch Diagnostic Run</h2>
        <p className="text-xs text-white/35 mb-6 leading-relaxed">
          Select a client and execute the MGD operational intelligence pipeline — findings, root causes, benchmarks, and narrative in one run.
        </p>

        {/* Client selector */}
        <div className="mb-4">
          <label className="text-[9px] font-bold uppercase tracking-widest text-white/30 block mb-2">Client</label>
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all appearance-none"
          >
            <option value="" className="bg-slate-900 text-white/60">— Select client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                {c.clientName}
              </option>
            ))}
          </select>
        </div>

        {/* Industry display */}
        {activeClient && (
          <div className="mb-4 p-3 rounded-lg bg-white/3 border border-white/8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Industry</div>
                <div className="text-sm text-white/70">{industryLabel(activeClient.industry)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-emerald-400/70 capitalize">{activeClient.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <Link href="/mgd/diagnostic">
          <button className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg font-semibold text-sm transition-all duration-300 ${
            selectedClient
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
              : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
          }`}>
            <Play className="w-4 h-4" />
            {selectedClient ? `Run Diagnostic — ${activeClient?.clientName}` : "Select a client to begin"}
            {selectedClient && <ArrowRight className="w-3.5 h-3.5 ml-auto" />}
          </button>
        </Link>
      </div>
    </GlassCard>
  );
}

// ── Live pulse indicator ───────────────────────────────────────────────────────

function LivePulse() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center w-3 h-3">
        <div className="absolute w-3 h-3 rounded-full bg-emerald-400 opacity-30 animate-ping" />
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
      </div>
      <span className="text-[10px] font-medium text-emerald-400/70 uppercase tracking-wider">
        Systems Operational
      </span>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, sub, icon: Icon, action }: {
  title: string; sub?: string; icon?: React.ElementType; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-white/40" />
          </div>
        )}
        <div>
          <h2 className="text-sm font-bold text-white/90">{title}</h2>
          {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function MGDDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  const allClients   = clients ?? [];
  const activeList   = allClients.filter(c => c.status === "active");
  const recentAct    = stats?.recentActivity ?? [];

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #060a13 0%, #0c1424 55%, #060e1c 100%)" }}
    >
      {/* Ambient orbs */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)", transform: "translate(-30%, -30%)" }} />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.03]"
        style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)", transform: "translate(30%, 30%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">

        {/* ── SECTION 1 — Executive Hero Strip ─────────────────────────────── */}
        <div className="mb-8">
          {/* Top identity row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LivePulse />
                <span className="text-white/15">·</span>
                <span className="text-[10px] text-white/20 uppercase tracking-widest">Margin Guard</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
                Margin Guard{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Diagnostics
                </span>
              </h1>
              <p className="text-sm text-white/35 mt-1.5 max-w-md leading-relaxed">
                Deterministic operational diagnostics — findings, root causes, benchmarks, and executive narrative in a single pipeline.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/mgd">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-white/60 hover:text-white/80 border border-white/10 transition-all">
                  <Layers className="w-3.5 h-3.5" />
                  Dashboard
                </button>
              </Link>
              <Link href="/mgd/diagnostic">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold text-white transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
                  <Play className="w-3.5 h-3.5" />
                  New Diagnostic
                </button>
              </Link>
              <Link href="/mgd/reports">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-white/60 hover:text-white/80 border border-white/10 transition-all">
                  <FileText className="w-3.5 h-3.5" />
                  Reports
                </button>
              </Link>
              <Link href="/mgd/present">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-white/60 hover:text-white/80 border border-white/10 transition-all">
                  <Monitor className="w-3.5 h-3.5" />
                  Present
                </button>
              </Link>
              <Link href="/mgd/report">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-white/60 hover:text-white/80 border border-white/10 transition-all">
                  <FileText className="w-3.5 h-3.5" />
                  Report Viewer
                </button>
              </Link>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ExecutiveStatCard
              label="Total Clients"
              value={stats?.totalClients ?? 0}
              sub="registered in system"
              icon={Users}
              accent="#3b82f6"
              loading={statsLoading}
            />
            <ExecutiveStatCard
              label="Active Clients"
              value={stats?.activeClients ?? 0}
              sub="status = active"
              icon={Activity}
              accent="#10b981"
              loading={statsLoading}
            />
            <ExecutiveStatCard
              label="Reports Generated"
              value={stats?.totalAnalyses ?? 0}
              sub="analyses completed"
              icon={BarChart3}
              accent="#8b5cf6"
              loading={statsLoading}
            />
            <ExecutiveStatCard
              label="Documents Processed"
              value={stats?.totalDocuments ?? 0}
              sub="across all clients"
              icon={Database}
              accent="#0ea5e9"
              loading={statsLoading}
            />
          </div>
        </div>

        {/* ── SECTION 2 — Run Panel ─────────────────────────────────────── */}
        {/*
          Previously shared this row with an "Operational Attention" panel
          (MOCK_ATTENTION — fabricated client alerts with fake severities and
          metrics). No real alerting/attention-queue system exists behind
          that panel at all, so it was removed rather than replaced with an
          empty state for a feature that was never real. Run Panel now takes
          the full row.
        */}
        <div className="mb-6">
          {clientsLoading ? (
            <GlassCard className="p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
              <div className="h-8 bg-white/10 rounded w-2/3 mb-6" />
              <div className="h-10 bg-white/10 rounded mb-4" />
              <div className="h-10 bg-white/10 rounded" />
            </GlassCard>
          ) : allClients.length === 0 ? (
            <FirstClientEmptyState />
          ) : (
            <IntelligenceRunPanel clients={allClients} />
          )}
        </div>

        {/* ── SECTION 3 — Active Clients Grid ──────────────────────────────── */}
        <div className="mb-6">
          <SectionHeader
            title="Active Clients"
            sub={`${activeList.length} client${activeList.length !== 1 ? "s" : ""} under operational monitoring`}
            icon={Building2}
            action={
              <Link href="/admin/clients">
                <button className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                  <span>View all</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </Link>
            }
          />
          {clientsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0,1,2].map(i => (
                <GlassCard key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
                  <div className="h-2 bg-white/10 rounded mb-4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </GlassCard>
              ))}
            </div>
          ) : activeList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeList.map(c => <ClientHealthCard key={c.id} client={c} />)}
            </div>
          ) : (
            <GlassCard className="p-8 text-center">
              <Users className="w-8 h-8 text-white/15 mx-auto mb-3" />
              <p className="text-sm text-white/30">No active clients yet.</p>
              <Link href="/admin/clients/new">
                <button className="mt-3 text-xs text-blue-400/60 hover:text-blue-400 transition-colors flex items-center gap-1 mx-auto">
                  <Plus className="w-3 h-3" /> Add first client
                </button>
              </Link>
            </GlassCard>
          )}
        </div>

        {/* ── SECTION 5 — Activity Feed ─────────────────────────────────── */}
        {/*
          Previously a 3-column row: this feed, a "Quick Actions" dock
          duplicating the hero-strip nav above, and a "Pipeline Status" card
          whose four "Operational" badges had no real health check behind
          them at all (see the removed Pipeline Modules/Pipeline Status
          blocks). Both were removed rather than replaced — the hero strip
          is now this dashboard's one navigation surface (see its own
          comment above), and no real per-engine health signal exists to
          honestly show in Pipeline Status's place.
        */}
        <div>
          <GlassCard className="p-4">
            <SectionHeader
              title="Intelligence Activity Feed"
              sub="Diagnostics, reports, and pipeline events"
              icon={Activity}
              action={
                <div className="flex items-center gap-1.5 text-[9px] text-white/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
              }
            />
            {statsLoading ? (
              <div className="space-y-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-6 h-6 rounded-md bg-white/10 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-white/10 rounded w-3/4 mb-1.5" />
                      <div className="h-2 bg-white/10 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActivityTimeline items={recentAct} />
            )}
          </GlassCard>
        </div>

        {/* Footer */}
        {/*
          Previously duplicated a third copy of the same destinations already
          in the hero strip above (plus /admin, which renders this identical
          component). The hero strip is now this dashboard's one navigation
          surface; /admin/clients remains reachable via "Active Clients →
          View all" above, so nothing genuinely useful was dropped.
        */}
        <div className="mt-10 pt-6 border-t border-white/5">
          <div className="text-[9px] text-white/15 uppercase tracking-widest">
            Margin Guard Diagnostics · Scope Optix Sdn. Bhd.
          </div>
        </div>

      </div>
    </div>
  );
}
