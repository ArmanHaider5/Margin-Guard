import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Briefcase, 
  FileSearch,
  Download,
  ChevronDown,
  ChevronRight,
  Users,
  Building2
} from "lucide-react";
import type { 
  ExportType,
  exportTypeLabels,
  exportTypeDescriptions,
  exportTypeAudience 
} from "@shared/export-types";

interface ExportSection {
  id: string;
  label: string;
  included: boolean;
  required: boolean;
  description?: string;
}

interface ExportTypeConfig {
  type: ExportType;
  label: string;
  description: string;
  audience: string;
  icon: typeof FileText;
  sections: ExportSection[];
  defaultSelected: boolean;
}

const exportConfigs: ExportTypeConfig[] = [
  {
    type: "executive_diagnostic_summary",
    label: "Executive Diagnostic Summary",
    description: "Board/C-suite ready summary with non-technical language",
    audience: "C-Suite / Board",
    icon: FileText,
    defaultSelected: true,
    sections: [
      { id: "cover", label: "Cover Page", included: true, required: true },
      { id: "situation", label: "Situation Overview", included: true, required: true },
      { id: "findings", label: "Key Findings", included: true, required: true },
      { id: "impact", label: "Business Impact", included: true, required: true },
      { id: "direction", label: "Recommended Direction", included: true, required: true },
      { id: "next_steps", label: "Next Steps", included: true, required: true },
    ],
  },
  {
    type: "consulting_proposal_pack",
    label: "Consulting Proposal Pack",
    description: "Complete proposal with scope and assessment (no pricing)",
    audience: "Decision Makers",
    icon: Briefcase,
    defaultSelected: false,
    sections: [
      { id: "cover", label: "Cover Page", included: true, required: true },
      { id: "executive_summary", label: "Executive Summary", included: true, required: true },
      { id: "intervention", label: "Intervention Assessment", included: true, required: true },
      { id: "scope", label: "AI-Drafted Consulting Scope", included: true, required: true },
      { id: "appendix", label: "Evidence Appendix", included: false, required: false, description: "Optional: Include evidence and traceability" },
    ],
  },
  {
    type: "diagnostic_appendix",
    label: "Diagnostic Appendix",
    description: "Evidence and traceability documentation",
    audience: "Internal / Consultant Reference",
    icon: FileSearch,
    defaultSelected: false,
    sections: [
      { id: "header", label: "Header Page", included: true, required: true },
      { id: "client_inputs", label: "Client Inputs", included: true, required: true },
      { id: "knowledge_refs", label: "Knowledge References", included: true, required: true },
      { id: "reasoning", label: "Reasoning Trace", included: true, required: true },
      { id: "assumptions", label: "Assumptions & Limitations", included: true, required: true },
    ],
  },
];

interface RCIExportEngineProps {
  analysisId?: string;
  clientName?: string;
  onExportRequest?: (exportType: ExportType, options: { includeAppendix?: boolean }) => void;
}

export function RCIExportEngine({ 
  analysisId, 
  clientName = "Client Organization",
  onExportRequest 
}: RCIExportEngineProps) {
  const [selectedExports, setSelectedExports] = useState<Set<ExportType>>(
    () => new Set<ExportType>(["executive_diagnostic_summary"])
  );
  const [expandedExport, setExpandedExport] = useState<ExportType | null>("executive_diagnostic_summary");
  const [includeAppendixInProposal, setIncludeAppendixInProposal] = useState(false);

  const toggleExport = (type: ExportType) => {
    const newSelected = new Set(selectedExports);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedExports(newSelected);
  };

  const toggleExpanded = (type: ExportType) => {
    setExpandedExport(expandedExport === type ? null : type);
  };

  const handleExport = () => {
    selectedExports.forEach((type) => {
      onExportRequest?.(type, { 
        includeAppendix: type === "consulting_proposal_pack" ? includeAppendixInProposal : undefined 
      });
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg font-semibold">Margin Guard Export Engine</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Generate client-facing deliverables
              </p>
            </div>
          </div>
          <Button 
            onClick={handleExport}
            disabled={selectedExports.size === 0}
            data-testid="button-generate-exports"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate Selected
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground pb-2">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            <span>{clientName}</span>
          </div>
          {analysisId && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>Analysis: {analysisId.slice(0, 8)}...</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          {exportConfigs.map((config) => {
            const isSelected = selectedExports.has(config.type);
            const isExpanded = expandedExport === config.type;
            const Icon = config.icon;

            return (
              <div 
                key={config.type}
                className={`border rounded-md transition-colors ${
                  isSelected ? "border-primary/30 bg-primary/5" : "border-border"
                }`}
              >
                <div 
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => toggleExpanded(config.type)}
                  data-testid={`export-option-${config.type}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleExport(config.type)}
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`checkbox-${config.type}`}
                  />
                  
                  <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {config.audience}
                      </Badge>
                      {config.type === "diagnostic_appendix" && (
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {config.description}
                    </p>
                  </div>

                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <Separator className="mb-3" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Included Sections
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {config.sections.map((section) => (
                          <div 
                            key={section.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            {config.type === "consulting_proposal_pack" && section.id === "appendix" ? (
                              <Checkbox
                                checked={includeAppendixInProposal}
                                onCheckedChange={(checked) => setIncludeAppendixInProposal(!!checked)}
                                data-testid="checkbox-include-appendix"
                              />
                            ) : (
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                section.included ? "bg-primary" : "bg-muted-foreground/30"
                              }`} />
                            )}
                            <span className={section.required ? "" : "text-muted-foreground"}>
                              {section.label}
                            </span>
                            {!section.required && (
                              <span className="text-xs text-muted-foreground">(optional)</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {config.type === "consulting_proposal_pack" && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          Note: Pricing is excluded from this export. Add pricing separately after client review.
                        </p>
                      )}

                      {config.type === "diagnostic_appendix" && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          Note: This document is for internal/consultant reference. Not included by default in client deliverables.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          All exports use Scope Optix branding and consultant-owned language. PDF generation available after structure review.
        </div>
      </CardContent>
    </Card>
  );
}

export { exportConfigs };
export type { ExportTypeConfig, ExportSection };
