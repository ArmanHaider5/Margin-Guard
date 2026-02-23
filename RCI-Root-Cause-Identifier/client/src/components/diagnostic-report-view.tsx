/**
 * Diagnostic Report View Component
 * 
 * Renders the composed DiagnosticReport with structured formatting.
 * Displays primary/secondary findings, intervention themes, and prevention focus.
 * Uses rule-based composition - no AI-generated text.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  AlertTriangle, 
  Lightbulb, 
  Shield, 
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ClipboardCheck
} from "lucide-react";
import { useState } from "react";
import type { DiagnosticReport, DiagnosticFinding, InterventionTheme } from "@shared/diagnostic-composer";
import type { FourMCategory } from "@shared/schema";

const fourMColors: Record<FourMCategory, { bg: string; text: string }> = {
  Money: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  Materials: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  Manpower: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  Machinery: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
};

interface DiagnosticReportViewProps {
  report: DiagnosticReport;
}

const evidenceStrengthStyles: Record<string, { bg: string; text: string; label: string }> = {
  STRONG: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Strong" },
  MODERATE: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Moderate" },
  WEAK: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", label: "Weak" },
};

function FindingCard({ finding, isPrimary }: { finding: DiagnosticFinding; isPrimary: boolean }) {
  const colors = fourMColors[finding.category as keyof typeof fourMColors] || fourMColors.Money;
  const strengthStyle = finding.evidenceStrength
    ? evidenceStrengthStyles[finding.evidenceStrength] || evidenceStrengthStyles.WEAK
    : null;
  
  const hasSignals = finding.evidenceAnchors && finding.evidenceAnchors.length > 0;
  const hasAnyConcreteOutput = hasSignals || (finding.impactObserved && finding.impactObserved.length > 0);
  const noSignalsFallback = !hasAnyConcreteOutput && finding.evidenceStrength === "WEAK";

  return (
    <Card 
      className={`p-4 ${isPrimary ? "border-l-4 border-l-primary" : ""}`}
      data-testid={`finding-${finding.id}`}
    >
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <h3 className="font-semibold text-base">{finding.evidenceLedTitle || finding.title}</h3>
        <Badge className={`${colors.bg} ${colors.text}`}>{finding.category}</Badge>
        {isPrimary && (
          <Badge variant="default" data-testid={`badge-primary-${finding.id}`}>
            Primary
          </Badge>
        )}
        {strengthStyle && (
          <Badge 
            className={`${strengthStyle.bg} ${strengthStyle.text}`}
            data-testid={`badge-evidence-strength-${finding.id}`}
          >
            {strengthStyle.label}
          </Badge>
        )}
      </div>
      
      <div className="space-y-3 text-sm">
        {hasSignals && (
          <div data-testid={`finding-evidence-anchors-${finding.id}`}>
            <p className="font-medium mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Supporting Evidence
            </p>
            <ul className="space-y-1 ml-5">
              {finding.evidenceAnchors!.map((anchor, idx) => (
                <li key={idx} className="list-disc text-muted-foreground">
                  <span className="font-medium text-foreground">{anchor.signal}</span>
                  <span className="text-xs ml-1">({anchor.documentName})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div data-testid={`finding-rootcause-${finding.id}`}>
          <p className="font-medium mb-1 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-muted-foreground" /> Insight
          </p>
          <p className="text-muted-foreground ml-5">{finding.insightNote || finding.whyItMatters}</p>
        </div>

        {finding.impactObserved && finding.impactObserved.length > 0 && (
          <div data-testid={`finding-impact-${finding.id}`}>
            <p className="font-medium mb-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" /> Estimated Impact
            </p>
            <ul className="space-y-1 ml-5">
              {finding.impactObserved.map((bullet, idx) => (
                <li key={idx} className="list-disc text-muted-foreground">{bullet}</li>
              ))}
            </ul>
          </div>
        )}

        <div data-testid={`finding-intervention-${finding.id}`}>
          <p className="font-medium mb-1 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" /> Suggested Intervention Direction
          </p>
          <ul className="ml-5">
            <li className="list-disc text-muted-foreground">{finding.interventionDirection}</li>
          </ul>
        </div>

        {finding.whatToValidateNext && finding.whatToValidateNext.length > 0 && (
          <div className="pt-2 border-t" data-testid={`finding-validate-${finding.id}`}>
            <p className="font-medium mb-1 flex items-center gap-1">
              <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" /> What to Validate Next
            </p>
            <ul className="space-y-1 ml-5">
              {finding.whatToValidateNext.map((doc, idx) => (
                <li key={idx} className="list-disc text-muted-foreground text-xs">{doc}</li>
              ))}
            </ul>
          </div>
        )}

        {noSignalsFallback && (
          <div className="pt-2 border-t" data-testid={`finding-no-signals-${finding.id}`}>
            <p className="text-xs text-amber-600 dark:text-amber-400 ml-5 italic">
              No concrete operational or financial signals extracted yet. Upload Ops, Finance, or Maintenance records to strengthen this finding.
            </p>
          </div>
        )}

        {finding.collapsedNote && (
          <p className="text-xs text-amber-600 dark:text-amber-400 italic ml-5">
            {finding.collapsedNote}
          </p>
        )}

        {finding.evidenceNote && (
          <div data-testid={`finding-evidence-${finding.id}`}>
            <p className="text-muted-foreground italic text-xs ml-5">{finding.evidenceNote}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function InterventionThemeCard({ theme }: { theme: InterventionTheme }) {
  return (
    <Card className="p-4" data-testid={`theme-${theme.theme.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium mb-1">{theme.theme}</h4>
          <p className="text-sm text-muted-foreground">{theme.description}</p>
        </div>
      </div>
    </Card>
  );
}

export function DiagnosticReportView({ report }: DiagnosticReportViewProps) {
  const [showSecondary, setShowSecondary] = useState(false);
  
  const hasSecondaryFindings = report.secondaryFindings.length > 0;
  const totalFindings = report.primaryFindings.length + report.secondaryFindings.length;
  
  return (
    <div className="space-y-6">
      <Card className="p-4 border-l-4 border-l-primary" data-testid="card-report-mode">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-semibold">
            {report.analysisMode === "deep" 
              ? "Deep Diagnostic (Evidence-Backed)" 
              : "Initial Diagnostic (Pattern-Based)"
            }
          </span>
          <Badge variant={report.documentsBacked ? "default" : "secondary"}>
            {report.documentsBacked ? "Document-Validated" : "Preliminary"}
          </Badge>
        </div>
      </Card>

      <Card className="p-6" data-testid="card-executive-summary">
        <div className="flex items-start gap-3">
          <Target className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-semibold mb-2">Executive Summary</h2>
            <p className="text-muted-foreground" data-testid="text-executive-summary">
              {report.executiveSummary}
            </p>
          </div>
        </div>
      </Card>

      {report.contextShiftNote && (
        <Card className="p-4 border-l-4 border-l-amber-500" data-testid="card-context-shift">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Diagnostic Focus Shift</h3>
              <p className="text-sm text-muted-foreground" data-testid="text-context-shift">
                {report.contextShiftNote}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6" data-testid="card-primary-findings">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Primary Findings
          <Badge variant="outline" className="ml-auto">
            {report.primaryFindings.length} dominant cause{report.primaryFindings.length !== 1 ? "s" : ""}
          </Badge>
        </h2>
        <div className="space-y-4">
          {report.primaryFindings.map(finding => (
            <FindingCard key={finding.id} finding={finding} isPrimary={true} />
          ))}
          {report.primaryFindings.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No dominant root causes identified.
            </p>
          )}
        </div>
      </Card>

      {hasSecondaryFindings && (
        <Card className="p-6" data-testid="card-secondary-findings">
          <button
            onClick={() => setShowSecondary(!showSecondary)}
            className="w-full flex items-center gap-2 text-left"
            data-testid="button-toggle-secondary"
          >
            {showSecondary ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Contributing Factors
              <Badge variant="secondary">
                {report.secondaryFindings.length} additional
              </Badge>
            </h2>
          </button>
          
          {showSecondary && (
            <div className="space-y-4 mt-4">
              {report.secondaryFindings.map(finding => (
                <FindingCard key={finding.id} finding={finding} isPrimary={false} />
              ))}
            </div>
          )}
        </Card>
      )}

      {report.interventionThemes.length > 0 && (
        <Card className="p-6" data-testid="card-intervention-themes">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Intervention Themes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.interventionThemes.map(theme => (
              <InterventionThemeCard key={theme.theme} theme={theme} />
            ))}
          </div>
        </Card>
      )}

      {report.preventionFocus.length > 0 && (
        <Card className="p-6" data-testid="card-prevention-focus">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Prevention Focus
          </h2>
          <ul className="space-y-2">
            {report.preventionFocus.map((focus, idx) => (
              <li 
                key={idx} 
                className="flex items-start gap-2 text-sm"
                data-testid={`prevention-${idx}`}
              >
                <span className="text-primary mt-1">•</span>
                <span>{focus}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground" data-testid="text-stats-summary">
        {totalFindings} root cause{totalFindings !== 1 ? "s" : ""} identified
        {report.interventionThemes.length > 0 && ` • ${report.interventionThemes.length} intervention theme${report.interventionThemes.length !== 1 ? "s" : ""}`}
      </div>
    </div>
  );
}
