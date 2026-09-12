import { useState, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import {
  ArrowLeft, Monitor, FileDown, AlertTriangle, AlertCircle,
  Info, CheckCircle2, ChevronDown, ChevronUp, Activity,
  Lightbulb, BarChart3, FileText, Clock, Layers,
  Building2, Calendar, Tag, RefreshCw, Inbox,
  TrendingUp, TrendingDown, Shield, Zap, Compass, StickyNote,
  Truck, PackageX, Wrench, Eye, Star, Gauge,
} from "lucide-react";
import { format } from "date-fns";
import FindingEvidencePanel, { type OperationalFinding } from "@/components/mgd/FindingEvidencePanel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Finding {
  id: string; category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  findingPriority?: number;
  confidence: number; title: string; summary: string;
  signals?: string[]; evidence?: unknown[]; operationalImpact?: string[];
}
interface RootCause {
  id: string; title: string; severity: string; confidence: number; rootCausePriority?: number;
  summary: string; contributingFindings?: string[]; operationalImpact?: string[];
}
interface Recommendation {
  id: string; title: string; priority: string; timeframe: string; recommendationPriority?: number;
  category: string; implementationDifficulty: string; summary: string;
  relatedRootCauses?: string[]; actionItems?: string[];
  expectedOperationalImpact?: string[]; confidence: number;
}
interface BenchmarkResult {
  id: string; metric: string; category: string;
  actualValue: number; benchmarkRange: { low: number; medium: number; high: number };
  status: string; interpretation: string; confidence: number;
}
interface NarrativeSection { id: string; title: string; content: string; priority: number; }
interface ExecutiveNarrative {
  executiveOverview: NarrativeSection; keyFindings: NarrativeSection;
  rootCauseSummary: NarrativeSection; operationalHealth: NarrativeSection;
  priorityActions: NarrativeSection; strategicDirection: NarrativeSection;
  finalConclusion: NarrativeSection;
  metadata?: { generatedAt?: string; industry?: string; findingsCount?: number; rootCauseCount?: number; recommendationCount?: number; operationalHealthScore?: number; };
}
interface IndustryRule {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
}
interface MGDReport {
  id?: string;
  metadata: {
    generatedAt: string; clientName?: string; industry?: string;
    operationalHealthScore?: number; reportVersion: string;
    // Absent on reports composed before this field existed — must be
    // treated as "unknown", never assumed SUFFICIENT.
    evidence?: { level: "NONE" | "PARTIAL" | "SUFFICIENT"; reasons: string[] };
  };
  summary: { criticalFindings: number; highFindings: number; criticalRootCauses: number; highPriorityRecommendations: number; benchmarkAlerts: number; };
  narrative?: ExecutiveNarrative;
  findings: Finding[];
  rootCauses: RootCause[];
  recommendations: Recommendation[];
  benchmarks: BenchmarkResult[];
  visualMetrics: { operationalHealthLabel: string; operationalRiskLevel: string; benchmarkStatusBreakdown: { healthy: number; watchlist: number; elevated: number; critical: number; }; };
  industryInsights?: {
    maturityLevel: string;
    rules: IndustryRule[];
    topRisks: IndustryRule[];
    topOpportunities: IndustryRule[];
  };
  consultantInsights?: {
    executiveObservations: string[];
    operationalConcerns:   string[];
    notes: {
      title: string; category: string; observation: string;
      relatedArea?: string; relevantFindingIds?: string[];
    }[];
  };
  // See docs/MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md and
  // docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md. `selectedAreas` and
  // `relevantFindingIds` are additive/optional — absent on reports composed
  // before they existed, or when the consultant selected no area.
  diagnosticScope?: {
    id: string; concernText: string; origin: "BUSINESS_CONCERN";
    status: "UNVALIDATED" | "INSUFFICIENT_EVIDENCE" | "SUPPORTED" | "NOT_SUPPORTED";
    selectedAreas?: string[];
    relevantFindingIds?: string[];
  }[];
  eventDiagnostics?: {
    dispatchesAnalysed:       number;
    dispatchFailureRate:      number;
    dispatchDelayRate:        number;
    averageDelayMinutes:      number;
    missingItemRate:          number;
    substitutionRate:         number;
    damageEvents:             number;
    damageRecoveryRate:       number;
    unrecoveredDamageRate:    number;
    inventoryVisibilityScore:   number;
    eventReadinessScore:        number;
    dispatchReliabilityScore:   number;
    assetAccountabilityScore:   number;
    averageEventValue:          number;
    estimatedRevenueExposure:   number;
    dispatchFailureExposure:    number;
    assetDamageExposure:        number;
    unrecoveredDamageValue:     number;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEFRAME_ORDER  = ["IMMEDIATE", "30_DAYS", "90_DAYS", "LONG_TERM"];
const TIMEFRAME_LABELS: Record<string, string> = {
  IMMEDIATE: "Immediate", "30_DAYS": "30 Days", "90_DAYS": "90 Days", LONG_TERM: "Long Term",
};
const BENCHMARK_ORDER  = ["CRITICAL", "ELEVATED", "WATCHLIST", "HEALTHY"];

const SEV: Record<string, { bg: string; text: string; border: string; dot: string; bar: string; icon: React.ReactNode }> = {
  CRITICAL: { bg:"bg-red-500/15",    text:"text-red-400",    border:"border-red-500/30",    dot:"bg-red-500",    bar:"bg-red-500",    icon:<AlertTriangle className="w-3.5 h-3.5 text-red-400"/> },
  HIGH:     { bg:"bg-orange-500/15", text:"text-orange-400", border:"border-orange-500/30", dot:"bg-orange-500", bar:"bg-orange-500", icon:<AlertCircle   className="w-3.5 h-3.5 text-orange-400"/> },
  MEDIUM:   { bg:"bg-amber-500/15",  text:"text-amber-400",  border:"border-amber-500/30",  dot:"bg-amber-500",  bar:"bg-amber-500",  icon:<Info          className="w-3.5 h-3.5 text-amber-400"/> },
  LOW:      { bg:"bg-blue-500/15",   text:"text-blue-400",   border:"border-blue-500/30",   dot:"bg-blue-400",   bar:"bg-blue-500",   icon:<CheckCircle2  className="w-3.5 h-3.5 text-blue-400"/> },
};

const BM: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  CRITICAL: { bg:"bg-red-500/15",    text:"text-red-400",    border:"border-red-500/30",    bar:"bg-red-500"    },
  ELEVATED: { bg:"bg-orange-500/15", text:"text-orange-400", border:"border-orange-500/30", bar:"bg-orange-500" },
  WATCHLIST:{ bg:"bg-amber-500/15",  text:"text-amber-400",  border:"border-amber-500/30",  bar:"bg-amber-500"  },
  HEALTHY:  { bg:"bg-emerald-500/15",text:"text-emerald-400",border:"border-emerald-500/30",bar:"bg-emerald-500"},
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthConfig(score: number | null) {
  // null means "not assessed" — no transactional evidence existed to derive
  // a score from. This must render as a neutral, unclassified state, never
  // as "Critical" (which a naive `?? 0` coalesce would produce, since 0
  // falls into the same band as a real catastrophic measured score).
  if (score == null) return { label:"Not Assessed", ring:"#64748b", text:"text-white/40", bg:"bg-white/5", border:"border-white/10" };
  if (score >= 80) return { label:"Operationally Stable",          ring:"#10b981", text:"text-emerald-400", bg:"bg-emerald-500/15", border:"border-emerald-500/30" };
  if (score >= 65) return { label:"Moderate Operational Strain",   ring:"#3b82f6", text:"text-blue-400",    bg:"bg-blue-500/15",    border:"border-blue-500/30"    };
  if (score >= 50) return { label:"Elevated Operational Strain",   ring:"#f59e0b", text:"text-amber-400",   bg:"bg-amber-500/15",   border:"border-amber-500/30"   };
  return               { label:"Critical Operational Instability", ring:"#ef4444", text:"text-red-400",     bg:"bg-red-500/15",     border:"border-red-500/30"     };
}

function industryLabel(raw?: string): string {
  return (raw ?? "").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()).replace(/Fnb/,"F&B").replace(/Qsr/,"QSR") || "—";
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try { return format(new Date(iso),"dd MMM yyyy, HH:mm"); } catch { return "—"; }
}

function diffLabel(d: string): { label: string; color: string } {
  return d === "LOW"    ? { label:"Low Effort",    color:"text-emerald-400" }
       : d === "HIGH"   ? { label:"High Effort",   color:"text-red-400"    }
       :                  { label:"Medium Effort", color:"text-amber-400"  };
}

// ── Design primitives ─────────────────────────────────────────────────────────

function GlassCard({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, count, accent="#3b82f6" }: {
  icon: React.ElementType; label: string; count?: number; accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background:`${accent}22`, border:`1px solid ${accent}44` }}>
        <Icon className="w-4 h-4" style={{ color:accent }}/>
      </div>
      <h2 className="text-base font-bold text-white tracking-tight">{label}</h2>
      {count !== undefined && (
        <span className="ml-auto text-[11px] text-white/30 tabular-nums">{count} item{count !== 1?"s":""}</span>
      )}
    </div>
  );
}

