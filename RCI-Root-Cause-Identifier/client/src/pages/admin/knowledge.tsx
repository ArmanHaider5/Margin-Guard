import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { RCIKnowledgeLibrary } from "@/components/rci-knowledge-library";
import { ArrowLeft } from "lucide-react";

const mockPatterns = [
  { id: "p1", title: "Manufacturing Cost Variance", category: "Process" as const, frequency: "Common" as const, industries: ["Manufacturing", "Construction"], summary: "Unexplained increases in production costs often stem from untracked process deviations, material waste, or unmonitored rework cycles." },
  { id: "p2", title: "Supervisory Knowledge Gap", category: "People" as const, frequency: "Moderate" as const, industries: ["Hospitality", "Healthcare", "Retail"], summary: "Loss of institutional knowledge due to turnover in supervisory roles leads to inconsistent decision-making and exception handling." },
  { id: "p3", title: "Legacy System Visibility Gap", category: "Systems" as const, frequency: "Common" as const, industries: ["Healthcare", "Manufacturing", "Logistics"], summary: "Older ERP and inventory systems lack real-time data capabilities, forcing manual reconciliation and delayed decisions." },
  { id: "p4", title: "Cross-Department Accountability Void", category: "Governance" as const, frequency: "Moderate" as const, industries: ["Property Development", "Oil & Gas"], summary: "Shared processes without clear ownership result in issues falling through the cracks between departments." },
  { id: "p5", title: "Quality Control Checkpoint Gaps", category: "Process" as const, frequency: "Common" as const, industries: ["Manufacturing", "F&B", "Construction"], summary: "Missing or informal quality gates allow defects to propagate downstream, increasing rework and customer complaints." },
];

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
          rootCausePatterns={mockPatterns}
          solutionArchetypes={mockArchetypes}
          preventionFrameworks={mockFrameworks}
          industryContexts={mockContexts}
        />
      </div>
    </div>
  );
}
