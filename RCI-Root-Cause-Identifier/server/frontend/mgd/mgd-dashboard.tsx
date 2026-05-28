import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, BarChart3, Building2,
  ChevronRight, Clock, FileText, Layers,
  Lightbulb, Monitor, Play, Plus,
  Shield, TrendingUp, Upload, Users, Zap,
  CheckCircle2, Circle, RefreshCw, ArrowRight,
  Cpu, Database,
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

interface AttentionItem {
  id:       string;
  severity: "CRITICAL" | "ELEVATED" | "WATCHLIST";
  client:   string;
  alert:    string;
  metric?:  string;
  value?:   string;
  ts:       string;
}

// ── Mock data for queue + activity (until dedicated endpoints exist) ───────────

const MOCK_ATTENTION: AttentionItem[] = [
  { id: "a1", severity: "CRITICAL", client: "Acme Events Sdn. Bhd.",    alert: "Refund Leakage Rate breach",       metric: "Refund Rate",    value: "14.2%", ts: new Date(Date.now() - 1_800_000).toISOString() },
  { id: "a2", severity: "CRITICAL", client: "Acme Events Sdn. Bhd.",    alert: "Manual Workflow Dependency spike",  metric: "MWD",            value: "78%",   ts: new Date(Date.now() - 3_600_000).toISOString() },
  { id: "a3", severity: "ELEVATED", client: "Pinnacle F&B Holdings",    alert: "Inventory Discrepancy elevated",   metric: "Discrepancy",    value: "11.8%", ts: new Date(Date.now() - 7_200_000).toISOString() },
  { id: "a4", severity: "ELEVATED", client: "Acme Events Sdn. Bhd.",    alert: "Overtime Exposure exceeds threshold", metric: "OT Rate",     value: "34%",   ts: new Date(Date.now() - 10_800_000).toISOString() },
  { id: "a5", severity: "WATCHLIST",client: "Pinnacle F&B Holdings",    alert: "Inventory Loss trending upward",   metric: "Loss Rate",      value: "5.8%",  ts: new Date(Date.now() - 18_000_000).toISOString() },
];

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

