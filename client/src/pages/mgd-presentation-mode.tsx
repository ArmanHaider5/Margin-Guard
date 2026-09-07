import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearch, useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
  Clock, Maximize2, Minimize2, Pause, Play,
  AlertTriangle, BarChart3, Layers, Lightbulb,
  TrendingUp, Shield, Building2, Activity,
  CheckCircle2, XCircle, X, Loader2, Inbox,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BenchmarkResult {
  id: string; metric: string; category: string;
  actualValue: number; benchmarkRange: { low: number; medium: number; high: number; };
  status: string; interpretation: string; confidence: number; operationalRisk?: string;
}
interface Finding {
  id: string; category: string; severity: string; confidence: number;
  title: string; summary: string; evidence?: string[]; operationalImpact?: string | string[];
}
interface RootCause {
  id: string; title: string; severity: string; confidence: number;
  summary: string; contributingFindings?: string[]; operationalImpact?: string[];
}
interface Recommendation {
  id: string; title: string; priority: string; timeframe: string;
  implementationDifficulty: string; summary: string;
  actionItems?: string[]; expectedOperationalImpact?: string[]; confidence: number;
}
interface NarrativeSection { id: string; title: string; content: string; }
interface ExecutiveNarrative {
  executiveOverview?: NarrativeSection; operationalHealth?: NarrativeSection;
  strategicDirection?: NarrativeSection; finalConclusion?: NarrativeSection;
  keyFindings?: NarrativeSection; priorityActions?: NarrativeSection;
}
interface MGDReport {
  id?: string;
  metadata: {
    generatedAt: string; clientName?: string; industry?: string;
    operationalHealthScore?: number; reportVersion: string;
    evidence?: { level: "NONE" | "PARTIAL" | "SUFFICIENT"; reasons: string[] };
  };
  summary: { criticalFindings: number; highFindings: number; criticalRootCauses: number; highPriorityRecommendations: number; benchmarkAlerts: number; };
  narrative: ExecutiveNarrative;
  findings: Finding[];
  rootCauses: RootCause[];
  recommendations: Recommendation[];
  benchmarks: BenchmarkResult[];
  visualMetrics: { operationalHealthLabel: string; operationalRiskLevel: string; benchmarkStatusBreakdown: { healthy: number; watchlist: number; elevated: number; critical: number; }; };
}

// ── Mock data ─────────────────────────────────────────────────────────────────
//
// DEV/TEST FIXTURE ONLY — never reachable from real navigation. The routed
// path (/mgd/present?id=...) always fetches a real, persisted report by id
// (see MGDPresentationMode below); this constant is used only when a caller
// directly renders <MGDPresentationMode useMock /> outside the router, e.g.
// for isolated visual testing. It must never become the fallback for a
// missing or failed real report — see the "status" state machine below,
// which shows an explicit error/empty state instead.

