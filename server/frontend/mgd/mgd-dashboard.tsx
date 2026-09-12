import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, BarChart3, Building2, ChevronRight,
  Circle, FileText, Lightbulb, Plus, Target, Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// MGD HOME / DASHBOARD — Milestone B (premium white redesign)
//
// Renders inside the shared MGDShell (Milestone A) — no sidebar/header of its
// own. Structure, top to bottom: Hero -> 5-stage diagnostic explainer ->
// value propositions -> existing clients / recent activity.
//
// Data contracts unchanged: GET /api/admin/stats, GET /api/admin/clients.
// No new routes, no new API calls, no fabricated data.
// ─────────────────────────────────────────────────────────────────────────────

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

// ── Utility helpers (unchanged logic) ──────────────────────────────────────────

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

const ACT_TINTS: Record<string, string> = {
  analysis: "bg-blue-50 text-blue-600",
  document: "bg-violet-50 text-violet-600",
  client:   "bg-emerald-50 text-emerald-600",
};

// Plain-language action label for each of the three EXISTING activity types
// (client/analysis/document) — no new activity types invented, no data
// fabricated. `item.name` (whatever it actually is — a filename, a client
// name, a report name) remains the true, secondary detail underneath.
const ACT_LABELS: Record<string, string> = {
  client:   "Client added",
  analysis: "Report generated",
  document: "Document uploaded",
};

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-4 pb-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Diagnose · Understand · Improve
      </p>
      <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary leading-tight tracking-tight max-w-2xl">
        Get a clearer picture of your business.
      </h1>
      <p className="mt-4 text-base text-muted-foreground max-w-xl leading-relaxed">
        Upload your operational and business information, tell MGD what's going on, and it will
        identify the real issues, their underlying causes, and practical opportunities to improve —
        based on your business's own evidence.
      </p>
      <Link href="/mgd/diagnostic">
        <button
          className="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90"
          data-testid="button-hero-start-diagnostic"
        >
          Start a New Diagnostic
          <ArrowRight className="h-4 w-4" />
        </button>
      </Link>
    </section>
  );
}

// ── Five-stage diagnostic process card ─────────────────────────────────────────

const STAGES = [
  { n: "01", title: "Upload Evidence",   copy: "Share the documents that describe how the business is operating today." },
  { n: "02", title: "Provide Context",   copy: "Tell MGD what's concerning you and what you've observed." },
  { n: "03", title: "Run Diagnostic",    copy: "MGD reviews the evidence against your business context." },
  { n: "04", title: "Review Results",    copy: "See the findings, root causes, and what they mean for the business." },
  { n: "05", title: "Take Action",       copy: "Turn the recommendations into clear next steps." },
];

function DiagnosticProcessCard() {
  return (
    <section className="rounded-lg border border-border bg-card p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-3 mb-6">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-accent text-primary">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground">Start a New Diagnostic</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Follow these steps to generate your diagnostic report.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-4">
        {STAGES.map((stage, i) => (
          <div key={stage.n} className="relative">
            {i < STAGES.length - 1 && (
              <div className="hidden sm:block absolute top-4 left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] h-px bg-border" />
            )}
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2">
              <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {stage.n}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{stage.title}</div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{stage.copy}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full-width divider + generous top spacing so this CTA visually
          belongs to the five-stage process as a whole, not to whichever
          stage happens to sit above its horizontal center (previously read
          as associated with Step 03). */}
      <div className="mt-10 pt-6 border-t border-border flex justify-center">
        <Link href="/mgd/diagnostic">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90"
            data-testid="button-process-start-diagnostic"
          >
            Start a New Diagnostic
            <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </section>
  );
}

// ── Value propositions ─────────────────────────────────────────────────────────

const VALUE_PROPS = [
  {
    icon: BarChart3,
    title: "Evidence-Based Analysis",
    copy: "MGD works from the information your business actually provides.",
  },
  {
    icon: Target,
    title: "Industry-Specific Intelligence",
    copy: "Your business context helps MGD interpret what the evidence is telling you.",
  },
  {
    icon: Lightbulb,
    title: "Practical Recommendations",
    copy: "Turn findings into clear priorities and actions.",
  },
];

function ValuePropsRow() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 py-10">
      {VALUE_PROPS.map(({ icon: Icon, title, copy }) => (
        <div key={title} className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-primary mb-3">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{copy}</p>
        </div>
      ))}
    </section>
  );
}

// ── First-client empty state (preserved, restyled) ─────────────────────────────
// Deterministic on clients.length === 0 from the real GET /api/admin/clients
// response — a diagnostic genuinely cannot run without a client to attach it
// to, so this is an honest, intentional empty state, not an invented one.

function FirstClientEmptyState() {
  return (
    <div className="rounded-lg border border-border bg-card p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-accent">
        <Plus className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-serif text-lg font-semibold text-foreground mb-1.5">
        Your diagnostic workspace is ready.
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        No client organizations have been created yet.
      </p>
      <Link href="/admin/clients/new">
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90">
          <Plus className="h-4 w-4" />
          Create Your First Client
        </button>
      </Link>
    </div>
  );
}

