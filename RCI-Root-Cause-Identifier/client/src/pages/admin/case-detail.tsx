/**
 * Case Detail Page
 * 
 * INSTITUTIONAL RULE: Case memory must always be client-owned.
 * This page fetches case data from the API (not local storage) to enforce client context.
 * Legacy entries without clientId are blocked and redirected to client selection.
 */
import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Pencil,
  Save,
  CheckCircle,
  Building2,
  Calendar,
  User,
  AlertTriangle,
  FileText,
  X,
  Download,
  Brain,
  CheckSquare,
  AlertOctagon,
  Zap,
  Shield,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { DiagnosticCase, RootCausePatternSnapshot } from "@shared/schema";

interface CaseWithLegacy extends DiagnosticCase {
  isLegacy?: boolean;
  legacyLabel?: string;
}

type CaseStatus = "draft" | "finalised";

const statusColors: Record<CaseStatus, { bg: string; text: string }> = {
  draft: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  finalised: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    consultantNotes: string;
    executiveSummary: string;
  }>({ consultantNotes: "", executiveSummary: "" });
  const [isExporting, setIsExporting] = useState(false);
  const qc = useQueryClient();

  // INSTITUTIONAL RULE: Fetch case from API to enforce client ownership
  const { data: diagnosticCase, isLoading, error } = useQuery<CaseWithLegacy>({
    queryKey: ["/api/admin/cases", id],
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { consultantNotes?: string; executiveSummary?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/cases/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/cases", id] });
      setIsEditing(false);
      toast({ title: "Saved", description: "Changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    },
  });

  const finaliseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/cases/${id}/finalise`);
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/cases", id] });
      toast({ title: "Finalised", description: "Case has been finalised." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to finalise case.", variant: "destructive" });
    },
  });

  const handleStartEdit = () => {
    if (!diagnosticCase) return;
    setEditData({
      consultantNotes: diagnosticCase.consultantNotes || "",
      executiveSummary: diagnosticCase.executiveSummary || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!id) return;
    updateMutation.mutate(editData);
  };

  const handleFinalise = () => {
    if (!id) return;
    finaliseMutation.mutate();
  };

  const handleExport = async () => {
    if (!diagnosticCase) return;
    setIsExporting(true);
    try {
      const response = await fetch("/api/admin/diagnostic-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientName: diagnosticCase.clientName,
          industry: diagnosticCase.industry,
          problemStatement: diagnosticCase.problemStatement,
          createdAt: diagnosticCase.createdAt,
          status: diagnosticCase.status,
          executiveSummary: diagnosticCase.executiveSummary,
          diagnosticOutputs: diagnosticCase.diagnosticOutputs,
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Diagnostic_Export_${diagnosticCase.clientName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Exported", description: "Diagnostic export downloaded." });
    } catch {
      toast({ title: "Error", description: "Failed to generate export.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!diagnosticCase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Case not found</p>
          <Link href="/admin/clients">
            <Button variant="outline">Go to Clients</Button>
          </Link>
        </div>
      </div>
    );
  }

  // INSTITUTIONAL RULE: Case memory must always be client-owned.
  // Legacy entries without clientId show redirect to client selection
  if (diagnosticCase.isLegacy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-lg">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
          <Badge variant="outline" className="mb-4 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            {diagnosticCase.legacyLabel || "Unlinked (Legacy)"}
          </Badge>
          <h2 className="text-lg font-semibold mb-2">Legacy Case</h2>
          <p className="text-muted-foreground mb-6">
            This case was created before client-ownership was enforced. Cases must now be accessed within a Client context.
          </p>
          <Link href="/admin/clients">
            <Button data-testid="button-go-to-clients">
              <Building2 className="w-4 h-4 mr-2" />
              Go to Clients
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const outputs = diagnosticCase.diagnosticOutputs as any;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* INSTITUTIONAL RULE: Case memory is client-owned - back navigates to client detail */}
            <div className="flex items-center gap-4">
              <Link href={diagnosticCase.clientId ? `/admin/clients/${diagnosticCase.clientId}` : "/admin/clients"}>
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold" data-testid="text-client-name">{diagnosticCase.clientName}</h1>
                  <Badge className={`${statusColors[diagnosticCase.status].bg} ${statusColors[diagnosticCase.status].text}`}>
                    {diagnosticCase.status === "finalised" ? "Finalised" : "Draft"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {diagnosticCase.industry}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {diagnosticCase.createdAt ? format(new Date(diagnosticCase.createdAt), "MMM d, yyyy") : "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleExport} 
                disabled={isExporting}
                data-testid="button-export"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>
              {diagnosticCase.status === "draft" ? (
                <>
                  {isEditing ? (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} data-testid="button-save">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleStartEdit} data-testid="button-edit">
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button data-testid="button-finalise">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Final
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mark Case as Final?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. Once finalised:
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>The case becomes read-only</li>
                                <li>No further edits can be made</li>
                                <li>Analysis cannot be rerun for this case</li>
                              </ul>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-finalise">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleFinalise} data-testid="button-confirm-finalise">
                              Mark as Final
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </>
              ) : (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Finalised - Read Only
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Problem Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" data-testid="text-problem-statement">{diagnosticCase.problemStatement}</p>
              </CardContent>
            </Card>

            {(diagnosticCase.executiveSummary || isEditing) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editData.executiveSummary}
                      onChange={(e) => setEditData((prev) => ({ ...prev, executiveSummary: e.target.value }))}
                      placeholder="Write executive summary..."
                      className="min-h-32"
                      data-testid="input-executive-summary"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-executive-summary">{diagnosticCase.executiveSummary}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {outputs?.rootCauses && outputs.rootCauses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Root Causes (4M Analysis)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {outputs.rootCauses.map((category: any) => (
                    <div key={category.id} className="space-y-2">
                      <h4 className="font-medium text-sm">{category.name}</h4>
                      <div className="space-y-2">
                        {category.causes?.map((cause: any) => (
                          <div key={cause.id} className="p-3 border rounded-md space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {cause.severity && (
                                <Badge variant={cause.severity === "high" ? "default" : cause.severity === "medium" ? "secondary" : "outline"} className="text-xs">
                                  {cause.severity.charAt(0).toUpperCase() + cause.severity.slice(1)} Severity
                                </Badge>
                              )}
                              {cause.intervention && (
                                <Badge variant="outline" className="text-xs">
                                  {cause.intervention === "consultant-required" ? "Consultant Required" : cause.intervention === "advisory" ? "Advisory" : "Self-fixable"}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-sm">
                              {cause.issue && <p><span className="font-medium">Issue:</span> {cause.issue}</p>}
                              {cause.impact && <p><span className="font-medium">Impact:</span> {cause.impact}</p>}
                              {cause.direction && <p><span className="font-medium">Direction:</span> {cause.direction}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {outputs?.recommendations && outputs.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {outputs.recommendations.map((layer: any) => (
                    <div key={layer.type} className="space-y-2">
                      <h4 className="font-medium text-sm capitalize">{layer.type} Actions</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {layer.recommendations?.map((rec: any) => (
                          <li key={rec.id}>{rec.text}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Case Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium">{diagnosticCase.clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Industry:</span>
                  <span className="font-medium">{diagnosticCase.industry}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {diagnosticCase.createdAt ? format(new Date(diagnosticCase.createdAt), "MMM d, yyyy HH:mm") : "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium">
                    {diagnosticCase.updatedAt ? format(new Date(diagnosticCase.updatedAt), "MMM d, yyyy HH:mm") : "N/A"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={`${statusColors[diagnosticCase.status].bg} ${statusColors[diagnosticCase.status].text}`}>
                    {diagnosticCase.status === "finalised" ? "Finalised" : "Draft"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Margin Guard Brain v2: Display attached root cause pattern snapshot */}
            {diagnosticCase.rootCauseSnapshot && (() => {
              const snap = diagnosticCase.rootCauseSnapshot as RootCausePatternSnapshot;
              return (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">Linked Root Cause Pattern</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground">Snapshot at time of diagnosis</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium" data-testid="text-pattern-name">
                        {snap.patternName}
                      </p>
                    </div>

                    {snap.validationChecklist?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <CheckSquare className="w-3 h-3" />
                          Validation Checklist
                        </div>
                        <ul className="space-y-1">
                          {snap.validationChecklist.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">&#8226;</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {snap.antiPatterns?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <AlertOctagon className="w-3 h-3" />
                          Anti-Patterns to Avoid
                        </div>
                        <ul className="space-y-1">
                          {snap.antiPatterns.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-destructive mt-0.5">&#8226;</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {snap.highLeverageFix && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Zap className="w-3 h-3" />
                          High-Leverage Fix
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {snap.highLeverageFix}
                        </p>
                      </div>
                    )}

                    {snap.preventionStrategy && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Shield className="w-3 h-3" />
                          Prevention Strategy
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {snap.preventionStrategy}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consultant Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editData.consultantNotes}
                    onChange={(e) => setEditData((prev) => ({ ...prev, consultantNotes: e.target.value }))}
                    placeholder="Add internal notes..."
                    className="min-h-32"
                    data-testid="input-consultant-notes"
                  />
                ) : diagnosticCase.consultantNotes ? (
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-consultant-notes">{diagnosticCase.consultantNotes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
