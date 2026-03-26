import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Building2,
  Briefcase,
  Calendar,
  AlertCircle,
  FileSearch,
  Plus,
  FolderOpen,
  Upload,
  FileSpreadsheet,
  FileText,
  File,
  Loader2,
  Trash2,
  ChevronRight,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
  Zap,
  Search,
  FileStack,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRef, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, ClientAnalysis, DiagnosticCase, ClientDocument } from "@shared/schema";

const industryLabels: Record<string, string> = {
  event_management: "Event Management",
  retail: "Retail",
  logistics: "Logistics",
  manufacturing: "Manufacturing",
  food_beverage: "Food & Beverage",
  construction: "Construction",
  healthcare: "Healthcare",
  education: "Education",
  hospitality: "Hospitality",
  agriculture: "Agriculture",
  automotive: "Automotive",
  textile: "Textile & Apparel",
  electronics: "Electronics",
  other: "Other",
};

const fileTypeIcons: Record<string, typeof FileSpreadsheet> = {
  excel: FileSpreadsheet,
  word: FileText,
  powerpoint: File,
  pdf: File,
  other: File,
};

const fileTypeLabel: Record<string, { label: string; color: string }> = {
  excel:      { label: "XLSX", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  word:       { label: "DOCX", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  pdf:        { label: "PDF",  color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  powerpoint: { label: "PPTX", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  other:      { label: "FILE", color: "bg-muted text-muted-foreground" },
};

const docStatusConfig: Record<string, { label: string; color: string; icon?: React.ComponentType<{ className?: string }> }> = {
  uploaded:   { label: "Uploaded",    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" },
  processing: { label: "Processing…", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800", icon: Loader2 },
  processed:  { label: "Processed",   color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800" },
  error:      { label: "Failed",      color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
};

const analysisStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
  pending:   { label: "Pending",     color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",   dot: "bg-amber-400" },
  running:   { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",         dot: "bg-blue-400" },
  completed: { label: "Completed",   color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
  error:     { label: "Error",       color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",               dot: "bg-red-500" },
};

export default function ClientDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      return await apiRequest("DELETE", `/api/admin/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Client deleted" });
      navigate("/admin/clients");
    },
    onError: (error) => {
      toast({ 
        title: "Deletion failed", 
        description: error instanceof Error ? error.message : "Failed to delete client",
        variant: "destructive" 
      });
    },
    onSettled: () => { setIsDeleting(false); }
  });

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["/api/admin/clients", id],
  });

  const { data: analyses, isLoading: analysesLoading } = useQuery<ClientAnalysis[]>({
    queryKey: ["/api/admin/clients", id, "analyses"],
  });

  const { data: cases, isLoading: casesLoading, error: casesError } = useQuery<DiagnosticCase[]>({
    queryKey: ["/api/admin/clients", id, "cases"],
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<ClientDocument[]>({
    queryKey: ["/api/admin/clients", id, "documents"],
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (docs?.some(d => d.status === "uploaded" || d.status === "processing")) return 2000;
      return false;
    },
  });

  const [isReprocessing, setIsReprocessing] = useState(false);
  const handleReprocess = async () => {
    if (!id) return;
    setIsReprocessing(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}/documents/reprocess`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Reprocess failed");
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", id, "documents"] });
      toast({ title: "Reprocessing", description: data.message });
    } catch (error) {
      toast({ title: "Reprocess failed", description: error instanceof Error ? error.message : "Error", variant: "destructive" });
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !id) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const response = await fetch(`/api/admin/clients/${id}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", id, "documents"] });
      toast({ title: "Upload successful", description: `${files.length} file(s) uploaded.` });
    } catch (error) {
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-MY", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  const formatDateShort = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-MY", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  if (clientLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Client not found</h2>
          <p className="text-muted-foreground mb-4">The requested client could not be located.</p>
          <Link href="/admin/clients">
            <Button variant="outline" data-testid="button-back-to-clients">Return to Clients</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const completedCount = analyses?.filter(a => a.status === "completed").length ?? 0;
  const lastAnalysis = analyses && analyses.length > 0
    ? analyses.reduce((latest, a) => new Date(a.createdAt) > new Date(latest.createdAt) ? a : latest)
    : null;
  const docCount = documents?.length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ── WORKSPACE HEADER ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Link href="/admin/clients">
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">All Clients</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight" data-testid="text-client-name">
                {client.name}
              </h1>
              <Badge
                variant={client.status === "active" ? "default" : "secondary"}
                className="text-xs px-2.5 py-0.5"
                data-testid="badge-profile-status"
              >
                {client.status === "active" ? "Active" : "Archived"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5" />
                {industryLabels[client.industry] || client.industry}
              </span>
              {client.programme && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-sm text-muted-foreground">{client.programme}</span>
                </>
              )}
              <span className="text-muted-foreground/30">·</span>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Activity className="w-3.5 h-3.5" />
                {analyses?.length ?? 0} diagnostic{analyses?.length !== 1 ? "s" : ""}
              </span>
              {docCount > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileStack className="w-3.5 h-3.5" />
                    {docCount} document{docCount !== 1 ? "s" : ""}
                  </span>
                </>
              )}
              {lastAnalysis && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    Last run {formatDateShort(lastAnalysis.createdAt)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Primary + Destructive actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="lg"
              className="font-semibold px-5"
              onClick={() => navigate(`/clients/${id}/diagnostics/new`)}
              data-testid="button-run-diagnostic"
            >
              <Plus className="w-4 h-4 mr-2" />
              Run New Diagnostic
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  data-testid="button-delete-client"
                  disabled={isDeleting}
                  title="Delete client"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="dialog-delete-client">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Client</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the client, diagnostics, and documents.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteClientMutation.mutate()}
                    className="bg-destructive text-destructive-foreground"
                    data-testid="button-confirm-delete"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* ── CLIENT PROFILE CARD ───────────────────────────────────── */}
      <Card className="overflow-hidden shadow-sm border-border/80" data-testid="card-client-profile">
        <div className="px-6 py-4 border-b bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Client Profile</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Name</p>
                <p className="text-sm font-semibold text-foreground leading-snug" data-testid="text-profile-name">{client.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Industry</p>
                <p className="text-sm font-semibold text-foreground leading-snug" data-testid="text-profile-industry">
                  {industryLabels[client.industry] || client.industry}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Programme</p>
                <p className="text-sm font-semibold text-foreground leading-snug" data-testid="text-profile-programme">
                  {client.programme || "Not assigned"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileSearch className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                <Badge
                  variant={client.status === "active" ? "default" : "secondary"}
                  className="text-xs"
                  data-testid="badge-profile-status-card"
                >
                  {client.status === "active" ? "Active" : "Archived"}
                </Badge>
              </div>
            </div>

          </div>
        </div>
      </Card>

      {/* ── DIAGNOSTICS LIST ─────────────────────────────────────── */}
      <Card className="overflow-hidden shadow-sm border-border/80" data-testid="card-diagnostics">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Diagnostics</p>
            {!analysesLoading && (
              <p className="text-sm font-semibold text-foreground">
                {analyses?.length ?? 0} on record
                {completedCount > 0 && (
                  <span className="font-normal text-muted-foreground"> · {completedCount} completed</span>
                )}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="font-medium"
            onClick={() => navigate(`/clients/${id}/diagnostics/new`)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Diagnostic
          </Button>
        </div>

        {analysesLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : analyses && analyses.length > 0 ? (
          <div className="divide-y">
            {analyses.map((analysis, idx) => {
              const sc = analysisStatusConfig[analysis.status || "pending"] ?? analysisStatusConfig.pending;
              const isDeep = analysis.analysisType !== "quick";
              return (
                <div
                  key={analysis.id}
                  onClick={() => navigate(`/admin/analyses/${analysis.id}`)}
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors group"
                  data-testid={`row-diagnostic-${analysis.id}`}
                >
                  {/* Index number */}
                  <span className="text-[11px] font-bold text-muted-foreground/50 w-5 shrink-0 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  {/* Icon box */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    analysis.status === "completed"
                      ? "bg-emerald-50 dark:bg-emerald-900/20"
                      : analysis.status === "error"
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-muted"
                  }`}>
                    {isDeep
                      ? <Search className={`w-4 h-4 ${analysis.status === "completed" ? "text-emerald-600" : "text-muted-foreground"}`} />
                      : <Zap className={`w-4 h-4 ${analysis.status === "completed" ? "text-emerald-600" : "text-muted-foreground"}`} />
                    }
                  </div>

                  {/* Name + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight" data-testid={`text-diagnostic-name-${analysis.id}`}>
                      {analysis.title || "Untitled Diagnostic"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-diagnostic-date-${analysis.id}`}>
                      {formatDate(analysis.createdAt)}
                    </p>
                  </div>

                  {/* Type badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium shrink-0 ${
                    isDeep
                      ? "bg-primary/5 text-primary border-primary/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`} data-testid={`text-diagnostic-focus-${analysis.id}`}>
                    {isDeep ? <Search className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                    {isDeep ? "Deep" : "Quick"}
                  </span>

                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0 ${sc.color}`}
                    data-testid={`badge-diagnostic-status-${analysis.id}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <FileSearch className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No diagnostics on record</p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed mb-5">
              Run a diagnostic to identify root causes and generate evidence-backed recommendations.
            </p>
            <Button
              size="sm"
              onClick={() => navigate(`/clients/${id}/diagnostics/new`)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Run First Diagnostic
            </Button>
          </div>
        )}
      </Card>

      {/* ── DOCUMENTS SECTION ────────────────────────────────────── */}
      <Card className="overflow-hidden shadow-sm border-border/80" data-testid="card-documents">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Documents</p>
            {!documentsLoading && (
              <p className="text-sm font-semibold text-foreground">
                {docCount} file{docCount !== 1 ? "s" : ""}
                {docCount > 0 && (
                  <span className="font-normal text-muted-foreground">
                    {" "}· {documents?.filter(d => d.status === "processed").length ?? 0} processed
                    {(documents?.filter(d => d.status === "error").length ?? 0) > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {" "}· {documents?.filter(d => d.status === "error").length} failed
                      </span>
                    )}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".xlsx,.xls,.doc,.docx,.ppt,.pptx,.pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              data-testid="input-file-upload"
            />
            {documents && documents.length > 0 && documents.some(d => d.status === "error" || d.status === "uploaded") && (
              <Button variant="ghost" size="sm" onClick={handleReprocess} disabled={isReprocessing}>
                {isReprocessing ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <FileSearch className="w-4 h-4 mr-1.5" />
                )}
                Reprocess
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="font-medium"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-documents"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1.5" />
              )}
              Upload
            </Button>
          </div>
        </div>

        {documentsLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="divide-y">
            {documents.map((doc) => {
              const ftLabel = fileTypeLabel[doc.fileType] || fileTypeLabel.other;
              const sc = docStatusConfig[doc.status || "uploaded"] ?? docStatusConfig.uploaded;
              const StatusIcon = sc.icon;
              const isError = doc.status === "error";
              return (
                <div
                  key={doc.id}
                  className={`flex items-center gap-3.5 px-6 py-4 ${isError ? "border-l-2 border-l-amber-300 dark:border-l-amber-600" : ""}`}
                  data-testid={`row-document-${doc.id}`}
                >
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${ftLabel.color}`}>
                    {ftLabel.label}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate text-foreground" data-testid={`text-document-name-${doc.id}`}>
                    {doc.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block" data-testid={`text-document-date-${doc.id}`}>
                    {formatDate(doc.uploadedAt)}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0 ${sc.color}`}
                    data-testid={`badge-document-status-${doc.id}`}>
                    {StatusIcon && <StatusIcon className={`w-3 h-3 ${doc.status === "processing" ? "animate-spin" : ""}`} />}
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No documents uploaded</p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed mb-5">
              Upload client documents (Excel, Word, PDF) to enable evidence-enriched deep diagnostics.
            </p>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload Documents
            </Button>
          </div>
        )}
      </Card>

      {/* ── CASE MEMORY ──────────────────────────────────────────── */}
      <Card className="overflow-hidden shadow-sm border-border/80" data-testid="card-cases">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Case Memory</p>
            {!casesLoading && !casesError && (
              <p className="text-sm font-semibold text-foreground">
                {cases?.length ?? 0} saved case{cases?.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {casesError ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-destructive" data-testid="text-cases-error">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-70" />
            <p className="text-sm font-semibold mb-1">Failed to load cases</p>
            <p className="text-xs opacity-70">{casesError instanceof Error ? casesError.message : "An error occurred while fetching cases."}</p>
          </div>
        ) : casesLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : cases && cases.length > 0 ? (
          <div className="divide-y">
            {cases.map((caseItem, idx) => {
              const isFinalised = caseItem.status === "finalised";
              return (
                <div
                  key={caseItem.id}
                  onClick={() => navigate(`/admin/cases/${caseItem.id}`)}
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors group"
                  data-testid={`row-case-${caseItem.id}`}
                >
                  <span className="text-[11px] font-bold text-muted-foreground/50 w-5 shrink-0 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isFinalised ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-muted"
                  }`}>
                    {isFinalised
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      : <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight" data-testid={`text-case-problem-${caseItem.id}`}>
                      {caseItem.problemStatement}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-case-date-${caseItem.id}`}>
                      {formatDate(caseItem.createdAt)}
                    </p>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0 ${
                    isFinalised
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                  }`} data-testid={`badge-case-status-${caseItem.id}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isFinalised ? "bg-emerald-500" : "bg-amber-400"}`} />
                    {isFinalised ? "Finalised" : "Draft"}
                  </span>

                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No saved cases</p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Cases are automatically saved when a diagnostic runs.
            </p>
          </div>
        )}
      </Card>

    </div>
  );
}