// ── Client card (preserved behavior, restyled) ─────────────────────────────────

function ClientCard({ client }: { client: Client }) {
  return (
    <Link href="/mgd/diagnostic">
      <div className="group cursor-pointer rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {client.clientName}
            </div>
            <div className="mt-1 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
              {industryLabel(client.industry)}
            </div>
          </div>
          <span className="text-[11px] italic text-muted-foreground flex-shrink-0">Not yet assessed</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${client.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            <span className="text-[11px] capitalize text-muted-foreground">{client.status}</span>
          </div>
          <span className="text-[11px] text-muted-foreground/70">{relativeTime(client.updatedAt ?? client.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

// ── Activity feed (preserved data/logic, restyled) ─────────────────────────────

function ActivityFeed({ items }: { items: AdminStats["recentActivity"] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Circle className="h-5 w-5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No recent activity yet.</p>
      </div>
    );
  }

  const augmented = items
    .map(i => ({ ...i, icon: ACT_ICONS[i.type] ?? Circle, tint: ACT_TINTS[i.type] ?? "bg-blue-50 text-blue-600" }))
    .slice(0, 8);

  return (
    <div className="space-y-1">
      {augmented.map(item => {
        const Icon = item.icon;
        const label = ACT_LABELS[item.type] ?? "Activity";
        return (
          <div key={item.id} className="flex items-start gap-3 py-2">
            <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${item.tint}`}>
              <Icon className="h-3 w-3" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="text-xs font-medium text-foreground">{label}</div>
              <div className="text-[11px] text-muted-foreground truncate" title={item.name}>{item.name}</div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">{relativeTime(item.date)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Existing clients / recent activity section ─────────────────────────────────

function StatChip({ value, label, loading }: { value: number; label: string; loading: boolean }) {
  return (
    <div className="flex-1 min-w-[160px] rounded-md border border-border bg-card px-4 py-3">
      <div className="text-xl font-semibold text-foreground">{loading ? "—" : value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function ExistingDataSection({
  stats, statsLoading, allClients, activeList, clientsLoading,
}: {
  stats?: AdminStats; statsLoading: boolean;
  allClients: Client[]; activeList: Client[]; clientsLoading: boolean;
}) {
  const recentAct = stats?.recentActivity ?? [];
  const totalClients   = stats?.totalClients ?? 0;
  const totalAnalyses  = stats?.totalAnalyses ?? 0;
  const totalDocuments = stats?.totalDocuments ?? 0;

  return (
    <section className="pt-4 pb-12 border-t border-border">
      {/* Compact, non-animated summary metrics — each its own bordered chip
          so the values are unambiguously separated (not just CSS gap-spaced
          inline text). */}
      <div className="flex flex-wrap gap-3 py-6">
        <StatChip value={totalClients}   label={`Client${totalClients === 1 ? "" : "s"} Registered`}   loading={statsLoading} />
        <StatChip value={totalAnalyses}  label={`Report${totalAnalyses === 1 ? "" : "s"} Generated`}    loading={statsLoading} />
        <StatChip value={totalDocuments} label={`Document${totalDocuments === 1 ? "" : "s"} Processed`} loading={statsLoading} />
      </div>

      {/* Active Clients and Recent Activity are stacked full-width sections
          rather than a forced side-by-side split — with only one or two real
          clients, a side-by-side column made the page look lopsided next to
          a longer activity list. Stacking keeps each section's height driven
          only by its own content. */}
      <div className="space-y-8">
        <div>
          <div className="flex items-end justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-primary">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Active Clients</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeList.length} client{activeList.length !== 1 ? "s" : ""} under diagnostic coverage
                </p>
              </div>
            </div>
            <Link href="/admin/clients">
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </Link>
          </div>

          {clientsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-4">
                  <div className="h-4 w-2/3 rounded bg-muted mb-3" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : allClients.length === 0 ? (
            <FirstClientEmptyState />
          ) : activeList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeList.map(c => <ClientCard key={c.id} client={c} />)}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
              <Users className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No active clients yet.</p>
              <Link href="/admin/clients/new">
                <button className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity">
                  <Plus className="h-3 w-3" /> Add first client
                </button>
              </Link>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm max-w-2xl">
            {statsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="h-6 w-6 flex-shrink-0 rounded-md bg-muted" />
                    <div className="flex-1">
                      <div className="h-3 w-3/4 rounded bg-muted mb-1.5" />
                      <div className="h-2 w-1/4 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActivityFeed items={recentAct} />
            )}
          </div>
        </div>
      </div>
    </section>
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

  const allClients = clients ?? [];
  const activeList = allClients.filter(c => c.status === "active");

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-8">
      <Hero />
      <DiagnosticProcessCard />
      <ValuePropsRow />
      <ExistingDataSection
        stats={stats}
        statsLoading={statsLoading}
        allClients={allClients}
        activeList={activeList}
        clientsLoading={clientsLoading}
      />
    </div>
  );
}
