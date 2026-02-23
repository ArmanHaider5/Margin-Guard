import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Zap, Search, FileSpreadsheet, FileText, File, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
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

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/admin/clients/${clientId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Start Analysis</h1>
          {client && <p className="text-muted-foreground">{client.name}</p>}
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="title">Analysis Title (Optional)</Label>
            <Input
              id="title"
              placeholder="e.g., Q4 2024 Operations Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-analysis-title"
            />
          </div>

          {/* Diagnostics must be anchored to an explicit problem statement. */}
          <div>
            <Label htmlFor="problemStatement" className="text-base font-medium">
              Problem Statement <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
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
              className={showValidation && !isProblemStatementValid ? "border-destructive" : ""}
              rows={4}
              data-testid="textarea-problem-statement"
            />
            {showValidation && !isProblemStatementValid && (
              <p className="text-sm text-destructive mt-1" data-testid="text-validation-error">
                Problem Statement is required to run a diagnostic.
              </p>
            )}
          </div>

          {/* Context selection narrows diagnostic scope and increases relevance. */}
          <div>
            <Label className="text-base font-medium">Diagnostic Context (Optional)</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select focus areas to narrow the diagnostic scope and increase relevance.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DIAGNOSTIC_CONTEXTS.map((context) => (
                <div 
                  key={context}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={`context-${context}`}
                    checked={selectedContexts.includes(context)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedContexts([...selectedContexts, context]);
                      } else {
                        setSelectedContexts(selectedContexts.filter(c => c !== context));
                      }
                    }}
                    data-testid={`checkbox-context-${context.toLowerCase()}`}
                  />
                  <Label 
                    htmlFor={`context-${context}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {context}
                  </Label>
                </div>
              ))}
            </div>
            {selectedContexts.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Focus: {selectedContexts.join(", ")}
              </p>
            )}
          </div>

          <div>
            <Label className="text-base font-medium">Observed Symptoms (Optional)</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select symptoms you have observed. This guides root cause alignment and prioritisation.
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
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                    data-testid={`symptom-${tag.toLowerCase()}`}
                  >
                    {SYMPTOM_LABELS[tag]}
                  </button>
                );
              })}
            </div>
            {selectedSymptoms.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <p className="text-sm text-muted-foreground">
                  {selectedSymptoms.length} symptom{selectedSymptoms.length > 1 ? "s" : ""} selected
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedSymptoms([])}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Select Documents (Optional)</Label>
              {uploadedDocs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={selectAll} data-testid="button-select-all">
                  {selectedDocs.length === uploadedDocs.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
            
            {uploadedDocs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <p>No documents uploaded</p>
                <p className="text-sm">Upload documents from Client Overview to enable evidence-enriched diagnostics</p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedDocs.map((doc) => {
                  const Icon = fileTypeIcons[doc.fileType] || File;
                  const isSelected = selectedDocs.includes(doc.id);
                  return (
                    <div key={doc.id}>
                      <div 
                        onClick={() => toggleDoc(doc.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "hover-elevate"
                        }`}
                        data-testid={`doc-select-${doc.id}`}
                      >
                        <Checkbox checked={isSelected} />
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <span className="flex-1 truncate">{doc.fileName}</span>
                        <Badge variant={doc.status === "processed" ? "secondary" : doc.status === "error" ? "destructive" : "outline"}>
                          {doc.status === "processing" ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing&hellip;</>
                          ) : doc.status === "processed" ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Processed</>
                          ) : doc.status === "error" ? (
                            <><AlertTriangle className="w-3 h-3 mr-1" /> Failed</>
                          ) : (
                            "Uploaded"
                          )}
                        </Badge>
                      </div>
                      {doc.status === "error" && doc.processingError && (
                        <div className="ml-8 mt-1 mb-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded px-2 py-1">
                          {doc.processingError}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Analysis Mode Selection */}
          <div>
            <Label className="text-base font-medium">Analysis Mode</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select the type of analysis to run.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => !hasDocumentsSelected && setSelectedMode("quick")}
                disabled={hasDocumentsSelected}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  effectiveMode === "quick" 
                    ? "border-primary bg-primary/5" 
                    : hasDocumentsSelected 
                      ? "opacity-50 cursor-not-allowed bg-muted/30"
                      : "hover-elevate cursor-pointer"
                }`}
                data-testid="button-mode-quick"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">Quick Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fast pattern matching based on problem statement and industry context.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode("deep")}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  effectiveMode === "deep" 
                    ? "border-primary bg-primary/5" 
                    : "hover-elevate cursor-pointer"
                }`}
                data-testid="button-mode-deep"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Search className="w-4 h-4" />
                  <span className="font-medium">Deep Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Comprehensive analysis with document evidence for substantiated findings.
                </p>
              </button>
            </div>
            {hasDocumentsSelected && hasDocsStillProcessing && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                Documents are still being processed. Please wait before running analysis.
              </p>
            )}
            {hasDocumentsSelected && !hasDocsStillProcessing && (
              <p className="text-sm text-primary mt-2 flex items-center gap-1" data-testid="text-documents-mode-notice">
                <CheckCircle2 className="w-4 h-4" />
                Documents processed — Deep Analysis will be used.
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg border bg-muted/30" data-testid="card-diagnostic-mode">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Diagnostic Mode:</span>
              <Badge variant={diagnosticMode === "baseline" ? "secondary" : "default"} data-testid="badge-diagnostic-mode">
                {diagnosticMode === "baseline" ? "Baseline (Preliminary)" : "Deep Diagnostic (Evidence-Enriched)"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {diagnosticMode === "baseline" 
                ? "Running without documents. Results based on industry patterns."
                : `Using document-derived signals and observed symptoms. ${selectedDocs.length} document(s) selected.`
              }
            </p>
          </div>

          <Button 
            size="lg" 
            className="w-full"
            onClick={handleRunAnalysis}
            disabled={createAndRunMutation.isPending || !isProblemStatementValid || (hasDocumentsSelected && hasDocsStillProcessing)}
            data-testid="button-run-analysis"
          >
            {createAndRunMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                {analysisType === "quick" ? <Zap className="w-4 h-4 mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Run {analysisType === "quick" ? "Quick" : "Deep"} Analysis
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
