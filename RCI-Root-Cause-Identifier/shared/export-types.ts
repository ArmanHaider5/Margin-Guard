import { z } from "zod";

export type ExportType = 
  | "executive_diagnostic_summary"
  | "consulting_proposal_pack"
  | "diagnostic_appendix";

export type SeverityLevel = "low" | "medium" | "high";
export type ImpactLevel = "low" | "medium" | "high";
export type CapabilityLevel = "low" | "medium" | "high";

export interface PhaseContent {
  objectives: string;
  activities: string;
  outputs: string;
}

export interface ConsultingScopeData {
  phase1: PhaseContent;
  phase2: PhaseContent;
  phase3: PhaseContent;
}

export interface ExecutiveSummaryData {
  situationOverview: string;
  keyFindings: string[];
  businessImpact: string;
  recommendedDirection: string;
  interventionAssessment: string;
  nextStepOptions: string[];
}

export interface InterventionAssessmentData {
  severity: SeverityLevel;
  businessImpact: ImpactLevel;
  clientCapability: CapabilityLevel;
}

export interface EvidenceData {
  documentsReviewed: string;
  interviewsConducted: string;
  observationsNoted: string;
}

export interface KnowledgeReferences {
  rootCausePatterns: string;
  historicalCases: string;
  frameworksApplied: string;
}

export interface EvidenceTraceabilityData {
  clientInputs: EvidenceData;
  knowledgeReferences: KnowledgeReferences;
  reasoningTrace: string;
  assumptionsLimitations: string;
}

export interface ClientMetadata {
  organizationName: string;
  industry: string;
  contactPerson?: string;
  analysisDate: string;
  analysisId: string;
}

export interface RCICoverPage {
  clientName: string;
  engagementTitle: string;
  engagementSubtitle?: string;
  assessmentDate: string;
  preparedBy: {
    firmName: string;
    consultantName?: string;
  };
  confidentialityNotice: string;
  documentReference?: string;
}

export const defaultConfidentialityNotice = 
  "This document contains confidential information prepared exclusively for the named recipient. " +
  "Distribution, reproduction, or disclosure to third parties without prior written consent is prohibited. " +
  "The contents herein are intended for decision-support purposes and should be validated against authoritative sources.";

export const defaultPreparedBy = {
  firmName: "Scope Optix",
};

export type EngagementType = 
  | "diagnostic_assessment"
  | "operational_review"
  | "strategic_analysis"
  | "intervention_proposal";

export const engagementTitles: Record<EngagementType, string> = {
  diagnostic_assessment: "Diagnostic Assessment",
  operational_review: "Operational Review",
  strategic_analysis: "Strategic Analysis",
  intervention_proposal: "Intervention Proposal",
};

export type RCIComponentType =
  | "ask_rci"
  | "ai_reasoning_snapshot"
  | "root_cause_tree"
  | "ai_recommendation_layers"
  | "rci_intervention_assessment"
  | "consulting_scope_generator"
  | "executive_summary"
  | "evidence_traceability_panel"
  | "rci_knowledge_library";

export interface ExportSectionMapping {
  sectionId: string;
  sectionLabel: string;
  sourceComponent: RCIComponentType;
  exportDataType: string;
  inclusionRule: "always" | "conditional" | "optional";
  condition?: string;
  defaultIncluded: boolean;
}

export const exportSectionMappings: Record<ExportType, ExportSectionMapping[]> = {
  executive_diagnostic_summary: [
    {
      sectionId: "section_1",
      sectionLabel: "Executive Summary",
      sourceComponent: "executive_summary",
      exportDataType: "ExecutiveSummaryData",
      inclusionRule: "always",
      defaultIncluded: true,
    },
  ],
  consulting_proposal_pack: [
    {
      sectionId: "section_1",
      sectionLabel: "Executive Summary",
      sourceComponent: "executive_summary",
      exportDataType: "ExecutiveSummaryData",
      inclusionRule: "always",
      defaultIncluded: true,
    },
    {
      sectionId: "section_2",
      sectionLabel: "Intervention Assessment",
      sourceComponent: "rci_intervention_assessment",
      exportDataType: "InterventionAssessmentData",
      inclusionRule: "always",
      defaultIncluded: true,
    },
    {
      sectionId: "section_3",
      sectionLabel: "Consulting Scope",
      sourceComponent: "consulting_scope_generator",
      exportDataType: "ConsultingScopeData",
      inclusionRule: "conditional",
      condition: "intervention_required",
      defaultIncluded: false,
    },
    {
      sectionId: "appendix",
      sectionLabel: "Evidence & Traceability",
      sourceComponent: "evidence_traceability_panel",
      exportDataType: "EvidenceTraceabilityData",
      inclusionRule: "optional",
      defaultIncluded: false,
    },
  ],
  diagnostic_appendix: [
    {
      sectionId: "appendix_full",
      sectionLabel: "Evidence & Traceability",
      sourceComponent: "evidence_traceability_panel",
      exportDataType: "EvidenceTraceabilityData",
      inclusionRule: "always",
      defaultIncluded: true,
    },
  ],
};

export const excludedFromExport: RCIComponentType[] = [
  "ask_rci",
  "ai_reasoning_snapshot",
  "root_cause_tree",
  "ai_recommendation_layers",
  "rci_knowledge_library",
];

