import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RCIKnowledgeLibrary } from "@/components/rci-knowledge-library";
import type { CaseOption } from "@/components/rci-knowledge-library";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { rootCauseLibrary } from "@shared/root-cause-library";
import type { DiagnosticCase } from "@shared/schema";

const categoryMap: Record<string, "Process" | "People" | "Systems" | "Governance"> = {
  Money: "Process",
  Manpower: "People",
  Materials: "Systems",
  Machinery: "Systems",
};

const availableIndustries = [
  ...new Set(rootCauseLibrary.flatMap((rc) => rc.applicableIndustries)),
].sort();

const patterns = rootCauseLibrary.map((rc) => ({
  id: rc.id,
  title: rc.title,
  category: categoryMap[rc.category] || ("Process" as const),
  fourMCategory: rc.category,
  frequency: (rc.baseConfidence >= 80 ? "Common" : rc.baseConfidence >= 70 ? "Moderate" : "Rare") as "Common" | "Moderate" | "Rare",
  industries: rc.applicableIndustries,
  summary: `${rc.whyItMatters} ${rc.interventionDirection}`,
  hasV2Fields: !!(rc.validationChecklist && rc.validationChecklist.length > 0),
  symptomTags: rc.symptomTags,
  baseConfidence: rc.baseConfidence,
}));

const mockArchetypes = [
  { id: "a1", name: "Process Redesign with Embedded Controls", applicableRootCauses: ["Process gaps", "Quality issues"], complexity: "Medium" as const, summary: "Restructure workflows to include mandatory checkpoints and automated controls that prevent deviation." },
  { id: "a2", name: "Knowledge Transfer Protocol", applicableRootCauses: ["Staff turnover", "Knowledge gaps"], complexity: "Low" as const, summary: "Structured handover procedures and documentation requirements to preserve institutional knowledge during transitions." },
  { id: "a3", name: "System Integration Bridge", applicableRootCauses: ["Legacy systems", "Data silos"], complexity: "High" as const, summary: "Middleware or API layer that connects disparate systems to enable real-time data flow without full replacement." },
  { id: "a4", name: "RACI Governance Framework", applicableRootCauses: ["Accountability gaps", "Cross-department issues"], complexity: "Medium" as const, summary: "Clear assignment of Responsible, Accountable, Consulted, and Informed roles for shared processes." },
];

const mockFrameworks = [
  { id: "f1", name: "Operational Risk Control Matrix", riskType: "Operational", maturityLevel: "Intermediate" as const, summary: "Structured mapping of operational risks to controls with defined owners and testing schedules." },
  { id: "f2", name: "Compliance Monitoring Calendar", riskType: "Compliance", maturityLevel: "Basic" as const, summary: "Scheduled review cycle for regulatory requirements with assigned responsibilities and escalation paths." },
  { id: "f3", name: "Continuous Improvement Loop", riskType: "Performance", maturityLevel: "Advanced" as const, summary: "Ongoing measurement and adjustment cycle based on leading indicators and root cause analysis." },
  { id: "f4", name: "Exception Management Protocol", riskType: "Operational", maturityLevel: "Intermediate" as const, summary: "Defined thresholds, escalation paths, and resolution tracking for process exceptions." },
];

const mockContexts = [
  { id: "c1", industry: "Manufacturing", caseType: "Operations" as const, referenceCount: 47, summary: "Cost reduction, quality improvement, and production efficiency cases across discrete and process manufacturing." },
  { id: "c2", industry: "Healthcare", caseType: "Compliance" as const, referenceCount: 23, summary: "Regulatory compliance, patient safety, and documentation improvement initiatives." },
  { id: "c3", industry: "Hospitality", caseType: "Operations" as const, referenceCount: 31, summary: "Service quality, staff retention, and operational efficiency in hotels and restaurants." },
  { id: "c4", industry: "Oil & Gas", caseType: "Transformation" as const, referenceCount: 12, summary: "Digital transformation, safety culture, and operational excellence programs." },
  { id: "c5", industry: "Logistics", caseType: "Operations" as const, referenceCount: 28, summary: "Supply chain optimization, warehouse efficiency, and delivery performance cases." },
];

export default function AdminKnowledge() {
  const { toast } = useToast();

  const { data: cases } = useQuery<DiagnosticCase[]>({
    queryKey: ["/api/admin/cases"],
  });

  const activeCases: CaseOption[] = (cases || [])
    .filter((c) => c.status === "draft")
    .map((c) => ({
      id: c.id,
      clientName: c.clientName,
      problemStatement: c.problemStatement,
      status: c.status || "draft",
    }));

  const handleAttachPattern = async (patternId: string, caseId: string) => {
    try {
      await apiRequest("POST", `/api/admin/cases/${caseId}/attach-pattern`, {
        rootCauseId: patternId,
      });
      toast({
        title: "Pattern Attached",
        description: "Root cause pattern has been linked to the case.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to attach pattern to case.",
        variant: "destructive",
      });
      throw new Error("Failed to attach");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold" data-testid="text-page-title">RCI Brain</h1>
              <p className="text-sm text-muted-foreground">Reference patterns, solutions, and frameworks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <RCIKnowledgeLibrary
          rootCausePatterns={patterns}
          solutionArchetypes={mockArchetypes}
          preventionFrameworks={mockFrameworks}
          industryContexts={mockContexts}
          activeCases={activeCases}
          onAttachPattern={handleAttachPattern}
          availableIndustries={availableIndustries}
        />
      </div>
    </div>
  );
}
