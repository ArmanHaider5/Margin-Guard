import { type RootCause, type FourMCategory, type ManagementIndicator, categoryToIndicator } from "@shared/schema";
import { problemLibrary, getProblemById, getCategoryLabel } from "@shared/problem-library";
import { allIndustryProblems, industryLabels, getIndustryProblemById, type Industry } from "@shared/industry-problems";
import { runExpertDiagnosis } from "../modules/diagnostics/engines/root-cause-expert-engine";
import { normalizeSignals } from "../signals/signal-normalizer";
import { generateConsultingDiagnosticReport, type ConsultingDiagnosticReport } from "../modules/diagnostics/engines/consulting-diagnostic-engine";
import { manufacturingRootCauseLibrary } from "../industry-models/manufacturing/manufacturing-root-causes";
import { manufacturingDiagnosticChains } from "../industries/manufacturing-diagnostic-chains";

interface AnalysisInput {
  symptom: string;
  symptomCategory: string;
  diagnosticCategory?: string;
  selectedProblemId?: string;
  selectedIndustryProblemId?: string;
  industry?: string;
  onset: string;
  responses: Record<string, string>;
}

const categoryToIndicatorMap: Record<string, ManagementIndicator> = {
  "Money": "Money Indicator",
  "Materials": "Material Indicator",
  "Manpower": "Manpower Indicator",
  "Machinery": "Machine Indicator",
};

export interface AnalysisResult {
  rootCauses: RootCause[];
  primaryIndicator: ManagementIndicator;
  consultingReport?: ConsultingDiagnosticReport | null;
}

export async function analyzeSymptom(input: AnalysisInput): Promise<AnalysisResult> {
  console.log("📄 PIPELINE: DOCUMENT PARSING STARTED");
  const inputText = buildAnalysisText(input);

  console.log("📊 PIPELINE: SIGNAL NORMALIZATION COMPLETE");
  const normalizedSignals = normalizeSignals(inputText);
  const signalIds = normalizedSignals.map(s => s.signalId);

  console.log("📊 PIPELINE: SIGNAL AGGREGATION COMPLETE");

  console.log("🔗 PIPELINE: SIGNAL MAP GENERATED");

  if (signalIds.length >= 2) {
    const expertResults = runExpertDiagnosis(signalIds, 4);

    if (expertResults.length > 0) {
      const rootCauses: RootCause[] = expertResults.map(f => ({
        cause: f.name,
        category: f.category as FourMCategory,
        indicator: categoryToIndicatorMap[f.category] || "Manpower Indicator",
        confidence: Math.min(5, Math.max(1, Math.round(f.finalScore / 10))),
        explanation: f.description,
        recommendations: [
          "Review current processes related to this root cause",
          "Implement corrective actions targeting the identified signals",
          "Monitor KPIs to track improvement",
          "Schedule follow-up assessment in 2-4 weeks",
          "Document findings for institutional knowledge"
        ],
        estimatedImpact: {
          cost: "Impact varies based on implementation scope",
          time: "Improvement expected within 2-4 weeks",
          efficiency: "10-25% efficiency gain possible"
        },
        preventionSteps: [
          "Establish regular monitoring of related KPIs",
          "Create standard operating procedures",
          "Schedule periodic reviews"
        ]
      }));

      const mfgRootCauseLookup = new Map(manufacturingRootCauseLibrary.map(rc => [rc.id, rc]));
      const matchedEntries = expertResults
        .map(er => mfgRootCauseLookup.get(er.id))
        .filter((rc): rc is NonNullable<typeof rc> => rc != null);

      const matchedMfgRootCauses = matchedEntries.map(entry => ({
        id: entry.id,
        name: entry.name,
        tier: (entry.tier === "primary" ? 1 : 2) as 1 | 2 | 3,
        category: entry.category,
        description: entry.description,
        triggers: entry.triggers,
        supportSignals: entry.supportingSignals,
      }));

      const allKpis: string[] = [];

      console.log("📋 PIPELINE: CONSULTING DIAGNOSTIC ENGINE STARTED");
      const consultingReport = generateConsultingDiagnosticReport({
        rootCauses: matchedMfgRootCauses,
        signals: normalizedSignals,
        kpis: allKpis,
        chains: manufacturingDiagnosticChains
      });

      return {
        rootCauses,
        primaryIndicator: rootCauses[0].indicator,
        consultingReport
      };
    }
  }

  return getFallbackAnalysis(input);
}

function buildAnalysisText(input: AnalysisInput): string {
  const parts: string[] = [];

  parts.push(input.symptom);

  if (input.selectedProblemId) {
    const problem = getProblemById(input.selectedProblemId);
    if (problem) {
      parts.push(problem.title);
      parts.push(problem.description);
      parts.push(problem.commonCauses.join(" "));
    }
  }

  if (input.selectedIndustryProblemId) {
    const industryProblem = getIndustryProblemById(input.selectedIndustryProblemId);
    if (industryProblem) {
      parts.push(industryProblem.title);
      parts.push(industryProblem.description);
      parts.push(industryProblem.commonCauses.join(" "));
    }
  }

  Object.values(input.responses).forEach(v => parts.push(v));

  return parts.join("\n");
}

