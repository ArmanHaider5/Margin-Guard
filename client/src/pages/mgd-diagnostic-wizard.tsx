import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2,
  ChevronDown, FileText, Loader2, Plus, Search, Trash2,
  Upload, X, AlertTriangle, ClipboardList, MessageSquare,
  StickyNote, Play, Package,
} from "lucide-react";
import DocumentClassificationPanel from "@/components/mgd/DocumentClassificationPanel";
import type { ClassifiedDocument, DocumentCategory } from "@/components/mgd/DocumentClassificationPanel";

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  { value: "event_management",     label: "Event Management"              },
  { value: "construction",         label: "Construction"                  },
  { value: "fnb_full_service",     label: "F&B — Full Service Restaurant" },
  { value: "fnb_qsr",              label: "F&B — Quick Service (QSR)"     },
  { value: "fnb_fast_food",        label: "F&B — Fast Food Chain"         },
  { value: "fnb_franchise",        label: "F&B — Franchise"               },
  { value: "fnb_independent",      label: "F&B — Independent Restaurant"  },
  { value: "healthcare",           label: "Healthcare & Pharmacies"       },
  { value: "hospitality",          label: "Hospitality"                   },
  { value: "hotels_airbnb",        label: "Hotels & Airbnb"               },
  { value: "logistics",            label: "Logistics"                     },
  { value: "manufacturing",        label: "Manufacturing"                 },
  { value: "oil_gas",              label: "Oil & Gas"                     },
  { value: "property_development", label: "Property Development"          },
];

const NOTE_CATEGORIES = [
  "Logistics", "Inventory", "Finance", "Manpower",
  "Operations", "Procurement", "Sales", "Technology", "Other",
];

// Mirrors server/mgd/finding-categories.ts's FINDING_CATEGORIES exactly (the
// one authoritative source — see docs/MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md)
// and the human-readable labels in server/mgd/executive-narrative-engine.ts's
// CATEGORY_LABEL, so a concern/observation's selected area always reads the
// same way here as it does in the composed report. This is a picklist for a
// CONSULTANT to explicitly choose from — MGD never infers an area from what
// they type. See docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md.
const DIAGNOSTIC_AREAS: { value: string; label: string }[] = [
  { value: "inventory_visibility",   label: "Inventory Management"        },
  { value: "logistics_coordination", label: "Logistics Coordination"      },
  { value: "warehouse_operations",   label: "Warehouse Operations"        },
  { value: "manpower_dependency",    label: "Manpower Dependency"         },
  { value: "financial_leakage",      label: "Financial Leakage"           },
  { value: "workflow_scalability",   label: "Workflow Scalability"        },
  { value: "event_readiness",        label: "Event Readiness Control"     },
  { value: "dispatch_operations",    label: "Dispatch Reliability"        },
  { value: "asset_management",       label: "Asset Accountability"        },
];

// Optional starting points only — never required classifications. Selecting
// one simply fills the free-form concern input; MGD never infers an area
// from it. See docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md.
const CONCERN_EXAMPLES = ["Delivery", "Inventory", "Cash Flow", "Staffing", "Profitability"];

const STEPS = [
  { id: 1, label: "Client"            },
  { id: 2, label: "Evidence"          },
  { id: 3, label: "What's Happening"  },
  { id: 4, label: "Observations"      },
  { id: 5, label: "Review & Run"      },
];

// ── Client-side document classifier (filename-only mirror of server logic) ────

const CLASSIFY_RULES: { category: DocumentCategory; keywords: string[] }[] = [
  { category: "lost_items",         keywords: ["lost", "shortage", "missing"]                             },
  { category: "damaged_items",      keywords: ["damage", "broken", "pecah"]                              },
  { category: "driver_assignment",  keywords: ["driver", "assignment", "assign"]                         },
  { category: "logistics_schedule", keywords: ["lorry", "driver", "dispatch", "delivery", "schedule"]    },
  { category: "quotation_register", keywords: ["quotation", "quote", "proposal"]                         },
  { category: "invoice_register",   keywords: ["invoice", "bil", "receipt"]                              },
  { category: "sales_report",       keywords: ["sales", "revenue", "transaction"]                        },
  { category: "job_description",    keywords: ["job description", "job desc", "vacancy", "position"]     },
  { category: "hr_document",        keywords: ["employee", "staff", "hr", "payroll", "attendance"]       },
  { category: "inventory_movement", keywords: ["inventory", "stock", "movement", "balance", "opening", "closing"] },
];

