/**
 * RCI Intervention Assessment Component
 * 
 * Assesses whether consultant intervention is required based on
 * issue severity, business impact, and client internal capability.
 * Makes decision logic transparent and defensible.
 * Avoids sales-oriented language.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SeverityLevel = "low" | "medium" | "high";
type ImpactLevel = "low" | "medium" | "high";
type CapabilityLevel = "low" | "medium" | "high";

interface RCIInterventionAssessmentProps {
  severity: SeverityLevel;
  businessImpact: ImpactLevel;
  clientCapability: CapabilityLevel;
  clientMode?: boolean;
}

function getLevelLabel(level: SeverityLevel | ImpactLevel | CapabilityLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function AssessmentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function RCIInterventionAssessment({
  severity,
  businessImpact,
  clientCapability,
  clientMode = false,
}: RCIInterventionAssessmentProps) {
  const requiresIntervention =
    severity === "high" &&
    businessImpact === "high" &&
    clientCapability === "low";

  const clientSafeLabels = {
    severity: {
      low: "Within normal parameters",
      medium: "Requires attention",
      high: "Priority action needed",
    },
    impact: {
      low: "Limited operational effect",
      medium: "Moderate business effect",
      high: "Significant business effect",
    },
    capability: {
      low: "External support recommended",
      medium: "Partial internal capacity",
      high: "Internal capacity available",
    },
  };

  const getSeverityDisplay = () => clientMode ? clientSafeLabels.severity[severity] : getLevelLabel(severity);
  const getImpactDisplay = () => clientMode ? clientSafeLabels.impact[businessImpact] : getLevelLabel(businessImpact);
  const getCapabilityDisplay = () => clientMode ? clientSafeLabels.capability[clientCapability] : getLevelLabel(clientCapability);

  const getConclusion = () => {
    if (clientMode) {
      return requiresIntervention
        ? "Following a professional diagnostic review, structured consulting support is recommended to address identified areas effectively and achieve sustainable outcomes."
        : "Our consultant evaluation indicates these areas can be addressed with internal resources, supported by professional guidance documentation.";
    }
    return requiresIntervention
      ? "RCI assessment indicates that professional intervention is required for sustainable resolution."
      : "RCI assessment indicates this issue may be addressed internally with guidance.";
  };

  return (
    <Card data-testid="rci-intervention-assessment">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          {clientMode ? "Professional Diagnostic Review" : "RCI Intervention Assessment"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border rounded px-4 py-2">
            <AssessmentRow label="Issue Priority" value={getSeverityDisplay()} />
            <AssessmentRow label="Business Impact" value={getImpactDisplay()} />
            <AssessmentRow label="Internal Capacity" value={getCapabilityDisplay()} />
          </div>

          <div
            className={`p-4 rounded border ${
              requiresIntervention
                ? "bg-muted border-foreground/20"
                : "border-muted"
            }`}
            data-testid="assessment-conclusion"
          >
            <p className="text-sm font-medium">
              {clientMode ? "Consultant Evaluation" : "Assessment Conclusion"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {getConclusion()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { SeverityLevel, ImpactLevel, CapabilityLevel };
