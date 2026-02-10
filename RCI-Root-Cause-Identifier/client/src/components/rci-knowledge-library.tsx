import { useState, useMemo } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crosshair, Brain, Sparkles, X, Info } from "lucide-react";
import type { SymptomTag, FourMCategory, ScoredRootCause } from "@shared/root-cause-library";
import { getLikelyRootCauses, SYMPTOM_TAGS } from "@shared/root-cause-library";

interface RootCausePattern {
  id: string;
  title: string;
  category: "Process" | "People" | "Systems" | "Governance";
  fourMCategory: FourMCategory;
  frequency: "Common" | "Moderate" | "Rare";
  industries: string[];
  summary?: string;
  hasV2Fields?: boolean;
  symptomTags?: SymptomTag[];
  baseConfidence: number;
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

interface CaseOption {
  id: string;
  clientName: string;
  problemStatement: string;
  status: string;
}

interface CaseContext {
  caseId: string;
  symptomTags: SymptomTag[];
}

interface RCIKnowledgeLibraryProps {
  rootCausePatterns: RootCausePattern[];
  solutionArchetypes: SolutionArchetype[];
  preventionFrameworks: PreventionFramework[];
  industryContexts: IndustryContext[];
  activeCases?: CaseOption[];
  onAttachPattern?: (patternId: string, caseId: string) => Promise<void>;
  availableIndustries?: string[];
  caseContext?: CaseContext;
}

const SYMPTOM_LABELS: Record<SymptomTag, string> = {
  MISSED_DEADLINES: "Missed Deadlines",
  COST_OVERRUNS: "Cost Overruns",
  HIGH_REWORK: "High Rework",
  LOW_ACCOUNTABILITY: "Low Accountability",
  FREQUENT_ESCALATIONS: "Frequent Escalations",
  QUALITY_ESCAPES: "Quality Escapes",
  FIRE_FIGHTING_CULTURE: "Fire-Fighting Culture",
  LOW_SYSTEM_ADOPTION: "Low System Adoption",
  CASH_FLOW_PRESSURE: "Cash Flow Pressure",
  HIGH_TURNOVER: "High Turnover",
  KNOWLEDGE_LOSS: "Knowledge Loss",
  SUPPLY_DISRUPTION: "Supply Disruption",
  CAPACITY_BOTTLENECK: "Capacity Bottleneck",
  CUSTOMER_COMPLAINTS: "Customer Complaints",
  MARGIN_EROSION: "Margin Erosion",
};

function ConfidenceBadge({ score }: { score: number }) {
  let label: string;
  let className: string;
  if (score >= 71) {
    label = "High";
    className = "bg-emerald-100 text-emerald-800 border-emerald-200";
  } else if (score >= 41) {
    label = "Medium";
    className = "bg-amber-100 text-amber-800 border-amber-200";
  } else {
    label = "Low";
    className = "bg-slate-100 text-slate-600 border-slate-200";
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-xs cursor-help ${className}`}>
            {label} ({score})
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p className="font-medium mb-1">Confidence Score: {score}/100</p>
          <p>Calculated from: 70% symptom overlap + 15% tag specificity + industry match (+10) + category match (+5).</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SymptomTagPill({
  tag,
  selected,
  onClick,
}: {
  tag: SymptomTag;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {SYMPTOM_LABELS[tag]}
      {selected && <X className="w-3 h-3 ml-1" />}
    </button>
  );
}

function RCIBrainLitePanel({
  selectedSymptoms,
  onToggleSymptom,
  topResults,
  onUseInCase,
  industry,
  onIndustryChange,
  availableIndustries,
}: {
  selectedSymptoms: SymptomTag[];
  onToggleSymptom: (tag: SymptomTag) => void;
  topResults: ScoredRootCause[];
  onUseInCase?: (patternId: string, patternTitle: string) => void;
  industry: string;
  onIndustryChange: (val: string) => void;
  availableIndustries: string[];
}) {
  return (
    <Card className="border-primary/20 bg-primary/[0.02]" data-testid="rci-brain-lite">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-medium">RCI Brain Lite</CardTitle>
          <Badge variant="secondary" className="text-xs">Quick Diagnosis</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Select observed symptoms to surface the most likely root causes from the knowledge library.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Observed Symptoms</label>
            {selectedSymptoms.length > 0 && (
              <button
                onClick={() => selectedSymptoms.forEach(onToggleSymptom)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOM_TAGS.map((tag) => (
              <SymptomTagPill
                key={tag}
                tag={tag}
                selected={selectedSymptoms.includes(tag)}
                onClick={() => onToggleSymptom(tag)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select value={industry} onValueChange={onIndustryChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filter by industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {availableIndustries.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedSymptoms.length > 0 && topResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">Top 3 Likely Root Causes</span>
            </div>
            <div className="space-y-2">
              {topResults.slice(0, 3).map((result, idx) => (
                <div
                  key={result.entry.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                  data-testid={`brain-lite-result-${idx}`}
                >
                  <span className="text-lg font-semibold text-muted-foreground w-6 text-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.entry.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ConfidenceBadge score={result.confidenceScore} />
                      <span className="text-xs text-muted-foreground">
                        Matched: {result.matchedTags.map((t) => SYMPTOM_LABELS[t]).join(", ")}
                      </span>
                    </div>
                  </div>
                  {onUseInCase && result.entry.validationChecklist && result.entry.validationChecklist.length > 0 && (
                    <div className="shrink-0">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => onUseInCase(result.entry.id, result.entry.title)}
                              data-testid={`brain-lite-use-${result.entry.id}`}
                            >
                              <Crosshair className="w-3 h-3 mr-1" />
                              Use in Case
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs max-w-[200px]">
                            This will freeze the current pattern details into the case.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic flex items-center gap-1">
              <Info className="w-3 h-3" />
              High confidence ≠ confirmed root cause. Validate with evidence checklist.
            </p>
          </div>
        )}

        {selectedSymptoms.length > 0 && topResults.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            No root causes match the selected symptoms. Try different symptom combinations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ExpandableRow({
  children,
  summary,
  testId,
  action,
  dimmed,
}: {
  children: React.ReactNode;
  summary?: string;
  testId: string;
  action?: React.ReactNode;
  dimmed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border-b last:border-b-0 transition-opacity ${dimmed ? "opacity-40" : ""}`}
      data-testid={testId}
    >
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
  filterCategory,
  onCategoryChange,
  filterIndustry,
  onIndustryChange,
  filterSymptoms,
  onToggleSymptom,
  availableIndustries,
  caseContext,
  scoredResults,
}: {
  patterns: RootCausePattern[];
  onUseInCase?: (patternId: string, patternTitle: string) => void;
  filterCategory: string;
  onCategoryChange: (val: string) => void;
  filterIndustry: string;
  onIndustryChange: (val: string) => void;
  filterSymptoms: SymptomTag[];
  onToggleSymptom: (tag: SymptomTag) => void;
  availableIndustries: string[];
  caseContext?: CaseContext;
  scoredResults: Map<string, ScoredRootCause>;
}) {
  const filteredPatterns = useMemo(() => {
    let result = [...patterns];

    if (filterCategory !== "all") {
      result = result.filter((p) => p.fourMCategory === filterCategory);
    }

    if (filterIndustry !== "all") {
      result = result.filter((p) => p.industries.some((i) => i === filterIndustry));
    }

    if (filterSymptoms.length > 0) {
      result = result.filter((p) => {
        if (!p.symptomTags || p.symptomTags.length === 0) return false;
        return filterSymptoms.some((s) => p.symptomTags!.includes(s));
      });
    }

    result.sort((a, b) => {
      const scoreA = scoredResults.get(a.id)?.confidenceScore ?? a.baseConfidence;
      const scoreB = scoredResults.get(b.id)?.confidenceScore ?? b.baseConfidence;
      return scoreB - scoreA;
    });

    return result;
  }, [patterns, filterCategory, filterIndustry, filterSymptoms, scoredResults]);

  const hasActiveFilters = filterCategory !== "all" || filterIndustry !== "all" || filterSymptoms.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="4M Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Money">Money</SelectItem>
            <SelectItem value="Manpower">Manpower</SelectItem>
            <SelectItem value="Materials">Materials</SelectItem>
            <SelectItem value="Machinery">Machinery</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterIndustry} onValueChange={onIndustryChange}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {availableIndustries.map((ind) => (
              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-1">
          {filterSymptoms.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-destructive/10"
              onClick={() => onToggleSymptom(tag)}
            >
              {SYMPTOM_LABELS[tag]} <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>

        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground">
            {filteredPatterns.length} of {patterns.length} patterns
          </span>
        )}
      </div>

      <div className="border rounded">
        <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
          <span>Pattern</span>
          <span>Category</span>
          <span>Confidence</span>
          <span>Industries</span>
          <span className="text-right">Actions</span>
        </div>
        {filteredPatterns.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No patterns match the current filters.
          </div>
        )}
        {filteredPatterns.map((pattern) => {
          const scored = scoredResults.get(pattern.id);
          const displayScore = scored?.confidenceScore ?? pattern.baseConfidence;

          let caseOverlap = 0;
          let caseTotalTags = 0;
          let isDimmed = false;
          if (caseContext && caseContext.symptomTags.length > 0) {
            caseTotalTags = caseContext.symptomTags.length;
            if (pattern.symptomTags && pattern.symptomTags.length > 0) {
              caseOverlap = caseContext.symptomTags.filter((s) =>
                pattern.symptomTags!.includes(s)
              ).length;
            }
            isDimmed = caseOverlap === 0;
          }

          return (
            <ExpandableRow
              key={pattern.id}
              summary={pattern.summary}
              testId={`pattern-${pattern.id}`}
              dimmed={isDimmed}
              action={
                <div className="flex items-center gap-2">
                  {caseContext && caseContext.symptomTags.length > 0 && (
                    <span className={`text-xs whitespace-nowrap ${caseOverlap > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                      {caseOverlap}/{caseTotalTags} matched
                    </span>
                  )}
                  {pattern.hasV2Fields && onUseInCase ? (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs max-w-[200px]">
                          This will freeze the current pattern details into the case.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>
              }
            >
              <div className="grid grid-cols-5 gap-2 text-sm items-center">
                <span className="font-medium">{pattern.title}</span>
                <Badge variant="outline" className="w-fit text-xs">{pattern.category}</Badge>
                <ConfidenceBadge score={displayScore} />
                <span className="text-muted-foreground truncate text-xs">{pattern.industries.slice(0, 3).join(", ")}{pattern.industries.length > 3 ? ` +${pattern.industries.length - 3}` : ""}</span>
                <span />
              </div>
            </ExpandableRow>
          );
        })}
      </div>
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
  availableIndustries = [],
  caseContext,
}: RCIKnowledgeLibraryProps) {
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<{ id: string; title: string } | null>(null);
  const [attaching, setAttaching] = useState(false);

  const [brainLiteSymptoms, setBrainLiteSymptoms] = useState<SymptomTag[]>([]);
  const [brainLiteIndustry, setBrainLiteIndustry] = useState("all");

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterSymptoms, setFilterSymptoms] = useState<SymptomTag[]>([]);

  const brainLiteResults = useMemo(() => {
    if (brainLiteSymptoms.length === 0) return [];
    return getLikelyRootCauses(brainLiteSymptoms, {
      industry: brainLiteIndustry !== "all" ? brainLiteIndustry : undefined,
    });
  }, [brainLiteSymptoms, brainLiteIndustry]);

  const scoredResultsMap = useMemo(() => {
    const map = new Map<string, ScoredRootCause>();
    const symptoms = filterSymptoms.length > 0 ? filterSymptoms : brainLiteSymptoms;
    if (symptoms.length > 0) {
      const results = getLikelyRootCauses(symptoms, {
        industry: filterIndustry !== "all" ? filterIndustry : brainLiteIndustry !== "all" ? brainLiteIndustry : undefined,
        category: filterCategory !== "all" ? filterCategory as FourMCategory : undefined,
      });
      for (const r of results) {
        map.set(r.entry.id, r);
      }
    }
    return map;
  }, [filterSymptoms, brainLiteSymptoms, filterIndustry, brainLiteIndustry, filterCategory]);

  const toggleBrainLiteSymptom = (tag: SymptomTag) => {
    setBrainLiteSymptoms((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleFilterSymptom = (tag: SymptomTag) => {
    setFilterSymptoms((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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
      <div className="space-y-6">
        <RCIBrainLitePanel
          selectedSymptoms={brainLiteSymptoms}
          onToggleSymptom={toggleBrainLiteSymptom}
          topResults={brainLiteResults}
          onUseInCase={onAttachPattern ? handleUseInCase : undefined}
          industry={brainLiteIndustry}
          onIndustryChange={setBrainLiteIndustry}
          availableIndustries={availableIndustries}
        />

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
                    filterCategory={filterCategory}
                    onCategoryChange={setFilterCategory}
                    filterIndustry={filterIndustry}
                    onIndustryChange={setFilterIndustry}
                    filterSymptoms={filterSymptoms}
                    onToggleSymptom={toggleFilterSymptom}
                    availableIndustries={availableIndustries}
                    caseContext={caseContext}
                    scoredResults={scoredResultsMap}
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
      </div>

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
  CaseContext,
  RCIKnowledgeLibraryProps,
};
