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
// Icon + label per category; colors now map to the shared semantic token
// palette (white MGD design system) instead of hardcoded dark-theme hex/tint
// values — same categories, same icons, no logic change.

interface CategoryMeta {
  label: string;
  icon:  React.ElementType;
}

const CATEGORY_META: Record<DocumentCategory, CategoryMeta> = {
  inventory_movement:  { label: "Inventory Movement Reports", icon: Package       },
  inventory_summary:   { label: "Inventory Summaries",        icon: ClipboardList },
  lost_items:          { label: "Lost Item Reports",          icon: AlertTriangle },
  damaged_items:       { label: "Damage Reports",             icon: AlertTriangle },
  logistics_schedule:  { label: "Logistics Schedules",        icon: Truck         },
  driver_assignment:   { label: "Driver Assignments",         icon: Truck         },
  invoice_register:    { label: "Invoice Registers",          icon: Receipt       },
  quotation_register:  { label: "Quotation Registers",        icon: FileText      },
  sales_report:        { label: "Sales Reports",              icon: BarChart3     },
  hr_document:         { label: "HR Documents",                icon: Users         },
  job_description:     { label: "Job Descriptions",            icon: FileSpreadsheet },
  unknown:             { label: "Unknown Files",                icon: FileQuestion  },
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

function confBarColor(conf: number): string {
  if (conf >= 80) return "bg-emerald-500";
  if (conf >= 60) return "bg-amber-500";
  if (conf >= 40) return "bg-orange-500";
  return "bg-muted-foreground/30";
}

function confTextColor(conf: number): string {
  if (conf >= 80) return "text-emerald-600";
  if (conf >= 60) return "text-amber-600";
  if (conf >= 40) return "text-orange-600";
  return "text-muted-foreground";
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
      <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${confBarColor(pct)}`}
          style={{ width:`${pct}%` }}
        />
      </div>
      <span className={`text-[10px] tabular-nums shrink-0 ${confTextColor(pct)}`}>{pct}%</span>
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
    <div className={`rounded-md border ${isUnknown ? "border-border bg-background" : "border-border bg-card"} overflow-hidden`}>
      {/* Row header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
      >
        {/* Icon */}
        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isUnknown ? "bg-muted" : "bg-accent"}`}>
          <Icon className={`w-3.5 h-3.5 ${isUnknown ? "text-muted-foreground" : "text-primary"}`}/>
        </div>

        {/* Label + count */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {!isUnknown && (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0"/>
            )}
            <span className={`text-[13px] font-medium ${isUnknown ? "text-muted-foreground" : "text-foreground"} truncate`}>
              {meta.label}
            </span>
            <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${isUnknown ? "text-muted-foreground" : "text-primary"}`}>
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
        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
        </div>
      </button>

      {/* Expanded file list */}
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {docs.map((doc, i) => (
            <div key={`${doc.fileName}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              <FileSpreadsheet className="w-3 h-3 text-muted-foreground shrink-0"/>
              <span className="flex-1 text-[12px] text-foreground/80 truncate" title={doc.fileName}>
                {shortName(doc.fileName)}
              </span>
              {doc.matchedKeywords.length > 0 && (
                <div className="hidden md:flex items-center gap-1 flex-wrap max-w-[180px]">
                  {doc.matchedKeywords.slice(0, 3).map(kw => (
                    <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                      {kw}
                    </span>
                  ))}
                  {doc.matchedKeywords.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{doc.matchedKeywords.length - 3}</span>
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
    <div className="rounded-md border border-border bg-card overflow-hidden">

      {/* ── Panel header ────────────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-accent/50 transition-colors text-left"
      >
        {/* Left icon */}
        <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-4 h-4 text-primary"/>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-foreground tracking-tight">{title}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {docs.length} file{docs.length !== 1 ? "s" : ""}
            </span>
            {knownCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                <CheckCircle2 className="w-3 h-3"/>
                {knownCount} classified
              </span>
            )}
            {unknownDocs.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                <FileQuestion className="w-3 h-3"/>
                {unknownDocs.length} unknown
              </span>
            )}
          </div>
          {/* Overall confidence bar */}
          {knownCount > 0 && !collapsed && (
            <div className="mt-1 flex items-center gap-2 max-w-[200px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest shrink-0">Avg confidence</span>
              <ConfBar value={totalConf}/>
            </div>
          )}
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-muted-foreground">
          {collapsed ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>}
        </div>
      </button>

      {/* ── Panel body ──────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="border-t border-border px-4 py-4 space-y-2">

          {/* Known categories */}
          {knownCategories.map(cat => (
            <CategoryGroup key={cat} category={cat} docs={grouped[cat]!}/>
          ))}

          {/* Unknown files — always last */}
          {unknownDocs.length > 0 && (
            <>
              {knownCategories.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-px bg-border"/>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Unclassified</span>
                  <div className="flex-1 h-px bg-border"/>
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
