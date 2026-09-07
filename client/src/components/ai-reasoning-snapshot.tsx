/**
 * AI Reasoning Snapshot Component
 * 
 * Makes AI reasoning visible and explainable to consultants.
 * Displays key diagnostic metrics that explain HOW the AI reached its conclusions.
 * Builds trust by avoiding black-box behavior.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Brain, HelpCircle } from "lucide-react";

interface ReasoningMetric {
  label: string;
  value: number | string;
  unit?: string;
  description: string;
}

type OverallSeverity = "low" | "medium" | "high";

interface AIReasoningSnapshotProps {
  patternsMatched: number;
  comparableCases: number;
  overallSeverity: OverallSeverity;
  rootCauseClusters: number;
  evidenceSources?: string[];
}

function MetricItem({ label, value, unit, description }: ReasoningMetric) {
  return (
    <div className="flex flex-col" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px]">
            <p className="text-xs">{description}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function SeverityIndicator({ level }: { level: OverallSeverity }) {
  const getSeverityLabel = (level: OverallSeverity): string => {
    switch (level) {
      case "high": return "High";
      case "medium": return "Medium";
      case "low": return "Low";
    }
  };

  const getSeverityColor = (level: OverallSeverity): string => {
    switch (level) {
      case "high": return "text-red-600 dark:text-red-400";
      case "medium": return "text-amber-600 dark:text-amber-400";
      case "low": return "text-green-600 dark:text-green-400";
    }
  };

  return (
    <div className="flex flex-col" data-testid="metric-severity">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm text-muted-foreground">Overall Severity</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px]">
            <p className="text-xs">
              How serious the identified issues are based on business impact and intervention required.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-semibold ${getSeverityColor(level)}`}>
          {getSeverityLabel(level)}
        </span>
      </div>
    </div>
  );
}

export function AIReasoningSnapshot({
  patternsMatched,
  comparableCases,
  overallSeverity,
  rootCauseClusters,
  evidenceSources,
}: AIReasoningSnapshotProps) {
  return (
    <Card data-testid="ai-reasoning-snapshot">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <CardTitle className="text-base font-medium">AI Reasoning</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <MetricItem
            label="Patterns Matched"
            value={patternsMatched}
            description="Number of known problem patterns the AI detected in the submitted data or description."
          />
          <MetricItem
            label="Comparable Cases"
            value={comparableCases}
            description="Similar cases from the knowledge base that inform this analysis."
          />
          <SeverityIndicator level={overallSeverity} />
          <MetricItem
            label="Root Cause Clusters"
            value={rootCauseClusters}
            description="Distinct groups of related root causes identified. Fewer clusters indicate a more focused problem."
          />
        </div>

        {evidenceSources && evidenceSources.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm text-muted-foreground">Evidence Sources</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  <p className="text-xs">
                    Documents and data points the AI used to reach its conclusions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm">{evidenceSources.join(", ")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