function SevBadge({ severity }: { severity: string }) {
  const s = SEV[severity] ?? SEV.LOW;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-widest border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
      {severity}
    </span>
  );
}

function ConfBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const bar = pct>=85?"bg-red-500":pct>=70?"bg-orange-500":pct>=55?"bg-amber-500":"bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width:`${pct}%` }}/>
      </div>
      <span className="text-[10px] tabular-nums text-white/40 shrink-0">{pct}%</span>
    </div>
  );
}

// ── Health Score Ring ──────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number | null }) {
  const R    = 70;
  const circ = 2 * Math.PI * R;
  const pct  = score == null ? 0 : Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;
  const { ring, label, text } = healthConfig(score);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-44 h-44">
        <svg width="176" height="176" viewBox="0 0 176 176" className="rotate-[-90deg]">
          <circle cx="88" cy="88" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
          <circle
            cx="88" cy="88" r={R} fill="none" stroke={ring} strokeWidth="12"
            strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
            style={{ transition:"stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white tracking-tight leading-none">{score != null && score > 0 ? score : "—"}</span>
          <span className="text-[10px] text-white/35 mt-1 uppercase tracking-widest">/ 100</span>
        </div>
      </div>
      <div className={`text-sm font-semibold ${text} text-center`}>{label}</div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className="" }: { className?: string }) {
  return <div className={`rounded bg-white/10 animate-pulse ${className}`}/>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <Skeleton className="h-8 w-64 mb-3"/>
        <Skeleton className="h-4 w-96"/>
      </GlassCard>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i=><GlassCard key={i} className="p-5"><Skeleton className="h-10 w-full"/></GlassCard>)}
      </div>
      <GlassCard className="p-6"><Skeleton className="h-44 w-full"/></GlassCard>
    </div>
  );
}

// ── Empty / Error states ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <GlassCard className="p-16 flex flex-col items-center gap-5">
      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <Inbox className="w-7 h-7 text-white/25"/>
      </div>
      <div className="text-center">
        <p className="text-white/50 text-sm font-medium">No report loaded</p>
        <p className="text-white/25 text-xs mt-1">Open a report from the archive to view it here.</p>
      </div>
      <Link href="/mgd/reports">
        <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
          <ArrowLeft className="w-3.5 h-3.5"/>
          Go to Archive
        </a>
      </Link>
    </GlassCard>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <GlassCard className="p-16 flex flex-col items-center gap-5">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400"/>
      </div>
      <div className="text-center">
        <p className="text-white/70 text-sm font-medium">Failed to load report</p>
        <p className="text-white/30 text-xs mt-1 max-w-xs">{message}</p>
      </div>
      <Link href="/mgd/reports">
        <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
          <ArrowLeft className="w-3.5 h-3.5"/>
          Back to Archive
        </a>
      </Link>
    </GlassCard>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SumCard({ label, value, icon:Icon, accent="#3b82f6" }: {
  label:string; value:number; icon:React.ElementType; accent?:string;
}) {
  return (
    <GlassCard className="p-5 relative overflow-hidden group hover:bg-white/[0.07] transition-all">
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
        style={{ background:`radial-gradient(circle,${accent},transparent 70%)`, transform:"translate(30%,-30%)" }}/>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background:`${accent}22`, border:`1px solid ${accent}44` }}>
        <Icon className="w-4 h-4" style={{ color:accent }}/>
      </div>
      <div className="text-3xl font-bold text-white leading-none mb-1">{value}</div>
      <div className="text-[11px] text-white/35 uppercase tracking-widest">{label}</div>
    </GlassCard>
  );
}

