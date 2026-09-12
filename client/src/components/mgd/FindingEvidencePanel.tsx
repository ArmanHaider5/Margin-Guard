import { AlertTriangle, AlertCircle, Info, FileSearch, CheckCircle2 } from "lucide-react";

// ── Local type mirrors (matches server/mgd/findings-engine.ts + evidence-engine.ts) ──

export interface FindingEvidence {
  documentId?:   string;
  documentName?: string;
  observation:   string;
  source?:       string;
  confidence?:   number;
}

export interface OperationalFinding {
  id:                string;
  title:             string;
  severity:          "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category:          string;
  department?:       string;
  summary:           string;
  signals:           string[];
  evidence?:         FindingEvidence[];
  operationalImpact?: string;
  confidence:        number;
}

/**
 * A signal is the raw evidence string a detector already produced
 * (server/mgd/findings-engine.ts's `signals: string[]`) — the same content,
 * rendered as-is, never reinterpreted or reworded here.
 */

// ── Severity config ────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  OperationalFinding["severity"],
  { label: string; badgeBg: string; badgeText: string; border: string; icon: React.ReactNode; dotBg: string }
> = {
  CRITICAL: {
    label:     "CRITICAL",
    badgeBg:   "bg-red-500/15",
    badgeText: "text-red-400",
    border:    "border-red-500/30",
    dotBg:     "bg-red-500",
    icon:      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  },
  HIGH: {
    label:     "HIGH",
    badgeBg:   "bg-orange-500/15",
    badgeText: "text-orange-400",
    border:    "border-orange-500/30",
    dotBg:     "bg-orange-500",
    icon:      <AlertCircle className="w-3.5 h-3.5 text-orange-400" />,
  },
  MEDIUM: {
    label:     "MEDIUM",
    badgeBg:   "bg-amber-500/15",
    badgeText: "text-amber-400",
    border:    "border-amber-500/30",
    dotBg:     "bg-amber-500",
    icon:      <Info className="w-3.5 h-3.5 text-amber-400" />,
  },
  LOW: {
    label:     "LOW",
    badgeBg:   "bg-blue-500/15",
    badgeText: "text-blue-400",
    border:    "border-blue-500/30",
    dotBg:     "bg-blue-400",
    icon:      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />,
  },
};

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct   = Math.min(100, Math.max(0, value));
  const color =
    pct >= 85 ? "bg-red-500"    :
    pct >= 70 ? "bg-orange-500" :
    pct >= 55 ? "bg-amber-500"  :
                "bg-blue-500";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-white/50 shrink-0">{pct}%</span>
    </div>
  );
}

// ── Signal item ───────────────────────────────────────────────────────────────
// Renders one raw detector signal string exactly as produced — no rewording,
// no reinterpretation, no fabricated source/date/percentage beyond what the
// string itself already contains.

function SignalItem({ text, index }: { text: string; index: number }) {
  return (
    <div className="group flex gap-3 p-3 rounded-lg bg-white/[0.035] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all">
      <div className="shrink-0 mt-0.5">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[10px] font-semibold text-white/50">
          {index + 1}
        </span>
      </div>
      <p className="flex-1 min-w-0 text-sm text-white/80 leading-relaxed">{text}</p>
    </div>
  );
}

// ── Evidence item ─────────────────────────────────────────────────────────────

function EvidenceItem({ item, index }: { item: FindingEvidence; index: number }) {
  const conf = item.confidence ?? 0;

  return (
    <div className="group flex gap-3 p-3 rounded-lg bg-white/[0.035] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all">
      {/* Index */}
      <div className="shrink-0 mt-0.5">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[10px] font-semibold text-white/50">
          {index + 1}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Observation */}
        <p className="text-sm text-white/80 leading-relaxed">{item.observation}</p>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          {item.source && (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/40 bg-white/5 rounded px-1.5 py-0.5 border border-white/[0.07]">
              <FileSearch className="w-2.5 h-2.5" />
              {item.source.replace(/_/g, " ")}
            </span>
          )}
          {item.documentName && (
            <span className="text-[11px] text-white/35 truncate max-w-[200px]" title={item.documentName}>
              {item.documentName}
            </span>
          )}
          {conf > 0 && (
            <div className="ml-auto shrink-0 w-24">
              <ConfidenceBar value={conf} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  finding: OperationalFinding;
}

export default function FindingEvidencePanel({ finding }: Props) {
  const sev      = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.LOW;
  const evidence = finding.evidence ?? [];
  const signals  = finding.signals ?? [];
  // Structured FindingEvidence[] takes priority where it is genuinely
  // populated (preserving existing behaviour); otherwise fall back to the
  // detector's own signal strings — the same data, just not previously
  // wired through to this panel.
  const hasEvidence = evidence.length > 0;
  const hasSignals  = !hasEvidence && signals.length > 0;
  const itemCount   = hasEvidence ? evidence.length : signals.length;
  const scrollable  = itemCount > 5;

  return (
    <div
      className={`
        rounded-xl border bg-white/[0.04] backdrop-blur-sm
        ${sev.border}
        flex flex-col gap-4 p-5
      `}
      style={{ background: "rgba(6,10,19,0.65)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="shrink-0 mt-0.5">{sev.icon}</div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white leading-snug">
              {finding.title}
            </h3>
            {finding.department && (
              <p className="text-[11px] text-white/40 mt-0.5">{finding.department}</p>
            )}
          </div>
        </div>

        {/* Severity badge + confidence */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span
            className={`
              inline-flex items-center gap-1 rounded-md px-2 py-0.5
              text-[10px] font-bold tracking-widest border
              ${sev.badgeBg} ${sev.badgeText} ${sev.border}
            `}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${sev.dotBg}`} />
            {sev.label}
          </span>
          <span className="text-[10px] text-white/35 tabular-nums">
            {finding.confidence}% confidence
          </span>
        </div>
      </div>

      {/* ── Summary ── */}
      <p className="text-[13px] text-white/60 leading-relaxed border-t border-white/[0.07] pt-3">
        {finding.summary}
      </p>

      {/* ── Evidence section ── */}
      <div className="border-t border-white/[0.07] pt-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
            Supporting Evidence
          </span>
          {(hasEvidence || hasSignals) && (
            <span className="text-[10px] text-white/25 tabular-nums">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {hasEvidence ? (
          <div
            className={`space-y-2 ${scrollable ? "overflow-y-auto max-h-[320px] pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" : ""}`}
          >
            {evidence.map((item, i) => (
              <EvidenceItem key={i} item={item} index={i} />
            ))}
          </div>
        ) : hasSignals ? (
          <div
            className={`space-y-2 ${scrollable ? "overflow-y-auto max-h-[320px] pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" : ""}`}
          >
            {signals.map((text, i) => (
              <SignalItem key={i} text={text} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-4 px-3 rounded-lg bg-white/[0.025] border border-white/[0.06]">
            <FileSearch className="w-4 h-4 text-white/20 shrink-0" />
            <p className="text-[12px] text-white/30 italic">
              No supporting evidence available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