function getFallbackAnalysis(input: AnalysisInput): AnalysisResult {
  if (input.selectedProblemId) {
    const problem = getProblemById(input.selectedProblemId);
    if (problem) {
      return {
        rootCauses: [{
          cause: problem.title,
          category: problem.dominantM,
          indicator: problem.indicator,
          confidence: 4,
          explanation: problem.description,
          recommendations: problem.recommendedActions,
          estimatedImpact: problem.impactNotes,
          preventionSteps: problem.preventionSteps
        }],
        primaryIndicator: problem.indicator
      };
    }
  }

  if (input.selectedIndustryProblemId) {
    const problem = getIndustryProblemById(input.selectedIndustryProblemId);
    if (problem) {
      const primaryCategory = problem.dominantM[0];
      return {
        rootCauses: [{
          cause: problem.title,
          category: primaryCategory,
          indicator: problem.indicator,
          confidence: 4,
          explanation: problem.description,
          recommendations: problem.solutions,
          estimatedImpact: {
            cost: "Impact varies based on implementation",
            time: "Improvement expected within 2-4 weeks",
            efficiency: "10-25% efficiency gain possible"
          },
          preventionSteps: problem.preventionSteps
        }],
        primaryIndicator: problem.indicator
      };
    }
  }

  const categoryMap: Record<string, { cause: string; category: FourMCategory; indicator: ManagementIndicator; explanation: string }> = {
    financial_control: {
      cause: "Cash flow management needs attention",
      category: "Money",
      indicator: "Money Indicator",
      explanation: "Financial issues often stem from gaps in how money flows through the business - from sales to collection to payment of expenses.",
    },
    inventory_materials: {
      cause: "Stock control system gaps",
      category: "Materials",
      indicator: "Material Indicator",
      explanation: "Inventory problems typically come from not having accurate information about what's in stock and when to reorder.",
    },
    production_efficiency: {
      cause: "Machine utilisation below potential",
      category: "Machinery",
      indicator: "Machine Indicator",
      explanation: "Equipment often runs at less than full capacity due to scheduling gaps, maintenance issues, or waiting for materials.",
    },
    workforce: {
      cause: "Staff skills or supervision gaps",
      category: "Manpower",
      indicator: "Manpower Indicator",
      explanation: "Workforce issues usually trace back to training gaps, unclear expectations, or supervisors not having time to manage their teams.",
    },
    quality: {
      cause: "Quality control process gaps",
      category: "Materials",
      indicator: "Material Indicator",
      explanation: "Quality problems often come from unclear standards, skipped checks, or raw material variations.",
    },
    sales_customer: {
      cause: "Customer relationship management gaps",
      category: "Money",
      indicator: "Money Indicator",
      explanation: "Sales and customer issues often stem from not staying close to customers or failing to adapt to their changing needs.",
    },
    strategic_management: {
      cause: "Management communication gaps",
      category: "Manpower",
      indicator: "Manpower Indicator",
      explanation: "Strategic issues often come from unclear decision-making, poor communication between departments, or lack of clear direction.",
    },
    work_execution: {
      cause: "Work flow coordination gaps",
      category: "Manpower",
      indicator: "Manpower Indicator",
      explanation: "Execution problems typically come from work not being prepared, assigned, or coordinated properly.",
    },
  };

  const fallback = categoryMap[input.diagnosticCategory || input.symptomCategory] || categoryMap.workforce;

  return {
    rootCauses: [
      {
        cause: fallback.cause,
        category: fallback.category,
        indicator: fallback.indicator,
        confidence: 4,
        explanation: fallback.explanation,
        recommendations: [
          "Review your current process step-by-step to identify where gaps exist",
          "Talk with your team to understand what's working and what's not",
          "Start with one small improvement this week and track the results",
          "Set up a weekly check to monitor progress and adjust as needed",
          "Document what works so you can train others and maintain consistency"
        ],
        estimatedImpact: {
          cost: "Potential savings of 5-15% in affected area",
          time: "Could save 2-4 hours per week once fixed",
          efficiency: "Expect 10-20% improvement in workflow"
        },
        preventionSteps: [
          "Create a simple checklist for the key steps",
          "Assign clear responsibility for each area",
          "Schedule regular reviews to catch problems early"
        ]
      },
      {
        cause: "Communication gaps between team members",
        category: "Manpower" as FourMCategory,
        indicator: "Manpower Indicator" as ManagementIndicator,
        confidence: 3,
        explanation: "When information doesn't flow smoothly between people or departments, problems multiply. Small issues become big ones because they're not caught early.",
        recommendations: [
          "Hold brief daily check-ins with your team (10-15 minutes)",
          "Create a simple way to report issues immediately",
          "Make sure everyone knows who to ask when they need help"
        ],
        estimatedImpact: {
          cost: "Reduces rework and error costs",
          time: "Saves time on miscommunication fixes",
          efficiency: "Smoother workflows and less frustration"
        },
        preventionSteps: [
          "Daily team huddles",
          "Clear escalation paths",
          "Regular cross-department meetings"
        ]
      }
    ],
    primaryIndicator: fallback.indicator
  };
}
