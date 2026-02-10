/**
 * Root Cause Tree Component
 * 
 * Visualizes identified root causes in a hierarchical structure.
 * Organizes causes by the 4M framework (Money, Manpower, Material, Machinery)
 * to support consultant judgement and client explanation.
 * Each cause shows severity level and required intervention type.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

type InterventionType = "self-fixable" | "advisory" | "consultant-required";

type SeverityLevel = "low" | "medium" | "high";

interface RootCause {
  id: string;
  title: string;
  severity: SeverityLevel;
  intervention: InterventionType;
  issue: string;
  impact: string;
  direction: string;
}

interface CauseCategory {
  id: string;
  name: string;
  causes: RootCause[];
}

interface RootCauseTreeProps {
  categories: CauseCategory[];
}

function getInterventionLabel(type: InterventionType): string {
  switch (type) {
    case "self-fixable":
      return "Self-fixable";
    case "advisory":
      return "Advisory";
    case "consultant-required":
      return "Consultant Required";
  }
}

function getInterventionVariant(type: InterventionType): "default" | "secondary" | "outline" {
  switch (type) {
    case "self-fixable":
      return "outline";
    case "advisory":
      return "secondary";
    case "consultant-required":
      return "default";
  }
}

function CategoryNode({ category }: { category: CauseCategory }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-l-2 border-muted pl-4" data-testid={`category-${category.id}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-2 w-full text-left hover-elevate rounded px-2 -ml-2"
        data-testid={`button-toggle-${category.id}`}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <span className="font-medium">{category.name}</span>
        <span className="text-sm text-muted-foreground ml-auto">
          {category.causes.length} {category.causes.length === 1 ? "cause" : "causes"}
        </span>
      </button>

      {expanded && (
        <div className="ml-6 space-y-2 pb-3">
          {category.causes.map((cause) => (
            <CauseNode key={cause.id} cause={cause} />
          ))}
        </div>
      )}
    </div>
  );
}

function getSeverityLabel(severity: SeverityLevel): string {
  switch (severity) {
    case "high": return "High";
    case "medium": return "Medium";
    case "low": return "Low";
  }
}

function getSeverityVariant(severity: SeverityLevel): "default" | "secondary" | "outline" {
  switch (severity) {
    case "high": return "default";
    case "medium": return "secondary";
    case "low": return "outline";
  }
}

function CauseNode({ cause }: { cause: RootCause }) {
  return (
    <div
      className="flex flex-col gap-3 py-4 px-4 rounded border bg-muted/30"
      data-testid={`cause-${cause.id}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge
          variant={getSeverityVariant(cause.severity)}
          className="text-xs"
          data-testid={`severity-${cause.id}`}
        >
          {getSeverityLabel(cause.severity)} Severity
        </Badge>
        <Badge
          variant={getInterventionVariant(cause.intervention)}
          className="text-xs"
          data-testid={`tag-${cause.id}`}
        >
          {getInterventionLabel(cause.intervention)}
        </Badge>
      </div>
      
      {/* Structured root cause formatting - each section on its own line */}
      <div className="space-y-4 text-sm">
        <div data-testid={`cause-rootcause-${cause.id}`}>
          <p className="font-medium text-muted-foreground mb-1">Root Cause:</p>
          <p className="pl-0">{cause.issue}</p>
        </div>
        
        <div data-testid={`cause-whyitmatters-${cause.id}`}>
          <p className="font-medium text-muted-foreground mb-1">Why It Matters:</p>
          <p className="pl-0">{cause.impact}</p>
        </div>
        
        <div data-testid={`cause-intervention-${cause.id}`}>
          <p className="font-medium text-muted-foreground mb-1">Intervention Direction:</p>
          <p className="pl-0">{cause.direction}</p>
        </div>
      </div>
    </div>
  );
}

export function RootCauseTree({ categories }: RootCauseTreeProps) {
  const totalCauses = categories.reduce((sum, cat) => sum + cat.causes.length, 0);

  return (
    <Card data-testid="root-cause-tree">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <CardTitle className="text-base font-medium">Root Cause Analysis</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {totalCauses} causes identified
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => (
            <CategoryNode key={category.id} category={category} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export type { RootCause, CauseCategory, InterventionType };
