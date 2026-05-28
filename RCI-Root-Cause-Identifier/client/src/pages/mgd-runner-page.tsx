import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  Activity, AlertTriangle, ArrowLeft, BarChart3, CheckCircle2,
  ChevronRight, Clock, FileText, Layers, Lightbulb, Loader2,
  Play, RefreshCw, Shield, Target, Trash2, TrendingUp, Zap,
  Building2, XCircle, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import MGDReportPage from "@/pages/mgd-report-page";

// ── Constants ──────────────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  { value: "event_management",  label: "Event Management" },
  { value: "construction",       label: "Construction" },
  { value: "fnb_full_service",   label: "F&B — Full Service Restaurant" },
  { value: "fnb_qsr",           label: "F&B — Quick Service (QSR)" },
  { value: "fnb_fast_food",     label: "F&B — Fast Food Chain" },
  { value: "fnb_franchise",     label: "F&B — Franchise" },
  { value: "fnb_independent",   label: "F&B — Independent Restaurant" },
  { value: "healthcare",        label: "Healthcare & Pharmacies" },
  { value: "hospitality",       label: "Hospitality" },
  { value: "hotels_airbnb",     label: "Hotels & Airbnb" },
  { value: "logistics",         label: "Logistics" },
  { value: "manufacturing",     label: "Manufacturing" },
  { value: "oil_gas",           label: "Oil & Gas" },
  { value: "property_development", label: "Property Development" },
];

// Simulated step timing within the pipeline (cumulative ms from run start)
const STEP_TIMING_MS = [120, 280, 450, 620, 800, 1000];

const PIPELINE_STEPS = [
  { id: "findings",        label: "Findings Engine",       icon: AlertTriangle, desc: "Detecting operational signals from transaction data" },
  { id: "rootcauses",      label: "Root Cause Engine",     icon: Layers,        desc: "Mapping findings to systemic root causes" },
  { id: "recommendations", label: "Recommendation Engine", icon: Lightbulb,     desc: "Generating prioritised corrective actions" },
  { id: "benchmarks",      label: "Benchmark Engine",      icon: BarChart3,     desc: "Comparing metrics against industry thresholds" },
  { id: "narrative",       label: "Narrative Engine",      icon: FileText,      desc: "Composing 7-section executive narrative" },
  { id: "report",          label: "Report Composer",       icon: Shield,        desc: "Assembling unified operational intelligence report" },
];

// Mock transaction dataset — used when no uploaded data is present
const MOCK_TRANSACTIONS = [
  { id: "t001", date: "2024-03-01", type: "inbound",  amount: 12400, qty: 240, description: "Stock replenishment — Event Alpha", source: "warehouse", ref: "PO-2024-0301" },
  { id: "t002", date: "2024-03-01", type: "outbound", amount: 8200,  qty: 160, description: "Event Alpha dispatch — Kuala Lumpur", source: "logistics",  ref: "EV-2024-0301" },
  { id: "t003", date: "2024-03-02", type: "return",   amount: 1800,  qty: 34,  description: "Refund — damaged goods, Alpha", source: "finance",    ref: "RF-2024-0302" },
  { id: "t004", date: "2024-03-03", type: "inbound",  amount: 9600,  qty: 180, description: "Emergency procurement — Event Beta", source: "warehouse", ref: "PO-2024-0303" },
  { id: "t005", date: "2024-03-04", type: "outbound", amount: 7100,  qty: 138, description: "Event Beta dispatch — Shah Alam", source: "logistics",  ref: "EV-2024-0304" },
  { id: "t006", date: "2024-03-05", type: "adjustment",amount: -420, qty: -8,  description: "Inventory reconciliation — discrepancy noted", source: "warehouse", ref: "ADJ-2024-0305" },
  { id: "t007", date: "2024-03-06", type: "return",   amount: 2100,  qty: 42,  description: "Refund — cancellation, Beta", source: "finance",    ref: "RF-2024-0306" },
  { id: "t008", date: "2024-03-07", type: "inbound",  amount: 15300, qty: 290, description: "Bulk stock — Events Gamma & Delta", source: "warehouse", ref: "PO-2024-0307" },
  { id: "t009", date: "2024-03-08", type: "outbound", amount: 11200, qty: 210, description: "Gamma dispatch — Petaling Jaya", source: "logistics",  ref: "EV-2024-0308" },
  { id: "t010", date: "2024-03-09", type: "outbound", amount: 6800,  qty: 128, description: "Delta dispatch — Subang", source: "logistics",  ref: "EV-2024-0309" },
  { id: "t011", date: "2024-03-10", type: "return",   amount: 3200,  qty: 60,  description: "Refund — no-show cancellations, Gamma", source: "finance",    ref: "RF-2024-0310" },
  { id: "t012", date: "2024-03-11", type: "adjustment",amount: -680, qty: -12, description: "Stock write-off — expired materials", source: "warehouse", ref: "ADJ-2024-0311" },
];

