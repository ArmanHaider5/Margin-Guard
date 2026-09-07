import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Zap, Search, FileSpreadsheet, FileText, File, Loader2, CheckCircle2, AlertTriangle,
  UploadCloud, ClipboardList, SlidersHorizontal, PlayCircle, XCircle, Clock, Check, ChevronRight
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, ClientDocument, DiagnosticContext } from "@shared/schema";
import { DIAGNOSTIC_CONTEXTS } from "@shared/schema";
import { SYMPTOM_TAGS, type SymptomTag } from "@shared/root-cause-library";

const SYMPTOM_LABELS: Record<SymptomTag, string> = {
  MISSED_DEADLINES: "Missed Deadlines",
  COST_OVERRUNS: "Cost Overruns",
  HIGH_REWORK: "High Rework",
  LOW_ACCOUNTABILITY: "Low Accountability",
  FREQUENT_ESCALATIONS: "Frequent Escalations",
  QUALITY_ESCAPES: "Quality Escapes",
  FIRE_FIGHTING_CULTURE: "Fire-Fighting Culture",
  LOW_SYSTEM_ADOPTION: "Low System Adoption",
  CASH_FLOW_PRESSURE: "Cash Flow Pressure",
  HIGH_TURNOVER: "High Turnover",
  KNOWLEDGE_LOSS: "Knowledge Loss",
  SUPPLY_DISRUPTION: "Supply Disruption",
  CAPACITY_BOTTLENECK: "Capacity Bottleneck",
  CUSTOMER_COMPLAINTS: "Customer Complaints",
  MARGIN_EROSION: "Margin Erosion",
};

const fileTypeIcons: Record<string, typeof FileSpreadsheet> = {
  excel: FileSpreadsheet,
  word: FileText,
  powerpoint: File,
  pdf: File,
  other: File,
};

