import { useState } from "react";
import {
  ChevronDown, ChevronUp, CheckCircle2, FileQuestion,
  FileSpreadsheet, Package, AlertTriangle, Truck,
  Receipt, FileText, Users, BarChart3, ClipboardList,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocumentCategory =
  | "inventory_movement"
  | "inventory_summary"
  | "lost_items"
  | "damaged_items"
  | "logistics_schedule"
  | "driver_assignment"
  | "invoice_register"
  | "quotation_register"
  | "sales_report"
  | "hr_document"
  | "job_description"
  | "unknown";

export interface ClassifiedDocument {
  fileName:        string;
  category:        DocumentCategory;
  confidence:      number;
  matchedKeywords: string[];
}

export interface DocumentClassificationPanelProps {
  documents: ClassifiedDocument[];
  /** Optional title override. Default: "Documents Uploaded" */
  title?: string;
  /** Start collapsed. Default: false */
  defaultCollapsed?: boolean;
}

// ── Category metadata ─────────────────────────────────────────────────────────

interface CategoryMeta {
  label:  string;
  icon:   React.ElementType;
  color:  string;
  accent: string;
}

const CATEGORY_META: Record<DocumentCategory, CategoryMeta> = {
  inventory_movement:  { label:"Inventory Movement Reports", icon:Package,       color:"text-blue-400",    accent:"#3b82f6" },
  inventory_summary:   { label:"Inventory Summaries",         icon:ClipboardList, color:"text-sky-400",     accent:"#0ea5e9" },
  lost_items:          { label:"Lost Item Reports",            icon:AlertTriangle, color:"text-red-400",     accent:"#ef4444" },
  damaged_items:       { label:"Damage Reports",               icon:AlertTriangle, color:"text-orange-400",  accent:"#f97316" },
  logistics_schedule:  { label:"Logistics Schedules",          icon:Truck,         color:"text-violet-400",  accent:"#8b5cf6" },
  driver_assignment:   { label:"Driver Assignments",            icon:Truck,         color:"text-purple-400",  accent:"#a855f7" },
  invoice_register:    { label:"Invoice Registers",             icon:Receipt,       color:"text-emerald-400", accent:"#10b981" },
  quotation_register:  { label:"Quotation Registers",           icon:FileText,      color:"text-teal-400",    accent:"#14b8a6" },
  sales_report:        { label:"Sales Reports",                 icon:BarChart3,     color:"text-amber-400",   accent:"#f59e0b" },
  hr_document:         { label:"HR Documents",                  icon:Users,         color:"text-pink-400",    accent:"#ec4899" },
  job_description:     { label:"Job Descriptions",              icon:FileSpreadsheet,color:"text-rose-400",   accent:"#f43f5e" },
  unknown:             { label:"Unknown Files",                  icon:FileQuestion,  color:"text-white/30",   accent:"#ffffff33" },
};

// The display order for known categories (unknown always last)
const KNOWN_ORDER: DocumentCategory[] = [
  "inventory_movement","inventory_summary","lost_items","damaged_items",
  "logistics_schedule","driver_assignment","invoice_register","quotation_register",
  "sales_report","hr_document","job_description",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function avgConf(docs: ClassifiedDocument[]): number {
  if (!docs.length) return 0;
  return Math.round(docs.reduce((s, d) => s + d.confidence, 0) / docs.length);
}

function confColor(conf: number): string {
  if (conf >= 80) return "text-emerald-400";
  if (conf >= 60) return "text-amber-400";
  if (conf >= 40) return "text-orange-400";
  return "text-white/30";
}

function confBarColor(conf: number): string {
  if (conf >= 80) return "bg-emerald-500";
  if (conf >= 60) return "bg-amber-500";
  if (conf >= 40) return "bg-orange-500";
  return "bg-white/20";
}

function shortName(fileName: string): string {
  if (!fileName) return "—";
  const parts = fileName.split(/[/\\]/);
  return parts[parts.length - 1] || fileName;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-0.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${confBarColor(pct)}`}
          style={{ width:`${pct}%` }}
        />
      </div>
      <span className={`text-[10px] tabular-nums shrink-0 ${confColor(pct)}`}>{pct}%</span>
    </div>
  );
}

interface CategoryGroupProps {
  category: DocumentCategory;
  docs:     ClassifiedDocument[];
}

function CategoryGroup({ category, docs }: CategoryGroupProps) {
  const [open, setOpen] = useState(false);
  const meta  = CATEGORY_META[category] ?? CATEGORY_META.unknown;
  const Icon  = meta.icon;
  const avg   = avgConf(docs);
  const isUnknown = category === "unknown";

  return (
    <div className={`rounded-xl border ${isUnknown ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.08] bg-white/[0.03]"} overflow-hidden`}>
      {/* Row header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
      >
        {/* Icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background:`${meta.accent}18`, border:`1px solid ${meta.accent}33` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: isUnknown ? "rgba(255,255,255,0.3)" : meta.accent }}/>
        </div>

        {/* Label + count */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {!isUnknown && (
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0"/>
            )}
            <span className={`text-[13px] font-medium ${isUnknown ? "text-white/35" : "text-white/80"} truncate`}>
              {meta.label}
            </span>
            <span className={`text-[11px] font-bold tabular-nums shrink-0 ${isUnknown ? "text-white/25" : meta.color}`}>
              ({docs.length})
            </span>
          </div>
          {/* Avg confidence bar — only for known */}
          {!isUnknown && (
            <div className="mt-1 max-w-[160px]">
              <ConfBar value={avg}/>
            </div>
          )}
        </div>

        {/* Expand chevron */}
        <div className="shrink-0 text-white/20">
          {open ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
        </div>
      </button>

      {/* Expanded file list */}
      {open && (
        <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
          {docs.map((doc, i) => (
            <div key={`${doc.fileName}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              <FileSpreadsheet className="w-3 h-3 text-white/20 shrink-0"/>
              <span className="flex-1 text-[12px] text-white/50 truncate" title={doc.fileName}>
                {shortName(doc.fileName)}
              </span>
              {doc.matchedKeywords.length > 0 && (
                <div className="hidden md:flex items-center gap-1 flex-wrap max-w-[180px]">
                  {doc.matchedKeywords.slice(0, 3).map(kw => (
                    <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.07] text-white/25 capitalize">
                      {kw}
                    </span>
                  ))}
                  {doc.matchedKeywords.length > 3 && (
                    <span className="text-[9px] text-white/20">+{doc.matchedKeywords.length - 3}</span>
                  )}
                </div>
              )}
              <div className="shrink-0 w-20">
                <ConfBar value={doc.confidence}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DocumentClassificationPanel({
  documents,
  title = "Documents Uploaded",
  defaultCollapsed = false,
}: DocumentClassificationPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const docs = Array.isArray(documents) ? documents : [];

  // Group by category
  const grouped: Partial<Record<DocumentCategory, ClassifiedDocument[]>> = {};
  for (const doc of docs) {
    const cat = doc?.category ?? "unknown";
    (grouped[cat] = grouped[cat] ?? []).push(doc);
  }

  const knownCategories = KNOWN_ORDER.filter(cat => (grouped[cat]?.length ?? 0) > 0);
  const unknownDocs     = grouped["unknown"] ?? [];
  const knownCount      = docs.length - unknownDocs.length;
  const totalConf       = avgConf(docs.filter(d => d.category !== "unknown"));

  if (docs.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">

      {/* ── Panel header ────────────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.04] transition-colors text-left"
      >
        {/* Left icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background:"#3b82f622", border:"1px solid #3b82f644" }}>
          <FileSpreadsheet className="w-4 h-4 text-blue-400"/>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-white tracking-tight">{title}</span>
            <span className="text-[11px] text-white/30 tabular-nums">
              {docs.length} file{docs.length !== 1 ? "s" : ""}
            </span>
            {knownCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <CheckCircle2 className="w-3 h-3"/>
                {knownCount} classified
              </span>
            )}
            {unknownDocs.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/25">
                <FileQuestion className="w-3 h-3"/>
                {unknownDocs.length} unknown
              </span>
            )}
          </div>
          {/* Overall confidence bar */}
          {knownCount > 0 && !collapsed && (
            <div className="mt-1 flex items-center gap-2 max-w-[200px]">
              <span className="text-[9px] text-white/25 uppercase tracking-widest shrink-0">Avg confidence</span>
              <ConfBar value={totalConf}/>
            </div>
          )}
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-white/25">
          {collapsed ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>}
        </div>
      </button>

      {/* ── Panel body ──────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="border-t border-white/[0.07] px-4 py-4 space-y-2">

          {/* Known categories */}
          {knownCategories.map(cat => (
            <CategoryGroup key={cat} category={cat} docs={grouped[cat]!}/>
          ))}

          {/* Unknown files — always last */}
          {unknownDocs.length > 0 && (
            <>
              {knownCategories.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-px bg-white/[0.05]"/>
                  <span className="text-[9px] text-white/20 uppercase tracking-widest">Unclassified</span>
                  <div className="flex-1 h-px bg-white/[0.05]"/>
                </div>
              )}
              <CategoryGroup category="unknown" docs={unknownDocs}/>
            </>
          )}
        </div>
      )}
    </div>
  );
}