const MOCK_METRICS = {
  inventoryLossRate:       5.8,
  refundRate:              14.2,
  logisticsUtilization:    0.81,
  rejectedJobsRate:        3.2,
  reconciliationDelayRate: 2.4,
  manualWorkflowDependency: 78,
  inventoryDiscrepancyRate: 11.8,
  manpowerDependencyRate:  62,
  overtimeExposureRate:    34,
};

// ── Types ──────────────────────────────────────────────────────────────────────

type PipelineState = "idle" | "running" | "completed" | "failed";
type StepState     = "pending" | "running" | "completed" | "failed";

interface StepStatus { id: string; state: StepState; }

interface PipelineMetrics {
  runtimeMs:           number;
  findingsCount:       number;
  rootCauseCount:      number;
  recommendationCount: number;
  benchmarkCount:      number;
  healthScore:         number;
  healthScoreSource:   "provided" | "estimated";
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ step, status, index }: {
  step: typeof PIPELINE_STEPS[0];
  status: StepState;
  index: number;
}) {
  const Icon = step.icon;
  const cfg = {
    pending:   { ring: "border-slate-200",  bg: "bg-slate-50",   icon: "text-slate-300",  text: "text-slate-400",  label: "Pending" },
    running:   { ring: "border-blue-300",   bg: "bg-blue-50",    icon: "text-blue-500",   text: "text-blue-600",   label: "Running" },
    completed: { ring: "border-emerald-300",bg: "bg-emerald-50", icon: "text-emerald-600",text: "text-emerald-700",label: "Done" },
    failed:    { ring: "border-red-300",    bg: "bg-red-50",     icon: "text-red-500",    text: "text-red-600",    label: "Failed" },
  }[status];

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-500 ${cfg.ring} ${cfg.bg}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${cfg.ring} bg-white`}>
        {status === "running" ? (
          <Loader2 className={`h-4 w-4 animate-spin ${cfg.icon}`} />
        ) : status === "completed" ? (
          <CheckCircle2 className={`h-4 w-4 ${cfg.icon}`} />
        ) : status === "failed" ? (
          <XCircle className={`h-4 w-4 ${cfg.icon}`} />
        ) : (
          <Icon className={`h-4 w-4 ${cfg.icon}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs font-semibold truncate ${cfg.text}`}>{step.label}</p>
          <span className={`shrink-0 text-xs font-medium ${cfg.text} opacity-70`}>{cfg.label}</span>
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">{step.desc}</p>
      </div>
    </div>
  );
}

// ── Metric chip ────────────────────────────────────────────────────────────────

function MetricChip({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm`}>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MGDRunnerPage() {
  const [clientName,   setClientName]   = useState("");
  const [industry,     setIndustry]     = useState("event_management");
  const [pipelineState, setPipelineState] = useState<PipelineState>("idle");
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(
    PIPELINE_STEPS.map(s => ({ id: s.id, state: "pending" as StepState }))
  );
  const [metrics,     setMetrics]      = useState<PipelineMetrics | null>(null);
  const [report,      setReport]       = useState<any>(null);
  const [errorMsg,    setErrorMsg]     = useState<string | null>(null);
  const [generatedAt, setGeneratedAt]  = useState<string | null>(null);

  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reportRef  = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  };

  const resetSteps = () => {
    setStepStatuses(PIPELINE_STEPS.map(s => ({ id: s.id, state: "pending" })));
  };

  const setStep = useCallback((index: number, state: StepState) => {
    setStepStatuses(prev => prev.map((s, i) => i === index ? { ...s, state } : s));
  }, []);

  const animateSteps = useCallback((onAllDone: () => void) => {
    clearTimers();

    PIPELINE_STEPS.forEach((_, i) => {
      const runAt  = STEP_TIMING_MS[i] ?? (i * 180);
      const doneAt = runAt + 160;

      const tRun = setTimeout(() => setStep(i, "running"),    runAt);
      const tDone = setTimeout(() => setStep(i, "completed"), doneAt);
      stepTimers.current.push(tRun, tDone);
    });

    const lastDone = (STEP_TIMING_MS[PIPELINE_STEPS.length - 1] ?? 1000) + 160;
    const tFinal = setTimeout(onAllDone, lastDone + 50);
    stepTimers.current.push(tFinal);
  }, [setStep]);

  const handleRun = useCallback(async () => {
    if (pipelineState === "running") return;

    setPipelineState("running");
    setReport(null);
    setMetrics(null);
    setErrorMsg(null);
    setGeneratedAt(null);
    resetSteps();

    const startedAt = Date.now();

    // Fire step animation immediately — it runs concurrently with the API call
    let apiResult: any = null;
    let apiError: Error | null = null;
    let apiDone = false;

    const onStepsComplete = () => {
      if (apiDone) finalise();
    };

    animateSteps(onStepsComplete);

    try {
      const res = await apiRequest("POST", "/api/mgd/run", {
        clientName: clientName.trim() || "Operational Diagnostic",
        industry,
        transactions: MOCK_TRANSACTIONS,
        documents:    [],
        metrics:      MOCK_METRICS,
      });
      apiResult = await res.json();
    } catch (err: any) {
      apiError = err;
    }

    apiDone = true;

    // Check if steps animation already finished; if not, finalise happens in onStepsComplete
    const elapsed = Date.now() - startedAt;
    const animDuration = (STEP_TIMING_MS[PIPELINE_STEPS.length - 1] ?? 1000) + 210;
    if (elapsed >= animDuration) finalise();

    function finalise() {
      clearTimers();
      if (apiError || !apiResult?.success) {
        setStepStatuses(PIPELINE_STEPS.map(s => ({ id: s.id, state: "completed" })));
        setPipelineState("failed");
        setErrorMsg(apiError?.message ?? apiResult?.error ?? "Pipeline failed. Please try again.");
        return;
      }

      setStepStatuses(PIPELINE_STEPS.map(s => ({ id: s.id, state: "completed" })));
      setReport(apiResult.report);
      setMetrics(apiResult.steps ?? null);
      setGeneratedAt(new Date().toISOString());
      setPipelineState("completed");

      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [pipelineState, clientName, industry, animateSteps]);

  const handleClear = () => {
    clearTimers();
    setPipelineState("idle");
    setReport(null);
    setMetrics(null);
    setErrorMsg(null);
    setGeneratedAt(null);
    resetSteps();
  };

  useEffect(() => () => clearTimers(), []);

  const isRunning   = pipelineState === "running";
  const isCompleted = pipelineState === "completed";
  const isFailed    = pipelineState === "failed";

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Top nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/mgd">
              <a className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors text-sm">
                <ArrowLeft className="h-4 w-4" /> MGD
              </a>
            </Link>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-800">Pipeline Runner</span>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">MGD-V1</span>
          </div>
          <div className="flex items-center gap-3">
            {isCompleted && generatedAt && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                Generated {new Date(generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {(isCompleted || isFailed) && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col xl:flex-row gap-8 items-start">

          {/* ── Sidebar: execution panel ──────────────────────────────────────── */}
          <div className="w-full xl:w-80 xl:sticky xl:top-20 shrink-0 space-y-5">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">MGD Runner</h1>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Operational intelligence pipeline for Margin Guard Diagnostics.
                Configure and execute a full diagnostic run.
              </p>
            </div>

            {/* Config card */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Configuration</p>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  disabled={isRunning}
                  placeholder="e.g. Acme Events Sdn. Bhd."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Industry</label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  disabled={isRunning}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors disabled:opacity-50"
                >
                  {INDUSTRY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500 font-medium">Data source</p>
                <p className="text-xs text-slate-400 mt-0.5">Using {MOCK_TRANSACTIONS.length} mock operational transactions + benchmark metrics</p>
              </div>

              {/* Run / Retry button */}
              {!isRunning && !isCompleted && !isFailed && (
                <button
                  onClick={handleRun}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <Play className="h-4 w-4" /> Run MGD Pipeline
                </button>
              )}

              {isRunning && (
                <button disabled className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-500 cursor-not-allowed">
                  <Loader2 className="h-4 w-4 animate-spin" /> Running pipeline…
                </button>
              )}

              {isCompleted && (
                <button
                  onClick={handleRun}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  <RotateCcw className="h-4 w-4" /> Re-run Pipeline
                </button>
              )}

              {isFailed && (
                <button
                  onClick={handleRun}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-sm"
                >
                  <RefreshCw className="h-4 w-4" /> Retry Pipeline
                </button>
              )}

              {/* Status badge */}
              {pipelineState !== "idle" && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                  isRunning   ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  isCompleted ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {isFailed && <XCircle className="h-3.5 w-3.5" />}
                  {isRunning ? "Pipeline executing…" : isCompleted ? "Report ready" : "Pipeline failed"}
                </div>
              )}
            </div>

            {/* Pipeline steps */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Pipeline Progress</p>
              <div className="space-y-2">
                {PIPELINE_STEPS.map((step, i) => (
                  <StepIndicator
                    key={step.id}
                    step={step}
                    status={stepStatuses[i]?.state ?? "pending"}
                    index={i}
                  />
                ))}
              </div>
            </div>

            {/* Runtime metrics */}
            {metrics && isCompleted && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Run Metrics</p>
                <div className="grid grid-cols-2 gap-3">
                  <MetricChip label="Findings"        value={metrics.findingsCount}       accent="text-orange-600" />
                  <MetricChip label="Root Causes"     value={metrics.rootCauseCount}      accent="text-red-600" />
                  <MetricChip label="Recommendations" value={metrics.recommendationCount} accent="text-blue-600" />
                  <MetricChip label="Benchmarks"      value={metrics.benchmarkCount}      accent="text-purple-600" />
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Health Score</p>
                    <p className="text-2xl font-bold text-slate-800 mt-0.5">{metrics.healthScore}<span className="text-sm font-normal text-slate-400">/100</span></p>
                    <p className="text-xs text-slate-400">{metrics.healthScoreSource === "provided" ? "Provided" : "Estimated by engine"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">Runtime</p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">{metrics.runtimeMs}<span className="text-xs font-normal text-slate-400">ms</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Future actions (greyed out — forward-declared) */}
            {isCompleted && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Coming Soon</p>
                {[
                  { icon: FileText,   label: "Export PDF Report" },
                  { icon: Target,     label: "Presentation Mode" },
                  { icon: TrendingUp, label: "Historical Comparison" },
                  { icon: Building2,  label: "Save to Client Archive" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-slate-300 cursor-not-allowed select-none">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Main: idle / error / report ─────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Idle state */}
            {pipelineState === "idle" && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white flex flex-col items-center justify-center py-24 px-8 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Activity className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">Ready to Execute</h2>
                <p className="text-sm text-slate-400 max-w-sm mb-8 leading-relaxed">
                  Configure the client and industry, then run the MGD pipeline to generate a full operational diagnostic report.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg text-left">
                  {PIPELINE_STEPS.map(step => {
                    const Icon = step.icon;
                    return (
                      <div key={step.id} className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                        <Icon className="h-3.5 w-3.5 shrink-0" /> {step.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Running state — animated skeleton */}
            {isRunning && !report && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-10 flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 mb-4">
                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Generating Operational Intelligence Report</h2>
                  <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                    Running {PIPELINE_STEPS.length} MGD engines across {MOCK_TRANSACTIONS.length} operational transactions. This takes under 2 seconds.
                  </p>
                </div>
                <div className="p-8 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-4 rounded-full bg-slate-100 animate-pulse`} style={{ width: `${85 - i * 12}%`, animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {isFailed && errorMsg && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8 flex flex-col items-center text-center">
                <XCircle className="h-10 w-10 text-red-500 mb-4" />
                <h2 className="text-base font-bold text-red-800 mb-2">Pipeline Execution Failed</h2>
                <p className="text-sm text-red-600 mb-6 max-w-sm leading-relaxed">{errorMsg}</p>
                <button
                  onClick={handleRun}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" /> Retry Pipeline
                </button>
              </div>
            )}

            {/* Report output */}
            {isCompleted && report && (
              <div ref={reportRef}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Operational Diagnostic Report</h2>
                    {generatedAt && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Generated {new Date(generatedAt).toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                        {metrics && (
                          <span className="ml-2 text-slate-300">· Pipeline ran in {metrics.runtimeMs}ms</span>
                        )}
                      </p>
                    )}
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                  </span>
                </div>

                {/* Render the full MGDReportPage inline — no navigation, pass live report */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <MGDReportPage report={report} useMock={false} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
