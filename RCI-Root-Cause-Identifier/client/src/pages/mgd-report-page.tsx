import { useState } from "react";
import { Link } from "wouter";
import {
  Activity, AlertTriangle, ArrowLeft, BarChart3, CheckCircle2,
  Clock, FileText, Layers, Lightbulb, ShieldAlert, TrendingUp,
  XCircle, ChevronRight, Calendar, Building2, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types (mirrors MGDReport shape from report-composer.ts) ───────────────────

interface BenchmarkStatusBreakdown {
  healthy: number; watchlist: number; elevated: number; critical: number;
}
interface VisualMetrics {
  operationalHealthLabel: string;
  operationalRiskLevel: string;
  benchmarkStatusBreakdown: BenchmarkStatusBreakdown;
}
interface ReportSummary {
  criticalFindings: number; highFindings: number;
  criticalRootCauses: number; highPriorityRecommendations: number;
  benchmarkAlerts: number;
}
interface Finding {
  id: string; category: string; severity: string; confidence: number;
  title: string; summary: string; evidence?: string[]; operationalImpact?: string[];
}
interface RootCause {
  id: string; title: string; severity: string; confidence: number;
  summary: string; contributingFindings?: string[]; operationalImpact?: string[];
}
interface Recommendation {
  id: string; title: string; priority: string; timeframe: string;
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
  metadata: { generatedAt: string; industry?: string; findingsCount: number; rootCauseCount: number; recommendationCount: number; operationalHealthScore?: number; };
}
interface MGDReport {
  metadata: { generatedAt: string; clientName?: string; industry?: string; operationalHealthScore?: number; reportVersion: string; };
  summary: ReportSummary;
  narrative: ExecutiveNarrative;
  findings: Finding[];
  rootCauses: RootCause[];
  recommendations: Recommendation[];
  benchmarks: BenchmarkResult[];
  visualMetrics: VisualMetrics;
}

// ── Mock report for development / preview ─────────────────────────────────────

const MOCK_REPORT: MGDReport = {
  metadata: { generatedAt: new Date().toISOString(), clientName: "Acme Events Sdn. Bhd.", industry: "event_management", operationalHealthScore: 58, reportVersion: "MGD-V1" },
  summary: { criticalFindings: 2, highFindings: 3, criticalRootCauses: 1, highPriorityRecommendations: 4, benchmarkAlerts: 3 },
  visualMetrics: {
    operationalHealthLabel: "Elevated Operational Strain",
    operationalRiskLevel: "Elevated",
    benchmarkStatusBreakdown: { healthy: 3, watchlist: 2, elevated: 2, critical: 1 },
  },
  findings: [
    { id: "f1", category: "inventory_visibility", severity: "CRITICAL", confidence: 92, title: "Critical Inventory Visibility Gap", summary: "Significant stock discrepancies detected across event fulfilment cycles. Inventory tracking lags real-time consumption by an estimated 18–24 hours, creating material exposure during peak event execution.", operationalImpact: ["Unplanned last-minute procurement at premium cost", "Increased vendor dependency and margin erosion"] },
    { id: "f2", category: "logistics_coordination", severity: "CRITICAL", confidence: 88, title: "Logistics Coordination Breakdown", summary: "Vendor dispatch and internal logistics workflows are operating in silos. Cross-team handover failures are generating repeated delivery delays and reactive escalations.", operationalImpact: ["Event setup delays averaging 2.4 hours", "Client satisfaction risk from visible operational disorder"] },
    { id: "f3", category: "financial_leakage", severity: "HIGH", confidence: 85, title: "Refund Leakage Accumulation", summary: "Refund transactions represent 14.2% of gross revenue — significantly above the industry benchmark of 4–7%. Root pattern indicates preventable service failures.", operationalImpact: ["Gross margin compression of ~8 percentage points", "Recurring client dissatisfaction pattern"] },
    { id: "f4", category: "manpower_dependency", severity: "HIGH", confidence: 79, title: "Key Person Dependency — Operations Lead", summary: "Core operational knowledge is concentrated in 2 team members. Absence or overload of these individuals directly stalls execution across all event lines.", operationalImpact: ["Single point of failure for event delivery", "Bottleneck in approval and escalation chains"] },
    { id: "f5", category: "workflow_scalability", severity: "HIGH", confidence: 74, title: "Workflow Scalability Ceiling Reached", summary: "Current manual coordination processes show clear evidence of capacity saturation. The team is managing growth through overtime exposure rather than workflow optimisation.", operationalImpact: ["Burnout risk and retention exposure", "Quality degradation under concurrent event load"] },
  ],
  rootCauses: [
    { id: "rc1", title: "Reactive Operational Coordination Model", severity: "CRITICAL", confidence: 95, summary: "The organisation's operational posture is fundamentally reactive — decisions and resource allocation are triggered by incidents rather than planned execution schedules. This is the primary systemic driver of the observed operational strain.", contributingFindings: ["f1", "f2", "f4"], operationalImpact: ["Compounding execution risk under concurrent event load", "High coordination overhead consuming management bandwidth"] },
    { id: "rc2", title: "Inventory Visibility Infrastructure Weakness", severity: "HIGH", confidence: 87, summary: "Absence of a centralised, real-time inventory tracking system forces teams to operate on lagged data, creating systematic over- and under-procurement cycles.", contributingFindings: ["f1", "f3"], operationalImpact: ["Persistent stock exposure during peak periods", "Procurement inefficiency and vendor cost inflation"] },
    { id: "rc3", title: "Workflow Digitalisation Gap", severity: "HIGH", confidence: 81, summary: "Manual handover dependencies between logistics, operations, and finance teams are creating systematic coordination failures that compound at scale.", contributingFindings: ["f2", "f4", "f5"], operationalImpact: ["Delayed escalation chains reducing response speed", "Knowledge silos creating delivery risk"] },
  ],
  recommendations: [
    { id: "rec1", title: "Implement Centralised Operational Dashboard", priority: "CRITICAL", timeframe: "IMMEDIATE", category: "workflow_scalability", implementationDifficulty: "MEDIUM", summary: "Deploy a unified operations hub providing real-time visibility into event status, resource allocation, and logistics milestones for all concurrent events.", relatedRootCauses: ["rc1", "rc3"], actionItems: ["Identify dashboard tooling (e.g. Monday.com, Airtable, custom)", "Map core data feeds: logistics, inventory, finance", "Run 2-week pilot with operations leads", "Set daily stand-up cadence anchored to dashboard data"], expectedOperationalImpact: ["Reduce reactive escalations by est. 60%", "Improve cross-team visibility and coordination speed"], confidence: 88 },
    { id: "rec2", title: "Deploy Real-Time Inventory Tracking System", priority: "CRITICAL", timeframe: "30_DAYS", category: "inventory_visibility", implementationDifficulty: "MEDIUM", summary: "Introduce barcode or RFID-based inventory tracking integrated with event execution checklists to close the 18–24 hour visibility lag.", relatedRootCauses: ["rc2"], actionItems: ["Audit current inventory management workflow", "Select tracking technology appropriate to event scale", "Train warehouse and logistics staff", "Integrate with procurement approval chain"], expectedOperationalImpact: ["Reduce procurement overruns by est. 35%", "Eliminate reactive last-minute vendor calls"], confidence: 85 },
    { id: "rec3", title: "Establish Dispatch Readiness Checkpoints", priority: "HIGH", timeframe: "IMMEDIATE", category: "logistics_coordination", implementationDifficulty: "LOW", summary: "Introduce standardised pre-event dispatch verification checklists with sign-off protocols to catch coordination failures before they reach the client.", relatedRootCauses: ["rc1", "rc3"], actionItems: ["Design checklist template for each event type", "Assign dispatch readiness owner per event", "Build checkpoint into CRM or project management workflow"], expectedOperationalImpact: ["Reduce on-site setup delays by est. 70%", "Improve vendor coordination reliability"], confidence: 90 },
    { id: "rec4", title: "Cross-Train Operations Team — Reduce Key Person Risk", priority: "HIGH", timeframe: "30_DAYS", category: "manpower_dependency", implementationDifficulty: "LOW", summary: "Document operational playbooks and rotate core responsibilities to eliminate single-point-of-failure risk within the operations function.", relatedRootCauses: ["rc1", "rc3"], actionItems: ["Identify critical knowledge held by 2 key individuals", "Create role-based operational playbooks", "Schedule monthly cross-training rotations"], expectedOperationalImpact: ["Eliminate operational halts during key person absences", "Build organisational resilience for scale"], confidence: 82 },
    { id: "rec5", title: "Refund Root Cause Analysis Programme", priority: "HIGH", timeframe: "90_DAYS", category: "financial_leakage", implementationDifficulty: "LOW", summary: "Introduce post-event refund reviews to classify root causes and build a systematic prevention programme targeting the highest-frequency failure types.", relatedRootCauses: ["rc2"], actionItems: ["Build refund classification taxonomy", "Run monthly refund review meetings with ops leads", "Track prevention rate as a KPI"], expectedOperationalImpact: ["Target reduction of refund rate from 14.2% to sub-7%", "Recover estimated 5–8% gross margin"], confidence: 78 },
    { id: "rec6", title: "Scalability Review — Event Capacity Planning", priority: "MEDIUM", timeframe: "LONG_TERM", category: "workflow_scalability", implementationDifficulty: "MEDIUM", summary: "Conduct a formal capacity planning exercise to define the maximum concurrent event load sustainable at current team size without quality degradation.", relatedRootCauses: ["rc3"], actionItems: ["Map current resource utilisation per event type", "Model capacity ceiling at current headcount", "Design hiring or automation roadmap for growth"], expectedOperationalImpact: ["Prevent burnout and retention risk", "Enable confident growth to next revenue tier"], confidence: 76 },
  ],
  benchmarks: [
    { id: "bm1", metric: "Refund Leakage Rate", category: "financial_leakage", actualValue: 14.2, benchmarkRange: { low: 4, medium: 6, high: 9 }, status: "CRITICAL", interpretation: "Refund rate is 2.4× the industry high threshold. This level of leakage indicates systematic preventable service failures requiring immediate structural intervention.", confidence: 90 },
    { id: "bm2", metric: "Inventory Discrepancy Rate", category: "inventory_visibility", actualValue: 11.8, benchmarkRange: { low: 2, medium: 4, high: 7 }, status: "CRITICAL", interpretation: "Discrepancy rate is significantly above industry norms, confirming the absence of effective real-time tracking infrastructure.", confidence: 85 },
    { id: "bm3", metric: "Logistics Coordination Delay", category: "logistics_coordination", actualValue: 2.4, benchmarkRange: { low: 0.5, medium: 1.0, high: 1.5 }, status: "ELEVATED", interpretation: "Average delivery delay exceeds the industry high benchmark. Multi-team coordination failures are the primary driver.", confidence: 82 },
    { id: "bm4", metric: "Manual Workflow Dependency", category: "manpower_dependency", actualValue: 78, benchmarkRange: { low: 20, medium: 40, high: 60 }, status: "ELEVATED", interpretation: "78% of core operational tasks rely on manual handover — well above the benchmark ceiling. Automation gap creates scale ceiling.", confidence: 80 },
    { id: "bm5", metric: "Overtime Exposure Rate", category: "workflow_scalability", actualValue: 34, benchmarkRange: { low: 10, medium: 20, high: 30 }, status: "WATCHLIST", interpretation: "Overtime is approaching a level that typically precedes burnout-driven attrition in operations-heavy teams.", confidence: 75 },
    { id: "bm6", metric: "Operational Health Score", category: "operational_health", actualValue: 58, benchmarkRange: { low: 80, medium: 70, high: 60 }, status: "WATCHLIST", interpretation: "Score falls within the Elevated Operational Strain band. Structural intervention required to prevent further degradation.", confidence: 88 },
    { id: "bm7", metric: "Logistics Utilisation", category: "logistics_coordination", actualValue: 0.81, benchmarkRange: { low: 0.6, medium: 0.75, high: 0.9 }, status: "HEALTHY", interpretation: "Logistics capacity utilisation is within normal range, suggesting the issue is coordination quality rather than capacity.", confidence: 77 },
    { id: "bm8", metric: "Rejected Jobs Rate", category: "financial_leakage", actualValue: 3.2, benchmarkRange: { low: 2, medium: 5, high: 8 }, status: "HEALTHY", interpretation: "Job rejection rate is within healthy parameters.", confidence: 72 },
  ],
  narrative: {
    executiveOverview: { id: "executive-overview", title: "Executive Overview", priority: 1, content: "Acme Events Sdn. Bhd. is operating under Elevated Operational Strain, with an Operational Health Score of 58/100. The diagnostic has identified 5 operational findings — 2 Critical and 3 High — driven primarily by a reactive coordination model and critical gaps in inventory visibility infrastructure. Immediate structural intervention is warranted to prevent further margin erosion and protect client delivery quality as the business scales." },
    keyFindings: { id: "key-findings", title: "Key Operational Findings", priority: 2, content: "The two most urgent findings — Inventory Visibility Gap and Logistics Coordination Breakdown — represent systemic infrastructure weaknesses rather than isolated incidents. Both are compounding each other: poor inventory data is driving reactive logistics decisions, which in turn generates client-facing delivery failures and refund exposure. These findings must be addressed concurrently, not sequentially." },
    rootCauseSummary: { id: "root-cause-summary", title: "Root Cause Analysis", priority: 3, content: "The primary systemic root cause is a Reactive Operational Coordination Model. The organisation has grown its event volume without building the operational infrastructure — dashboards, SOPs, tracking systems, cross-training — necessary to sustain delivery quality at scale. This root cause is driving 4 of the 5 identified findings and must be addressed at the structural level, not through individual effort or overtime absorption." },
    operationalHealth: { id: "operational-health", title: "Operational Health Assessment", priority: 4, content: "The Operational Health Score of 58 places the organisation in the Elevated Operational Strain band. Benchmark comparison confirms that refund leakage (14.2%) and inventory discrepancy rates (11.8%) are operating significantly above industry norms. The logistics utilisation benchmark, however, is healthy — indicating this is a coordination and visibility problem, not a capacity problem. The infrastructure is there; the integration and governance is not." },
    priorityActions: { id: "priority-actions", title: "Priority Actions", priority: 5, content: "The two highest-impact interventions are: (1) Centralised Operational Dashboard — deployable immediately, no new technology required, immediate visibility improvement; and (2) Dispatch Readiness Checkpoints — a process-level fix that can reduce on-site delays by an estimated 70% within 30 days. Both actions are low-to-medium difficulty and can be initiated in parallel this week." },
    strategicDirection: { id: "strategic-direction", title: "Strategic Direction", priority: 6, content: "The 90-day strategic direction should focus on closing the visibility infrastructure gap (inventory tracking, centralised ops dashboard) and eliminating manual handover dependencies through process standardisation and light automation. The refund reduction programme, if executed effectively, has the potential to recover 5–8% gross margin within two quarters — making it the highest-ROI initiative in the recommendation set." },
    finalConclusion: { id: "final-conclusion", title: "Conclusion", priority: 7, content: "Acme Events has the team, the market position, and the client base to scale effectively — but the operational infrastructure has not kept pace with revenue growth. The diagnostic recommends a disciplined 90-day operational stabilisation programme before pursuing further growth. Prioritise visibility, standardisation, and cross-training. The financial case is clear: reducing refund leakage alone to industry norm would recover more than the cost of all recommended interventions combined." },
    metadata: { generatedAt: new Date().toISOString(), industry: "event_management", findingsCount: 5, rootCauseCount: 3, recommendationCount: 6, operationalHealthScore: 58 },
  },
};

// ── Helper components ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { label: "Critical", bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",   dot: "bg-red-500" },
  HIGH:     { label: "High",     bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",dot: "bg-orange-500" },
  MEDIUM:   { label: "Medium",   bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200",dot: "bg-yellow-500" },
  LOW:      { label: "Low",      bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",  dot: "bg-blue-400" },
};

const BENCHMARK_CONFIG: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  CRITICAL: { label: "Critical",  bg: "bg-red-50",    text: "text-red-700",    bar: "bg-red-500" },
  ELEVATED: { label: "Elevated",  bg: "bg-orange-50", text: "text-orange-700", bar: "bg-orange-400" },
  WATCHLIST:{ label: "Watchlist", bg: "bg-yellow-50", text: "text-yellow-700", bar: "bg-yellow-400" },
  HEALTHY:  { label: "Healthy",   bg: "bg-green-50",  text: "text-green-700",  bar: "bg-green-500" },
};

const TIMEFRAME_LABELS: Record<string, string> = {
  IMMEDIATE: "Immediate",
  "30_DAYS": "30 Days",
  "90_DAYS": "90 Days",
  LONG_TERM: "Long Term",
};

const TIMEFRAME_ORDER = ["IMMEDIATE", "30_DAYS", "90_DAYS", "LONG_TERM"];

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW:    { label: "Low Effort",    color: "text-green-700" },
  MEDIUM: { label: "Medium Effort", color: "text-yellow-700" },
  HIGH:   { label: "High Effort",   color: "text-red-700" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.LOW;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-slate-400 rounded-full transition-all" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-500 font-medium tabular-nums">{value}%</span>
    </div>
  );
}

function BenchmarkBar({ benchmark }: { benchmark: BenchmarkResult }) {
  const cfg = BENCHMARK_CONFIG[benchmark.status] ?? BENCHMARK_CONFIG.HEALTHY;
  const max = benchmark.benchmarkRange.high * 1.5;
  const pct = Math.min(100, Math.round((benchmark.actualValue / max) * 100));
  const highPct = Math.min(100, Math.round((benchmark.benchmarkRange.high / max) * 100));

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg} border-opacity-60`} style={{ borderColor: "inherit" }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{benchmark.metric}</p>
          <p className="text-xs text-slate-500 mt-0.5">{benchmark.interpretation}</p>
        </div>
        <span className={`ml-4 shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>
      <div className="mt-3 relative h-2 bg-white/70 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-slate-200/80 rounded-full" style={{ width: `${highPct}%` }} />
        <div className={`absolute inset-y-0 left-0 ${cfg.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-slate-400">0</span>
        <span className={`text-xs font-bold ${cfg.text}`}>{benchmark.actualValue}</span>
        <span className="text-xs text-slate-400">Threshold: {benchmark.benchmarkRange.high}</span>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<any>; label: string; value: number; sub: string; accent: string;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm flex items-start gap-4`}>
      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const sevCfg = SEVERITY_CONFIG[rec.priority] ?? SEVERITY_CONFIG.LOW;
  const diff = DIFFICULTY_CONFIG[rec.implementationDifficulty] ?? DIFFICULTY_CONFIG.LOW;
  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-sm font-semibold text-slate-900 leading-snug">{rec.title}</h4>
        <SeverityBadge severity={rec.priority} />
      </div>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">{rec.summary}</p>
      {rec.actionItems && rec.actionItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Action Items</p>
          <ul className="space-y-1.5">
            {rec.actionItems.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
      {rec.expectedOperationalImpact && rec.expectedOperationalImpact.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Expected Impact</p>
          <ul className="space-y-1">
            {rec.expectedOperationalImpact.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="pt-3 border-t border-slate-50 flex items-center gap-4">
        <span className={`text-xs font-medium ${diff.color}`}>{diff.label}</span>
        <span className="text-slate-300">·</span>
        <ConfidenceBar value={rec.confidence} />
      </div>
    </div>
  );
}

// ── Loading state ──────────────────────────────────────────────────────────────

function MGDReportSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function MGDReportEmpty() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <FileText className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Report Generated</h2>
        <p className="text-sm text-slate-500 mb-6">Run the MGD pipeline to generate an operational diagnostic report for this client.</p>
        <Link href="/mgd">
          <a className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to MGD
          </a>
        </Link>
      </div>
    </div>
  );
}

// ── Health score display ───────────────────────────────────────────────────────

function HealthScoreRing({ score, label }: { score: number; label: string }) {
  const angle = (score / 100) * 283;
  const color = score >= 80 ? "#10b981" : score >= 65 ? "#f59e0b" : score >= 50 ? "#f97316" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-40 w-40 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${angle} 283`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-bold text-slate-900 leading-none">{score}</p>
        <p className="text-xs text-slate-400 mt-1 font-medium">/100</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

interface MGDReportPageProps {
  report?: MGDReport | null;
  isLoading?: boolean;
  useMock?: boolean;
}

export default function MGDReportPage({ report: propReport, isLoading = false, useMock = true }: MGDReportPageProps) {
  const [activeSection, setActiveSection] = useState<string>("overview");

  if (isLoading) return <MGDReportSkeleton />;

  const report = propReport ?? (useMock ? MOCK_REPORT : null);
  if (!report) return <MGDReportEmpty />;

  const { metadata, summary, visualMetrics, findings, rootCauses, recommendations, benchmarks, narrative } = report;
  const bsd = visualMetrics.benchmarkStatusBreakdown;
  const totalBM = (bsd.healthy + bsd.watchlist + bsd.elevated + bsd.critical) || 1;

  const sortedFindings = [...findings].sort((a, b) => {
    const ord = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (ord[a.severity as keyof typeof ord] ?? 9) - (ord[b.severity as keyof typeof ord] ?? 9);
  });

  const recsByTimeframe = TIMEFRAME_ORDER.reduce<Record<string, Recommendation[]>>((acc, tf) => {
    const group = recommendations.filter(r => r.timeframe === tf);
    if (group.length) acc[tf] = group;
    return acc;
  }, {});

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "summary",  label: "Summary" },
    { id: "benchmarks", label: "Benchmarks" },
    { id: "findings", label: "Findings" },
    { id: "rootcauses", label: "Root Causes" },
    { id: "recommendations", label: "Actions" },
    { id: "narrative", label: "Narrative" },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  const generatedDate = new Date(metadata.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Sticky nav ────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/mgd">
              <a className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors text-sm">
                <ArrowLeft className="h-4 w-4" /> MGD
              </a>
            </Link>
            <span className="text-slate-200">|</span>
            <span className="text-sm font-semibold text-slate-800 truncate max-w-xs">{metadata.clientName ?? "Diagnostic Report"}</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">{metadata.reportVersion}</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeSection === item.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" /> {generatedDate}
            </span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-14">

        {/* ── SECTION 1: Executive Hero ──────────────────────────────────────── */}
        <section id="section-overview">
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-10 py-12">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
                <div className="flex-1">
                  {metadata.clientName && (
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-400 text-sm font-medium">{metadata.clientName}</span>
                    </div>
                  )}
                  <h1 className="text-3xl font-bold text-white leading-tight mb-4">
                    Operational Diagnostic Report
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    {metadata.industry && (
                      <span className="text-xs text-slate-400 bg-white/10 border border-white/10 px-3 py-1 rounded-full capitalize">
                        {metadata.industry.replace(/_/g, " ")}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 bg-white/10 border border-white/10 px-3 py-1 rounded-full font-mono">
                      {metadata.reportVersion}
                    </span>
                    <span className="text-xs text-slate-400 bg-white/10 border border-white/10 px-3 py-1 rounded-full">
                      Generated {generatedDate}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Health Status</span>
                      <span className="text-sm font-bold text-white">{visualMetrics.operationalHealthLabel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Risk Level</span>
                      <span className="text-sm font-bold text-white">{visualMetrics.operationalRiskLevel}</span>
                    </div>
                  </div>
                </div>
                {metadata.operationalHealthScore != null && (
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <HealthScoreRing score={metadata.operationalHealthScore} label={visualMetrics.operationalHealthLabel} />
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Operational Health</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick-stat ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-slate-100 border-t border-slate-100">
              {[
                { label: "Critical Findings",     value: summary.criticalFindings,          icon: XCircle,      color: "text-red-600" },
                { label: "High Findings",         value: summary.highFindings,              icon: AlertTriangle,color: "text-orange-600" },
                { label: "Critical Root Causes",  value: summary.criticalRootCauses,        icon: Layers,       color: "text-red-600" },
                { label: "Priority Actions",      value: summary.highPriorityRecommendations,icon: Zap,         color: "text-blue-600" },
                { label: "Benchmark Alerts",      value: summary.benchmarkAlerts,           icon: ShieldAlert,  color: "text-orange-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="px-5 py-4 text-center">
                  <div className={`flex items-center justify-center gap-1.5 mb-1 ${color}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-xl font-bold">{value}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Summary Cards ───────────────────────────────────────── */}
        <section id="section-summary">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Executive Summary</h2>
            <p className="text-sm text-slate-500 mt-1">Key metrics from the operational diagnostic assessment.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard icon={XCircle}      label="Critical Findings"          value={summary.criticalFindings}              sub="Requires immediate action"      accent="bg-red-500" />
            <SummaryCard icon={Layers}       label="Critical Root Causes"       value={summary.criticalRootCauses}            sub="Systemic structural issues"     accent="bg-rose-600" />
            <SummaryCard icon={Zap}          label="Priority Recommendations"   value={summary.highPriorityRecommendations}   sub="High or critical priority"      accent="bg-blue-600" />
            <SummaryCard icon={ShieldAlert}  label="Benchmark Alerts"           value={summary.benchmarkAlerts}              sub="Elevated or critical status"    accent="bg-orange-500" />
          </div>
        </section>

        {/* ── SECTION 3: Benchmark Overview ─────────────────────────────────── */}
        <section id="section-benchmarks">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Benchmark Overview</h2>
              <p className="text-sm text-slate-500 mt-1">Comparison against industry operational standards.</p>
            </div>
          </div>

          {/* Status summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { key: "critical", label: "Critical",  count: bsd.critical,  bar: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50" },
              { key: "elevated", label: "Elevated",  count: bsd.elevated,  bar: "bg-orange-400", text: "text-orange-700", bg: "bg-orange-50" },
              { key: "watchlist",label: "Watchlist", count: bsd.watchlist, bar: "bg-yellow-400", text: "text-yellow-700", bg: "bg-yellow-50" },
              { key: "healthy",  label: "Healthy",   count: bsd.healthy,   bar: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50" },
            ].map(({ key, label, count, bar, text, bg }) => (
              <div key={key} className={`rounded-xl border border-slate-100 ${bg} p-4`}>
                <p className={`text-3xl font-bold ${text}`}>{count}</p>
                <p className="text-xs font-semibold text-slate-600 mt-1">{label}</p>
                <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div className={`h-full ${bar} rounded-full`} style={{ width: `${(count / totalBM) * 100}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{Math.round((count / totalBM) * 100)}% of benchmarks</p>
              </div>
            ))}
          </div>

          {/* Benchmark cards — sorted by severity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...benchmarks]
              .sort((a, b) => {
                const ord = { CRITICAL: 0, ELEVATED: 1, WATCHLIST: 2, HEALTHY: 3 };
                return (ord[a.status as keyof typeof ord] ?? 9) - (ord[b.status as keyof typeof ord] ?? 9);
              })
              .map(bm => <BenchmarkBar key={bm.id} benchmark={bm} />)}
          </div>
        </section>

        {/* ── SECTION 4: Key Findings ────────────────────────────────────────── */}
        <section id="section-findings">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Key Operational Findings</h2>
            <p className="text-sm text-slate-500 mt-1">{findings.length} findings identified — sorted by severity.</p>
          </div>
          <div className="space-y-4">
            {sortedFindings.map((f, idx) => {
              const cfg = SEVERITY_CONFIG[f.severity] ?? SEVERITY_CONFIG.LOW;
              return (
                <div key={f.id} className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <div className={`flex items-center gap-3 px-5 py-3 border-b ${cfg.bg} border-slate-100`}>
                    <span className="text-xs font-bold text-slate-400 tabular-nums w-5">{String(idx + 1).padStart(2, "0")}</span>
                    <SeverityBadge severity={f.severity} />
                    <span className="text-xs text-slate-500 capitalize">{f.category.replace(/_/g, " ")}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">{f.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{f.summary}</p>
                    {f.operationalImpact && f.operationalImpact.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Operational Impact</p>
                        <ul className="space-y-1.5">
                          {f.operationalImpact.map((imp, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-orange-400" />
                              {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">Confidence</span>
                        <ConfidenceBar value={f.confidence} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 5: Root Cause Panels ──────────────────────────────────── */}
        <section id="section-rootcauses">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Root Cause Analysis</h2>
            <p className="text-sm text-slate-500 mt-1">{rootCauses.length} systemic root causes identified.</p>
          </div>
          <div className="space-y-5">
            {rootCauses.map((rc, idx) => {
              const cfg = SEVERITY_CONFIG[rc.severity] ?? SEVERITY_CONFIG.LOW;
              return (
                <div key={rc.id} className="rounded-xl border border-slate-100 bg-white shadow-sm p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${cfg.bg} ${cfg.text}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{rc.title}</h3>
                        <div className="mt-1"><SeverityBadge severity={rc.severity} /></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed mb-5">{rc.summary}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {rc.contributingFindings && rc.contributingFindings.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Contributing Findings</p>
                        <ul className="space-y-1.5">
                          {rc.contributingFindings.map((fId, i) => {
                            const linked = findings.find(f => f.id === fId);
                            return (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                                {linked ? linked.title : fId}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {rc.operationalImpact && rc.operationalImpact.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Operational Impact</p>
                        <ul className="space-y-1.5">
                          {rc.operationalImpact.map((imp, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-orange-700">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Confidence</span>
                      <ConfidenceBar value={rc.confidence} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 6: Priority Recommendations ───────────────────────────── */}
        <section id="section-recommendations">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Priority Recommendations</h2>
            <p className="text-sm text-slate-500 mt-1">{recommendations.length} corrective actions — grouped by implementation timeframe.</p>
          </div>
          <div className="space-y-10">
            {TIMEFRAME_ORDER.filter(tf => recsByTimeframe[tf]).map(tf => (
              <div key={tf}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold">
                    <Clock className="h-3.5 w-3.5" />
                    {TIMEFRAME_LABELS[tf]}
                  </div>
                  <span className="text-xs text-slate-400">{recsByTimeframe[tf].length} recommendation{recsByTimeframe[tf].length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recsByTimeframe[tf].map(rec => <RecommendationCard key={rec.id} rec={rec} />)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 7: Executive Narrative ────────────────────────────────── */}
        <section id="section-narrative">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Executive Narrative</h2>
            <p className="text-sm text-slate-500 mt-1">Strategic analysis and consulting commentary.</p>
          </div>
          <div className="space-y-6">
            {[
              narrative.executiveOverview,
              narrative.operationalHealth,
              narrative.strategicDirection,
              narrative.finalConclusion,
            ].filter(Boolean).map(sec => (
              <div key={sec.id} className="rounded-xl border border-slate-100 bg-white shadow-sm p-7">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-loose">{sec.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <footer className="rounded-xl border border-slate-100 bg-white shadow-sm px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Margin Guard Diagnostics · Scope Optix Sdn. Bhd.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="font-mono">{metadata.reportVersion}</span>
            <span>·</span>
            <span>{generatedDate}</span>
            <span>·</span>
            <span>Confidential</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