const MOCK_REPORT: MGDReport = {
  metadata: {
    generatedAt:             new Date().toISOString(),
    clientName:              "Acme Events Sdn. Bhd.",
    industry:                "Event Management",
    operationalHealthScore:  51,
    reportVersion:           "MGD-V1",
  },
  summary: {
    criticalFindings:            3,
    highFindings:                2,
    criticalRootCauses:          2,
    highPriorityRecommendations: 4,
    benchmarkAlerts:             6,
  },
  visualMetrics: {
    operationalHealthLabel:   "Elevated Operational Strain",
    operationalRiskLevel:     "Controlled",
    benchmarkStatusBreakdown: { healthy: 3, watchlist: 0, elevated: 2, critical: 4 },
  },
  narrative: {
    executiveOverview: {
      id: "executive-overview", title: "Executive Overview",
      content: "Acme Events Sdn. Bhd. is operating under elevated operational strain with a health score of 51/100. Benchmark analysis across nine operational metrics reveals four critical threshold breaches—refund leakage, manual workflow dependency, manpower concentration, and overtime exposure. These systemic pressures indicate fragile operational architecture with insufficient automation and a high degree of human-dependent execution risk. Immediate intervention is required to stabilise the operational base before scalability initiatives can be considered.",
    },
    operationalHealth: {
      id: "operational-health", title: "Operational Health Assessment",
      content: "The organisation's operational health score of 51 classifies it as Elevated Operational Strain. This classification reflects persistent gaps in process automation (78% manual dependency), excessive reliance on key personnel (62% manpower concentration), and structural refund leakage running at 14.2%—more than double the industry threshold. Without structural remediation, these conditions are likely to worsen under volume growth or seasonal demand surges.",
    },
    strategicDirection: {
      id: "strategic-direction", title: "Strategic Direction",
      content: "The immediate strategic priority is to reduce manual workflow dependency through selective automation of high-frequency, low-complexity processes. Process mapping exercises targeting the top five manual workflows should yield 20–30% efficiency gains within 60 days. In the medium term, workforce cross-training programmes will reduce single-point-of-failure risks. Over the next 90 days, a phased refund policy tightening strategy—combined with cancellation buffer provisioning—will address the most significant margin leakage vector. Long-term operational maturity requires investment in integrated operational intelligence tooling and standardised KPI governance.",
    },
    finalConclusion: {
      id: "final-conclusion", title: "Conclusion",
      content: "Acme Events Sdn. Bhd. is at a critical operational inflection point. The four critical benchmark breaches and elevated health score of 51 signal systemic risk that cannot be resolved through isolated tactical fixes. A coordinated operational improvement programme—anchored by automation, cross-training, and refund governance—is the requisite path to sustainable margin recovery. MGD recommends immediate engagement on the four priority recommendations identified in this report. A 90-day re-evaluation is advised to measure programme impact and recalibrate the operational roadmap.",
    },
  },
  benchmarks: [
    { id: "bm1", metric: "Refund Leakage Rate",       category: "Finance",    actualValue: 14.2, benchmarkRange: { low: 2, medium: 4, high: 6  }, status: "CRITICAL", interpretation: "Refund rate at 14.2% — more than double acceptable threshold of 6%.",     confidence: 88, operationalRisk: "Direct margin erosion; accelerates under volume growth." },
    { id: "bm2", metric: "Manual Workflow Dependency", category: "Operations", actualValue: 78,   benchmarkRange: { low: 20, medium: 35, high: 50 }, status: "CRITICAL", interpretation: "78% of workflows executed manually — far exceeds 50% critical threshold.", confidence: 78, operationalRisk: "Execution bottlenecks and error compounding under pressure." },
    { id: "bm3", metric: "Manpower Dependency Rate",   category: "Manpower",   actualValue: 62,   benchmarkRange: { low: 20, medium: 35, high: 50 }, status: "CRITICAL", interpretation: "62% concentration in key personnel — critical single-point-of-failure risk.", confidence: 75, operationalRisk: "Operational continuity threatened by key personnel departure." },
    { id: "bm4", metric: "Overtime Exposure Rate",     category: "Manpower",   actualValue: 34,   benchmarkRange: { low: 10, medium: 20, high: 30 }, status: "CRITICAL", interpretation: "34% overtime exposure — indicates structural understaffing.",              confidence: 72, operationalRisk: "Burnout, quality degradation, and escalating labour costs." },
    { id: "bm5", metric: "Inventory Loss Rate",        category: "Operations", actualValue: 5.8,  benchmarkRange: { low: 1, medium: 2.5, high: 4  }, status: "ELEVATED", interpretation: "Inventory losses running at 5.8% — above 4% elevated threshold.",           confidence: 90, operationalRisk: "Uncontrolled shrinkage eroding event-level margins." },
    { id: "bm6", metric: "Inventory Discrepancy Rate", category: "Operations", actualValue: 11.8, benchmarkRange: { low: 2, medium: 5, high: 8   }, status: "ELEVATED", interpretation: "11.8% discrepancy rate signals reconciliation control weaknesses.",          confidence: 85, operationalRisk: "Audit exposure and procurement over-ordering." },
    { id: "bm7", metric: "Rejected Jobs Rate",         category: "Operations", actualValue: 3.2,  benchmarkRange: { low: 2, medium: 5, high: 8   }, status: "HEALTHY",  interpretation: "Rejected jobs rate of 3.2% — within healthy operational range.",          confidence: 83 },
    { id: "bm8", metric: "Logistics Utilisation",      category: "Logistics",  actualValue: 0.81, benchmarkRange: { low: 0.6, medium: 0.75, high: 0.9 }, status: "HEALTHY", interpretation: "Logistics capacity utilisation at 81% — well managed.",                 confidence: 82 },
    { id: "bm9", metric: "Reconciliation Delay Rate",  category: "Finance",    actualValue: 2.4,  benchmarkRange: { low: 1, medium: 3, high: 5   }, status: "HEALTHY",  interpretation: "Reconciliation delay rate of 2.4% — within acceptable range.",            confidence: 80 },
  ],
  findings: [
    { id: "f001", severity: "CRITICAL", category: "Finance",    confidence: 91, title: "Structural Refund Leakage — Margin Erosion", summary: "Refund rate of 14.2% is eroding event-level gross margins across all client segments. Cancellation-driven returns account for 68% of refund volume with no contractual buffer in place.", operationalImpact: ["Estimated 8–11% gross margin drag per event cohort", "Refund cycles straining cash flow predictability"] },
    { id: "f002", severity: "CRITICAL", category: "Operations", confidence: 87, title: "High Manual Workflow Dependency — Execution Risk", summary: "78% of operational workflows rely on manual execution with no automation guardrails. Process errors and throughput bottlenecks are compounding under event volume growth.", operationalImpact: ["3–4x higher error rate vs. automated peers", "Inability to scale operations without proportional headcount increase"] },
    { id: "f003", severity: "CRITICAL", category: "Manpower",   confidence: 83, title: "Key Personnel Concentration — Continuity Risk", summary: "62% of critical operational functions vest in three individuals. No documented succession protocols or cross-training programmes exist.", operationalImpact: ["Single-event failure risk if key staff unavailable", "Contractual penalty exposure from delivery failures"] },
    { id: "f004", severity: "HIGH",     category: "Operations", confidence: 79, title: "Inventory Discrepancy — Control Weaknesses", summary: "11.8% inventory discrepancy rate indicates breakdown in stocktake and reconciliation controls. Manual counting methods and absent barcode verification are primary contributors.", operationalImpact: ["Over-procurement adding 6–9% cost overhead", "Audit exposure under client contract terms"] },
    { id: "f005", severity: "HIGH",     category: "Manpower",   confidence: 74, title: "Overtime Overexposure — Structural Understaffing", summary: "34% overtime exposure across logistics and operations teams signals that headcount is calibrated for average demand, not peak event loads.", operationalImpact: ["Labour cost overrun of est. RM 18,000–24,000/quarter", "Fatigue-driven quality degradation in delivery execution"] },
  ],
  rootCauses: [
    { id: "rc001", severity: "CRITICAL", confidence: 89, title: "Absent Contractual Refund Governance", summary: "No standardised refund policy or cancellation buffer clauses exist across client contracts. Refund approvals are processed ad hoc without margin-impact assessment.", contributingFindings: ["f001"], operationalImpact: ["Uncapped refund liability on every event contract", "Finance team unable to forecast net margin with confidence"] },
    { id: "rc002", severity: "CRITICAL", confidence: 84, title: "Absence of Process Automation Infrastructure", summary: "Operations have scaled through headcount addition rather than process automation. No workflow automation tools, digital checklists, or task orchestration systems are deployed.", contributingFindings: ["f002", "f003"], operationalImpact: ["Proportional cost scaling — growth equals headcount growth", "Error compounding accelerates under event volume surges"] },
    { id: "rc003", severity: "HIGH",     confidence: 78, title: "Inventory Management System Deficiency", summary: "Physical stock management relies on manual spreadsheet reconciliation with no real-time tracking capability. Discrepancies accumulate between procurement and deployment cycles.", contributingFindings: ["f004"], operationalImpact: ["Systematic over-procurement to compensate for tracking gaps", "Loss attribution is impossible without transaction-level tracking"] },
    { id: "rc004", severity: "HIGH",     confidence: 71, title: "Workforce Planning Structural Gap", summary: "Event staffing is modelled on average historical volume rather than forward-looking demand forecasting. Peak event clusters trigger systematic overtime without contingency staffing protocols.", contributingFindings: ["f003", "f005"], operationalImpact: ["Labour cost variance of 15–25% in peak quarters", "Cross-training deficit leaves operations unable to flex workforce"] },
  ],
  recommendations: [
    { id: "r001", priority: "CRITICAL", timeframe: "IMMEDIATE", implementationDifficulty: "MEDIUM", confidence: 88, title: "Implement Standard Refund Policy & Cancellation Buffer Clauses", summary: "Draft and deploy a standardised refund governance framework across all new and renewed client contracts. Include non-refundable deposit clauses (minimum 30%) and tiered cancellation penalties.", actionItems: ["Draft model refund clause with legal review", "Apply to all contracts renewing within 60 days", "Train sales team on policy negotiation"], expectedOperationalImpact: ["Reduce refund leakage from 14.2% to below 6% within 2 quarters", "Improve margin predictability by 20–30%"] },
    { id: "r002", priority: "HIGH",     timeframe: "IMMEDIATE", implementationDifficulty: "LOW",    confidence: 85, title: "Deploy Digital Task Automation for Top-5 Manual Workflows", summary: "Identify and automate the five highest-frequency manual workflows using no-code automation tools (e.g. Make, Zapier). Begin with inventory reconciliation, booking confirmation, and supplier PO generation.", actionItems: ["Map top-5 workflows and document current manual steps", "Select automation tool and build first workflow within 2 weeks", "Measure time savings and error reduction at 30-day mark"], expectedOperationalImpact: ["Reduce manual dependency from 78% to below 55% within 90 days", "Free 15–20 staff-hours per week for higher-value activities"] },
    { id: "r003", priority: "HIGH",     timeframe: "30_DAYS",   implementationDifficulty: "LOW",    confidence: 82, title: "Cross-Train Three Backup Operatives for Critical Functions", summary: "Identify three operations staff with aptitude for logistics, procurement, and client management. Begin a 30-day structured cross-training programme with shadowing, SOPs, and competency sign-offs.", actionItems: ["Document SOPs for each critical function", "Identify and assign cross-training candidates", "Complete competency assessment by day 30"], expectedOperationalImpact: ["Reduce single-point-of-failure risk for all three critical functions", "Enable flexible workforce deployment during peak events"] },
    { id: "r004", priority: "HIGH",     timeframe: "30_DAYS",   implementationDifficulty: "MEDIUM", confidence: 79, title: "Deploy Barcode-Based Inventory Tracking System", summary: "Implement a lightweight barcode or QR-code inventory tracking system for all event equipment and consumables. Integrate with procurement records to close the reconciliation loop.", actionItems: ["Evaluate 3 lightweight inventory SaaS options", "Pilot on next two events", "Full rollout with staff training by day 45"], expectedOperationalImpact: ["Reduce inventory discrepancy rate from 11.8% to below 4%", "Eliminate systematic over-procurement buffer (est. RM 8,000–12,000/quarter)"] },
    { id: "r005", priority: "MEDIUM",   timeframe: "90_DAYS",   implementationDifficulty: "MEDIUM", confidence: 74, title: "Build Forward-Looking Demand Forecast Model", summary: "Develop a 90-day rolling demand forecast using historical booking data and confirmed pipeline. Use the model to optimise base staffing levels and pre-position contingency staffing contracts.", actionItems: ["Extract 18 months of booking data", "Build forecast model in Excel/BI tool", "Review monthly in operations team meeting"], expectedOperationalImpact: ["Reduce overtime exposure from 34% to below 20%", "Improve labour cost predictability by quarter"] },
    { id: "r006", priority: "LOW",      timeframe: "LONG_TERM", implementationDifficulty: "HIGH",   confidence: 68, title: "Establish Operational Intelligence Dashboard (KPI Governance)", summary: "Build a unified operational KPI dashboard that tracks the nine MGD benchmark metrics in real-time. Assign metric owners, set alert thresholds, and conduct monthly operational reviews.", actionItems: ["Define 9 KPI owners and reporting cadence", "Build dashboard in BI tool", "Establish monthly ops review ritual"], expectedOperationalImpact: ["Real-time operational visibility replacing quarterly guesswork", "Early warning system for threshold breaches before they escalate"] },
  ],
};

