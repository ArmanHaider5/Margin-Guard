import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  File,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Tag,
  Calendar,
  Hash,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientDocument } from "@shared/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValidationCheck {
  name:   string;
  status: "PASS" | "WARNING" | "FAIL";
  score:  number;
  detail: string;
  data:   Record<string, any>;
}

interface CilValidationReport {
  documentId:   string;
  fileName:     string;
  documentType: string;
  healthScore:  number;
  status:       "PASS" | "WARNING" | "FAIL";
  issues:       string[];
  summary:      string;
  checks:       ValidationCheck[];
  stats:        Record<string, any>;
  samples:      any[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fileTypeLabel: Record<string, { label: string; color: string }> = {
  excel:      { label: "XLSX", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  word:       { label: "DOCX", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  pdf:        { label: "PDF",  color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  powerpoint: { label: "PPTX", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  other:      { label: "FILE", color: "bg-muted text-muted-foreground" },
};

const docStatusConfig: Record<string, { label: string; color: string }> = {
  uploaded:   { label: "Uploaded",   color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" },
  processing: { label: "Processing", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" },
  processed:  { label: "Processed",  color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800" },
  error:      { label: "Failed",     color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
};

const healthColor = (score: number) => {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
};

const healthBg = (score: number) => {
  if (score >= 80) return "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800";
  if (score >= 50) return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
  return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
};

const StatusIcon = ({ status, className }: { status: "PASS" | "WARNING" | "FAIL"; className?: string }) => {
  if (status === "PASS")    return <CheckCircle2 className={className ?? "w-4 h-4 text-emerald-500"} />;
  if (status === "WARNING") return <AlertTriangle className={className ?? "w-4 h-4 text-amber-500"} />;
  return <XCircle className={className ?? "w-4 h-4 text-red-500"} />;
};

const checkStatusColor: Record<string, string> = {
  PASS:    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
  WARNING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
  FAIL:    "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
};

const overallIcon = (status: "PASS" | "WARNING" | "FAIL") => {
  if (status === "PASS")    return <ShieldCheck className="w-8 h-8 text-emerald-500" />;
  if (status === "WARNING") return <ShieldAlert className="w-8 h-8 text-amber-500" />;
  return <ShieldX className="w-8 h-8 text-red-500" />;
};

function formatDate(date: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" });
}

function docClassLabel(cls: string) {
  const map: Record<string, string> = {
    movement_log:        "Movement Log",
    inventory_record:    "Inventory Record",
    sales_sheet:         "Sales Sheet",
    invoice:             "Invoice",
    quotation:           "Quotation",
    logistics_schedule:  "Logistics Schedule",
    loss_record:         "Loss Record",
    unknown:             "Unknown",
  };
  return map[cls] ?? cls;
}

// ── Sample transaction row ────────────────────────────────────────────────────

function SampleRow({ tx }: { tx: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground w-20 shrink-0">
          {tx.transactionType ?? "—"}
        </span>
        <span className="flex-1 text-sm font-medium text-foreground truncate">
          {tx.entityName ?? <span className="text-muted-foreground italic">no entity name</span>}
        </span>
        {tx.quantity !== null && tx.quantity !== undefined && (
          <span className="text-xs text-muted-foreground shrink-0">qty: {tx.quantity}</span>
        )}
        {tx.value !== null && tx.value !== undefined && (
          <span className="text-xs text-muted-foreground shrink-0 ml-3">RM {Number(tx.value).toLocaleString()}</span>
        )}
        {tx.date && (
          <span className="text-xs text-muted-foreground shrink-0 ml-3 hidden sm:block">{tx.date}</span>
        )}
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && tx.debugTrace && (
        <div className="px-4 pb-4 pt-1 border-t bg-muted/20 space-y-3">
          {tx.debugTrace.originalRow && Object.keys(tx.debugTrace.originalRow).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Original Row</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(tx.debugTrace.originalRow).map(([k, v]) => (
                  <div key={k} className="flex gap-1.5 text-xs">
                    <span className="text-muted-foreground shrink-0">{k}:</span>
                    <span className="font-medium text-foreground truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tx.debugTrace.mappedFields && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Mapped Fields</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(tx.debugTrace.mappedFields).map(([k, v]) => (
                  <div key={k} className="flex gap-1.5 text-xs">
                    <span className="text-muted-foreground shrink-0">{k}:</span>
                    <span className="font-medium text-foreground">{v === null || v === undefined ? <span className="italic text-muted-foreground">null</span> : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tx.referenceId && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">ref:</span> {tx.referenceId}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DocumentDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [validationResult, setValidationResult] = useState<CilValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const { data: doc, isLoading } = useQuery<ClientDocument>({
    queryKey: ["/api/admin/documents", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/documents/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load document");
      return res.json();
    },
  });

  const handleValidate = async () => {
    if (!id) return;
    setIsValidating(true);
    try {
      const res = await fetch(`/api/admin/documents/${id}/cil-validate`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Validation failed");
      setValidationResult(data);
    } catch (err) {
      toast({
        title: "Validation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleReprocess = async () => {
    if (!id) return;
    setIsReprocessing(true);
    try {
      const res = await fetch(`/api/admin/documents/${id}/cil-reprocess`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reprocess failed");
      setValidationResult(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents", id] });
      toast({
        title: "Reprocessed",
        description: `${data.storedTxCount ?? 0} transactions stored from ${data.totalRows ?? 0} rows.`,
      });
    } catch (err) {
      toast({
        title: "Reprocess failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Document not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1 as any)}>Go back</Button>
        </Card>
      </div>
    );
  }

  const ftLabel = fileTypeLabel[doc.fileType] ?? fileTypeLabel.other;
  const sc = docStatusConfig[doc.status ?? "uploaded"] ?? docStatusConfig.uploaded;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">

      {/* ── Back + Title ──────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate(-1 as any)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-bold ${ftLabel.color}`}>
            {ftLabel.label}
          </span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{doc.fileName}</h1>
        </div>
      </div>

      {/* ── Document Info Card ────────────────────────────────────────── */}
      <Card className="overflow-hidden shadow-sm border-border/80">
        <div className="px-6 py-4 border-b bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Document Info</p>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${sc.color}`}>
              {sc.label}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">File Type</p>
            <p className="text-sm font-semibold text-foreground">{ftLabel.label}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Uploaded</p>
            <p className="text-sm font-semibold text-foreground">{formatDate(doc.uploadedAt)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Processed</p>
            <p className="text-sm font-semibold text-foreground">{formatDate(doc.processedAt ?? null)}</p>
          </div>
        </div>
        {doc.processingError && (
          <div className="px-6 pb-4">
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">{doc.processingError}</p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleValidate}
          disabled={isValidating || doc.status !== "processed"}
          className="font-semibold"
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4 mr-2" />
          )}
          {isValidating ? "Validating…" : "Run Validation"}
        </Button>
        <Button
          variant="outline"
          onClick={handleReprocess}
          disabled={isReprocessing}
        >
          {isReprocessing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {isReprocessing ? "Reprocessing…" : "Reprocess"}
        </Button>
        {doc.status !== "processed" && (
          <p className="text-xs text-muted-foreground">
            Validation requires the document to be processed first.
          </p>
        )}
      </div>

      {/* ── Validation Report ─────────────────────────────────────────── */}
      {validationResult && (
        <div className="space-y-4">

          {/* Hero — Health Score + Status */}
          <Card className={`overflow-hidden shadow-sm border ${healthBg(validationResult.healthScore)}`}>
            <div className="px-6 py-5 flex items-center gap-5">
              {overallIcon(validationResult.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <span className={`text-4xl font-black tabular-nums ${healthColor(validationResult.healthScore)}`}>
                    {validationResult.healthScore}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">/ 100</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${checkStatusColor[validationResult.status]}`}>
                    <StatusIcon status={validationResult.status} className="w-3 h-3" />
                    {validationResult.status}
                  </span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted border">
                    {docClassLabel(validationResult.documentType)}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{validationResult.summary}</p>
              </div>
            </div>
          </Card>

          {/* Issues */}
          {validationResult.issues.length > 0 && (
            <Card className="overflow-hidden shadow-sm border-border/80">
              <div className="px-6 py-4 border-b bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Issues ({validationResult.issues.length})
                </p>
              </div>
              <div className="px-6 py-4 space-y-2">
                {validationResult.issues.map((issue, i) => {
                  const isWarn = issue.startsWith("[WARNING]");
                  const isFail = issue.startsWith("[FAIL]");
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-sm ${
                        isFail  ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300" :
                        isWarn  ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300" :
                                  "bg-muted border-border text-foreground"
                      }`}
                    >
                      {isFail  ? <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> :
                       isWarn  ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> :
                                 <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                      <span>{issue.replace(/^\[(WARNING|FAIL|PASS)\]\s*/, "")}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Individual Checks */}
          <Card className="overflow-hidden shadow-sm border-border/80">
            <div className="px-6 py-4 border-b bg-muted/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Check Results</p>
            </div>
            <div className="divide-y">
              {validationResult.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-4">
                  <StatusIcon status={check.status} className={`w-4 h-4 shrink-0 mt-0.5 ${
                    check.status === "PASS"    ? "text-emerald-500" :
                    check.status === "WARNING" ? "text-amber-500"   : "text-red-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-foreground">{check.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${checkStatusColor[check.status]}`}>
                        {check.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{check.detail}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${
                    check.score === 20 ? "text-emerald-600 dark:text-emerald-400" :
                    check.score === 10 ? "text-amber-500 dark:text-amber-400"     : "text-red-500 dark:text-red-400"
                  }`}>
                    {check.score}/20
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Stats */}
          {validationResult.stats && (
            <Card className="overflow-hidden shadow-sm border-border/80">
              <div className="px-6 py-4 border-b bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stats</p>
              </div>
              <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Rows</p>
                  <p className="text-2xl font-black text-foreground tabular-nums">{validationResult.stats.totalRows ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Transactions</p>
                  <p className="text-2xl font-black text-foreground tabular-nums">{validationResult.stats.totalTransactions ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Avg Tx / Row</p>
                  <p className="text-2xl font-black text-foreground tabular-nums">{validationResult.stats.avgTxPerRow ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Column Coverage</p>
                  <p className="text-2xl font-black text-foreground tabular-nums">{validationResult.stats.mapCoverage ?? "—"}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ref ID Coverage</p>
                  <p className="text-2xl font-black text-foreground tabular-nums">{validationResult.stats.refPct ?? "—"}%</p>
                </div>
                {validationResult.stats.typeDistribution && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Tx Types</p>
                    <div className="space-y-1">
                      {Object.entries(validationResult.stats.typeDistribution as Record<string, number>)
                        .filter(([, v]) => v > 0)
                        .map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground capitalize">{k}:</span>
                            <span className="font-semibold text-foreground">{v}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Sample Transactions */}
          {validationResult.samples && validationResult.samples.length > 0 && (
            <Card className="overflow-hidden shadow-sm border-border/80">
              <div className="px-6 py-4 border-b bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Sample Transactions ({validationResult.samples.length}) — click to inspect debug trace
                </p>
              </div>
              <div className="px-6 py-4 space-y-2">
                {validationResult.samples.map((tx, i) => (
                  <SampleRow key={tx.id ?? i} tx={tx} />
                ))}
              </div>
            </Card>
          )}

          {/* No issues */}
          {validationResult.issues.length === 0 && validationResult.status === "PASS" && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">All checks passed. Document parsing quality is good.</p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
