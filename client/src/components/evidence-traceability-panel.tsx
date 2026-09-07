/**
 * Evidence & Traceability Panel Component
 * 
 * Provides traceability for all diagnostic conclusions.
 * Supports audits, compliance reviews, and dispute resolution.
 * Demonstrates responsible AI-assisted consulting.
 * All sections are collapsible and editable.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronRight } from "lucide-react";

interface EvidenceData {
  documentsReviewed: string;
  interviewsConducted: string;
  observationsNoted: string;
}

interface KnowledgeReferences {
  rootCausePatterns: string;
  historicalCases: string;
  frameworksApplied: string;
}

interface EvidenceTraceabilityData {
  clientInputs: EvidenceData;
  knowledgeReferences: KnowledgeReferences;
  reasoningTrace: string;
  assumptionsLimitations: string;
}

interface EvidenceTraceabilityPanelProps {
  initialData: EvidenceTraceabilityData;
  onDataChange?: (data: EvidenceTraceabilityData) => void;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  testId: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded" data-testid={testId}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full p-3 text-left hover-elevate rounded"
        data-testid={`button-toggle-${testId}`}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-sm font-medium">{title}</span>
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[60px] text-sm resize-none"
        data-testid={testId}
      />
    </div>
  );
}

export function EvidenceTraceabilityPanel({
  initialData,
  onDataChange,
}: EvidenceTraceabilityPanelProps) {
  const [data, setData] = useState<EvidenceTraceabilityData>(initialData);

  const updateClientInputs = (field: keyof EvidenceData, value: string) => {
    const updated = {
      ...data,
      clientInputs: { ...data.clientInputs, [field]: value },
    };
    setData(updated);
    onDataChange?.(updated);
  };

  const updateKnowledgeRefs = (field: keyof KnowledgeReferences, value: string) => {
    const updated = {
      ...data,
      knowledgeReferences: { ...data.knowledgeReferences, [field]: value },
    };
    setData(updated);
    onDataChange?.(updated);
  };

  const updateField = (field: "reasoningTrace" | "assumptionsLimitations", value: string) => {
    const updated = { ...data, [field]: value };
    setData(updated);
    onDataChange?.(updated);
  };

  return (
    <Card data-testid="evidence-traceability-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Evidence & Traceability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 rounded border border-muted bg-muted/30">
            <p className="text-xs text-muted-foreground">
              This analysis is based on information available at the time of assessment and requires professional judgement.
            </p>
          </div>

          <CollapsibleSection title="1. Client Inputs & Evidence" testId="section-client-inputs">
            <div className="space-y-3 pt-2">
              <EditableField
                label="Documents Reviewed"
                value={data.clientInputs.documentsReviewed}
                onChange={(v) => updateClientInputs("documentsReviewed", v)}
                testId="input-documents-reviewed"
              />
              <EditableField
                label="Interviews Conducted"
                value={data.clientInputs.interviewsConducted}
                onChange={(v) => updateClientInputs("interviewsConducted", v)}
                testId="input-interviews-conducted"
              />
              <EditableField
                label="Observations Noted"
                value={data.clientInputs.observationsNoted}
                onChange={(v) => updateClientInputs("observationsNoted", v)}
                testId="input-observations-noted"
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="2. Knowledge Library References" testId="section-knowledge-refs">
            <div className="space-y-3 pt-2">
              <EditableField
                label="Referenced Root Cause Patterns"
                value={data.knowledgeReferences.rootCausePatterns}
                onChange={(v) => updateKnowledgeRefs("rootCausePatterns", v)}
                testId="input-root-cause-patterns"
              />
              <EditableField
                label="Historical Cases Used"
                value={data.knowledgeReferences.historicalCases}
                onChange={(v) => updateKnowledgeRefs("historicalCases", v)}
                testId="input-historical-cases"
              />
              <EditableField
                label="Frameworks or Standards Applied"
                value={data.knowledgeReferences.frameworksApplied}
                onChange={(v) => updateKnowledgeRefs("frameworksApplied", v)}
                testId="input-frameworks-applied"
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="3. Reasoning Trace" testId="section-reasoning-trace">
            <div className="pt-2">
              <Textarea
                value={data.reasoningTrace}
                onChange={(e) => updateField("reasoningTrace", e.target.value)}
                className="min-h-[100px] text-sm resize-none"
                data-testid="input-reasoning-trace"
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="4. Assumptions & Limitations" testId="section-assumptions">
            <div className="pt-2">
              <Textarea
                value={data.assumptionsLimitations}
                onChange={(e) => updateField("assumptionsLimitations", e.target.value)}
                className="min-h-[100px] text-sm resize-none"
                data-testid="input-assumptions-limitations"
              />
            </div>
          </CollapsibleSection>
        </div>
      </CardContent>
    </Card>
  );
}

export type { EvidenceTraceabilityData, EvidenceData, KnowledgeReferences };