// ── Finding Card ──────────────────────────────────────────────────────────────

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const sev = SEV[finding.severity] ?? SEV.LOW;
  const evidenceCount = (finding.evidence?.length ?? 0) + (finding.signals?.length ?? 0);

  const adapted: OperationalFinding = {
    id:        finding.id,
    title:     finding.title,
    severity:  finding.severity,
    category:  finding.category,
    summary:   finding.summary,
    confidence:finding.confidence,
    signals:   (finding.signals as string[]) ?? [],
    // Pass through unchanged rather than discarding — FindingEvidencePanel
    // falls back to `signals` above when this is empty/absent, so existing
    // FindingEvidence[] data (if a finding ever carries it) is preserved.
    evidence:  finding.evidence as OperationalFinding["evidence"],
  };

  return (
    <div className={`rounded-xl border ${sev.border} bg-white/[0.03] overflow-hidden transition-all`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="shrink-0 mt-0.5">{sev.icon}</div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-white leading-snug">{finding.title}</h4>
              <span className="text-[11px] text-white/35 capitalize">{finding.category.replace(/_/g," ")}</span>
            </div>
          </div>
          <SevBadge severity={finding.severity}/>
        </div>
        <p className="text-[13px] text-white/55 leading-relaxed mb-3">{finding.summary}</p>
        <ConfBar value={finding.confidence}/>
        {finding.operationalImpact && (
          <ul className="mt-3 space-y-1">
            {(Array.isArray(finding.operationalImpact)
              ? finding.operationalImpact
              : [finding.operationalImpact as string]
            ).map((imp,i)=>(
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-white/40">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-white/25 shrink-0"/>
                {imp}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.07]">
          <span className="text-[11px] text-white/25">
            {evidenceCount > 0 ? `${evidenceCount} evidence item${evidenceCount!==1?"s":""}` : "No evidence attached"}
          </span>
          <button
            onClick={() => setOpen(o=>!o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border
              ${open
                ? `${sev.bg} ${sev.text} ${sev.border}`
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
              }`}
          >
            {open ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            {open ? "Hide Evidence" : "View Evidence"}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/[0.07] p-5 bg-black/20">
          <FindingEvidencePanel finding={adapted}/>
        </div>
      )}
    </div>
  );
}

// ── Root Cause Card ───────────────────────────────────────────────────────────

function RootCauseCard({ rc }: { rc: RootCause }) {
  const sev = SEV[rc.severity] ?? SEV.LOW;
  return (
    <div className={`rounded-xl border ${sev.border} bg-white/[0.03] p-5`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <h4 className="text-sm font-semibold text-white leading-snug">{rc.title}</h4>
        <SevBadge severity={rc.severity}/>
      </div>
      <p className="text-[13px] text-white/55 leading-relaxed mb-3">{rc.summary}</p>
      <ConfBar value={rc.confidence}/>
      {rc.operationalImpact && (
        <ul className="mt-3 space-y-1">
          {(Array.isArray(rc.operationalImpact)
            ? rc.operationalImpact
            : [rc.operationalImpact as string]
          ).map((imp,i)=>(
            <li key={i} className="flex items-start gap-1.5 text-[12px] text-white/40">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-white/25 shrink-0"/>
              {imp}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Recommendation Card ───────────────────────────────────────────────────────

function RecCard({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(false);
  const sev  = SEV[rec.priority] ?? SEV.LOW;
  const diff = diffLabel(rec.implementationDifficulty);
  return (
    <div className={`rounded-xl border ${sev.border} bg-white/[0.03] overflow-hidden`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-sm font-semibold text-white leading-snug">{rec.title}</h4>
          <span className={`shrink-0 text-[10px] font-semibold ${diff.color}`}>{diff.label}</span>
        </div>
        <p className="text-[13px] text-white/55 leading-relaxed mb-3">{rec.summary}</p>
        <ConfBar value={rec.confidence}/>
        {rec.actionItems && rec.actionItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.07]">
            <button
              onClick={()=>setOpen(o=>!o)}
              className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              {open ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
              {open ? "Hide" : "Show"} action items ({rec.actionItems.length})
            </button>
            {open && (
              <ul className="mt-2 space-y-1.5">
                {rec.actionItems.map((a,i)=>(
                  <li key={i} className="flex items-start gap-2 text-[12px] text-white/50">
                    <span className="mt-1 w-1 h-1 rounded-full bg-blue-400/60 shrink-0"/>
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Benchmark Card ────────────────────────────────────────────────────────────

function BenchmarkCard({ bm }: { bm: BenchmarkResult }) {
  const cfg = BM[bm.status] ?? BM.HEALTHY;
  const max = bm.benchmarkRange.high * 1.5 || 1;
  const pct = Math.min(100, Math.round((bm.actualValue / max) * 100));
  const highPct = Math.min(100, Math.round((bm.benchmarkRange.high / max) * 100));

  return (
    <div className={`rounded-xl border ${cfg.border} bg-white/[0.03] p-5`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-white">{bm.metric}</p>
          <p className="text-[12px] text-white/40 mt-0.5 leading-relaxed">{bm.interpretation}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          {bm.status}
        </span>
      </div>
      <div className="mt-3 relative h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-white/10 rounded-full" style={{ width:`${highPct}%` }}/>
        <div className={`absolute inset-y-0 left-0 ${cfg.bar} rounded-full transition-all`} style={{ width:`${pct}%` }}/>
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-white/25">0</span>
        <span className={`text-[10px] font-bold ${cfg.text}`}>{bm.actualValue}</span>
        <span className="text-[10px] text-white/25">Threshold: {bm.benchmarkRange.high}</span>
      </div>
    </div>
  );
}

// ── Narrative Section ─────────────────────────────────────────────────────────

function NarrativeCard({ section }: { section: NarrativeSection }) {
  return (
    <GlassCard className="p-6">
      <h4 className="text-sm font-bold text-white mb-3">{section.title}</h4>
      <p className="text-[13px] text-white/60 leading-relaxed whitespace-pre-line">{section.content}</p>
    </GlassCard>
  );
}

// ── Industry Assessment helpers & components ──────────────────────────────────

function maturityConfig(level: string) {
  switch (level) {
    case "ADVANCED":   return { color:"text-emerald-400", bg:"bg-emerald-500/15", border:"border-emerald-500/30", dot:"bg-emerald-500" };
    case "SCALING":    return { color:"text-blue-400",    bg:"bg-blue-500/15",    border:"border-blue-500/30",    dot:"bg-blue-500"    };
    case "DEVELOPING": return { color:"text-amber-400",   bg:"bg-amber-500/15",   border:"border-amber-500/30",  dot:"bg-amber-500"   };
    default:           return { color:"text-red-400",     bg:"bg-red-500/15",     border:"border-red-500/30",    dot:"bg-red-500"     };
  }
}

function IndustryRuleCard({ rule }: { rule: IndustryRule }) {
  const sev = SEV[rule.severity] ?? SEV.LOW;
  return (
    <div className={`rounded-xl border ${sev.border} bg-white/[0.03] p-5`}>
      <div className="flex items-start justify-between gap-4 mb-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="shrink-0 mt-0.5">{sev.icon}</div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white leading-snug">{rule.title}</h4>
            <span className="text-[11px] text-white/35 capitalize">{rule.category.replace(/_/g," ")}</span>
          </div>
        </div>
        <SevBadge severity={rule.severity}/>
      </div>
      <p className="text-[13px] text-white/55 leading-relaxed mb-3">{rule.description}</p>
      <ConfBar value={rule.confidence}/>
    </div>
  );
}

// ── Event Diagnostics Panel ───────────────────────────────────────────────────

const EM_FINDINGS = [
  "Inventory Visibility Weakness",
  "Dispatch Reliability Risk",
  "Inventory Shortage Pattern",
  "Asset Damage Recovery Leakage",
  "Event Readiness Exposure",
];

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function score(v: number) { return `${v}/100`; }

function EMMetricRow({ label, value, dim = false }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[12px] text-white/45">{label}</span>
      <span className={`text-[12px] font-semibold tabular-nums ${dim ? "text-white/30" : "text-white/80"}`}>{value}</span>
    </div>
  );
}

function EventDiagnosticsPanel({ report }: { report: MGDReport }) {
  const ed = report.eventDiagnostics;
  if (!ed) return null;

  const triggeredTitles = new Set(
    (report.findings ?? []).map(f => f.title)
  );

  const scoreColor = (v: number) =>
    v >= 80 ? "text-emerald-400" : v >= 60 ? "text-amber-400" : "text-red-400";

  const eventHealthScores = [
    { label: "Dispatch Reliability", val: ed.dispatchReliabilityScore  },
    { label: "Event Readiness",      val: ed.eventReadinessScore       },
    { label: "Asset Accountability", val: ed.assetAccountabilityScore  },
    { label: "Inventory Visibility", val: ed.inventoryVisibilityScore  },
  ];

  return (
    <GlassCard className="p-6">
      <SectionHeader icon={Truck} label="Event Management Metrics" accent="#06b6d4"/>

      {/* ── EVENT HEALTH block ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="w-3.5 h-3.5 text-cyan-400/60"/>
          <span className="text-[10px] uppercase tracking-widest text-white/25">Event Health</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {eventHealthScores.map(({ label, val }) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col items-center gap-1.5">
              <div className="flex items-baseline gap-0.5">
                <span className={`text-2xl font-bold tabular-nums ${scoreColor(val)}`}>{val}</span>
                <span className="text-[11px] text-white/25 font-normal">/100</span>
              </div>
              <span className="text-[10px] text-white/35 text-center leading-snug">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left column — metrics */}
        <div className="space-y-4">

          {/* Dispatch block */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-3.5 h-3.5 text-cyan-400/60"/>
              <span className="text-[10px] uppercase tracking-widest text-white/25">Dispatch</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-1">
              <EMMetricRow label="Dispatches Analysed"  value={String(ed.dispatchesAnalysed)} dim={ed.dispatchesAnalysed === 0}/>
              <EMMetricRow label="Dispatch Failure Rate" value={pct(ed.dispatchFailureRate)}/>
              <EMMetricRow label="Dispatch Delay Rate"   value={pct(ed.dispatchDelayRate)}/>
              <EMMetricRow label="Avg Delay Minutes"     value={`${ed.averageDelayMinutes.toFixed(1)} min`}/>
            </div>
          </div>

          {/* Inventory block */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PackageX className="w-3.5 h-3.5 text-amber-400/60"/>
              <span className="text-[10px] uppercase tracking-widest text-white/25">Inventory</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-1">
              <EMMetricRow label="Missing Item Rate"  value={pct(ed.missingItemRate)}/>
              <EMMetricRow label="Substitution Rate"  value={pct(ed.substitutionRate)}/>
            </div>
          </div>

          {/* Damage block */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-3.5 h-3.5 text-red-400/60"/>
              <span className="text-[10px] uppercase tracking-widest text-white/25">Asset Damage</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-1">
              <EMMetricRow label="Damage Events"          value={String(ed.damageEvents)} dim={ed.damageEvents === 0}/>
              <EMMetricRow label="Damage Recovery Rate"   value={pct(ed.damageRecoveryRate)}/>
              <EMMetricRow label="Unrecovered Damage Rate" value={pct(ed.unrecoveredDamageRate)}/>
            </div>
          </div>

          {/* Scores block */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-3.5 h-3.5 text-indigo-400/60"/>
              <span className="text-[10px] uppercase tracking-widest text-white/25">Readiness Scores</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-1">
              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[12px] text-white/45">Inventory Visibility Score</span>
                <span className={`text-[12px] font-bold tabular-nums ${scoreColor(ed.inventoryVisibilityScore)}`}>{score(ed.inventoryVisibilityScore)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12px] text-white/45">Event Readiness Score</span>
                <span className={`text-[12px] font-bold tabular-nums ${scoreColor(ed.eventReadinessScore)}`}>{score(ed.eventReadinessScore)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right column — triggered findings checklist */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-3.5 h-3.5 text-violet-400/60"/>
            <span className="text-[10px] uppercase tracking-widest text-white/25">Triggered Findings</span>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            {EM_FINDINGS.map(name => {
              const hit = triggeredTitles.has(name);
              return (
                <div key={name} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hit ? "bg-emerald-500/20 border border-emerald-500/40" : "bg-white/[0.03] border border-white/10"}`}>
                    {hit
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400"/>
                      : <span className="w-2 h-0.5 bg-white/20 rounded"/>
                    }
                  </div>
                  <span className={`text-[12px] leading-snug ${hit ? "text-white/80 font-medium" : "text-white/30"}`}>
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-white/20 leading-relaxed">
            Triggered findings indicate which EM detection patterns fired based on uploaded event data. Zero dispatches analysed means no event-management source files have been processed yet for this client.
          </p>
        </div>

      </div>

      {/* ── EVENT IMPACT CALCULATOR ────────────────────────────────────────── */}
      <div className="mt-6 pt-5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-3.5 h-3.5 text-red-400/60"/>
          <span className="text-[10px] uppercase tracking-widest text-white/25">Event Impact Calculator</span>
          {ed.averageEventValue === 0 && (
            <span className="ml-2 text-[9px] text-white/20 italic">— add event value data to unlock estimates</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

          {/* Card 1 — Revenue Exposure (Missing Items) */}
          <div className="rounded-xl border border-red-500/15 bg-red-500/[0.04] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <PackageX className="w-3.5 h-3.5 text-red-400/60"/>
              <span className="text-[10px] uppercase tracking-widest text-white/30">Revenue Exposure</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/40">Missing Items</span>
                <span className="text-[12px] font-semibold text-white/70 tabular-nums">{ed.dispatchesAnalysed > 0 ? Math.round(ed.missingItemRate * ed.dispatchesAnalysed) : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/40">Avg Event Value</span>
                <span className="text-[12px] font-semibold text-white/70 tabular-nums">
                  {ed.averageEventValue > 0 ? `RM ${ed.averageEventValue.toLocaleString()}` : "—"}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/50">Potential Exposure</span>
                <span className={`text-[14px] font-bold tabular-nums ${ed.estimatedRevenueExposure > 0 ? "text-red-400" : "text-white/25"}`}>
                  {ed.estimatedRevenueExposure > 0 ? `RM ${ed.estimatedRevenueExposure.toLocaleString()}` : "RM 0"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2 — Dispatch Failure Exposure */}
          <div className="rounded-xl border border-orange-500/15 bg-orange-500/[0.04] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-orange-400/60"/>
              <span className="text-[10px] uppercase tracking-widest text-white/30">Dispatch Failure</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/40">Failed Dispatches</span>
                <span className="text-[12px] font-semibold text-white/70 tabular-nums">{ed.dispatchesAnalysed > 0 ? Math.round(ed.dispatchFailureRate * ed.dispatchesAnalysed) : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/40">Avg Event Value</span>
                <span className="text-[12px] font-semibold text-white/70 tabular-nums">
                  {ed.averageEventValue > 0 ? `RM ${ed.averageEventValue.toLocaleString()}` : "—"}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/50">Potential Exposure</span>
                <span className={`text-[14px] font-bold tabular-nums ${ed.dispatchFailureExposure > 0 ? "text-orange-400" : "text-white/25"}`}>
                  {ed.dispatchFailureExposure > 0 ? `RM ${ed.dispatchFailureExposure.toLocaleString()}` : "RM 0"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3 — Asset Damage Exposure */}
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-amber-400/60"/>
              <span className="text-[10px] uppercase tracking-widest text-white/30">Asset Damage</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/40">Total Damage Value</span>
                <span className="text-[12px] font-semibold text-white/70 tabular-nums">
                  {ed.assetDamageExposure > 0 ? `RM ${ed.assetDamageExposure.toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/40">Unrecovered</span>
                <span className="text-[12px] font-semibold text-red-400/80 tabular-nums">
                  {ed.unrecoveredDamageValue > 0 ? `RM ${ed.unrecoveredDamageValue.toLocaleString()}` : "—"}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/50">Asset Exposure</span>
                <span className={`text-[14px] font-bold tabular-nums ${ed.assetDamageExposure > 0 ? "text-amber-400" : "text-white/25"}`}>
                  {ed.assetDamageExposure > 0 ? `RM ${ed.assetDamageExposure.toLocaleString()}` : "RM 0"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total exposure footer */}
        {(() => {
          const total = ed.estimatedRevenueExposure + ed.dispatchFailureExposure + ed.assetDamageExposure;
          return total > 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-3 flex items-center justify-between">
              <span className="text-[11px] text-white/40 uppercase tracking-wider">Total Estimated Exposure</span>
              <span className="text-[16px] font-bold text-red-400 tabular-nums">RM {total.toLocaleString()}</span>
            </div>
          ) : null;
        })()}
        <p className="mt-3 text-[10px] text-white/15 leading-relaxed">
          Exposure estimates are derived from operational data and event value averages. Actual impact may vary. Use as a directional indicator for prioritisation.
        </p>
      </div>

    </GlassCard>
  );
}

// ── Diagnostic Scope Section ───────────────────────────────────────────────────
// "What did the client ask us to look at, and what did MGD actually find in
// that area?" — see docs/MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md and
// docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md. Every statement here must
// preserve: Concern ≠ evidence. Scope ≠ finding. A relevant finding is
// never presented as proof the concern is confirmed; its absence is never
// presented as the concern being disproven.

// Mirrors mgd-diagnostic-wizard.tsx's DIAGNOSTIC_AREAS labels exactly.
const AREA_LABEL: Record<string, string> = {
  inventory_visibility:   "Inventory Management",
  logistics_coordination: "Logistics Coordination",
  warehouse_operations:   "Warehouse Operations",
  manpower_dependency:    "Manpower Dependency",
  financial_leakage:      "Financial Leakage",
  workflow_scalability:   "Workflow Scalability",
  event_readiness:        "Event Readiness Control",
  dispatch_operations:    "Dispatch Reliability",
  asset_management:       "Asset Accountability",
};

function areaLabel(v: string): string {
  return AREA_LABEL[v] ?? v.replace(/_/g, " ");
}

function ScopeStatusBadge({ status }: { status: string }) {
  if (status === "INSUFFICIENT_EVIDENCE") {
    return (
      <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border border-red-500/25 bg-red-500/10 text-red-300">
        Insufficient evidence
      </span>
    );
  }
  // UNVALIDATED is the honest default — evidence exists in the report, but
  // no deterministic mechanism correlates it specifically to this concern.
  // Never rendered as "confirmed" or "validated" — see the ADR §9 rules.
  return (
    <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border border-white/15 bg-white/[0.04] text-white/40">
      Not independently validated
    </span>
  );
}

function DiagnosticScopeSection({ report }: { report: MGDReport }) {
  const items = report.diagnosticScope ?? [];
  if (!items.length) return null;

  const findingById = new Map(report.findings.map(f => [f.id, f]));

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/15 border border-blue-500/25">
          <Compass className="w-4 h-4 text-blue-400"/>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-white tracking-tight">Diagnostic Scope</h3>
          <p className="text-[11px] text-white/30 mt-0.5">
            What the client asked MGD to examine — shown separately from what MGD concluded.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map(item => {
          const areas = item.selectedAreas ?? [];
          const relevant = (item.relevantFindingIds ?? [])
            .map(id => findingById.get(id))
            .filter((f): f is Finding => !!f);

          return (
            <div key={item.id} className="rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-[13px] font-semibold text-white leading-snug flex-1">
                  “{item.concernText}”
                </p>
                <ScopeStatusBadge status={item.status}/>
              </div>

              {areas.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-[10px] text-white/25">Requested area:</span>
                  {areas.map(a => (
                    <span key={a} className="text-[10px] px-2 py-0.5 rounded-md border border-blue-500/25 bg-blue-500/10 text-blue-300">
                      {areaLabel(a)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-white/25 mb-2">No specific diagnostic area was selected for this concern.</p>
              )}

              {areas.length > 0 && (
                relevant.length > 0 ? (
                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                    <p className="text-[10px] text-white/30 mb-1.5">
                      Findings relevant to this area ({relevant.length}) — these are not proof the concern above is confirmed, only findings MGD produced in the same requested area:
                    </p>
                    <div className="space-y-1">
                      {relevant.map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-[11px]">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEV[f.severity]?.dot ?? "bg-white/30"}`}/>
                          <span className="text-white/60">{f.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-white/25 mt-2 pt-2 border-t border-white/[0.06]">
                    No findings were produced in the requested area for this run. This does not mean the concern is disproven — it means no detector in that area surfaced a finding from the evidence available.
                  </p>
                )
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ── Consultant Observations Section ───────────────────────────────────────────

const CATEGORY_ACCENT: Record<string, { bg: string; border: string; text: string }> = {
  Logistics:   { bg: "bg-sky-500/10",    border: "border-sky-500/25",    text: "text-sky-300"    },
  Inventory:   { bg: "bg-emerald-500/10",border: "border-emerald-500/25",text: "text-emerald-300" },
  Finance:     { bg: "bg-blue-500/10",   border: "border-blue-500/25",   text: "text-blue-300"   },
  Manpower:    { bg: "bg-violet-500/10", border: "border-violet-500/25", text: "text-violet-300"  },
  Operations:  { bg: "bg-orange-500/10", border: "border-orange-500/25", text: "text-orange-300"  },
  Procurement: { bg: "bg-teal-500/10",   border: "border-teal-500/25",   text: "text-teal-300"   },
  Sales:       { bg: "bg-pink-500/10",   border: "border-pink-500/25",   text: "text-pink-300"    },
  Technology:  { bg: "bg-cyan-500/10",   border: "border-cyan-500/25",   text: "text-cyan-300"   },
  Other:       { bg: "bg-white/5",       border: "border-white/10",      text: "text-white/40"   },
};

function ConsultantObservationsSection({ report }: { report: MGDReport }) {
  const ci = report.consultantInsights;
  const notes = ci?.notes ?? [];
  if (!notes.length) return null;
  const findingById = new Map(report.findings.map(f => [f.id, f]));

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 border border-amber-500/25">
          <StickyNote className="w-4 h-4 text-amber-400"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-[15px] font-bold text-white tracking-tight">Consultant Observations</h3>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full
              bg-amber-500/10 border border-amber-500/20 text-amber-400">
              {notes.length} note{notes.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[11px] text-white/30 mt-0.5">
            Field observations recorded by the consultant — not system-generated.
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-amber-500/10"/>
        <span className="text-[9px] text-amber-500/40 uppercase tracking-widest font-semibold">
          Human Input · Pre-diagnostic Context
        </span>
        <div className="flex-1 h-px bg-amber-500/10"/>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {notes.map((note, i) => {
          const accent = CATEGORY_ACCENT[note.category] ?? CATEGORY_ACCENT["Other"];
          return (
            <div
              key={i}
              className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4 relative overflow-hidden"
            >
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/40 rounded-l-xl"/>

              {/* System label */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-amber-500/50">
                  Consultant Observation
                </span>
                {note.category && (
                  <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border
                    ${accent.bg} ${accent.border} ${accent.text}`}>
                    {note.category}
                  </span>
                )}
              </div>

              {/* Title */}
              {note.title && (
                <p className="text-[13px] font-semibold text-white mb-1.5 leading-snug">
                  {note.title}
                </p>
              )}

              {/* Observation */}
              {note.observation && (
                <p className="text-[12px] text-white/55 leading-relaxed">
                  {note.observation}
                </p>
              )}

              {/* Consultant-selected diagnostic area + relevant findings — a
                  display cross-reference only; this observation remains a
                  consultant statement, never documentary evidence, even
                  when a finding shares its selected area. */}
              {note.relatedArea && (
                <div className="mt-2.5 pt-2.5 border-t border-amber-500/10">
                  <span className="text-[10px] px-2 py-0.5 rounded-md border border-blue-500/25 bg-blue-500/10 text-blue-300">
                    {areaLabel(note.relatedArea)}
                  </span>
                  {(note.relevantFindingIds ?? []).length > 0 ? (
                    <div className="mt-1.5 space-y-1">
                      {(note.relevantFindingIds ?? []).map(id => {
                        const f = findingById.get(id);
                        if (!f) return null;
                        return (
                          <div key={id} className="flex items-center gap-2 text-[11px]">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEV[f.severity]?.dot ?? "bg-white/30"}`}/>
                            <span className="text-white/50">{f.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/25 mt-1.5">No findings in this area for this run — the observation stands on its own as consultant context.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ── Industry Assessment Section ────────────────────────────────────────────────

function IndustryAssessmentSection({ report }: { report: MGDReport }) {
  const [expanded, setExpanded] = useState(false);
  const ii = report.industryInsights;
  if (!ii) return null;

  const mat        = maturityConfig(ii.maturityLevel);
  const rules      = ii.rules ?? [];
  const topRisk    = (ii.topRisks ?? [])[0];
  const topOpp     = (ii.topOpportunities ?? [])[0];
  const FOLD       = 5;
  const visible    = expanded ? rules : rules.slice(0, FOLD);
  const hasMore    = rules.length > FOLD;

  return (
    <GlassCard className="p-6">
      <SectionHeader icon={Compass} label="Industry Assessment" count={rules.length} accent="#6366f1"/>

      {/* 4 summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">

        {/* Industry */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 className="w-3.5 h-3.5 text-indigo-400"/>
            <span className="text-[10px] uppercase tracking-widest text-white/30">Industry</span>
          </div>
          <p className="text-sm font-semibold text-white leading-snug">
            {industryLabel(report.metadata.industry)}
          </p>
        </div>

        {/* Maturity Level */}
        <div className={`rounded-xl border ${mat.border} ${mat.bg} p-4`}>
          <div className="flex items-center gap-1.5 mb-2">
            <Shield className="w-3.5 h-3.5 text-white/40"/>
            <span className="text-[10px] uppercase tracking-widest text-white/30">Maturity Level</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${mat.dot} shrink-0`}/>
            <p className={`text-sm font-bold ${mat.color} capitalize`}>
              {ii.maturityLevel.charAt(0) + ii.maturityLevel.slice(1).toLowerCase()}
            </p>
          </div>
        </div>

        {/* Top Risk */}
        <div className={`rounded-xl border ${topRisk ? "border-red-500/20 bg-red-500/[0.05]" : "border-white/10 bg-white/[0.03]"} p-4`}>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-400"/>
            <span className="text-[10px] uppercase tracking-widest text-white/30">Top Risk</span>
          </div>
          {topRisk
            ? <p className="text-[12px] font-semibold text-white leading-snug line-clamp-2">{topRisk.title}</p>
            : <p className="text-[12px] text-white/25 italic">None detected</p>
          }
          {topRisk && (
            <span className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-widest border ${SEV[topRisk.severity]?.bg} ${SEV[topRisk.severity]?.text} ${SEV[topRisk.severity]?.border}`}>
              {topRisk.confidence}% conf
            </span>
          )}
        </div>

        {/* Top Opportunity */}
        <div className={`rounded-xl border ${topOpp ? "border-emerald-500/20 bg-emerald-500/[0.05]" : "border-white/10 bg-white/[0.03]"} p-4`}>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400"/>
            <span className="text-[10px] uppercase tracking-widest text-white/30">Top Opportunity</span>
          </div>
          {topOpp
            ? <p className="text-[12px] font-semibold text-white leading-snug line-clamp-2">{topOpp.title}</p>
            : <p className="text-[12px] text-white/25 italic">None identified</p>
          }
          {topOpp && (
            <span className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-widest border ${SEV[topOpp.severity]?.bg} ${SEV[topOpp.severity]?.text} ${SEV[topOpp.severity]?.border}`}>
              {topOpp.confidence}% conf
            </span>
          )}
        </div>
      </div>

      {/* Industry Rules list */}
      {rules.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-widest text-white/25">Industry Rules</span>
            <div className="flex-1 h-px bg-white/[0.06]"/>
          </div>
          {visible.map(rule => <IndustryRuleCard key={rule.id} rule={rule}/>)}
          {hasMore && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all"
            >
              {expanded
                ? <><ChevronUp className="w-3.5 h-3.5"/> Show less</>
                : <><ChevronDown className="w-3.5 h-3.5"/> Show {rules.length - FOLD} more rule{rules.length - FOLD !== 1 ? "s" : ""}</>
              }
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-6 justify-center text-white/25 text-[13px]">
          <Zap className="w-4 h-4"/>
          No industry rules triggered for this diagnostic
        </div>
      )}
    </GlassCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MGDReportViewer() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const reportId = params.get("id");
  const [, navigate] = useLocation();

  const [report, setReport]   = useState<MGDReport | null>(null);
  const [status, setStatus]   = useState<"loading" | "loaded" | "empty" | "error">("loading");
  const [errMsg, setErrMsg]   = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError]     = useState("");

  useEffect(() => {
    async function load() {
      // 1. Canonical path — the URL's ?id= is the single source of truth for
      // "which report," resolved via the persisted store. Works across
      // reloads, tabs, and shared links, unlike passing the report object
      // itself through route state.
      if (reportId) {
        try {
          const res = await fetch(`/api/mgd/reports/${reportId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.report?.report) {
              setReport(data.report.report);
              setStatus("loaded");
              return;
            }
          }
          setErrMsg(`Report "${reportId}" not found.`);
          setStatus("error");
        } catch (e: unknown) {
          setErrMsg(e instanceof Error ? e.message : "Network error");
          setStatus("error");
        }
        return;
      }
      // 2. Same-tab fallback only — covers the rare case where a diagnostic
      // just ran but its report failed to persist (no id was ever minted),
      // so there is genuinely no id to put in the URL. Never consulted when
      // a ?id= is present, so it can never override or race a real,
      // shareable report link.
      const raw = sessionStorage.getItem("mgd-selected-report");
      if (raw) {
        try {
          setReport(JSON.parse(raw));
          setStatus("loaded");
          return;
        } catch {}
      }
      setStatus("empty");
    }
    load();
  }, [reportId]);

  const effectiveReportId = reportId || report?.id || null;

  async function handleExportPdf() {
    if (!report) return;
    if (!effectiveReportId) {
      setPdfError("This report was not saved, so it has no id to export — re-run the diagnostic to generate a saved report first.");
      return;
    }
    try {
      setPdfLoading(true);
      setPdfError("");
      const res = await fetch("/api/mgd/export-pdf", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ reportId: effectiveReportId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "PDF export failed");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `MGD-Report-${report.metadata.clientName ?? "Report"}-${report.metadata.generatedAt.slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[MGD][VIEWER] PDF export error:", e);
      setPdfError(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setPdfLoading(false);
    }
  }

  function handlePresent() {
    if (!effectiveReportId) return;
    navigate(`/mgd/present?id=${effectiveReportId}`);
  }

  // Preserve null (not assessed) rather than coalescing to 0 — 0 is a
  // legitimate real score (catastrophic, measured) with a different meaning.
  const score = report?.metadata?.operationalHealthScore ?? null;
  const { ring: _r, label: _l, text: healthText, bg: healthBg, border: healthBorder } = healthConfig(score);

  // Grouped recommendations
  const recsByTimeframe: Record<string, Recommendation[]> = {};
  (report?.recommendations ?? []).forEach(r => {
    (recsByTimeframe[r.timeframe] = recsByTimeframe[r.timeframe] ?? []).push(r);
  });

  // Grouped benchmarks
  const bmsByStatus: Record<string, BenchmarkResult[]> = {};
  (report?.benchmarks ?? []).forEach(b => {
    (bmsByStatus[b.status] = bmsByStatus[b.status] ?? []).push(b);
  });

  // Narrative sections in order
  const narrativeSections: NarrativeSection[] = report?.narrative
    ? [
        report.narrative.executiveOverview,
        report.narrative.keyFindings,
        report.narrative.rootCauseSummary,
        report.narrative.operationalHealth,
        report.narrative.priorityActions,
        report.narrative.strategicDirection,
        report.narrative.finalConclusion,
      ].filter(Boolean)
    : [];

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#060a13 0%,#070b14 50%,#060c15 100%)" }}>
      {/* Grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage:"linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize:"40px 40px" }}/>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 space-y-7">

        {/* ── Loading ── */}
        {status === "loading" && <LoadingSkeleton/>}

        {/* ── Error ── */}
        {status === "error" && <ErrorState message={errMsg}/>}

        {/* ── Empty ── */}
        {status === "empty" && <EmptyState/>}

        {/* ── Loaded ── */}
        {status === "loaded" && report && (() => {
          const summary = report.summary;
          return (
            <>
              {/* SECTION 1 — Report Header */}
              <GlassCard className="p-6">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Link href="/mgd/reports">
                        <a className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                          <ArrowLeft className="w-3 h-3"/>
                          Archive
                        </a>
                      </Link>
                      <span className="text-white/20">/</span>
                      <span className="text-[11px] text-white/40">Report Viewer</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight leading-tight mb-3">
                      {report.metadata.clientName ?? "Unnamed Client"}
                    </h1>
                    <div className="flex items-center gap-4 flex-wrap">
                      {report.metadata.industry && (
                        <div className="flex items-center gap-1.5 text-[12px] text-white/45">
                          <Building2 className="w-3.5 h-3.5 text-white/25"/>
                          {industryLabel(report.metadata.industry)}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[12px] text-white/45">
                        <Calendar className="w-3.5 h-3.5 text-white/25"/>
                        {fmtDate(report.metadata.generatedAt)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-white/45">
                        <Tag className="w-3.5 h-3.5 text-white/25"/>
                        {report.metadata.reportVersion}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handlePresent}
                      disabled={!effectiveReportId}
                      title={effectiveReportId ? undefined : "This report has no saved id yet — it can't be opened in Presentation Mode."}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Monitor className="w-3.5 h-3.5"/>
                      Present
                    </button>
                    <button
                      onClick={handleExportPdf}
                      disabled={pdfLoading || !effectiveReportId}
                      title={effectiveReportId ? undefined : "This report has no saved id yet — it can't be exported."}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pdfLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <FileDown className="w-3.5 h-3.5"/>}
                      Export PDF
                    </button>
                    <Link href="/mgd/reports">
                      <a className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm font-medium hover:bg-white/10 hover:text-white/80 transition-all">
                        <ArrowLeft className="w-3.5 h-3.5"/>
                        Back to Archive
                      </a>
                    </Link>
                  </div>
                </div>
                {pdfError && (
                  <p className="mt-3 text-[12px] text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0"/>
                    {pdfError}
                  </p>
                )}
              </GlassCard>

              {/* SECTION 2 — Executive Summary Cards */}
              <div>
                <div className="text-[11px] text-white/25 uppercase tracking-widest mb-3">Executive Summary</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <SumCard label="Critical Findings"        value={summary.criticalFindings}            icon={AlertTriangle} accent="#ef4444"/>
                  <SumCard label="High Findings"            value={summary.highFindings}                icon={AlertCircle}   accent="#f97316"/>
                  <SumCard label="Root Causes"              value={summary.criticalRootCauses}          icon={Layers}        accent="#8b5cf6"/>
                  <SumCard label="High Priority Recs"       value={summary.highPriorityRecommendations} icon={Lightbulb}     accent="#3b82f6"/>
                  <SumCard label="Benchmark Alerts"         value={summary.benchmarkAlerts}             icon={Activity}      accent="#f59e0b"/>
                </div>
              </div>

              {/* SECTION 3 — Operational Health */}
              <GlassCard className="p-8">
                <SectionHeader icon={Activity} label="Operational Health" accent="#3b82f6"/>
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <HealthRing score={score}/>
                  <div className="flex-1 space-y-4 min-w-0">
                    <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 border ${healthBg} ${healthBorder}`}>
                      <span className={`text-sm font-bold ${healthText}`}>{report.visualMetrics.operationalHealthLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(["critical","elevated","watchlist","healthy"] as const).map(k => {
                        const val = report.visualMetrics.benchmarkStatusBreakdown[k];
                        const colors: Record<string, string> = { critical:"text-red-400", elevated:"text-orange-400", watchlist:"text-amber-400", healthy:"text-emerald-400" };
                        return (
                          <div key={k} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <span className="text-[11px] text-white/35 capitalize">{k}</span>
                            <span className={`text-sm font-bold ${colors[k]}`}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[12px] text-white/30 leading-relaxed">
                      Risk level: <span className="text-white/55 font-medium">{report.visualMetrics.operationalRiskLevel}</span>
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* SECTION 3.4 — Diagnostic Scope (what the client asked us to examine) */}
              <DiagnosticScopeSection report={report}/>

              {/* SECTION 3.5 — Industry Assessment */}
              <IndustryAssessmentSection report={report}/>

              {/* SECTION 3.6 — Event Diagnostics Panel */}
              <EventDiagnosticsPanel report={report}/>

              {/* SECTION 3.7 — Consultant Observations */}
              <ConsultantObservationsSection report={report}/>

              {/* SECTION 4 — Findings */}
              {report.findings.length > 0 && (
                <GlassCard className="p-6">
                  <SectionHeader icon={AlertTriangle} label="Operational Findings" count={report.findings.length} accent="#ef4444"/>
                  <div className="space-y-4">
                    {report.findings.map(f => <FindingCard key={f.id} finding={f}/>)}
                  </div>
                </GlassCard>
              )}

              {/* SECTION 5 — Root Causes */}
              {report.rootCauses.length > 0 && (
                <GlassCard className="p-6">
                  <SectionHeader icon={Layers} label="Root Causes" count={report.rootCauses.length} accent="#8b5cf6"/>
                  <div className="space-y-4">
                    {report.rootCauses.map(rc => <RootCauseCard key={rc.id} rc={rc}/>)}
                  </div>
                </GlassCard>
              )}

              {/* SECTION 6 — Recommendations */}
              {report.recommendations.length > 0 && (
                <GlassCard className="p-6">
                  <SectionHeader icon={Lightbulb} label="Recommendations" count={report.recommendations.length} accent="#3b82f6"/>
                  <div className="space-y-7">
                    {TIMEFRAME_ORDER.filter(tf => recsByTimeframe[tf]?.length).map(tf => (
                      <div key={tf}>
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-3.5 h-3.5 text-white/30"/>
                          <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">{TIMEFRAME_LABELS[tf]}</span>
                          <span className="text-[10px] text-white/20 ml-1">({recsByTimeframe[tf].length})</span>
                        </div>
                        <div className="space-y-3">
                          {recsByTimeframe[tf].map(r => <RecCard key={r.id} rec={r}/>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* SECTION 7 — Benchmarks */}
              {report.benchmarks.length > 0 && (
                <GlassCard className="p-6">
                  <SectionHeader icon={BarChart3} label="Benchmark Results" count={report.benchmarks.length} accent="#f59e0b"/>
                  <div className="space-y-7">
                    {BENCHMARK_ORDER.filter(st => bmsByStatus[st]?.length).map(st => (
                      <div key={st}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-widest border ${BM[st].bg} ${BM[st].text} ${BM[st].border}`}>
                            {st}
                          </span>
                          <span className="text-[10px] text-white/20">({bmsByStatus[st].length})</span>
                        </div>
                        <div className="space-y-3">
                          {bmsByStatus[st].map(b => <BenchmarkCard key={b.id} bm={b}/>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* SECTION 8 — Narrative */}
              {narrativeSections.length > 0 && (
                <div>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"#6366f122", border:"1px solid #6366f144" }}>
                      <FileText className="w-4 h-4 text-indigo-400"/>
                    </div>
                    <h2 className="text-base font-bold text-white tracking-tight">Executive Narrative</h2>
                    <span className="ml-auto text-[11px] text-white/30">{narrativeSections.length} sections</span>
                  </div>
                  <div className="space-y-4">
                    {narrativeSections.map(s => <NarrativeCard key={s.id} section={s}/>)}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-[11px] text-white/20 pt-4 border-t border-white/[0.06]">
                <span>MGD Report Viewer · Scope Optix Sdn. Bhd.</span>
                <span>Version: {report.metadata.reportVersion}</span>
              </div>
            </>
          );
        })()}

      </div>
    </div>
  );
}
