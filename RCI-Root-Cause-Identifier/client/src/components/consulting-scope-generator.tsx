/**
 * Consulting Scope Generator Component
 * 
 * Converts AI diagnosis into a draft consulting engagement scope.
 * Assists consultants in proposal preparation while maintaining
 * human ownership of final recommendations.
 * Editable by consultants before use.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PhaseContent {
  objectives: string;
  activities: string;
  outputs: string;
}

interface ConsultingScopeData {
  phase1: PhaseContent;
  phase2: PhaseContent;
  phase3: PhaseContent;
}

interface ConsultingScopeGeneratorProps {
  initialScope: ConsultingScopeData;
  onScopeChange?: (scope: ConsultingScopeData) => void;
  readOnly?: boolean;
  clientMode?: boolean;
}

function PhaseSection({
  phaseNumber,
  title,
  content,
  onChange,
  readOnly = false,
}: {
  phaseNumber: number;
  title: string;
  content: PhaseContent;
  onChange: (field: keyof PhaseContent, value: string) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="border rounded p-4" data-testid={`phase-${phaseNumber}`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-muted-foreground">Phase {phaseNumber}</span>
          <span className="font-medium">{title}</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Objectives</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.objectives}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Typical Activities</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.activities}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Expected Outputs</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.outputs}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-4" data-testid={`phase-${phaseNumber}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-muted-foreground">Phase {phaseNumber}</span>
        <span className="font-medium">{title}</span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`objectives-${phaseNumber}`} className="text-sm">
            Objectives
          </Label>
          <Textarea
            id={`objectives-${phaseNumber}`}
            value={content.objectives}
            onChange={(e) => onChange("objectives", e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            data-testid={`input-objectives-${phaseNumber}`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`activities-${phaseNumber}`} className="text-sm">
            Typical Activities
          </Label>
          <Textarea
            id={`activities-${phaseNumber}`}
            value={content.activities}
            onChange={(e) => onChange("activities", e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            data-testid={`input-activities-${phaseNumber}`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`outputs-${phaseNumber}`} className="text-sm">
            Expected Outputs
          </Label>
          <Textarea
            id={`outputs-${phaseNumber}`}
            value={content.outputs}
            onChange={(e) => onChange("outputs", e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            data-testid={`input-outputs-${phaseNumber}`}
          />
        </div>
      </div>
    </div>
  );
}

export function ConsultingScopeGenerator({
  initialScope,
  onScopeChange,
  readOnly = false,
  clientMode = false,
}: ConsultingScopeGeneratorProps) {
  const [scope, setScope] = useState<ConsultingScopeData>(initialScope);

  const handlePhaseChange = (
    phase: "phase1" | "phase2" | "phase3",
    field: keyof PhaseContent,
    value: string
  ) => {
    const updated = {
      ...scope,
      [phase]: {
        ...scope[phase],
        [field]: value,
      },
    };
    setScope(updated);
    onScopeChange?.(updated);
  };

  return (
    <Card data-testid="consulting-scope-generator">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          {clientMode ? "Proposed Engagement Scope" : "AI-Drafted Consulting Scope"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!readOnly && !clientMode && (
            <div className="p-3 rounded border border-muted bg-muted/30">
              <p className="text-sm text-muted-foreground">
                This scope is AI-drafted and requires consultant review and refinement.
              </p>
            </div>
          )}

          <PhaseSection
            phaseNumber={1}
            title="Deep Diagnostic"
            content={scope.phase1}
            onChange={(field, value) => handlePhaseChange("phase1", field, value)}
            readOnly={readOnly || clientMode}
          />

          <PhaseSection
            phaseNumber={2}
            title="Solution Design & Governance"
            content={scope.phase2}
            onChange={(field, value) => handlePhaseChange("phase2", field, value)}
            readOnly={readOnly || clientMode}
          />

          <PhaseSection
            phaseNumber={3}
            title="Implementation & Change Enablement"
            content={scope.phase3}
            onChange={(field, value) => handlePhaseChange("phase3", field, value)}
            readOnly={readOnly || clientMode}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export type { ConsultingScopeData, PhaseContent };