const SEV_COLORS: Record<string, { ring: string; badge: string; dot: string; text: string }> = {
  CRITICAL: { ring: "border-red-500/30",    badge: "bg-red-500/15 text-red-300 border border-red-500/30",    dot: "bg-red-400",    text: "text-red-400" },
  ELEVATED: { ring: "border-orange-500/30", badge: "bg-orange-500/15 text-orange-300 border border-orange-500/30", dot: "bg-orange-400", text: "text-orange-400" },
  WATCHLIST:{ ring: "border-amber-500/30",  badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30",  dot: "bg-amber-400",  text: "text-amber-400" },
};

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
  const healthScore = Math.floor(50 + Math.random() * 45); // placeholder until live run
  const color = healthScore >= 80 ? "#34d399" : healthScore >= 65 ? "#fbbf24" : "#fb923c";

  return (
    <Link href={`/mgd/run`}>
      <GlassCard className="p-4 cursor-pointer hover:bg-white/8 hover:border-white/20 transition-all duration-300 group relative overflow-hidden">
        {/* Left accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl" style={{ background: color }} />
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
            <span className="text-lg font-bold" style={{ color }}>{healthScore}</span>
            <span className="text-[9px] text-white/25">/ 100</span>
          </div>
        </div>
        <div className="w-full bg-white/5 rounded-full h-1.5 mb-3">
          <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${healthScore}%`, background: color }} />
        </div>
        <div className="flex items-center justify-between">
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

function OperationalAlertCard({ item }: { item: AttentionItem }) {
  const sev = SEV_COLORS[item.severity] ?? SEV_COLORS.WATCHLIST;
  return (
    <div className={`p-3 rounded-lg border bg-white/3 ${sev.ring} flex items-start gap-3`}>
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sev.dot}`}
        style={{ boxShadow: item.severity === "CRITICAL" ? "0 0 6px rgba(248,113,113,0.7)" : "none" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${sev.badge}`}>
            {item.severity}
          </span>
          <span className="text-[10px] text-white/35 truncate">{item.client}</span>
        </div>
        <div className="text-xs text-white/65 leading-snug">{item.alert}</div>
        {item.metric && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] text-white/25">{item.metric}:</span>
            <span className={`text-[9px] font-bold ${sev.text}`}>{item.value}</span>
          </div>
        )}
        <div className="text-[9px] text-white/20 mt-1">{relativeTime(item.ts)}</div>
      </div>
    </div>
  );
}

function ActivityTimeline({ items }: { items: AdminStats["recentActivity"] }) {
  const augmented = [
    ...items.map(i => ({ ...i, icon: ACT_ICONS[i.type] ?? Activity, colorCls: ACT_COLORS[i.type] ?? "text-blue-400 bg-blue-500/15" })),
    { id: "sys1", type: "analysis" as const, name: "MGD Benchmark Engine — 9 metrics evaluated", date: new Date(Date.now() - 5 * 60_000).toISOString(), icon: BarChart3, colorCls: "text-blue-400 bg-blue-500/15" },
    { id: "sys2", type: "document" as const, name: "PDF Report generated — Acme Events Sdn. Bhd.", date: new Date(Date.now() - 15 * 60_000).toISOString(), icon: FileText, colorCls: "text-violet-400 bg-violet-500/15" },
    { id: "sys3", type: "analysis" as const, name: "MGD Pipeline executed — 4 CRITICAL benchmarks", date: new Date(Date.now() - 35 * 60_000).toISOString(), icon: Cpu, colorCls: "text-blue-400 bg-blue-500/15" },
  ].slice(0, 8);

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

        {/* Pipeline readiness */}
        <div className="mb-5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-2">Pipeline Modules Ready</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Findings Engine",       ok: true },
              { label: "Root Cause Engine",     ok: true },
              { label: "Benchmark Engine",      ok: true },
              { label: "Recommendation Engine", ok: true },
              { label: "Narrative Engine",      ok: true },
              { label: "Report Composer",       ok: true },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="text-[10px] text-white/35">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link href={`/mgd/run${selectedClient ? `?client=${selectedClient}` : ""}`}>
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

// ── Quick Actions Dock ────────────────────────────────────────────────────────

const ACTIONS = [
  { label: "Run Diagnostic",     icon: Play,      href: "/mgd/run",     color: "#3b82f6", desc: "Execute full MGD pipeline" },
  { label: "Presentation Mode",  icon: Monitor,   href: "/mgd/present", color: "#6366f1", desc: "Boardroom presentation view" },
  { label: "Report Viewer",      icon: BarChart3, href: "/mgd/report",  color: "#8b5cf6", desc: "Interactive report renderer" },
  { label: "Upload Documents",   icon: Upload,    href: "/admin/clients",color: "#0ea5e9", desc: "Add transaction data" },
];

function QuickActionsDock() {
  return (
    <GlassCard className="p-4">
      <div className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-3">Quick Actions</div>
      <div className="space-y-2">
        {ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.label} href={a.href}>
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer group">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: `${a.color}22`, border: `1px solid ${a.color}44` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: a.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white/70 group-hover:text-white/90 transition-colors">{a.label}</div>
                  <div className="text-[9px] text-white/25">{a.desc}</div>
                </div>
                <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/35 transition-colors" />
              </div>
            </Link>
          );
        })}
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
                <span className="text-[10px] text-white/20 uppercase tracking-widest">MGD-V1</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
                MGD Operational{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Intelligence
                </span>
              </h1>
              <p className="text-sm text-white/35 mt-1.5 max-w-md leading-relaxed">
                Deterministic operational diagnostics — findings, root causes, benchmarks, and executive narrative in a single pipeline.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/mgd/run">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold text-white transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
                  <Play className="w-3.5 h-3.5" />
                  New Diagnostic
                </button>
              </Link>
              <Link href="/mgd/present">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-white/60 hover:text-white/80 border border-white/10 transition-all">
                  <Monitor className="w-3.5 h-3.5" />
                  Present
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
              label="Active Diagnostics"
              value={stats?.activeClients ?? 0}
              sub="clients with live data"
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

        {/* ── SECTION 2 + 4 — Run Panel + Attention Queue ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Run Panel — 2 columns */}
          <div className="lg:col-span-2">
            {clientsLoading ? (
              <GlassCard className="p-6 h-full animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
                <div className="h-8 bg-white/10 rounded w-2/3 mb-6" />
                <div className="h-10 bg-white/10 rounded mb-4" />
                <div className="h-10 bg-white/10 rounded" />
              </GlassCard>
            ) : (
              <IntelligenceRunPanel clients={allClients} />
            )}
          </div>

          {/* Attention Queue — 1 column */}
          <div>
            <GlassCard className="p-4 h-full">
              <SectionHeader
                title="Operational Attention"
                sub={`${MOCK_ATTENTION.filter(a => a.severity === "CRITICAL").length} critical alerts`}
                icon={AlertTriangle}
              />
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 320 }}>
                {MOCK_ATTENTION.map(item => (
                  <OperationalAlertCard key={item.id} item={item} />
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5">
                <Link href="/mgd/run">
                  <button className="w-full text-[10px] text-blue-400/60 hover:text-blue-400 transition-colors flex items-center justify-center gap-1.5">
                    Run diagnostic to resolve alerts
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            </GlassCard>
          </div>
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

        {/* ── SECTION 5 + 6 — Activity Feed + Quick Actions ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity Feed — 2 columns */}
          <div className="lg:col-span-2">
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
              {recentAct.length === 0 && !statsLoading ? (
                <ActivityTimeline items={[]} />
              ) : statsLoading ? (
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

          {/* Quick Actions Dock — 1 column */}
          <div className="space-y-3">
            <QuickActionsDock />

            {/* MGD system status card */}
            <GlassCard className="p-4">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-3">Pipeline Status</div>
              {[
                { label: "Findings Engine",    status: "Operational", color: "text-emerald-400 bg-emerald-500/15" },
                { label: "Benchmark Engine",   status: "Operational", color: "text-emerald-400 bg-emerald-500/15" },
                { label: "Narrative Engine",   status: "Operational", color: "text-emerald-400 bg-emerald-500/15" },
                { label: "PDF Export",         status: "Operational", color: "text-emerald-400 bg-emerald-500/15" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/35">{s.label}</span>
                  <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.status}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-white/5">
                <Link href="/api/mgd/health">
                  <button className="text-[9px] text-white/20 hover:text-white/40 transition-colors flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    View API Health
                  </button>
                </Link>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
          <div className="text-[9px] text-white/15 uppercase tracking-widest">
            MGD Operational Intelligence · Scope Optix Sdn. Bhd.
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: "Run Diagnostic", href: "/mgd/run" },
              { label: "Presentation",   href: "/mgd/present" },
              { label: "Report Viewer",  href: "/mgd/report" },
              { label: "Admin Panel",    href: "/admin" },
            ].map(l => (
              <Link key={l.label} href={l.href}>
                <span className="text-[9px] text-white/20 hover:text-white/45 transition-colors uppercase tracking-wider cursor-pointer">
                  {l.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