export default function ClientDiagnosticsNew() {
  const { clientId } = useParams<{ clientId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  // Context selection narrows diagnostic scope and increases relevance.
  const [selectedContexts, setSelectedContexts] = useState<DiagnosticContext[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomTag[]>([]);
  const [selectedMode, setSelectedMode] = useState<"quick" | "deep">("quick");

  const { data: client, isLoading: clientLoading, error: clientError } = useQuery<Client>({
    queryKey: ["/api/admin/clients", clientId],
    enabled: !!clientId,
  });

  const { data: documents } = useQuery<ClientDocument[]>({
    queryKey: ["/api/admin/clients", clientId, "documents"],
    enabled: !!clientId,
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (docs?.some(d => d.status === "uploaded" || d.status === "processing")) return 2000;
      return false;
    },
  });

  // Show ALL uploaded documents (not just processed) for selection
  const uploadedDocs = documents || [];

  // Auto-select newly appearing documents. Uses a ref so manual deselects are respected
  // (we only add IDs we've never seen before — we never re-force a deselected doc).
  const seenDocIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const newIds = uploadedDocs.map(d => d.id).filter(id => !seenDocIds.current.has(id));
    if (newIds.length > 0) {
      newIds.forEach(id => seenDocIds.current.add(id));
      setSelectedDocs(prev => [...new Set([...prev, ...newIds])]);
    }
  }, [uploadedDocs]);

  const hasDocumentsSelected = selectedDocs.length > 0;
  const hasProcessedDocs = uploadedDocs.some(d => selectedDocs.includes(d.id) && d.status === "processed");
  const hasDocsStillProcessing = uploadedDocs.some(d => selectedDocs.includes(d.id) && (d.status === "uploaded" || d.status === "processing"));
  const effectiveMode = hasDocumentsSelected ? "deep" : selectedMode;
  
  // Diagnostic mode for display (baseline/deep terminology)
  const diagnosticMode = effectiveMode === "deep" ? "deep" : "baseline";
  const analysisType = effectiveMode;

  // Diagnostics must be anchored to an explicit problem statement.
  const isProblemStatementValid = problemStatement.trim().length > 0;
  
  const createAndRunMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) {
        throw new Error("Quick Analysis must be run within a Client.");
      }
      if (!isProblemStatementValid) {
        throw new Error("Problem Statement is required to run a diagnostic.");
      }
      const createRes = await apiRequest("POST", `/api/admin/clients/${clientId}/analyses`, {
        title: title || `${analysisType === "quick" ? "Quick" : "Deep"} Analysis - ${new Date().toLocaleDateString()}`,
        problemStatement: problemStatement.trim(),
        diagnosticContexts: selectedContexts.length > 0 ? selectedContexts : undefined,
        selectedSymptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined,
        analysisType,
        documentIds: selectedDocs.length > 0 ? selectedDocs : undefined,
      });
      const analysis = await createRes.json();
      
      const runRes = await apiRequest("POST", `/api/admin/analyses/${analysis.id}/run`);
      return runRes.json();
    },
    onSuccess: (analysis) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", clientId, "analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", clientId, "cases"] });
      toast({ title: "Analysis completed!", description: "Results saved to client record." });
      navigate(`/admin/analyses/${analysis.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleDoc = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(d => d !== docId)
        : [...prev, docId]
    );
  };

  function handleRunAnalysis() {
    console.log("Run Analysis clicked - mode:", analysisType);

    if (!clientId) {
      alert("Client context missing. Cannot run analysis.");
      return;
    }

    // Validate problem statement before proceeding
    if (!isProblemStatementValid) {
      setShowValidation(true);
      return;
    }

    createAndRunMutation.mutate();
  }

  const selectAll = () => {
    if (selectedDocs.length === uploadedDocs.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(uploadedDocs.map(d => d.id));
    }
  };

  if (!clientId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Client context missing</h1>
          <p className="text-muted-foreground mb-4">Please return to Clients.</p>
          <Link href="/admin/clients">
            <Button data-testid="button-return-clients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Clients
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (clientError || (!clientLoading && !client)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Client context missing</h1>
          <p className="text-muted-foreground mb-4">Please return to Clients.</p>
          <Link href="/admin/clients">
            <Button data-testid="button-return-clients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Clients
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fileTypeLabel: Record<string, { label: string; color: string }> = {
    excel:      { label: "XLSX", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    word:       { label: "DOCX", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    pdf:        { label: "PDF",  color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    powerpoint: { label: "PPTX", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
    other:      { label: "FILE", color: "bg-muted text-muted-foreground" },
  };

  const processedCount = uploadedDocs.filter(d => d.status === "processed" && !d.processingError).length;
  const errorCount = uploadedDocs.filter(d => d.status === "error").length;

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* ── PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 mb-8">
        <Link href={`/admin/clients/${clientId}`}>
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Run Diagnostic</h1>
          {client && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.name} · {client.industry || "General"}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-8">

        {/* ── STEP 1: PROBLEM CONTEXT ─────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">01</span>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Problem Context</h2>
            </div>
          </div>

          <Card className="overflow-hidden shadow-sm border-border/80">
            <div className="p-6 space-y-7">

              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Analysis Title <span className="normal-case font-normal">(Optional)</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Q4 2024 Operations Review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2"
                  data-testid="input-analysis-title"
                />
              </div>

              {/* Problem Statement */}
              <div>
                <Label htmlFor="problemStatement" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Problem Statement <span className="text-destructive normal-case font-normal">*Required</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-2">
                  Describe the primary issues the organisation is facing. This anchors the diagnostic and determines which root causes are evaluated.
                </p>
                <Textarea
                  id="problemStatement"
                  placeholder="e.g., High staff turnover in production department, frequent machine breakdowns, rising material costs..."
                  value={problemStatement}
                  onChange={(e) => {
                    setProblemStatement(e.target.value);
                    if (showValidation && e.target.value.trim().length > 0) {
                      setShowValidation(false);
                    }
                  }}
                  className={showValidation && !isProblemStatementValid ? "border-destructive ring-1 ring-destructive" : ""}
                  rows={4}
                  data-testid="textarea-problem-statement"
                />
                {showValidation && !isProblemStatementValid && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5" data-testid="text-validation-error">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Problem Statement is required to run a diagnostic.
                  </p>
                )}
              </div>

              {/* Diagnostic Contexts */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Diagnostic Focus <span className="normal-case font-normal">(Optional)</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Narrow the diagnostic scope to specific operational areas.
                </p>
                <div className="flex flex-wrap gap-2">
                  {DIAGNOSTIC_CONTEXTS.map((context) => {
                    const isSelected = selectedContexts.includes(context);
                    return (
                      <button
                        key={context}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedContexts(selectedContexts.filter(c => c !== context));
                          } else {
                            setSelectedContexts([...selectedContexts, context]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm border font-medium transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`checkbox-context-${context.toLowerCase()}`}
                      >
                        {isSelected && <Check className="w-3 h-3 inline mr-1.5 -mt-0.5" />}
                        {context}
                      </button>
                    );
                  })}
                </div>
                {selectedContexts.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Focused on: {selectedContexts.join(", ")}
                  </p>
                )}
              </div>

              {/* Observed Symptoms */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Observed Symptoms <span className="normal-case font-normal">(Optional)</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Select symptoms you have observed — these boost alignment to matching root causes.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOM_TAGS.map((tag) => {
                    const isSelected = selectedSymptoms.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSymptoms(selectedSymptoms.filter(s => s !== tag));
                          } else {
                            setSelectedSymptoms([...selectedSymptoms, tag]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`symptom-${tag.toLowerCase()}`}
                      >
                        {SYMPTOM_LABELS[tag]}
                      </button>
                    );
                  })}
                </div>
                {selectedSymptoms.length > 0 && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {selectedSymptoms.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSymptoms([])}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

            </div>
          </Card>
        </div>

        {/* ── STEP 2: DOCUMENTS ───────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">02</span>
            <div className="flex items-center gap-2 flex-1">
              <UploadCloud className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Supporting Documents</h2>
            </div>
            {uploadedDocs.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {processedCount}/{uploadedDocs.length} ready · {selectedDocs.length} selected
              </span>
            )}
          </div>

          <Card className="overflow-hidden shadow-sm border-border/80">
            {uploadedDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <UploadCloud className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">No documents available</p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Upload Ops, Finance, Maintenance, or QC files from the Client Overview to enable evidence-enriched diagnostics.
                </p>
              </div>
            ) : (
              <div>
                {/* Summary bar */}
                <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-foreground">
                      {uploadedDocs.length} file{uploadedDocs.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> {processedCount} ready
                    </span>
                    {errorCount > 0 && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle className="w-3 h-3" /> {errorCount} failed
                        </span>
                      </>
                    )}
                    {selectedDocs.length > 0 && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-primary font-semibold">{selectedDocs.length} selected</span>
                      </>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs font-medium" onClick={selectAll} data-testid="button-select-all">
                    {selectedDocs.length === uploadedDocs.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                {/* File rows */}
                <div className="divide-y">
                  {uploadedDocs.map((doc) => {
                    const ftLabel = fileTypeLabel[doc.fileType] || fileTypeLabel.other;
                    const isSelected = selectedDocs.includes(doc.id);
                    const isProcessed = doc.status === "processed" && !doc.processingError;
                    const isLimited = doc.status === "processed" && !!doc.processingError;
                    const isError = doc.status === "error";
                    const isProcessing = doc.status === "processing" || doc.status === "uploaded";
                    return (
                      <div key={doc.id} className={isError || isLimited ? "border-l-2 border-l-amber-300 dark:border-l-amber-600" : ""}>
                        <div
                          onClick={() => toggleDoc(doc.id)}
                          className={`flex items-center gap-3.5 px-5 py-4 cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                          }`}
                          data-testid={`doc-select-${doc.id}`}
                        >
                          {/* Selection box */}
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? "bg-primary border-primary" : "border-border"
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>

                          {/* File type badge */}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${ftLabel.color}`}>
                            {ftLabel.label}
                          </span>

                          {/* File name */}
                          <span className="flex-1 text-sm truncate">{doc.fileName}</span>

                          {/* Status pill */}
                          {isProcessed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          )}
                          {isLimited && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800 shrink-0">
                              <AlertTriangle className="w-3 h-3" /> Limited
                            </span>
                          )}
                          {isError && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[11px] font-semibold border border-red-200 dark:border-red-800 shrink-0">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                          {isProcessing && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold border border-border shrink-0">
                              <Loader2 className="w-3 h-3 animate-spin" /> Processing
                            </span>
                          )}
                        </div>

                        {/* Error / partial message */}
                        {doc.processingError && (
                          <div className={`flex items-start gap-2 mx-5 mb-3 text-xs rounded-lg px-3 py-2.5 ${
                            isError
                              ? "text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400"
                              : "text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400"
                          }`}>
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <div>
                              <p>{isError ? "Extraction failed" : "Partial extraction"} — {doc.processingError}</p>
                              {isError && <p className="mt-0.5 opacity-70">This file can still be included — it may contribute partial signal data.</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── STEP 3: ANALYSIS MODE ───────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">03</span>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Analysis Mode</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Quick Analysis */}
            <button
              type="button"
              onClick={() => !hasDocumentsSelected && setSelectedMode("quick")}
              disabled={hasDocumentsSelected}
              className={`rounded-xl border-2 p-6 text-left transition-all ${
                effectiveMode === "quick"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : hasDocumentsSelected
                    ? "opacity-35 cursor-not-allowed border-border bg-muted/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/20 cursor-pointer"
              }`}
              data-testid="button-mode-quick"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  effectiveMode === "quick" ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Zap className="w-5 h-5" style={{ color: effectiveMode === "quick" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                </div>
                {effectiveMode === "quick" && (
                  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </span>
                )}
              </div>
              <p className="font-semibold text-base mb-1.5">Quick Analysis</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Fast pattern matching based on your problem statement and industry context. Ideal for initial scoping.
              </p>
              {hasDocumentsSelected && (
                <p className="text-[11px] text-muted-foreground/60 mt-3 italic">Not available when documents are selected</p>
              )}
            </button>

            {/* Deep Diagnostic */}
            <button
              type="button"
              onClick={() => setSelectedMode("deep")}
              className={`rounded-xl border-2 p-6 text-left transition-all relative ${
                effectiveMode === "deep"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-muted/5 hover:border-primary/50 hover:bg-muted/20 cursor-pointer"
              }`}
              data-testid="button-mode-deep"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  effectiveMode === "deep" ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Search className="w-5 h-5" style={{ color: effectiveMode === "deep" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide border border-primary/20">
                    Recommended
                  </span>
                  {effectiveMode === "deep" && (
                    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </span>
                  )}
                </div>
              </div>
              <p className="font-semibold text-base mb-1.5">Deep Diagnostic</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Evidence-driven analysis using document signals and observed symptoms. Produces substantiated, high-confidence root cause findings.
              </p>
            </button>
          </div>

          {hasDocumentsSelected && hasDocsStillProcessing && (
            <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <p className="text-sm">Documents are still processing. Please wait before running the diagnostic.</p>
            </div>
          )}
          {hasDocumentsSelected && !hasDocsStillProcessing && hasProcessedDocs && (
            <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" data-testid="text-documents-mode-notice">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p className="text-sm">Documents ready — Deep Diagnostic mode activated automatically.</p>
            </div>
          )}
        </div>

        {/* ── STEP 4: RUN DIAGNOSTIC ──────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">04</span>
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Run Diagnostic</h2>
            </div>
          </div>

          <Card className="overflow-hidden shadow-sm border-border/80" data-testid="card-diagnostic-mode">
            {/* Pre-flight summary — 3 status columns */}
            <div className="px-6 py-5 border-b bg-muted/20">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Mode</p>
                  <Badge
                    variant={diagnosticMode === "baseline" ? "secondary" : "default"}
                    className="text-xs px-2.5"
                    data-testid="badge-diagnostic-mode"
                  >
                    {diagnosticMode === "baseline" ? "Baseline" : "Deep Diagnostic"}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Documents</p>
                  <p className={`text-sm font-bold ${selectedDocs.length > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {selectedDocs.length > 0 ? `${selectedDocs.length} included` : "None selected"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Status</p>
                  {isProblemStatementValid && !(hasDocumentsSelected && hasDocsStillProcessing) ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Ready
                    </span>
                  ) : hasDocumentsSelected && hasDocsStillProcessing ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-bold">
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-bold">
                      <AlertTriangle className="w-4 h-4" /> Incomplete
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* CTA area */}
            <div className="px-6 pt-5 pb-6">
              {/* Pre-flight message */}
              <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 mb-5 text-sm ${
                !isProblemStatementValid
                  ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  : hasDocumentsSelected && hasDocsStillProcessing
                  ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  : diagnosticMode === "deep"
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted/40 border border-border text-muted-foreground"
              }`}>
                {!isProblemStatementValid ? (
                  <><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>Complete the Problem Statement in Step 1 to proceed.</span></>
                ) : hasDocumentsSelected && hasDocsStillProcessing ? (
                  <><Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" /><span>Waiting for documents to finish processing before running.</span></>
                ) : diagnosticMode === "deep" && selectedDocs.length > 0 ? (
                  <><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><span>{selectedDocs.length} document{selectedDocs.length !== 1 ? "s" : ""} included — Deep Diagnostic ready to run.</span></>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><span>Problem context set. Baseline analysis will use industry pattern matching.</span></>
                )}
              </div>

              <Button
                size="lg"
                className="w-full h-13 text-base font-bold"
                style={{ height: "3.25rem" }}
                onClick={handleRunAnalysis}
                disabled={createAndRunMutation.isPending || !isProblemStatementValid || (hasDocumentsSelected && hasDocsStillProcessing)}
                data-testid="button-run-analysis"
              >
                {createAndRunMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2.5 animate-spin" />
                    Running Diagnostic…
                  </>
                ) : (
                  <>
                    {effectiveMode === "quick" ? <Zap className="w-5 h-5 mr-2.5" /> : <Search className="w-5 h-5 mr-2.5" />}
                    Run {effectiveMode === "quick" ? "Quick Analysis" : "Deep Diagnostic"}
                    <ChevronRight className="w-4 h-4 ml-2 opacity-60" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