function classifyFilename(fileName: string): ClassifiedDocument {
  const norm = fileName.toLowerCase().replace(/[_\-]/g, " ").replace(/\s+/g, " ");
  let best: { category: DocumentCategory; score: number; kw: string[] } = { category: "unknown", score: 20, kw: [] };
  for (const rule of CLASSIFY_RULES) {
    const hits = rule.keywords.filter(kw => norm.includes(kw));
    if (!hits.length) continue;
    const score = Math.min(95, 40 + (hits.length - 1) * 10);
    // Inventory sub-split
    let cat = rule.category;
    if (cat === "inventory_movement") {
      if (norm.includes("balance") || norm.includes("summary")) cat = "inventory_summary";
    }
    if (score > best.score) best = { category: cat, score, kw: hits };
  }
  return { fileName, category: best.category, confidence: best.score, matchedKeywords: best.kw };
}

function industryLabel(raw?: string) {
  return (
    INDUSTRY_OPTIONS.find(o => o.value === raw)?.label ??
    ((raw ?? "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—")
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Client { id: string; name: string; industry: string; }
interface ClientDoc { id: string; fileName: string; fileType?: string; status?: string; }
interface ConsultantNote {
  id: string; title: string; observation: string; category: string;
  /** Consultant-selected diagnostic area (Finding Category), optional. */
  relatedArea?: string;
}
/** A Business Concern with 0+ consultant-selected diagnostic areas — never
 *  inferred from `text`. See docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md. */
interface Concern { text: string; areas: string[]; }

// ── Design primitives (white MGD design system — semantic tokens only) ────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card ${className}`}>
      {children}
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground mb-1.5">
      {children}
      {hint && <span className="font-normal text-muted-foreground/70"> {hint}</span>}
    </p>
  );
}

function TextInput({ value, onChange, placeholder, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground/60
        focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${className}`}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full bg-background border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder-muted-foreground/60
        focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none leading-relaxed ${className}`}
    />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-background border border-border rounded-md px-3 py-2.5 pr-9
          text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"/>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────
// Quieter than a technical progress bar: a small numbered/checked marker per
// step with its label, connected by thin rules — communicates position and
// completion without a "configuring a system" feel.

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto">
      {STEPS.map((s, i) => {
        const done   = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border transition-colors
                ${done   ? "bg-primary/10 border-primary/30 text-primary" :
                  active ? "bg-primary border-primary text-primary-foreground" :
                           "bg-background border-border text-muted-foreground"}`}>
                {done ? <Check className="w-3.5 h-3.5"/> : s.id}
              </div>
              <span className={`text-[10px] uppercase tracking-wide whitespace-nowrap transition-colors
                ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 md:w-14 h-px mx-2 mb-5 transition-colors ${done ? "bg-primary/30" : "bg-border"}`}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1 — Client ───────────────────────────────────────────────────────────

function Step1Client({
  clients, loading, selectedId, onSelect,
  showNew, setShowNew, newName, setNewName, newIndustry, setNewIndustry,
  creating, onCreate,
}: {
  clients: Client[]; loading: boolean; selectedId: string; onSelect: (id: string) => void;
  showNew: boolean; setShowNew: (v: boolean) => void;
  newName: string; setNewName: (v: string) => void;
  newIndustry: string; setNewIndustry: (v: string) => void;
  creating: boolean; onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    industryLabel(c.industry).toLowerCase().includes(search.toLowerCase())
  );
  const selected = clients.find(c => c.id === selectedId);

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Client organization</FieldLabel>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2.5 text-sm text-foreground
              placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>

        {/* Client list */}
        <div className="rounded-md border border-border bg-background divide-y divide-border max-h-64 overflow-y-auto">
          {loading && (
            <div className="p-4 flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin"/> Loading clients…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-4 text-muted-foreground text-sm text-center">No clients found</div>
          )}
          {!loading && filtered.map(c => {
            const isSelected = c.id === selectedId;
            return (
              // Single-choice radio-card, not a checkbox — only one client
              // can ever be selected (onSelect toggle logic below is
              // unchanged), so the visual must not imply multi-select.
              <button
                key={c.id}
                onClick={() => onSelect(isSelected ? "" : c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2
                  ${isSelected
                    ? "bg-accent border-l-primary"
                    : "border-l-transparent hover:bg-accent/50"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                  ${isSelected ? "border-primary" : "border-border"}`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate transition-colors ${isSelected ? "text-foreground font-semibold" : "text-foreground/90 font-medium"}`}>{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{industryLabel(c.industry)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* New Client */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-border"/>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-border"/>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-md border text-sm font-medium transition-colors
            ${showNew ? "bg-accent border-primary/30 text-primary" : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}
        >
          <Plus className="w-3.5 h-3.5"/>
          New Client
        </button>
        {showNew && (
          <div className="mt-3 rounded-md border border-border bg-accent/40 p-4 space-y-3">
            <div>
              <FieldLabel>Client name</FieldLabel>
              <TextInput value={newName} onChange={setNewName} placeholder="e.g. Akasa Event Solutions"/>
            </div>
            <div>
              <FieldLabel>Industry</FieldLabel>
              <Select value={newIndustry} onChange={setNewIndustry} options={INDUSTRY_OPTIONS} placeholder="Select industry…"/>
            </div>
            <button
              onClick={onCreate}
              disabled={!newName.trim() || !newIndustry || creating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary
                text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>}
              {creating ? "Creating…" : "Create Client"}
            </button>
          </div>
        )}
      </div>

      {/* Selected summary — clean, unambiguous selection card */}
      {selected && (
        <Card className="p-4 flex items-center gap-3 border-primary/30 bg-accent/60 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0"/>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{selected.name}</p>
            <p className="text-[11px] text-muted-foreground">{industryLabel(selected.industry)}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Step 2 — Evidence ─────────────────────────────────────────────────────────

function Step2Documents({
  clientDocs, loadingDocs, selectedDocIds, toggleDoc, toggleAll,
  uploadedClassified, onFilesSelected, isDragging, setIsDragging, fileInputRef, uploading,
}: {
  clientDocs: ClientDoc[]; loadingDocs: boolean;
  selectedDocIds: Set<string>; toggleDoc: (id: string) => void; toggleAll: () => void;
  uploadedClassified: ClassifiedDocument[];
  onFilesSelected: (files: FileList | null) => void;
  isDragging: boolean; setIsDragging: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  uploading: boolean;
}) {
  const allSelected = clientDocs.length > 0 && clientDocs.every(d => selectedDocIds.has(d.id));

  return (
    <div className="space-y-6">
      {/* Evidence already on file */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Evidence already on file</FieldLabel>
          {clientDocs.length > 0 && (
            <button onClick={toggleAll} className="text-[11px] text-primary hover:opacity-75 transition-opacity">
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        <div className="rounded-md border border-border bg-background divide-y divide-border max-h-56 overflow-y-auto">
          {loadingDocs && (
            <div className="p-4 flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin"/> Loading evidence…
            </div>
          )}
          {!loadingDocs && clientDocs.length === 0 && (
            <div className="p-6 text-center">
              <Package className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2"/>
              <p className="text-[13px] text-muted-foreground">No evidence on file for this client yet</p>
            </div>
          )}
          {!loadingDocs && clientDocs.map(doc => {
            const checked = selectedDocIds.has(doc.id);
            const classified = classifyFilename(doc.fileName);
            return (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                  ${checked ? "bg-accent" : "hover:bg-accent/50"}`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors
                  ${checked ? "bg-primary border-primary" : "border-border bg-background"}`}>
                  {checked && <Check className="w-3 h-3 text-primary-foreground"/>}
                </div>
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
                <span className="flex-1 text-[13px] text-foreground/90 truncate">{doc.fileName}</span>
                {classified.category !== "unknown" && (
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                    {classified.category.replace(/_/g, " ")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {clientDocs.length > 0 && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">{selectedDocIds.size} of {clientDocs.length} selected</p>
        )}
      </div>

      {/* Add more evidence */}
      <div>
        <FieldLabel>Add more evidence</FieldLabel>
        <div
          onDragOver={e => { e.preventDefault(); if (!uploading) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); if (!uploading) onFilesSelected(e.dataTransfer.files); }}
          onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
          className={`rounded-md border-2 border-dashed p-8 flex flex-col items-center gap-3 transition-colors
            ${uploading
              ? "border-primary/40 bg-accent/40 cursor-wait"
              : isDragging
                ? "border-primary/60 bg-accent/60 cursor-pointer"
                : "border-border bg-background hover:border-primary/40 hover:bg-accent/30 cursor-pointer"}`}
        >
          <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center">
            {uploading
              ? <Loader2 className="w-5 h-5 text-primary animate-spin"/>
              : <Upload className="w-5 h-5 text-primary"/>
            }
          </div>
          <div className="text-center">
            <p className="text-[13px] text-foreground font-medium">
              {uploading ? "Uploading…" : "Drop files here or click to browse"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">.xlsx · .csv · .pdf · .docx</p>
          </div>
          <input
            ref={fileInputRef} type="file" multiple className="hidden"
            accept=".xlsx,.csv,.pdf,.docx,.xls,.txt"
            onChange={e => onFilesSelected(e.target.files)}
          />
        </div>
      </div>

      {/* Classification panel */}
      {uploadedClassified.length > 0 && (
        <div>
          <FieldLabel>Recognized document types</FieldLabel>

          {/* Concise per-file confirmation — what the consultant sees by
              default. Full classifier detail (confidence scores, matched
              keywords) is unchanged in the panel below — only its
              defaultCollapsed value changed, so that detail stays one click
              away instead of competing with this summary by default. */}
          <div className="space-y-1.5 mb-3">
            {uploadedClassified.map((doc, i) => (
              <div key={`${doc.fileName}-${i}`} className="flex items-center gap-2 text-[12px]">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${doc.category !== "unknown" ? "text-primary" : "text-muted-foreground/50"}`}/>
                <span className="text-foreground/80 truncate">{doc.fileName}</span>
                <span className="text-muted-foreground shrink-0">
                  {doc.category !== "unknown"
                    ? <>— Recognized as: <span className="capitalize">{doc.category.replace(/_/g, " ")}</span></>
                    : "— Not yet recognized"}
                </span>
              </div>
            ))}
          </div>

          <DocumentClassificationPanel documents={uploadedClassified} title="Uploaded Files" defaultCollapsed/>
        </div>
      )}
    </div>
  );
}

