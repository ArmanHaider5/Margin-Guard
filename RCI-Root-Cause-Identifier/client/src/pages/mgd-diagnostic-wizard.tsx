import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2,
  ChevronDown, FileText, Loader2, Plus, Search, Trash2,
  Upload, X, AlertTriangle, ClipboardList, MessageSquare,
  StickyNote, Play, Users, Package,
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

const CONCERN_EXAMPLES = [
  "Inventory losses", "Logistics bottlenecks", "Profitability",
  "Catering expansion", "Staff dependency", "Fleet capacity",
  "Cash flow management", "Reconciliation delays",
];

const STEPS = [
  { id: 1, label: "Client"       },
  { id: 2, label: "Documents"    },
  { id: 3, label: "Concerns"     },
  { id: 4, label: "Observations" },
  { id: 5, label: "Run"          },
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
interface ConsultantNote { id: string; title: string; observation: string; category: string; }

// ── Design primitives ─────────────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] uppercase tracking-widest text-white/35 mb-1.5">{children}</p>;
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
      className={`w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25
        focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all ${className}`}
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
        className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 pr-9
          text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
      >
        {placeholder && <option value="" className="bg-[#0a0f1e] text-white/40">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-[#0a0f1e] text-white">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none"/>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done    = s.id < current;
        const active  = s.id === current;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border transition-all
                ${done   ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" :
                  active ? "bg-blue-500/20 border-blue-500/60 text-blue-300" :
                           "bg-white/[0.04] border-white/10 text-white/25"}`}>
                {done ? <Check className="w-3.5 h-3.5"/> : s.id}
              </div>
              <span className={`text-[10px] uppercase tracking-widest whitespace-nowrap transition-colors
                ${active ? "text-blue-300 font-semibold" : done ? "text-emerald-400" : "text-white/20"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-12 md:w-20 h-px mx-2 mb-5 transition-all ${done ? "bg-emerald-500/40" : "bg-white/[0.08]"}`}/>
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
        <Label>Select Existing Client</Label>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25"/>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white
              placeholder-white/25 focus:outline-none focus:border-blue-500/50 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              <X className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>

        {/* Client list */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.05] max-h-64 overflow-y-auto">
          {loading && (
            <div className="p-4 flex items-center gap-2 text-white/30 text-sm">
              <Loader2 className="w-4 h-4 animate-spin"/> Loading clients…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-4 text-white/25 text-sm text-center">No clients found</div>
          )}
          {!loading && filtered.map(c => {
            const isSelected = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(isSelected ? "" : c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                  ${isSelected ? "bg-blue-500/10" : "hover:bg-white/[0.04]"}`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all
                  ${isSelected ? "bg-blue-500 border-blue-400" : "border-white/20 bg-white/[0.03]"}`}>
                  {isSelected && <Check className="w-3 h-3 text-white"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  <p className="text-[11px] text-white/35">{industryLabel(c.industry)}</p>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0"/>}
              </button>
            );
          })}
        </div>
      </div>

      {/* New Client */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-white/[0.07]"/>
          <span className="text-[10px] text-white/25 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/[0.07]"/>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
            ${showNew ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/80"}`}
        >
          <Plus className="w-3.5 h-3.5"/>
          New Client
        </button>
        {showNew && (
          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 space-y-3">
            <div>
              <Label>Client Name</Label>
              <TextInput value={newName} onChange={setNewName} placeholder="e.g. Akasa Event Solutions"/>
            </div>
            <div>
              <Label>Industry</Label>
              <Select value={newIndustry} onChange={setNewIndustry} options={INDUSTRY_OPTIONS} placeholder="Select industry…"/>
            </div>
            <button
              onClick={onCreate}
              disabled={!newName.trim() || !newIndustry || creating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30
                text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>}
              {creating ? "Creating…" : "Create Client"}
            </button>
          </div>
        )}
      </div>

      {/* Selected summary */}
      {selected && (
        <GlassCard className="p-4 flex items-center gap-3 border-blue-500/20 bg-blue-500/[0.05]">
          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0"/>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{selected.name}</p>
            <p className="text-[11px] text-white/40">{industryLabel(selected.industry)}</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ── Step 2 — Documents ────────────────────────────────────────────────────────

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
      {/* Available client documents */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Available Client Documents</Label>
          {clientDocs.length > 0 && (
            <button onClick={toggleAll} className="text-[11px] text-blue-400/70 hover:text-blue-300 transition-colors">
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.05] max-h-56 overflow-y-auto">
          {loadingDocs && (
            <div className="p-4 flex items-center gap-2 text-white/30 text-sm">
              <Loader2 className="w-4 h-4 animate-spin"/> Loading documents…
            </div>
          )}
          {!loadingDocs && clientDocs.length === 0 && (
            <div className="p-6 text-center">
              <Package className="w-6 h-6 text-white/15 mx-auto mb-2"/>
              <p className="text-[13px] text-white/25">No documents on file for this client</p>
            </div>
          )}
          {!loadingDocs && clientDocs.map(doc => {
            const checked = selectedDocIds.has(doc.id);
            const classified = classifyFilename(doc.fileName);
            return (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all
                  ${checked ? "bg-blue-500/[0.07]" : "hover:bg-white/[0.03]"}`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all
                  ${checked ? "bg-blue-500 border-blue-400" : "border-white/20 bg-white/[0.03]"}`}>
                  {checked && <Check className="w-3 h-3 text-white"/>}
                </div>
                <FileText className="w-3.5 h-3.5 text-white/25 shrink-0"/>
                <span className="flex-1 text-[13px] text-white/70 truncate">{doc.fileName}</span>
                {classified.category !== "unknown" && (
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-white/30 capitalize">
                    {classified.category.replace(/_/g, " ")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {clientDocs.length > 0 && (
          <p className="mt-1.5 text-[11px] text-white/25">{selectedDocIds.size} of {clientDocs.length} selected</p>
        )}
      </div>

      {/* Upload additional files */}
      <div>
        <Label>Upload Additional Files</Label>
        <div
          onDragOver={e => { e.preventDefault(); if (!uploading) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); if (!uploading) onFilesSelected(e.dataTransfer.files); }}
          onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
          className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center gap-3 transition-all
            ${uploading
              ? "border-blue-500/40 bg-blue-500/[0.04] cursor-wait"
              : isDragging
                ? "border-blue-500/60 bg-blue-500/[0.07] cursor-pointer"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] cursor-pointer"}`}
        >
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            {uploading
              ? <Loader2 className="w-5 h-5 text-blue-400 animate-spin"/>
              : <Upload className="w-5 h-5 text-white/30"/>
            }
          </div>
          <div className="text-center">
            <p className="text-[13px] text-white/50 font-medium">
              {uploading ? "Uploading…" : "Drop files here or click to browse"}
            </p>
            <p className="text-[11px] text-white/25 mt-0.5">.xlsx · .csv · .pdf · .docx</p>
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
          <Label>Detected Document Types</Label>
          <DocumentClassificationPanel documents={uploadedClassified} title="Uploaded Files" defaultCollapsed={false}/>
        </div>
      )}
    </div>
  );
}

// ── Step 3 — Business Concerns ────────────────────────────────────────────────

function Step3Concerns({
  concerns, addConcern, removeConcern, input, setInput,
}: {
  concerns: string[]; addConcern: (c: string) => void; removeConcern: (i: number) => void;
  input: string; setInput: (v: string) => void;
}) {
  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed && !concerns.includes(trimmed)) {
      addConcern(trimmed);
      setInput("");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>What concerns does the client want reviewed?</Label>
        <div className="flex gap-2">
          <TextInput
            value={input} onChange={setInput} placeholder="e.g. Inventory losses…"
            className="flex-1"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="px-4 py-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-sm font-medium
              hover:bg-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <Plus className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* Quick-add examples */}
      <div>
        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Common concerns</p>
        <div className="flex flex-wrap gap-2">
          {CONCERN_EXAMPLES.filter(e => !concerns.includes(e)).map(ex => (
            <button
              key={ex}
              onClick={() => addConcern(ex)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03] text-white/40
                hover:border-blue-500/30 hover:bg-blue-500/[0.06] hover:text-blue-300 transition-all"
            >
              + {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Added concerns */}
      {concerns.length > 0 && (
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Added concerns ({concerns.length})</p>
          <div className="space-y-2">
            {concerns.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-blue-500/15 bg-blue-500/[0.05]">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0"/>
                <span className="flex-1 text-[13px] text-white/70">{c}</span>
                <button onClick={() => removeConcern(i)} className="text-white/20 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5"/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {concerns.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <MessageSquare className="w-6 h-6 text-white/15 mx-auto mb-2"/>
          <p className="text-[13px] text-white/25">Add at least one concern to guide the diagnostic</p>
        </div>
      )}
    </div>
  );
}

// ── Step 4 — Consultant Observations ─────────────────────────────────────────

function Step4Observations({
  notes, addNote, removeNote,
  title, setTitle, observation, setObservation, category, setCategory,
}: {
  notes: ConsultantNote[]; addNote: () => void; removeNote: (id: string) => void;
  title: string; setTitle: (v: string) => void;
  observation: string; setObservation: (v: string) => void;
  category: string; setCategory: (v: string) => void;
}) {
  const canAdd = title.trim() && observation.trim() && category;

  return (
    <div className="space-y-5">
      {/* Add note form */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <StickyNote className="w-4 h-4 text-amber-400"/>
          <span className="text-[13px] font-semibold text-white">Add Observation</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Title</Label>
            <TextInput value={title} onChange={setTitle} placeholder="e.g. Fleet Capacity Issue"/>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={setCategory}
              options={NOTE_CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="Select category…"/>
          </div>
        </div>
        <div>
          <Label>Observation</Label>
          <textarea
            value={observation}
            onChange={e => setObservation(e.target.value)}
            placeholder="Describe what was observed or noted during the client briefing…"
            rows={3}
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white
              placeholder-white/25 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all resize-none"
          />
        </div>
        <button
          onClick={addNote}
          disabled={!canAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300
            text-sm font-medium hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="w-3.5 h-3.5"/>
          Add Observation
        </button>
      </GlassCard>

      {/* Notes list */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[10px] text-white/25 uppercase tracking-widest">Observations added ({notes.length})</p>
          {notes.map(n => (
            <div key={n.id} className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    {n.category}
                  </span>
                </div>
                <button onClick={() => removeNote(n.id)} className="text-white/20 hover:text-red-400 transition-colors mt-0.5">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed">{n.observation}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <StickyNote className="w-6 h-6 text-white/15 mx-auto mb-2"/>
          <p className="text-[13px] text-white/25">No observations yet — add context from your client conversation</p>
        </div>
      )}
    </div>
  );
}

// ── Step 5 — Review & Run ─────────────────────────────────────────────────────

function Step5Review({
  client, selectedDocCount, uploadedCount, concerns, notes, running, error, onRun,
}: {
  client: Client | null; selectedDocCount: number; uploadedCount: number;
  concerns: string[]; notes: ConsultantNote[];
  running: boolean; error: string; onRun: () => void;
}) {
  const rows: { icon: React.ElementType; label: string; value: string; accent: string }[] = [
    { icon: Building2,     label: "Client",              value: client?.name ?? "—",                                  accent: "text-blue-400"    },
    { icon: ClipboardList, label: "Industry",             value: industryLabel(client?.industry),                      accent: "text-indigo-400"  },
    { icon: FileText,      label: "Documents Selected",   value: `${selectedDocCount} document${selectedDocCount !== 1 ? "s" : ""}`, accent: "text-emerald-400" },
    { icon: Upload,        label: "Files Uploaded",       value: `${uploadedCount} file${uploadedCount !== 1 ? "s" : ""}`, accent: "text-sky-400"    },
    { icon: MessageSquare, label: "Business Concerns",    value: concerns.length ? `${concerns.length} concern${concerns.length !== 1 ? "s" : ""}` : "None added", accent: "text-amber-400"   },
    { icon: StickyNote,    label: "Consultant Observations", value: notes.length ? `${notes.length} note${notes.length !== 1 ? "s" : ""}` : "None added", accent: "text-orange-400"  },
  ];

  return (
    <div className="space-y-6">
      <GlassCard className="divide-y divide-white/[0.06]">
        {rows.map(row => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 px-5 py-3.5">
              <Icon className={`w-4 h-4 shrink-0 ${row.accent}`}/>
              <span className="text-[12px] text-white/35 w-40 shrink-0">{row.label}</span>
              <span className="text-[13px] text-white/75 font-medium">{row.value}</span>
            </div>
          );
        })}
      </GlassCard>

      {/* Concerns preview */}
      {concerns.length > 0 && (
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Business Concerns</p>
          <div className="flex flex-wrap gap-2">
            {concerns.map((c, i) => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] text-blue-300">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0"/>
          <p className="text-[13px] text-red-300">{error}</p>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onRun}
        disabled={running}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl
          bg-gradient-to-r from-blue-600/40 to-indigo-600/40 border border-blue-500/40
          text-white text-base font-bold tracking-tight
          hover:from-blue-600/55 hover:to-indigo-600/55 hover:border-blue-400/60
          disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/10"
      >
        {running
          ? <><Loader2 className="w-5 h-5 animate-spin"/> Running Diagnostic…</>
          : <><Play className="w-5 h-5"/> Run Diagnostic</>
        }
      </button>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function MGDDiagnosticWizard() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  // ── Step 1 state ───────────────────────────────────────────────────────────
  const [clients,      setClients]      = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedId,   setSelectedId]   = useState("");
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
  const [businessConcerns, setBusinessConcerns]  = useState<string[]>([]);

  // ── Step 4 state ───────────────────────────────────────────────────────────
  const [notes,         setNotes]         = useState<ConsultantNote[]>([]);
  const [noteTitle,     setNoteTitle]     = useState("");
  const [noteObs,       setNoteObs]       = useState("");
  const [noteCat,       setNoteCat]       = useState("");

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
  const addConcern    = (c: string) => setBusinessConcerns(prev => [...prev, c]);
  const removeConcern = (i: number) => setBusinessConcerns(prev => prev.filter((_, idx) => idx !== i));

  // Add / remove note
  function addNote() {
    if (!noteTitle.trim() || !noteObs.trim() || !noteCat) return;
    setNotes(prev => [...prev, {
      id: crypto.randomUUID(),
      title: noteTitle.trim(),
      observation: noteObs.trim(),
      category: noteCat,
    }]);
    setNoteTitle(""); setNoteObs(""); setNoteCat("");
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
        businessConcerns,
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

  // Step titles
  const STEP_META = [
    { title: "Select Client",           sub: "Choose an existing client or create a new one" },
    { title: "Select Documents",        sub: "Choose documents to include and upload additional files" },
    { title: "Business Concerns",       sub: "What areas does the client want the diagnostic to focus on?" },
    { title: "Consultant Observations", sub: "Add field notes from your client conversation" },
    { title: "Review & Run",            sub: "Confirm the diagnostic configuration and start analysis" },
  ];
  const meta = STEP_META[step - 1];

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#060a13 0%,#070b14 50%,#060c15 100%)" }}>
      {/* Grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage:"linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize:"40px 40px" }}/>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">

        {/* Back nav */}
        <div className="mb-6">
          <Link href="/mgd">
            <a className="inline-flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5"/>
              MGD Dashboard
            </a>
          </Link>
        </div>

        {/* Page title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">New Diagnostic</h1>
          <p className="text-[13px] text-white/35">Margin Guard Diagnostics · Scope Optix</p>
        </div>

        {/* Stepper */}
        <Stepper current={step}/>

        {/* Step card */}
        <GlassCard className="p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">{meta.title}</h2>
            <p className="text-[13px] text-white/40 mt-0.5">{meta.sub}</p>
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
              input={concernInput} setInput={setConcernInput}
            />
          )}
          {step === 4 && (
            <Step4Observations
              notes={notes} addNote={addNote} removeNote={removeNote}
              title={noteTitle} setTitle={setNoteTitle}
              observation={noteObs} setObservation={setNoteObs}
              category={noteCat} setCategory={setNoteCat}
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
        </GlassCard>

        {/* Navigation footer */}
        <div className="flex items-center justify-between mt-5 gap-3">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03]
              text-white/50 text-sm font-medium hover:bg-white/[0.07] hover:text-white/80
              disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5"/>
            Back
          </button>

          {step < 5 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed[step - 1]}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600/30 border border-blue-500/40
                text-blue-200 text-sm font-semibold hover:bg-blue-600/45 hover:border-blue-400/60
                disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5"/>
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/35 to-indigo-600/35
                border border-blue-500/40 text-white text-sm font-bold
                hover:from-blue-600/50 hover:to-indigo-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Play className="w-3.5 h-3.5"/>}
              {running ? "Running…" : "Run Diagnostic"}
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-1.5 mt-5">
          {STEPS.map(s => (
            <div key={s.id} className={`h-0.5 rounded-full transition-all ${
              s.id < step ? "w-8 bg-emerald-500/60" :
              s.id === step ? "w-8 bg-blue-500/70" :
              "w-4 bg-white/[0.08]"
            }`}/>
          ))}
        </div>
      </div>
    </div>
  );
}