export const componentExportEligibility: Record<RCIComponentType, boolean> = {
  ask_rci: false,
  ai_reasoning_snapshot: false,
  root_cause_tree: false,
  ai_recommendation_layers: false,
  rci_intervention_assessment: true,
  consulting_scope_generator: true,
  executive_summary: true,
  evidence_traceability_panel: true,
  rci_knowledge_library: false,
};

export function isInterventionRequired(assessment: InterventionAssessmentData): boolean {
  return (
    assessment.severity === "high" &&
    assessment.businessImpact === "high" &&
    assessment.clientCapability === "low"
  );
}

export function getIncludedSections(
  exportType: ExportType,
  assessment?: InterventionAssessmentData,
  options?: { includeAppendix?: boolean }
): ExportSectionMapping[] {
  const mappings = exportSectionMappings[exportType];
  
  return mappings.filter((section) => {
    if (section.inclusionRule === "always") {
      return true;
    }
    
    if (section.inclusionRule === "conditional" && section.condition === "intervention_required") {
      return assessment ? isInterventionRequired(assessment) : false;
    }
    
    if (section.inclusionRule === "optional") {
      return options?.includeAppendix ?? section.defaultIncluded;
    }
    
    return section.defaultIncluded;
  });
}

export interface ExecutiveDiagnosticSummaryExport {
  type: "executive_diagnostic_summary";
  metadata: ClientMetadata;
  sections: {
    coverPage: {
      title: string;
      subtitle: string;
      preparedFor: string;
      preparedBy: string;
      date: string;
    };
    situationOverview: {
      included: true;
      content: string;
    };
    keyFindings: {
      included: true;
      findings: string[];
    };
    businessImpact: {
      included: true;
      content: string;
    };
    recommendedDirection: {
      included: true;
      content: string;
    };
    nextSteps: {
      included: true;
      options: string[];
    };
  };
  formatting: {
    brandingLevel: "full" | "minimal";
    includePageNumbers: boolean;
    includeConfidentialityNotice: boolean;
  };
}

export interface ConsultingProposalPackExport {
  type: "consulting_proposal_pack";
  metadata: ClientMetadata;
  sections: {
    coverPage: {
      title: string;
      subtitle: string;
      preparedFor: string;
      preparedBy: string;
      date: string;
    };
    executiveSummary: {
      included: true;
      data: ExecutiveSummaryData;
    };
    interventionAssessment: {
      included: true;
      data: InterventionAssessmentData;
      narrativeSummary: string;
    };
    consultingScope: {
      included: true;
      data: ConsultingScopeData;
      engagementOverview: string;
    };
    appendix: {
      included: boolean;
      evidenceTraceability?: EvidenceTraceabilityData;
    };
  };
  formatting: {
    brandingLevel: "full" | "minimal";
    includePageNumbers: boolean;
    includeConfidentialityNotice: boolean;
    includeTermsSection: boolean;
  };
  exclusions: {
    pricing: true;
    internalNotes: true;
  };
}

export interface DiagnosticAppendixExport {
  type: "diagnostic_appendix";
  metadata: ClientMetadata;
  sections: {
    headerPage: {
      title: string;
      referenceId: string;
      date: string;
    };
    clientInputs: {
      included: true;
      data: EvidenceData;
    };
    knowledgeReferences: {
      included: true;
      data: KnowledgeReferences;
    };
    reasoningTrace: {
      included: true;
      content: string;
    };
    assumptionsLimitations: {
      included: true;
      content: string;
    };
  };
  formatting: {
    brandingLevel: "minimal";
    includePageNumbers: boolean;
  };
  inclusionRules: {
    requiresExplicitSelection: true;
    defaultIncluded: false;
    clientFacing: false;
  };
}

export type RCIExport = 
  | ExecutiveDiagnosticSummaryExport
  | ConsultingProposalPackExport
  | DiagnosticAppendixExport;

export interface ExportRequest {
  exportType: ExportType;
  analysisId: string;
  clientId: string;
  options: {
    includeAppendix?: boolean;
    brandingLevel?: "full" | "minimal";
  };
}

export interface ExportResult {
  success: boolean;
  exportType: ExportType;
  filename: string;
  generatedAt: string;
  error?: string;
}

export const exportTypeLabels: Record<ExportType, string> = {
  executive_diagnostic_summary: "Executive Diagnostic Summary",
  consulting_proposal_pack: "Consulting Proposal Pack",
  diagnostic_appendix: "Diagnostic Appendix",
};

export const exportTypeDescriptions: Record<ExportType, string> = {
  executive_diagnostic_summary: "Board/C-suite ready summary with non-technical language",
  consulting_proposal_pack: "Complete proposal with scope and assessment (no pricing)",
  diagnostic_appendix: "Evidence and traceability documentation (optional)",
};

export const exportTypeAudience: Record<ExportType, string> = {
  executive_diagnostic_summary: "C-Suite / Board",
  consulting_proposal_pack: "Decision Makers",
  diagnostic_appendix: "Internal / Consultant Reference",
};

export const exportRequestSchema = z.object({
  exportType: z.enum([
    "executive_diagnostic_summary",
    "consulting_proposal_pack",
    "diagnostic_appendix",
  ]),
  analysisId: z.string().min(1),
  clientId: z.string().min(1),
  options: z.object({
    includeAppendix: z.boolean().optional(),
    brandingLevel: z.enum(["full", "minimal"]).optional(),
  }).optional(),
});

export type ExportRequestInput = z.infer<typeof exportRequestSchema>;
