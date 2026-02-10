/**
 * RCI Knowledge Library Component
 * 
 * Makes the AI knowledge base visible and credible.
 * Allows consultants to browse and validate the knowledge foundation.
 * Represents 40 years of consulting experience encoded into structured knowledge.
 * Read-only view protecting proprietary intellectual property.
 *
 * RCI Brain v2: Added "Use in Case" workflow for attaching root cause patterns to cases.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Crosshair } from "lucide-react";

interface RootCausePattern {
  id: string;
  title: string;
  category: "Process" | "People" | "Systems" | "Governance";
  frequency: "Common" | "Moderate" | "Rare";
  industries: string[];
  summary?: string;
  hasV2Fields?: boolean;
}

interface SolutionArchetype {
  id: string;
  name: string;
  applicableRootCauses: string[];
  complexity: "Low" | "Medium" | "High";
  summary?: string;
}

interface PreventionFramework {
  id: string;
  name: string;
  riskType: string;
  maturityLevel: "Basic" | "Intermediate" | "Advanced";
  summary?: string;
}

interface IndustryContext {
  id: string;
  industry: string;
  caseType: "Operations" | "Compliance" | "Transformation";
  referenceCount: number;
  summary?: string;
}

// RCI Brain v2: Case selection for "Use in Case" workflow
interface CaseOption {
  id: string;
  clientName: string;
  problemStatement: string;
  status: string;
}

interface RCIKnowledgeLibraryProps {
  rootCausePatterns: RootCausePattern[];
  solutionArchetypes: SolutionArchetype[];
  preventionFrameworks: PreventionFramework[];
  industryContexts: IndustryContext[];
  activeCases?: CaseOption[];
  onAttachPattern?: (patternId: string, caseId: string) => Promise<void>;
}

function ExpandableRow({
  children,
  summary,
  testId,
  action,
}: {
  children: React.ReactNode;
  summary?: string;
  testId: string;
  action?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b last:border-b-0" data-testid={testId}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left py-3 px-2 hover-elevate rounded"
        >
          {children}
        </button>
        {action && <div className="pr-2 shrink-0">{action}</div>}
      </div>
      {expanded && summary && (
        <div className="px-4 pb-3 text-sm text-muted-foreground">
          {summary}
        </div>
      )}
    </div>
  );
}

function RootCausePatternsTab({
  patterns,
  onUseInCase,
}: {
  patterns: RootCausePattern[];
  onUseInCase?: (patternId: string, patternTitle: string) => void;
}) {
  return (
    <div className="border rounded">
      <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        <span>Pattern</span>
        <span>Category</span>
        <span>Frequency</span>
        <span>Industries</span>
      </div>
      {patterns.map((pattern) => (
        <ExpandableRow
          key={pattern.id}
          summary={pattern.summary}
          testId={`pattern-${pattern.id}`}
          action={
            pattern.hasV2Fields && onUseInCase ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onUseInCase(pattern.id, pattern.title);
                }}
                data-testid={`button-use-in-case-${pattern.id}`}
              >
                <Crosshair className="w-3 h-3 mr-1" />
                Use in Case
              </Button>
            ) : null
          }
        >
          <div className="grid grid-cols-4 gap-2 text-sm">
            <span className="font-medium">{pattern.title}</span>
            <Badge variant="outline" className="w-fit text-xs">{pattern.category}</Badge>
            <span className="text-muted-foreground">{pattern.frequency}</span>
            <span className="text-muted-foreground truncate">{pattern.industries.join(", ")}</span>
          </div>
        </ExpandableRow>
      ))}
    </div>
  );
}

function SolutionArchetypesTab({ archetypes }: { archetypes: SolutionArchetype[] }) {
  return (
    <div className="border rounded">
      <div className="grid grid-cols-3 gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        <span>Solution</span>
        <span>Applicable Root Causes</span>
        <span>Complexity</span>
      </div>
      {archetypes.map((archetype) => (
        <ExpandableRow key={archetype.id} summary={archetype.summary} testId={`archetype-${archetype.id}`}>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="font-medium">{archetype.name}</span>
            <span className="text-muted-foreground truncate">{archetype.applicableRootCauses.join(", ")}</span>
            <Badge variant="outline" className="w-fit text-xs">{archetype.complexity}</Badge>
          </div>
        </ExpandableRow>
      ))}
    </div>
  );
}

function PreventionFrameworksTab({ frameworks }: { frameworks: PreventionFramework[] }) {
  return (
    <div className="border rounded">
      <div className="grid grid-cols-3 gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        <span>Framework</span>
        <span>Risk Type</span>
        <span>Maturity Level</span>
      </div>
      {frameworks.map((framework) => (
        <ExpandableRow key={framework.id} summary={framework.summary} testId={`framework-${framework.id}`}>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="font-medium">{framework.name}</span>
            <span className="text-muted-foreground">{framework.riskType}</span>
            <Badge variant="outline" className="w-fit text-xs">{framework.maturityLevel}</Badge>
          </div>
        </ExpandableRow>
      ))}
    </div>
  );
}

function IndustryContextsTab({ contexts }: { contexts: IndustryContext[] }) {
  return (
    <div className="border rounded">
      <div className="grid grid-cols-3 gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        <span>Industry</span>
        <span>Case Type</span>
        <span>References</span>
      </div>
      {contexts.map((context) => (
        <ExpandableRow key={context.id} summary={context.summary} testId={`context-${context.id}`}>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="font-medium">{context.industry}</span>
            <Badge variant="outline" className="w-fit text-xs">{context.caseType}</Badge>
            <span className="text-muted-foreground">{context.referenceCount} cases</span>
          </div>
        </ExpandableRow>
      ))}
    </div>
  );
}

export function RCIKnowledgeLibrary({
  rootCausePatterns,
  solutionArchetypes,
  preventionFrameworks,
  industryContexts,
  activeCases,
  onAttachPattern,
}: RCIKnowledgeLibraryProps) {
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<{ id: string; title: string } | null>(null);
  const [attaching, setAttaching] = useState(false);

  const handleUseInCase = (patternId: string, patternTitle: string) => {
    setSelectedPattern({ id: patternId, title: patternTitle });
    setCaseDialogOpen(true);
  };

  const handleAttach = async (caseId: string) => {
    if (!selectedPattern || !onAttachPattern) return;
    setAttaching(true);
    try {
      await onAttachPattern(selectedPattern.id, caseId);
      setCaseDialogOpen(false);
      setSelectedPattern(null);
    } finally {
      setAttaching(false);
    }
  };

  const draftCases = activeCases?.filter((c) => c.status === "draft") || [];

  return (
    <>
      <Card data-testid="rci-knowledge-library">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base font-medium">RCI Knowledge Library</CardTitle>
            <Badge variant="secondary" className="text-xs">Proprietary Knowledge</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded border border-muted bg-muted/30">
              <p className="text-xs text-muted-foreground">
                This knowledge library represents accumulated professional experience and is not a prescriptive solution set.
              </p>
            </div>

            <Tabs defaultValue="patterns">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                <TabsTrigger value="patterns" className="text-xs" data-testid="tab-patterns">
                  Root Cause Patterns
                </TabsTrigger>
                <TabsTrigger value="solutions" className="text-xs" data-testid="tab-solutions">
                  Solution Archetypes
                </TabsTrigger>
                <TabsTrigger value="prevention" className="text-xs" data-testid="tab-prevention">
                  Prevention Frameworks
                </TabsTrigger>
                <TabsTrigger value="industry" className="text-xs" data-testid="tab-industry">
                  Industry Contexts
                </TabsTrigger>
              </TabsList>

              <TabsContent value="patterns" className="mt-4">
                <RootCausePatternsTab
                  patterns={rootCausePatterns}
                  onUseInCase={onAttachPattern ? handleUseInCase : undefined}
                />
              </TabsContent>

              <TabsContent value="solutions" className="mt-4">
                <SolutionArchetypesTab archetypes={solutionArchetypes} />
              </TabsContent>

              <TabsContent value="prevention" className="mt-4">
                <PreventionFrameworksTab frameworks={preventionFrameworks} />
              </TabsContent>

              <TabsContent value="industry" className="mt-4">
                <IndustryContextsTab contexts={industryContexts} />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* RCI Brain v2: Case selector dialog for "Use in Case" workflow */}
      <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Pattern to Case</DialogTitle>
            <DialogDescription>
              Select an active case to attach "{selectedPattern?.title}" as a root cause reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {draftCases.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active draft cases available. Create a case from a client first.
              </p>
            ) : (
              draftCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAttach(c.id)}
                  disabled={attaching}
                  className="w-full text-left p-3 border rounded hover:bg-muted/50 transition-colors disabled:opacity-50"
                  data-testid={`case-option-${c.id}`}
                >
                  <p className="text-sm font-medium">{c.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.problemStatement}</p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type {
  RootCausePattern,
  SolutionArchetype,
  PreventionFramework,
  IndustryContext,
  CaseOption,
  RCIKnowledgeLibraryProps,
};