// ── Step 3 — What's Happening (Business Concerns) ─────────────────────────────

function Step3Concerns({
  concerns, addConcern, removeConcern, toggleConcernArea, input, setInput,
}: {
  concerns: Concern[]; addConcern: (c: string) => void; removeConcern: (i: number) => void;
  toggleConcernArea: (i: number, area: string) => void;
  input: string; setInput: (v: string) => void;
}) {
  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed && !concerns.some(c => c.text === trimmed)) {
      addConcern(trimmed);
      setInput("");
    }
  }

  // Local-only UI disclosure state — which concerns currently show their
  // area-tagging picker. Keyed by concern text (not index) so removing one
  // concern can never shift another concern's expand/collapse state.
  // Nothing here is persisted or sent to the server; Concern.areas remains
  // the sole source of truth for what's actually selected.
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  function toggleExpanded(text: string) {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text); else next.add(text);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Free-form concern — the dominant interaction on this step */}
      <div>
        <FieldLabel>Tell us what's concerning you</FieldLabel>
        <TextArea
          value={input} onChange={setInput}
          placeholder="We're frequently delivering late to our key customers and I'm not sure why."
          rows={4}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium
              hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <Plus className="w-3.5 h-3.5"/>
            Add
          </button>
        </div>
      </div>

      {/* Optional starting points — visually secondary, never a required
          classification. Selecting one only fills the input above. */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">You can also start with:</p>
        <div className="flex flex-wrap gap-2">
          {CONCERN_EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background text-muted-foreground
                hover:border-primary/40 hover:text-primary transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Added concerns */}
      {concerns.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">What you'd like us to investigate ({concerns.length})</p>
          <div className="space-y-2">
            {concerns.map((c, i) => (
              <div key={i} className="rounded-md border border-border bg-card px-4 py-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5"/>
                  <span className="flex-1 text-sm text-foreground leading-relaxed">{c.text}</span>
                  <button onClick={() => removeConcern(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X className="w-3.5 h-3.5"/>
                  </button>
                </div>
                <div className="mt-2 pl-6">
                  {expandedAreas.has(c.text) ? (
                    <>
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        Area <span className="text-muted-foreground/70">(optional — your choice, MGD won't guess)</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {DIAGNOSTIC_AREAS.map(area => {
                          const selected = c.areas.includes(area.value);
                          return (
                            <button
                              key={area.value}
                              type="button"
                              onClick={() => toggleConcernArea(i, area.value)}
                              className={`text-[10.5px] px-2 py-1 rounded-md border transition-colors ${
                                selected
                                  ? "border-primary/40 bg-accent text-primary"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                              }`}
                            >
                              {selected && <Check className="w-2.5 h-2.5 inline mr-1 -mt-0.5"/>}
                              {area.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(c.text)}
                        className="text-[10.5px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Hide area options
                      </button>
                    </>
                  ) : (
                    // Collapsed default — a single restrained secondary
                    // control. If areas are already selected, they stay
                    // apparent here so the consultant never has to reopen
                    // the picker just to see what's tagged.
                    <button
                      type="button"
                      onClick={() => toggleExpanded(c.text)}
                      className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5 shrink-0"/>
                      {c.areas.length > 0 ? (
                        <span>
                          Area: <span className="text-primary/80">{c.areas.map(a => DIAGNOSTIC_AREAS.find(d => d.value === a)?.label ?? a).join(", ")}</span>
                          <span className="text-muted-foreground/60"> · Edit</span>
                        </span>
                      ) : (
                        "Add an area (optional)"
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 4 — Observations ─────────────────────────────────────────────────────

function Step4Observations({
  notes, addNote, removeNote,
  title, setTitle, observation, setObservation, category, setCategory,
  area, setArea,
}: {
  notes: ConsultantNote[]; addNote: () => void; removeNote: (id: string) => void;
  title: string; setTitle: (v: string) => void;
  observation: string; setObservation: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  area: string; setArea: (v: string) => void;
}) {
  const canAdd = title.trim() && observation.trim() && category;

  return (
    <div className="space-y-6">
      {/* Add note form — observation text is the primary control; title and
          category/area are progressively de-emphasized below it. No change
          to ConsultantNote, canAdd's validation, or any handler — purely a
          reordering/restyling of the same fields. */}
      <Card className="p-5 space-y-4 shadow-sm">
        <FieldLabel>What did you notice?</FieldLabel>
        <TextArea
          value={observation} onChange={setObservation}
          placeholder="The operations manager still schedules drivers manually using WhatsApp and a spreadsheet."
          rows={4}
        />

        {/* Title — kept (required, part of ConsultantNote), visually subordinate */}
        <div>
          <FieldLabel>What would you call this?</FieldLabel>
          <TextInput value={title} onChange={setTitle} placeholder="e.g. Fleet Capacity Issue"/>
        </div>

        {/* Optional context — category/area, visually secondary. Category
            remains functionally required (canAdd unchanged below); this is
            a hierarchy change only, not a validation change. */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Add context (optional)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select value={category} onChange={setCategory}
                options={NOTE_CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="Select category…"/>
            </div>
            <div>
              <FieldLabel hint="(optional — your choice, MGD won't guess)">Related area</FieldLabel>
              <Select value={area} onChange={setArea}
                options={DIAGNOSTIC_AREAS} placeholder="No specific area…"/>
            </div>
          </div>
        </div>

        <button
          onClick={addNote}
          disabled={!canAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground
            text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <Plus className="w-3.5 h-3.5"/>
          Add Observation
        </button>
      </Card>

      {/* Notes list */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Observations noted ({notes.length})</p>
          {notes.map(n => (
            // Primary: title + the actual observation text. Secondary:
            // category/area badges, moved below the observation instead of
            // crowding the title. Same removeNote(n.id) handler, unchanged.
            <div key={n.id} className="rounded-md border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <button onClick={() => removeNote(n.id)} className="text-muted-foreground hover:text-destructive transition-colors mt-0.5 shrink-0">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
              <p className="text-[13px] text-foreground/80 leading-relaxed mt-1.5">{n.observation}</p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {n.category}
                </span>
                {n.relatedArea && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent text-primary">
                    {DIAGNOSTIC_AREAS.find(a => a.value === n.relatedArea)?.label ?? n.relatedArea}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          No observations yet — add anything you've noticed above.
        </p>
      )}
    </div>
  );
}

// ── Step 5 — Review & Run ─────────────────────────────────────────────────────

function BriefRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-5 py-4">
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function Step5Review({
  client, selectedDocCount, uploadedCount, concerns, notes, running, error, onRun,
}: {
  client: Client | null; selectedDocCount: number; uploadedCount: number;
  concerns: Concern[]; notes: ConsultantNote[];
  running: boolean; error: string; onRun: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="divide-y divide-border shadow-sm">
        <BriefRow icon={Building2} label="Client">
          {client?.name ?? "—"}
        </BriefRow>

        <BriefRow icon={ClipboardList} label="Business context">
          {industryLabel(client?.industry)}
        </BriefRow>

        <BriefRow icon={FileText} label="Evidence">
          {/* selectedDocCount and uploadedCount are independent counts (see
              Milestone C forensic review) — stated side by side rather than
              implying uploaded files are necessarily a subset of selected
              ones. */}
          {selectedDocCount === 0 && uploadedCount === 0
            ? "No evidence selected"
            : `${selectedDocCount} document${selectedDocCount !== 1 ? "s" : ""} selected` +
              (uploadedCount > 0 ? ` · ${uploadedCount} file${uploadedCount !== 1 ? "s" : ""} uploaded this session` : "")}
        </BriefRow>

        <BriefRow icon={MessageSquare} label="What's happening">
          {concerns.length === 0 ? (
            <span className="text-muted-foreground">No concerns added</span>
          ) : (
            <div className="flex flex-wrap gap-2 mt-0.5">
              {concerns.map((c, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-accent/50 text-foreground">
                  {c.text}
                  {c.areas.length > 0 && (
                    <span className="text-primary/70"> · {c.areas.map(a => DIAGNOSTIC_AREAS.find(d => d.value === a)?.label ?? a).join(", ")}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </BriefRow>

        <BriefRow icon={StickyNote} label="Your observations">
          {notes.length === 0 ? (
            <span className="text-muted-foreground">No observations added</span>
          ) : (
            <div className="space-y-3 mt-0.5">
              {notes.map(n => (
                <div key={n.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{n.category}</span>
                    {n.relatedArea && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-primary">
                        {DIAGNOSTIC_AREAS.find(a => a.value === n.relatedArea)?.label ?? n.relatedArea}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-foreground/75 leading-relaxed">{n.observation}</p>
                </div>
              ))}
            </div>
          )}
        </BriefRow>
      </Card>

      <p className="text-sm text-muted-foreground leading-relaxed">
        MGD will use the evidence and context above to investigate the underlying issues and identify
        practical opportunities for improvement.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0"/>
          <p className="text-[13px] text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function MGDDiagnosticWizard() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  // Client preselection (Milestone 18A) — when launched from a specific
  // client's workspace via /mgd/diagnostic?clientId=<id>, that client is
  // preselected here instead of asking the consultant to search for and
  // reselect the client they're already viewing. Read once on first render
  // (the wizard is always a fresh mount when navigated to); Step 1 still
  // displays the selection normally, it's simply already made.
  const search = useSearch();
  const preselectedClientId = new URLSearchParams(search).get("clientId") ?? "";

  // ── Step 1 state ───────────────────────────────────────────────────────────
  const [clients,      setClients]      = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedId,   setSelectedId]   = useState(preselectedClientId);
  const [showNew,      setShowNew]      = useState(false);
  const [newName,      setNewName]      = useState("");
  const [newIndustry,  setNewIndustry]  = useState("");
  const [creating,     setCreating]     = useState(false);

  // ── Step 2 state ───────────────────────────────────────────────────────────
  const [clientDocs,       setClientDocs]       = useState<ClientDoc[]>([]);
  const [loadingDocs,      setLoadingDocs]       = useState(false);
  const [selectedDocIds,   setSelectedDocIds]    = useState<Set<string>>(new Set());
  const [uploadedFiles,    setUploadedFiles]     = useState<File[]>([]);
  const [uploadedClassified, setUploadedClassified] = useState<ClassifiedDocument[]>([]);
  const [isDragging,       setIsDragging]        = useState(false);
  const [uploading,        setUploading]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 3 state ───────────────────────────────────────────────────────────
  const [concernInput,     setConcernInput]      = useState("");
  const [businessConcerns, setBusinessConcerns]  = useState<Concern[]>([]);

  // ── Step 4 state ───────────────────────────────────────────────────────────
  const [notes,         setNotes]         = useState<ConsultantNote[]>([]);
  const [noteTitle,     setNoteTitle]     = useState("");
  const [noteObs,       setNoteObs]       = useState("");
  const [noteCat,       setNoteCat]       = useState("");
  const [noteArea,      setNoteArea]      = useState("");

  // ── Step 5 state ───────────────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");

  // Load clients on mount
  useEffect(() => {
    fetch("/api/admin/clients")
      .then(r => r.json())
      .then((data: Client[]) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, []);

  // Load client documents when a client is selected
  useEffect(() => {
    if (!selectedId) { setClientDocs([]); setSelectedDocIds(new Set()); return; }
    setLoadingDocs(true);
    fetch(`/api/admin/clients/${selectedId}/documents`)
      .then(r => r.json())
      .then((data: ClientDoc[]) => {
        const docs = Array.isArray(data) ? data : [];
        setClientDocs(docs);
        setSelectedDocIds(new Set(docs.map(d => d.id)));
      })
      .catch(() => setClientDocs([]))
      .finally(() => setLoadingDocs(false));
  }, [selectedId]);

  // Create new client
  async function handleCreateClient() {
    if (!newName.trim() || !newIndustry) return;
    setCreating(true);
    try {
      const res  = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), industry: newIndustry }),
      });
      if (!res.ok) throw new Error("Failed to create client");
      const created: Client = await res.json();
      setClients(prev => [created, ...prev]);
      setSelectedId(created.id);
      setShowNew(false);
      setNewName("");
      setNewIndustry("");
    } catch {
      // silent — user can retry
    } finally {
      setCreating(false);
    }
  }

  // Handle uploaded files
  const handleFilesSelected = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);

    // Local classification for the "Detected Document Types" panel
    setUploadedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const fresh = arr.filter(f => !existing.has(f.name));
      const merged = [...prev, ...fresh];
      setUploadedClassified(merged.map(f => classifyFilename(f.name)));
      return merged;
    });

    // Upload to server and refresh the Available Client Documents list
    if (!selectedId) return;
    setUploading(true);
    try {
      const form = new FormData();
      arr.forEach(f => form.append("files", f));
      await fetch(`/api/admin/clients/${selectedId}/documents`, { method: "POST", body: form });

      // Refresh doc list and auto-select all (including new ones)
      const res  = await fetch(`/api/admin/clients/${selectedId}/documents`);
      const data = await res.json();
      const docs: ClientDoc[] = Array.isArray(data) ? data : [];
      setClientDocs(docs);
      setSelectedDocIds(new Set(docs.map(d => d.id)));
    } catch {
      // silent — classification panel still shows, user can retry
    } finally {
      setUploading(false);
    }
  }, [selectedId]);

  // Toggle doc selection
  const toggleDoc = useCallback((id: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedDocIds(prev =>
      prev.size === clientDocs.length ? new Set() : new Set(clientDocs.map(d => d.id))
    );
  }, [clientDocs]);

  // Add / remove concern
  const addConcern    = (c: string) => setBusinessConcerns(prev => [...prev, { text: c, areas: [] }]);
  const removeConcern = (i: number) => setBusinessConcerns(prev => prev.filter((_, idx) => idx !== i));
  // Toggle a diagnostic area on/off for one concern — consultant-driven only.
  const toggleConcernArea = (i: number, area: string) =>
    setBusinessConcerns(prev => prev.map((c, idx) => {
      if (idx !== i) return c;
      const areas = c.areas.includes(area) ? c.areas.filter(a => a !== area) : [...c.areas, area];
      return { ...c, areas };
    }));

  // Add / remove note
  function addNote() {
    if (!noteTitle.trim() || !noteObs.trim() || !noteCat) return;
    setNotes(prev => [...prev, {
      id: crypto.randomUUID(),
      title: noteTitle.trim(),
      observation: noteObs.trim(),
      category: noteCat,
      ...(noteArea ? { relatedArea: noteArea } : {}),
    }]);
    setNoteTitle(""); setNoteObs(""); setNoteCat(""); setNoteArea("");
  }
  const removeNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  // Step validation
  const selectedClient = clients.find(c => c.id === selectedId) ?? null;
  const canProceed = [
    !!selectedId,          // step 1
    true,                  // step 2 — optional
    true,                  // step 3 — optional
    true,                  // step 4 — optional
  ];

  function nextStep() { if (step < 5) setStep(s => s + 1); }
  function prevStep() { if (step > 1) setStep(s => s - 1); }

  // Run diagnostic
  async function handleRun() {
    if (!selectedId || !selectedClient) { setRunError("No client selected."); return; }
    setRunning(true);
    setRunError("");
    try {
      const payload = {
        clientId:           selectedId,
        clientName:         selectedClient.name,
        industry:           selectedClient.industry,
        selectedDocuments:  Array.from(selectedDocIds),
        // Send the richer {text, selectedAreas} shape only when the
        // consultant actually selected an area — a plain string otherwise,
        // so the wire payload stays minimal. See
        // docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md.
        businessConcerns: businessConcerns.map(c =>
          c.areas.length > 0 ? { text: c.text, selectedAreas: c.areas } : c.text,
        ),
        consultantNotes:    notes,
        transactions:       [],   // pipeline will use selectedDocuments
        documents:          [],
      };
      const res  = await fetch("/api/mgd/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Diagnostic failed");
      const reportId = data.report?.id;
      sessionStorage.setItem("mgd-selected-report", JSON.stringify(data.report?.report ?? data.report));
      navigate(reportId ? `/mgd/report?id=${reportId}` : "/mgd/report");
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setRunning(false);
    }
  }

  // Step titles — plain business language, no internal MGD architecture terms
  const STEP_META = [
    { title: "Which business are we looking at?", sub: "Select an existing client, or create a new client organization." },
    { title: "What information do you have?",     sub: "Select the information you'd like MGD to use for this diagnostic." },
    { title: "What would you like MGD to investigate?", sub: "Tell MGD what concerns you about this business. You can add one or more things you'd like us to investigate." },
    { title: "What have you noticed?",             sub: "Add anything you've noticed, heard, or learned from the client." },
    { title: "Ready to investigate",               sub: "Review what you're asking MGD to look into before running the diagnostic." },
  ];
  const meta = STEP_META[step - 1];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Stepper */}
      <Stepper current={step}/>

      {/* Step card */}
      <Card className="p-6 md:p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">{meta.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{meta.sub}</p>
        </div>

        {step === 1 && (
          <Step1Client
            clients={clients} loading={loadingClients}
            selectedId={selectedId} onSelect={setSelectedId}
            showNew={showNew} setShowNew={setShowNew}
            newName={newName} setNewName={setNewName}
            newIndustry={newIndustry} setNewIndustry={setNewIndustry}
            creating={creating} onCreate={handleCreateClient}
          />
        )}
        {step === 2 && (
          <Step2Documents
            clientDocs={clientDocs} loadingDocs={loadingDocs}
            selectedDocIds={selectedDocIds} toggleDoc={toggleDoc} toggleAll={toggleAll}
            uploadedClassified={uploadedClassified}
            onFilesSelected={handleFilesSelected}
            isDragging={isDragging} setIsDragging={setIsDragging}
            fileInputRef={fileInputRef}
            uploading={uploading}
          />
        )}
        {step === 3 && (
          <Step3Concerns
            concerns={businessConcerns} addConcern={addConcern} removeConcern={removeConcern}
            toggleConcernArea={toggleConcernArea}
            input={concernInput} setInput={setConcernInput}
          />
        )}
        {step === 4 && (
          <Step4Observations
            notes={notes} addNote={addNote} removeNote={removeNote}
            title={noteTitle} setTitle={setNoteTitle}
            observation={noteObs} setObservation={setNoteObs}
            category={noteCat} setCategory={setNoteCat}
            area={noteArea} setArea={setNoteArea}
          />
        )}
        {step === 5 && (
          <Step5Review
            client={selectedClient}
            selectedDocCount={selectedDocIds.size}
            uploadedCount={uploadedFiles.length}
            concerns={businessConcerns}
            notes={notes}
            running={running}
            error={runError}
            onRun={handleRun}
          />
        )}
      </Card>

      {/* Navigation footer */}
      <div className="flex items-center justify-between mt-5 gap-3">
        <button
          onClick={prevStep}
          disabled={step === 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md border border-border bg-background
            text-muted-foreground text-sm font-medium hover:bg-accent hover:text-foreground
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5"/>
          Back
        </button>

        {step < 5 ? (
          <button
            onClick={nextStep}
            disabled={!canProceed[step - 1]}
            className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary
              text-primary-foreground text-sm font-semibold hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Continue
            <ArrowRight className="w-3.5 h-3.5"/>
          </button>
        ) : (
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary
              text-primary-foreground text-sm font-semibold shadow-sm
              hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Play className="w-3.5 h-3.5"/>}
            {running ? "Running…" : "Run Diagnostic"}
          </button>
        )}
      </div>

      {/* Progress indicator — quiet, informational only */}
      <div className="flex justify-center gap-1.5 mt-5">
        {STEPS.map(s => (
          <div key={s.id} className={`h-0.5 rounded-full transition-colors ${
            s.id < step ? "w-8 bg-primary/40" :
            s.id === step ? "w-8 bg-primary" :
            "w-4 bg-border"
          }`}/>
        ))}
      </div>
    </div>
  );
}
