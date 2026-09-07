import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Edit3, 
  Eye,
  Download,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2
} from "lucide-react";
import type { 
  ExecutiveSummaryData, 
  InterventionAssessmentData, 
  ConsultingScopeData,
  EvidenceTraceabilityData,
  RCICoverPage,
  ExportType
} from "@shared/export-types";

interface ExportPreviewProps {
  exportType: ExportType;
  coverPage: RCICoverPage;
  executiveSummary?: ExecutiveSummaryData;
  interventionAssessment?: InterventionAssessmentData;
  consultingScope?: ConsultingScopeData;
  evidenceTraceability?: EvidenceTraceabilityData;
  interventionRequired?: boolean;
  includeAppendix?: boolean;
  onCoverPageChange?: (data: RCICoverPage) => void;
  onExecutiveSummaryChange?: (data: ExecutiveSummaryData) => void;
  onConsultingScopeChange?: (data: ConsultingScopeData) => void;
  onExport?: () => void;
}

interface EditableFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  multiline?: boolean;
  editable?: boolean;
}

function EditableField({ label, value, onChange, multiline = false, editable = false }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onChange?.(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!editable) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {multiline ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
        ) : (
          <p className="text-sm">{value}</p>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {multiline ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[100px] text-sm"
            data-testid={`input-${label.toLowerCase().replace(/\s/g, "-")}`}
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="text-sm"
            data-testid={`input-${label.toLowerCase().replace(/\s/g, "-")}`}
          />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} data-testid="button-save-field">Save</Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 group">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
          data-testid={`button-edit-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <Edit3 className="w-3 h-3 mr-1" />
          Edit
        </Button>
      </div>
      {multiline ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-sm">{value}</p>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  sectionNumber?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function PreviewSection({ title, sectionNumber, children, defaultExpanded = true }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-md">
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover-elevate"
        onClick={() => setExpanded(!expanded)}
        data-testid={`section-${title.toLowerCase().replace(/\s/g, "-")}`}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <div className="flex items-center gap-2">
          {sectionNumber && (
            <Badge variant="outline" className="text-xs font-mono">
              {sectionNumber}
            </Badge>
          )}
          <span className="font-medium">{title}</span>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <Separator className="mb-4" />
          {children}
        </div>
      )}
    </div>
  );
}

export function ExportPreview({
  exportType,
  coverPage,
  executiveSummary,
  interventionAssessment,
  consultingScope,
  evidenceTraceability,
  interventionRequired = false,
  includeAppendix = false,
  onCoverPageChange,
  onExecutiveSummaryChange,
  onConsultingScopeChange,
  onExport,
}: ExportPreviewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportTypeLabels: Record<ExportType, string> = {
    executive_diagnostic_summary: "Executive Diagnostic Summary",
    consulting_proposal_pack: "Consulting Proposal Pack",
    diagnostic_appendix: "Diagnostic Appendix",
  };

  const getSeverityLabel = (level: string) => {
    const labels: Record<string, string> = {
      low: "Low",
      medium: "Moderate",
      high: "Significant",
    };
    return labels[level] || level;
  };

  const getCapabilityLabel = (level: string) => {
    const labels: Record<string, string> = {
      low: "Limited internal capacity",
      medium: "Partial internal capacity",
      high: "Strong internal capacity",
    };
    return labels[level] || level;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/admin/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType,
          coverPage,
          executiveSummary,
          interventionAssessment,
          consultingScope,
          evidenceTraceability,
          interventionRequired,
          includeAppendix,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${coverPage.engagementTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${coverPage.clientName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Complete",
        description: "PDF has been downloaded successfully.",
      });

      onExport?.();
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg font-semibold">Export Preview</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {exportTypeLabels[exportType]} — Review before export
              </p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={isExporting} data-testid="button-confirm-export">
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isExporting ? "Generating..." : "Confirm & Export"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm">
          <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">
            Editable fields are marked with an edit button on hover. All changes apply to this export only.
          </span>
        </div>

        <PreviewSection title="Cover Page" sectionNumber="0">
          <div className="space-y-4">
            <EditableField
              label="Client Name"
              value={coverPage.clientName}
              editable={!!onCoverPageChange}
              onChange={(val) => onCoverPageChange?.({ ...coverPage, clientName: val })}
            />
            <EditableField
              label="Engagement Title"
              value={coverPage.engagementTitle}
              editable={!!onCoverPageChange}
              onChange={(val) => onCoverPageChange?.({ ...coverPage, engagementTitle: val })}
            />
            {coverPage.engagementSubtitle && (
              <EditableField
                label="Engagement Subtitle"
                value={coverPage.engagementSubtitle}
                editable={!!onCoverPageChange}
                onChange={(val) => onCoverPageChange?.({ ...coverPage, engagementSubtitle: val })}
              />
            )}
            <EditableField
              label="Assessment Date"
              value={coverPage.assessmentDate}
            />
            <EditableField
              label="Prepared By"
              value={coverPage.preparedBy.firmName}
            />
            <EditableField
              label="Confidentiality Notice"
              value={coverPage.confidentialityNotice}
              multiline
            />
          </div>
        </PreviewSection>

        {executiveSummary && (
          <PreviewSection title="Executive Summary" sectionNumber="1">
            <div className="space-y-4">
              <EditableField
                label="Situation Overview"
                value={executiveSummary.situationOverview}
                multiline
                editable={!!onExecutiveSummaryChange}
                onChange={(val) => onExecutiveSummaryChange?.({ ...executiveSummary, situationOverview: val })}
              />
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Findings</p>
                <ul className="space-y-1">
                  {executiveSummary.keyFindings.map((finding, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <EditableField
                label="Business Impact"
                value={executiveSummary.businessImpact}
                multiline
                editable={!!onExecutiveSummaryChange}
                onChange={(val) => onExecutiveSummaryChange?.({ ...executiveSummary, businessImpact: val })}
              />

              <EditableField
                label="Recommended Direction"
                value={executiveSummary.recommendedDirection}
                multiline
                editable={!!onExecutiveSummaryChange}
                onChange={(val) => onExecutiveSummaryChange?.({ ...executiveSummary, recommendedDirection: val })}
              />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Step Options</p>
                <ul className="space-y-1">
                  {executiveSummary.nextStepOptions.map((option, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <span>{option}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </PreviewSection>
        )}

        {interventionAssessment && (exportType === "consulting_proposal_pack") && (
          <PreviewSection title="Intervention Assessment" sectionNumber="2">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issue Severity</p>
                  <p className="text-sm font-medium">{getSeverityLabel(interventionAssessment.severity)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Impact</p>
                  <p className="text-sm font-medium">{getSeverityLabel(interventionAssessment.businessImpact)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Internal Capability</p>
                  <p className="text-sm font-medium">{getCapabilityLabel(interventionAssessment.clientCapability)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assessment Summary</p>
                <p className="text-sm">
                  {interventionRequired 
                    ? "Based on the assessment criteria, structured professional support is recommended to address the identified issues effectively."
                    : "The organization may address identified issues through internal resources with periodic advisory support."}
                </p>
              </div>
            </div>
          </PreviewSection>
        )}

        {consultingScope && interventionRequired && (exportType === "consulting_proposal_pack") && (
          <PreviewSection title="Consulting Scope" sectionNumber="3">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium">Phase 1: Diagnostic Validation</p>
                <div className="pl-4 space-y-2 border-l-2 border-muted">
                  <EditableField
                    label="Objectives"
                    value={consultingScope.phase1.objectives}
                    multiline
                    editable={!!onConsultingScopeChange}
                    onChange={(val) => onConsultingScopeChange?.({ 
                      ...consultingScope, 
                      phase1: { ...consultingScope.phase1, objectives: val }
                    })}
                  />
                  <EditableField
                    label="Activities"
                    value={consultingScope.phase1.activities}
                    multiline
                    editable={!!onConsultingScopeChange}
                    onChange={(val) => onConsultingScopeChange?.({ 
                      ...consultingScope, 
                      phase1: { ...consultingScope.phase1, activities: val }
                    })}
                  />
                  <EditableField
                    label="Outputs"
                    value={consultingScope.phase1.outputs}
                    multiline
                    editable={!!onConsultingScopeChange}
                    onChange={(val) => onConsultingScopeChange?.({ 
                      ...consultingScope, 
                      phase1: { ...consultingScope.phase1, outputs: val }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Phase 2: Solution Design</p>
                <div className="pl-4 space-y-2 border-l-2 border-muted">
                  <EditableField
                    label="Objectives"
                    value={consultingScope.phase2.objectives}
                    multiline
                    editable={!!onConsultingScopeChange}
                    onChange={(val) => onConsultingScopeChange?.({ 
                      ...consultingScope, 
                      phase2: { ...consultingScope.phase2, objectives: val }
                    })}
                  />
                  <EditableField
                    label="Activities"
                    value={consultingScope.phase2.activities}
                    multiline
                    editable={!!onConsultingScopeChange}
                    onChange={(val) => onConsultingScopeChange?.({ 
                      ...consultingScope, 
                      phase2: { ...consultingScope.phase2, activities: val }
                    })}
                  />
                  <EditableField
                    label="Outputs"
                    value={consultingScope.phase2.outputs}
                    multiline
                    editable={!!onConsultingScopeChange}
                    onChange={(val) => onConsultingScopeChange?.({ 
                      ...consultingScope, 
                      phase2: { ...consultingScope.phase2, outputs: val }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Phase 3: Implementation Support</p>
                <div className="pl-4 space-y-2 border-l-2 border-muted">
                  <EditableField
                    label="Objectives"
                    value={consultingScope.phase3.objectives}
                    multiline
                    editable={!!onConsultingScopeChange}
                    onChange={(val) => onConsultingScopeChange?.({ 
                      ...consultingScope, 
                      phase3: { ...consultingScope.phase3, objectives: val }
                    })}
                  />
                  <EditableField
                    label="Activities"
                    value={consultingScope.phase3.activities}
                    multiline
                    editable={!!onConsultingScopeChange}
                    onChange={(val) => onConsultingScopeChange?.({ 
                      ...consultingScope, 
                      phase3: { ...consultingScope.phase3, activities: val }
                    })}
                  />
                  <EditableField
                    label="Outputs"
                    value={consultingScope.phase3.outputs}
                    multiline
                    editable={!!onConsultingScopeChange}
                    onChange={(val) => onConsultingScopeChange?.({ 
                      ...consultingScope, 
                      phase3: { ...consultingScope.phase3, outputs: val }
                    })}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">
                  Note: Pricing and commercial terms are excluded from this document. Add separately after client review.
                </p>
              </div>
            </div>
          </PreviewSection>
        )}

        {evidenceTraceability && includeAppendix && (
          <PreviewSection title="Evidence & Traceability" sectionNumber="Appendix" defaultExpanded={false}>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client Inputs</p>
                <div className="pl-4 space-y-2 border-l-2 border-muted text-sm">
                  <p><span className="text-muted-foreground">Documents Reviewed:</span> {evidenceTraceability.clientInputs.documentsReviewed}</p>
                  <p><span className="text-muted-foreground">Interviews Conducted:</span> {evidenceTraceability.clientInputs.interviewsConducted}</p>
                  <p><span className="text-muted-foreground">Observations:</span> {evidenceTraceability.clientInputs.observationsNoted}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Knowledge References</p>
                <div className="pl-4 space-y-2 border-l-2 border-muted text-sm">
                  <p><span className="text-muted-foreground">Patterns Applied:</span> {evidenceTraceability.knowledgeReferences.rootCausePatterns}</p>
                  <p><span className="text-muted-foreground">Historical Cases:</span> {evidenceTraceability.knowledgeReferences.historicalCases}</p>
                  <p><span className="text-muted-foreground">Frameworks:</span> {evidenceTraceability.knowledgeReferences.frameworksApplied}</p>
                </div>
              </div>

              <EditableField
                label="Analysis Approach"
                value={evidenceTraceability.reasoningTrace}
                multiline
              />

              <EditableField
                label="Assumptions & Limitations"
                value={evidenceTraceability.assumptionsLimitations}
                multiline
              />
            </div>
          </PreviewSection>
        )}

        <div className="pt-2 text-xs text-muted-foreground">
          This is a preview of the export document. Final formatting will be applied during PDF generation.
        </div>
      </CardContent>
    </Card>
  );
}