// ── Utility helpers ───────────────────────────────────────────────────────────

function safeStr(v: unknown, fallback = "—"): string {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s.length > 0 ? s : fallback;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const SEV_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-300 border border-red-500/40",
  HIGH:     "bg-orange-500/20 text-orange-300 border border-orange-500/40",
  MEDIUM:   "bg-amber-500/20 text-amber-300 border border-amber-500/40",
  LOW:      "bg-blue-500/20 text-blue-300 border border-blue-500/40",
  ELEVATED: "bg-orange-500/20 text-orange-300 border border-orange-500/40",
  WATCHLIST:"bg-amber-500/20 text-amber-300 border border-amber-500/40",
  HEALTHY:  "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
};

const SEV_DOT: Record<string, string> = {
  CRITICAL: "bg-red-400",
  HIGH:     "bg-orange-400",
  MEDIUM:   "bg-amber-400",
  LOW:      "bg-blue-400",
  ELEVATED: "bg-orange-400",
  WATCHLIST:"bg-amber-400",
  HEALTHY:  "bg-emerald-400",
};

// ── Helper components ─────────────────────────────────────────────────────────

function SeverityPill({ label, size = "sm" }: { label: string; size?: "sm" | "xs" }) {
  const key = (label ?? "").toUpperCase();
  const cls = SEV_STYLES[key] ?? "bg-slate-500/20 text-slate-300 border border-slate-500/40";
  return (
    <span className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 ${size === "xs" ? "text-[9px]" : "text-[10px]"} ${cls}`}>
      {label}
    </span>
  );
}

function ConfBar({ pct, color = "#3b82f6", width = 120 }: { pct: number; color?: string; width?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative rounded-full overflow-hidden bg-white/10" style={{ width, height: 4 }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
        />
      </div>
      <span className="text-[10px] text-white/40">{pct}%</span>
    </div>
  );
}

function HealthRing({ score, size = 140 }: { score: number | null; size?: number }) {
  // null means "not assessed" — no transactional evidence existed. Rendered
  // as an empty, neutral-gray ring with "—" rather than a filled, colored
  // ring for score 0 (which would visually read as "measured, critical").
  const notAssessed = score == null;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = notAssessed ? 0 : (score / 100) * circ;
  const color = notAssessed ? "#64748b" : score >= 80 ? "#34d399" : score >= 65 ? "#fbbf24" : score >= 50 ? "#fb923c" : "#f87171";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-white leading-none" style={{ fontSize: size * 0.23 }}>{notAssessed ? "—" : score}</span>
        <span className="text-white/40 font-medium" style={{ fontSize: size * 0.085 }}>/100</span>
      </div>
    </div>
  );
}

function ExecutiveMetric({ label, value, color = "text-white" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className={`text-3xl font-bold tracking-tight ${color}`}>{value}</span>
      <span className="text-xs text-white/40 uppercase tracking-widest mt-0.5">{label}</span>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function PresentationHeader({
  slideNum, total, title, subtitle, icon: Icon,
}: {
  slideNum: number; total: number; title: string; subtitle?: string; icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
        )}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70 mb-1">
            SLIDE {slideNum} / {total}
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Slide transition wrapper ───────────────────────────────────────────────────

function SlideTransition({ children, slideKey }: { children: React.ReactNode; slideKey: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="w-full h-full"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(18px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
    >
      {children}
    </div>
  );
}

// ── SLIDE 1 — Executive Health Overview ───────────────────────────────────────

function Slide1Cover({ report }: { report: MGDReport }) {
  // Preserve null (not assessed) rather than coalescing to 0 — 0 is a
  // legitimate real score (catastrophic, measured) with a different meaning.
  const score = report.metadata.operationalHealthScore ?? null;
  const { operationalHealthLabel, operationalRiskLevel, benchmarkStatusBreakdown: bsd } = report.visualMetrics;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
        {/* Left — identity */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400/60 mb-3">
              SCOPE OPTIX · MGD OPERATIONAL INTELLIGENCE
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Operational<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Diagnostic Report
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 justify-center lg:justify-start">
            <Building2 className="w-4 h-4 text-white/40" />
            <span className="text-lg text-white/70 font-medium">{safeStr(report.metadata.clientName)}</span>
          </div>
          {report.metadata.industry && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/50">
              {report.metadata.industry.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </div>
          )}
          <div className="text-sm text-white/30 flex items-center gap-1.5 justify-center lg:justify-start">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(report.metadata.generatedAt)}
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 pt-2 max-w-xs mx-auto lg:mx-0">
            {[
              { label: "Critical Findings",  value: report.summary.criticalFindings,           color: "text-red-400" },
              { label: "Root Causes",        value: report.summary.criticalRootCauses,          color: "text-red-400" },
              { label: "Priority Actions",   value: report.summary.highPriorityRecommendations, color: "text-blue-400" },
              { label: "Benchmark Alerts",   value: report.summary.benchmarkAlerts,             color: "text-orange-400" },
            ].map(s => (
              <GlassCard key={s.label} className="p-3">
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
                <p className="text-[9px] text-white/35 uppercase tracking-wider mt-0.5">{s.label}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Right — health ring */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-30"
              style={{ background: score == null ? "#94a3b8" : score >= 65 ? "#fbbf24" : "#f87171", transform: "scale(1.3)" }} />
            <HealthRing score={score} size={180} />
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-white">{operationalHealthLabel}</div>
            <div className="text-xs text-white/40 mt-1">Operational Risk: <span className="text-white/60">{operationalRiskLevel}</span></div>
          </div>
          {/* Benchmark overview mini */}
          <GlassCard className="px-5 py-4 w-48">
            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-3">Benchmark Status</div>
            {[
              { label: "Critical",  count: bsd.critical,  color: "bg-red-400" },
              { label: "Elevated",  count: bsd.elevated,  color: "bg-orange-400" },
              { label: "Watchlist", count: bsd.watchlist, color: "bg-amber-400" },
              { label: "Healthy",   count: bsd.healthy,   color: "bg-emerald-400" },
            ].map(b => (
              <div key={b.label} className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${b.color}`} />
                  <span className="text-[10px] text-white/50">{b.label}</span>
                </div>
                <span className={`text-xs font-bold text-white/70`}>{b.count}</span>
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ── SLIDE 2 — Benchmark Risk Overview ────────────────────────────────────────

function Slide2Benchmarks({ report }: { report: MGDReport }) {
  const bms = report.benchmarks;
  const bsd = report.visualMetrics.benchmarkStatusBreakdown;
  const total = bsd.critical + bsd.elevated + bsd.watchlist + bsd.healthy || 1;
  const criticals = bms.filter(b => b.status === "CRITICAL");
  const others    = bms.filter(b => b.status !== "CRITICAL");

  return (
    <div className="h-full flex flex-col">
      <PresentationHeader slideNum={2} total={7} title="Benchmark Risk Overview"
        subtitle={`${bms.length} operational metrics evaluated against industry thresholds`}
        icon={BarChart3} />

      {/* Distribution bar */}
      <GlassCard className="p-4 mb-5">
        <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Severity Distribution</div>
        <div className="flex rounded-full overflow-hidden h-3">
          {[
            { count: bsd.critical,  color: "bg-red-500" },
            { count: bsd.elevated,  color: "bg-orange-500" },
            { count: bsd.watchlist, color: "bg-amber-500" },
            { count: bsd.healthy,   color: "bg-emerald-500" },
          ].map((b, i) => b.count > 0 ? (
            <div key={i} className={`${b.color} transition-all duration-700`}
              style={{ width: `${(b.count / total) * 100}%` }} />
          ) : null)}
        </div>
        <div className="flex gap-4 mt-2.5">
          {[
            { label: "Critical",  count: bsd.critical,  color: "text-red-400" },
            { label: "Elevated",  count: bsd.elevated,  color: "text-orange-400" },
            { label: "Watchlist", count: bsd.watchlist, color: "text-amber-400" },
            { label: "Healthy",   count: bsd.healthy,   color: "text-emerald-400" },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-1.5">
              <span className={`text-sm font-bold ${b.color}`}>{b.count}</span>
              <span className="text-[9px] text-white/30 uppercase">{b.label}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Critical alerts */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {criticals.map((bm, idx) => (
          <GlassCard key={bm.id} className="p-3.5 border-red-500/20">
            <div className="flex items-start justify-between mb-2">
              <SeverityPill label={bm.status} size="xs" />
              <span className="text-[9px] text-white/30">{bm.category}</span>
            </div>
            <div className="font-semibold text-sm text-white mb-1">{bm.metric}</div>
            <div className="text-xs text-red-300 font-mono font-bold">{bm.actualValue}</div>
            <div className="text-[10px] text-white/40 mt-1.5 leading-relaxed">{bm.interpretation}</div>
            <div className="mt-2">
              <ConfBar pct={bm.confidence} color="#f87171" width={80} />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Healthy / elevated strip */}
      <div className="flex gap-2 flex-wrap">
        {others.map(bm => {
          const col = bm.status === "ELEVATED" ? "#fb923c" : bm.status === "WATCHLIST" ? "#fbbf24" : "#34d399";
          return (
            <GlassCard key={bm.id} className="px-3 py-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SEV_DOT[bm.status] ?? "bg-slate-400"}`} />
              <span className="text-xs text-white/60">{bm.metric}</span>
              <span className="text-xs font-mono font-bold" style={{ color: col }}>{bm.actualValue}</span>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ── SLIDE 3 — Key Operational Findings ───────────────────────────────────────

function Slide3Findings({ report }: { report: MGDReport }) {
  const findings = report.findings;

  return (
    <div className="h-full flex flex-col">
      <PresentationHeader slideNum={3} total={7} title="Key Operational Findings"
        subtitle={`${findings.length} findings identified — sorted by severity and confidence`}
        icon={AlertTriangle} />

      {findings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-white/40">No operational findings detected in this diagnostic run.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 content-start overflow-y-auto">
          {findings.map((f, i) => {
            const col = f.severity === "CRITICAL" ? "#f87171" : f.severity === "HIGH" ? "#fb923c" : f.severity === "MEDIUM" ? "#fbbf24" : "#60a5fa";
            const impacts = Array.isArray(f.operationalImpact) ? f.operationalImpact : (typeof f.operationalImpact === "string" ? [f.operationalImpact] : []);
            return (
              <GlassCard key={f.id} className="p-4" style={{ borderLeftColor: col, borderLeftWidth: 2 } as React.CSSProperties}>
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold text-white/50 border border-white/15">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <SeverityPill label={f.severity} size="xs" />
                      <span className="text-[9px] text-white/30 uppercase tracking-wider">{safeStr(f.category).replace(/_/g, " ")}</span>
                    </div>
                    <div className="font-semibold text-sm text-white leading-snug">{f.title}</div>
                  </div>
                </div>
                <p className="text-xs text-white/50 leading-relaxed mb-2">{f.summary}</p>
                {impacts.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {impacts.slice(0, 2).map((imp, ii) => (
                      <div key={ii} className="flex items-start gap-1.5">
                        <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: col }} />
                        <span className="text-[10px] text-white/40">{imp}</span>
                      </div>
                    ))}
                  </div>
                )}
                <ConfBar pct={f.confidence} color={col} width={100} />
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SLIDE 4 — Root Cause Intelligence ────────────────────────────────────────

function Slide4RootCauses({ report }: { report: MGDReport }) {
  const rootCauses = report.rootCauses;
  const findings   = report.findings;

  return (
    <div className="h-full flex flex-col">
      <PresentationHeader slideNum={4} total={7} title="Root Cause Intelligence"
        subtitle="Systemic causes underlying the operational findings"
        icon={Layers} />

      {rootCauses.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40">No root causes identified in this run.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto">
          {rootCauses.map((rc, i) => {
            const col = rc.severity === "CRITICAL" ? "#f87171" : rc.severity === "HIGH" ? "#fb923c" : "#fbbf24";
            const linked = (rc.contributingFindings ?? [])
              .map(fid => findings.find(f => f.id === fid)?.title ?? null)
              .filter(Boolean) as string[];

            return (
              <GlassCard key={rc.id} className="p-4">
                <div className="flex items-start gap-3">
                  {/* Number */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white border-2"
                    style={{ borderColor: col, boxShadow: `0 0 8px ${col}40` }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <SeverityPill label={rc.severity} size="xs" />
                      <span className="font-semibold text-sm text-white">{rc.title}</span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed mb-2">{rc.summary}</p>
                    {/* Causal chain */}
                    {linked.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1">Contributing Findings</div>
                        <div className="flex flex-wrap gap-1.5">
                          {linked.map((t, li) => (
                            <div key={li} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                              <div className="w-1 h-1 rounded-full bg-white/40" />
                              <span className="text-[9px] text-white/40">{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Operational impacts */}
                    {(rc.operationalImpact ?? []).slice(0, 2).map((imp, ii) => (
                      <div key={ii} className="flex items-start gap-1.5 mb-1">
                        <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: col }} />
                        <span className="text-[10px] text-white/40">{imp}</span>
                      </div>
                    ))}
                    <div className="mt-2">
                      <ConfBar pct={rc.confidence} color={col} width={100} />
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SLIDE 5 — Priority Recommendations ───────────────────────────────────────

const TF_LABELS: Record<string, string>  = { IMMEDIATE: "Immediate", "30_DAYS": "30 Days", "90_DAYS": "90 Days", LONG_TERM: "Long Term" };
const TF_ORDER  = ["IMMEDIATE", "30_DAYS", "90_DAYS", "LONG_TERM"];
const TF_COLORS: Record<string, string>  = { IMMEDIATE: "#f87171", "30_DAYS": "#fb923c", "90_DAYS": "#fbbf24", LONG_TERM: "#60a5fa" };

function Slide5Recommendations({ report }: { report: MGDReport }) {
  const recs = report.recommendations;

  return (
    <div className="h-full flex flex-col">
      <PresentationHeader slideNum={5} total={7} title="Priority Recommendations"
        subtitle={`${recs.length} corrective actions — grouped by implementation timeframe`}
        icon={Lightbulb} />

      {recs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40">No recommendations generated.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 flex-1 content-start overflow-y-auto">
          {TF_ORDER.map(tf => {
            const group = recs.filter(r => r.timeframe === tf);
            if (!group.length) return null;
            const color = TF_COLORS[tf];
            return (
              <div key={tf} className="space-y-2">
                {/* Timeframe header */}
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                    {TF_LABELS[tf]}
                  </span>
                  <span className="text-[9px] text-white/25">{group.length} action{group.length !== 1 ? "s" : ""}</span>
                </div>
                {group.map(rec => (
                  <GlassCard key={rec.id} className="p-3.5">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <SeverityPill label={rec.priority} size="xs" />
                      <span className="text-[9px] text-white/30 uppercase">Effort: {rec.implementationDifficulty}</span>
                    </div>
                    <div className="font-semibold text-xs text-white leading-snug mb-1.5">{rec.title}</div>
                    {(rec.actionItems ?? []).slice(0, 2).map((a, ai) => (
                      <div key={ai} className="flex items-start gap-1.5 mb-1">
                        <span className="text-[9px] font-bold" style={{ color }}>{ai + 1}.</span>
                        <span className="text-[10px] text-white/40 leading-relaxed">{a}</span>
                      </div>
                    ))}
                    {(rec.expectedOperationalImpact ?? []).slice(0, 1).map((imp, ii) => (
                      <div key={ii} className="flex items-start gap-1.5 mt-1.5 pt-1.5 border-t border-white/5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[10px] text-emerald-300/70">{imp}</span>
                      </div>
                    ))}
                  </GlassCard>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SLIDE 6 — Strategic Direction ────────────────────────────────────────────

function Slide6Strategic({ report }: { report: MGDReport }) {
  const sec = report.narrative?.strategicDirection;
  // "Recommendations by timeframe" is real, report-derived data — the closest
  // thing this platform actually computes to an operational-maturity roadmap.
  // (The six fixed "maturity dimension" percentages this slide used to show —
  // Process Automation 22%, Workforce Cross-Training 35%, etc. — were never
  // derived from any report; they were the same six hardcoded numbers on
  // every single presentation, real or not. Removed rather than replaced
  // with another invented number.)
  const byTimeframe = TF_ORDER
    .map(tf => ({ tf, items: report.recommendations.filter(r => r.timeframe === tf) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="h-full flex flex-col">
      <PresentationHeader slideNum={6} total={7} title="Strategic Direction"
        subtitle="Recommended roadmap, sequenced by implementation timeframe"
        icon={TrendingUp} />

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Narrative text */}
        {sec?.content ? (
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70">Strategic Direction</span>
            </div>
            <p className="text-sm text-white/55 leading-7">{sec.content}</p>
          </GlassCard>
        ) : (
          <div className="flex items-center gap-2 py-4 justify-center text-white/25 text-[13px]">
            No strategic direction narrative was generated for this diagnostic.
          </div>
        )}

        {/* Roadmap by timeframe — real recommendation data */}
        {byTimeframe.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {byTimeframe.map(({ tf, items }) => (
              <GlassCard key={tf} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: TF_COLORS[tf] }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TF_COLORS[tf] }}>
                    {TF_LABELS[tf]}
                  </span>
                  <span className="text-[9px] text-white/25">{items.length} action{items.length !== 1 ? "s" : ""}</span>
                </div>
                <ul className="space-y-1">
                  {items.slice(0, 3).map(r => (
                    <li key={r.id} className="text-[11px] text-white/50 leading-relaxed">{r.title}</li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SLIDE 7 — Final Conclusion ────────────────────────────────────────────────

function Slide7Conclusion({ report }: { report: MGDReport }) {
  const sec  = report.narrative?.finalConclusion;
  const score = report.metadata.operationalHealthScore ?? null;

  // Real, report-derived "what to do right now" — the IMMEDIATE-timeframe
  // recommendations this diagnostic actually produced, already sorted by
  // priority/confidence (report-composer.ts). Falls back to the next
  // earliest timeframe with any recommendations at all if none are tagged
  // IMMEDIATE, so the slide never silently drops real content; shows an
  // honest empty state only if there are truly no recommendations.
  // (This used to be four fixed strings — "Implement standard refund
  // governance framework," etc. — identical on every presentation
  // regardless of what the diagnostic actually found.)
  const immediateActions = report.recommendations
    .filter(r => r.timeframe === "IMMEDIATE")
    .slice(0, 4)
    .map(r => r.title);
  const fallbackActions = immediateActions.length > 0
    ? immediateActions
    : report.recommendations.slice(0, 4).map(r => r.title);

  return (
    <div className="h-full flex flex-col">
      <PresentationHeader slideNum={7} total={7} title="Executive Conclusion"
        subtitle="Operational outlook and programme priorities"
        icon={Shield} />

      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left — conclusion text */}
        <div className="flex-1 space-y-4">
          {sec?.content && (
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 rounded-full bg-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70">Executive Conclusion</span>
              </div>
              <p className="text-sm text-white/55 leading-7">{sec.content}</p>
            </GlassCard>
          )}

          {/* Outlook block */}
          <GlassCard className="p-4">
            <div className="text-[9px] text-white/25 uppercase tracking-widest mb-3">Recommended Priority Actions</div>
            {fallbackActions.length > 0 ? (
              fallbackActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2.5 mb-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[8px] font-bold text-blue-400">{i + 1}</span>
                  </div>
                  <span className="text-xs text-white/55">{action}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/25 italic">No recommendations were generated for this diagnostic.</p>
            )}
          </GlassCard>
        </div>

        {/* Right — score + branding */}
        <div className="flex flex-col items-center gap-5 lg:w-52">
          <GlassCard className="p-5 w-full text-center">
            <div className="text-[9px] text-white/25 uppercase tracking-widest mb-3">Operational Health</div>
            <div className="flex justify-center mb-3">
              <HealthRing score={score} size={110} />
            </div>
            <div className="font-semibold text-sm text-white">{report.visualMetrics.operationalHealthLabel}</div>
            <div className="text-[10px] text-white/30 mt-1">90-day re-evaluation advised</div>
          </GlassCard>

          {/* MGD branding */}
          <GlassCard className="p-4 w-full text-center">
            <div className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Prepared by</div>
            <div className="font-bold text-sm text-white">Scope Optix</div>
            <div className="text-[10px] text-white/30">MGD Operational Intelligence</div>
            <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-white/20">
              {report.metadata.reportVersion} · {formatDate(report.metadata.generatedAt)}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const SLIDES = [
  { id: "cover",           label: "Health Overview",    icon: Activity },
  { id: "benchmarks",     label: "Benchmarks",          icon: BarChart3 },
  { id: "findings",       label: "Findings",            icon: AlertTriangle },
  { id: "rootcauses",     label: "Root Causes",         icon: Layers },
  { id: "recommendations",label: "Recommendations",     icon: Lightbulb },
  { id: "strategic",      label: "Strategic Direction", icon: TrendingUp },
  { id: "conclusion",     label: "Conclusion",          icon: Shield },
];

interface MGDPresentationModeProps {
  report?:  MGDReport;
  useMock?: boolean;
}

/** Minimal loading/error/empty chrome, matching the Report Viewer's own
 * states (mgd-report-viewer.tsx) in spirit — kept local rather than shared
 * since this milestone does not consolidate the two pages' components. */
function CenteredState({ icon: Icon, title, subtitle, backHref, backLabel }: {
  icon: React.ElementType; title: string; subtitle?: string; backHref: string; backLabel: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center text-white"
      style={{ background: "linear-gradient(135deg, #070b14 0%, #0d1526 50%, #07111f 100%)" }}>
      <div className="flex flex-col items-center gap-5 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon className="w-7 h-7 text-white/40" />
        </div>
        <div>
          <p className="text-white/70 text-sm font-medium">{title}</p>
          {subtitle && <p className="text-white/30 text-xs mt-1 max-w-xs">{subtitle}</p>}
        </div>
        <Link href={backHref}>
          <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
            {backLabel}
          </a>
        </Link>
      </div>
    </div>
  );
}

export default function MGDPresentationMode({ report: propReport, useMock = false }: MGDPresentationModeProps) {
  const search = useSearch();
  const reportId = new URLSearchParams(search).get("id");
  const [, navigate] = useLocation();

  // `propReport`/`useMock` are only ever populated by a caller rendering this
  // component directly (isolated testing) — the real route
  // (/mgd/present?id=...) supplies neither, so real navigation always takes
  // the fetch-by-id path below. MOCK_REPORT is reachable only when a caller
  // explicitly opts into it via `useMock` — never as a silent fallback.
  const [fetchedReport, setFetchedReport] = useState<MGDReport | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "empty" | "error">(
    propReport || useMock ? "loaded" : "loading",
  );
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (propReport || useMock) return; // isolated-rendering path — nothing to fetch
    if (!reportId) { setStatus("empty"); return; }

    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/mgd/reports/${reportId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.report?.report) {
            if (!cancelled) { setFetchedReport(data.report.report); setStatus("loaded"); }
            return;
          }
        }
        if (!cancelled) { setErrMsg(`Report "${reportId}" not found.`); setStatus("error"); }
      } catch (e: unknown) {
        if (!cancelled) { setErrMsg(e instanceof Error ? e.message : "Network error"); setStatus("error"); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [reportId, propReport, useMock]);

  const report = useMock ? MOCK_REPORT : (propReport ?? fetchedReport);
  const effectiveReportId = reportId || report?.id || null;

  // ── Every hook below is declared unconditionally, before any early return,
  // per the Rules of Hooks — the loading/empty/error/no-report branches are
  // checked further down, after all hooks exist, so hook call order/count
  // never changes between renders (e.g. loading → loaded).
  const [slide,         setSlide]         = useState(0);
  const [slideKey,      setSlideKey]      = useState(0);
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [autoAdvance,   setAutoAdvance]   = useState(false);
  const [timerSecs,     setTimerSecs]     = useState(0);
  const [showControls,  setShowControls]  = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((idx: number) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, idx));
    setSlide(next);
    setSlideKey(k => k + 1);
  }, []);

  const prev = useCallback(() => goTo(slide - 1), [goTo, slide]);
  const next = useCallback(() => goTo(slide + 1), [goTo, slide]);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") { setIsFullscreen(false); document.exitFullscreen?.(); }
      else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) { document.exitFullscreen(); setIsFullscreen(false); }
        else { containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Auto-advance
  useEffect(() => {
    if (autoAdvance) {
      autoRef.current = setInterval(() => {
        setSlide(s => {
          const next = s >= SLIDES.length - 1 ? 0 : s + 1;
          setSlideKey(k => k + 1);
          return next;
        });
      }, 12000);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoAdvance]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Fullscreen API listener
  useEffect(() => {
    function onFSChange() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  // Mouse move — show/hide controls
  function handleMouseMove() {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowControls(false), 3500);
  }

  // ── Loading / empty / error / no-report states — checked only after every
  // hook above has already been called, so the hook sequence never changes
  // across these branches. NEVER falls through to MOCK_REPORT here.
  if (!propReport && !useMock) {
    if (status === "loading") {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #070b14 0%, #0d1526 50%, #07111f 100%)" }}>
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      );
    }
    if (status === "empty") {
      return (
        <CenteredState icon={Inbox} title="No report selected"
          subtitle="Open a report from the archive or the report viewer, then choose Present."
          backHref="/mgd/reports" backLabel="Go to Archive" />
      );
    }
    if (status === "error" || !report) {
      return (
        <CenteredState icon={AlertTriangle} title="Failed to load report" subtitle={errMsg || "This report could not be found."}
          backHref="/mgd/reports" backLabel="Back to Archive" />
      );
    }
  }
  if (!report) {
    // Unreachable in practice (covered above), but keeps every slide
    // component's `report: MGDReport` prop genuinely non-null.
    return null;
  }
  // Narrowed, stable reference — `report` above is `MGDReport | null` to
  // TypeScript inside the `renderSlide` closure below (a nested function
  // declaration doesn't retain the null-check narrowing); this is the same
  // guaranteed-non-null value, just typed accurately for that closure.
  const loadedReport: MGDReport = report;

  // Render current slide
  function renderSlide() {
    switch (slide) {
      case 0: return <Slide1Cover         report={loadedReport} />;
      case 1: return <Slide2Benchmarks    report={loadedReport} />;
      case 2: return <Slide3Findings      report={loadedReport} />;
      case 3: return <Slide4RootCauses    report={loadedReport} />;
      case 4: return <Slide5Recommendations report={loadedReport} />;
      case 5: return <Slide6Strategic     report={loadedReport} />;
      case 6: return <Slide7Conclusion    report={loadedReport} />;
      default: return null;
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen overflow-hidden text-white select-none"
      style={{ background: "linear-gradient(135deg, #070b14 0%, #0d1526 50%, #07111f 100%)" }}
      onMouseMove={handleMouseMove}
    >
      {/* Ambient glow — top-left */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }} />
      {/* Ambient glow — bottom-right */}
      <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full opacity-8 pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }} />

      {/* ── Top chrome ── */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 transition-opacity duration-500"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <Link href={effectiveReportId ? `/mgd/report?id=${effectiveReportId}` : "/mgd"}>
          <button className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Presentation</span>
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/25">{formatTimer(timerSecs)}</span>
          <span className="text-[10px] text-white/25 uppercase tracking-widest">{SLIDES[slide].label}</span>
          <span className="text-[10px] text-white/20">{slide + 1} / {SLIDES.length}</span>
          <button
            className="text-white/30 hover:text-white/60 transition-colors"
            onClick={() => setAutoAdvance(a => !a)}
            title={autoAdvance ? "Stop auto-advance" : "Auto-advance (12s)"}
          >
            {autoAdvance ? <Pause className="w-3.5 h-3.5 text-blue-400" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            className="text-white/30 hover:text-white/60 transition-colors"
            onClick={() => {
              if (document.fullscreenElement) { document.exitFullscreen(); } else { containerRef.current?.requestFullscreen(); }
            }}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Slide dot progress ── */}
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 transition-opacity duration-500"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width:   i === slide ? 20 : 6,
              height:  6,
              background: i === slide ? "#3b82f6" : "rgba(255,255,255,0.2)",
              boxShadow: i === slide ? "0 0 8px #3b82f6" : "none",
            }}
          />
        ))}
      </div>

      {/* ── Main slide content ── */}
      <div className="absolute inset-0 px-10 pt-16 pb-16 flex flex-col">
        <SlideTransition key={slideKey} slideKey={slideKey}>
          <div className="w-full h-full overflow-hidden">
            {renderSlide()}
          </div>
        </SlideTransition>
      </div>

      {/* ── Bottom navigation ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 transition-opacity duration-500"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        {/* Slide nav tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {SLIDES.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === slide;
            return (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "bg-blue-500/25 border border-blue-500/40 text-blue-300"
                    : "text-white/25 hover:text-white/50 hover:bg-white/5"
                }`}
              >
                <Icon className="w-2.5 h-2.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Arrow buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            disabled={slide === 0}
            className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            disabled={slide === SLIDES.length - 1}
            className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keyboard hints */}
      <div
        className="absolute bottom-3 right-1/2 translate-x-1/2 z-20 flex items-center gap-3 text-[9px] text-white/15 transition-opacity duration-500"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <span>← → Navigate</span>
        <span>·</span>
        <span>F Fullscreen</span>
        <span>·</span>
        <span>ESC Exit</span>
      </div>
    </div>
  );
}
