/**
 * Executive / Client Summary Component
 * 
 * Translates technical diagnosis into an executive-level summary.
 * Supports client presentations, board discussions, and decision-making.
 * Maintains consultant authority and accountability.
 * Editable for consultant refinement.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ExecutiveSummaryData {
  situationOverview: string;
  keyFindings: string[];
  businessImpact: string;
  recommendedDirection: string;
  interventionAssessment: string;
  nextStepOptions: string[];
}

interface ExecutiveSummaryProps {
  initialData: ExecutiveSummaryData;
  onDataChange?: (data: ExecutiveSummaryData) => void;
  readOnly?: boolean;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-medium mb-2">{children}</h3>
  );
}

function EditableTextSection({
  label,
  value,
  onChange,
  testId,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="space-y-2">
        <SectionHeader>{label}</SectionHeader>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={testId}>
          {value}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <SectionHeader>{label}</SectionHeader>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px] text-sm resize-none"
        data-testid={testId}
      />
    </div>
  );
}

function EditableBulletSection({
  label,
  items,
  onChange,
  testId,
  readOnly = false,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  testId: string;
  readOnly?: boolean;
}) {
  const value = items.join("\n");

  const handleChange = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    onChange(lines);
  };

  if (readOnly) {
    return (
      <div className="space-y-2">
        <SectionHeader>{label}</SectionHeader>
        <ul className="list-disc list-inside space-y-1" data-testid={testId}>
          {items.map((item, index) => (
            <li key={index} className="text-sm text-muted-foreground">{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SectionHeader>{label}</SectionHeader>
      <Textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="min-h-[100px] text-sm resize-none"
        placeholder="One item per line"
        data-testid={testId}
      />
      <p className="text-xs text-muted-foreground">Enter one item per line</p>
    </div>
  );
}

export function ExecutiveSummary({
  initialData,
  onDataChange,
  readOnly = false,
}: ExecutiveSummaryProps) {
  const [data, setData] = useState<ExecutiveSummaryData>(initialData);

  const updateField = <K extends keyof ExecutiveSummaryData>(
    field: K,
    value: ExecutiveSummaryData[K]
  ) => {
    const updated = { ...data, [field]: value };
    setData(updated);
    onDataChange?.(updated);
  };

  const title = readOnly 
    ? "Professional Diagnostic Summary" 
    : "Executive Diagnostic Summary";

  return (
    <Card data-testid="executive-summary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <EditableTextSection
            label="1. Situation Overview"
            value={data.situationOverview}
            onChange={(v) => updateField("situationOverview", v)}
            testId="input-situation-overview"
            readOnly={readOnly}
          />

          <EditableBulletSection
            label="2. Key Findings"
            items={data.keyFindings}
            onChange={(v) => updateField("keyFindings", v)}
            testId="input-key-findings"
            readOnly={readOnly}
          />

          <EditableTextSection
            label="3. Business Impact"
            value={data.businessImpact}
            onChange={(v) => updateField("businessImpact", v)}
            testId="input-business-impact"
            readOnly={readOnly}
          />

          <EditableTextSection
            label="4. Recommended Direction"
            value={data.recommendedDirection}
            onChange={(v) => updateField("recommendedDirection", v)}
            testId="input-recommended-direction"
            readOnly={readOnly}
          />

          <EditableTextSection
            label={readOnly ? "5. Consultant Evaluation" : "5. Intervention Assessment"}
            value={data.interventionAssessment}
            onChange={(v) => updateField("interventionAssessment", v)}
            testId="input-intervention-assessment"
            readOnly={readOnly}
          />

          <EditableBulletSection
            label="6. Next-Step Options"
            items={data.nextStepOptions}
            onChange={(v) => updateField("nextStepOptions", v)}
            testId="input-next-step-options"
            readOnly={readOnly}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export type { ExecutiveSummaryData };
