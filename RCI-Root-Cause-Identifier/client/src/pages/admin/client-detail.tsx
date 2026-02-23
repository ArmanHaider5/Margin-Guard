import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Trash2
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

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const fileTypeIcons: Record<string, typeof FileSpreadsheet> = {
  excel: FileSpreadsheet,
  word: FileText,
  powerpoint: File,
  pdf: File,
  other: File,
};

const docStatusColors: Record<string, string> = {
  uploaded: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  processed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const docStatusLabels: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing\u2026",
  processed: "Processed",
  error: "Failed",
};

export default function ClientDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Client deletion is restricted to authorised roles for data hygiene.
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
    onSettled: () => {
      setIsDeleting(false);
    }
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (clientLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/clients">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold" data-testid="text-client-name">{client.name}</h1>
          <p className="text-muted-foreground text-sm">Client Overview</p>
        </div>
        <Button 
          onClick={() => navigate(`/clients/${id}/diagnostics/new`)}
          data-testid="button-run-diagnostic"
        >
          <Plus className="w-4 h-4 mr-2" />
          Run New Diagnostic
        </Button>
        
        {/* Client deletion is restricted to authorised roles for data hygiene. */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              className="text-destructive"
              data-testid="button-delete-client"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Client
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

      <Card className="p-6" data-testid="card-client-profile">
        <h2 className="text-lg font-medium mb-4">Client Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium" data-testid="text-profile-name">{client.name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Industry</p>
              <p className="font-medium" data-testid="text-profile-industry">
                {industryLabels[client.industry] || client.industry}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Programme</p>
              <p className="font-medium" data-testid="text-profile-programme">
                {client.programme || "Not assigned"}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <FileSearch className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge 
                variant={client.status === "active" ? "default" : "secondary"}
                data-testid="badge-profile-status"
              >
                {client.status === "active" ? "Active" : "Archived"}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6" data-testid="card-diagnostics">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Diagnostics</h2>
          <p className="text-sm text-muted-foreground">
            {analyses?.length || 0} diagnostic{analyses?.length !== 1 ? "s" : ""} on record
          </p>
        </div>

        {analysesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : analyses && analyses.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diagnostic Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Focus Area</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyses.map((analysis) => (
                <TableRow 
                  key={analysis.id} 
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate(`/admin/analyses/${analysis.id}`)}
                  data-testid={`row-diagnostic-${analysis.id}`}
                >
                  <TableCell className="font-medium" data-testid={`text-diagnostic-name-${analysis.id}`}>
                    {analysis.title}
                  </TableCell>
                  <TableCell data-testid={`text-diagnostic-date-${analysis.id}`}>
                    {formatDate(analysis.createdAt)}
                  </TableCell>
                  <TableCell data-testid={`text-diagnostic-focus-${analysis.id}`}>
                    <Badge variant="outline">
                      {analysis.analysisType === "quick" ? "Quick Analysis" : "Deep Analysis"}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`badge-diagnostic-status-${analysis.id}`}>
                    <Badge className={statusColors[analysis.status || "pending"]}>
                      {analysis.status === "completed" ? "Completed" : 
                       analysis.status === "running" ? "In Progress" :
                       analysis.status === "error" ? "Error" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-1">No diagnostics on record</p>
            <p className="text-sm">Run a diagnostic to identify root causes and generate recommendations.</p>
          </div>
        )}
      </Card>

      <Card className="p-6" data-testid="card-documents">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Documents</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {documents?.length || 0} document{documents?.length !== 1 ? "s" : ""}
            </p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReprocess}
                disabled={isReprocessing}
              >
                {isReprocessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileSearch className="w-4 h-4 mr-2" />
                )}
                Reprocess Documents
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-documents"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Documents
            </Button>
          </div>
        </div>

        {documentsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : documents && documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const Icon = fileTypeIcons[doc.fileType] || File;
                return (
                  <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                    <TableCell className="font-medium" data-testid={`text-document-name-${doc.id}`}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {doc.fileName}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-document-date-${doc.id}`}>
                      {formatDate(doc.uploadedAt)}
                    </TableCell>
                    <TableCell data-testid={`badge-document-status-${doc.id}`}>
                      <Badge className={docStatusColors[doc.status || "uploaded"]}>
                        {doc.status === "processing" && <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />}
                        {docStatusLabels[doc.status || "uploaded"]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-1">No documents uploaded</p>
            <p className="text-sm">Upload client documents to enable evidence-enriched diagnostics.</p>
          </div>
        )}
      </Card>

      <Card className="p-6" data-testid="card-cases">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Case Memory</h2>
          <p className="text-sm text-muted-foreground">
            {cases?.length || 0} saved case{cases?.length !== 1 ? "s" : ""}
          </p>
        </div>

        {casesError ? (
          <div className="text-center py-8 text-destructive" data-testid="text-cases-error">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-70" />
            <p className="font-medium mb-1">Failed to load cases</p>
            <p className="text-sm">{casesError instanceof Error ? casesError.message : "An error occurred while fetching cases."}</p>
          </div>
        ) : casesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : cases && cases.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Problem Statement</TableHead>
                <TableHead>Date Saved</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((caseItem) => (
                <TableRow 
                  key={caseItem.id} 
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate(`/admin/cases/${caseItem.id}`)}
                  data-testid={`row-case-${caseItem.id}`}
                >
                  <TableCell className="font-medium max-w-md truncate" data-testid={`text-case-problem-${caseItem.id}`}>
                    {caseItem.problemStatement}
                  </TableCell>
                  <TableCell data-testid={`text-case-date-${caseItem.id}`}>
                    {formatDate(caseItem.createdAt)}
                  </TableCell>
                  <TableCell data-testid={`badge-case-status-${caseItem.id}`}>
                    <Badge 
                      variant={caseItem.status === "finalised" ? "default" : "outline"}
                      className={caseItem.status === "finalised" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"}
                    >
                      {caseItem.status === "finalised" ? "Finalised" : "Draft"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-1">No saved cases</p>
            <p className="text-sm">Cases are automatically saved when a diagnostic runs.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
