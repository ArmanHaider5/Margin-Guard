import OpenAI from "openai";
import pRetry, { AbortError } from "p-retry";
import { type RootCause, type FourMCategory, type ManagementIndicator, categoryToIndicator } from "@shared/schema";
import { problemLibrary, getProblemById, getCategoryLabel } from "@shared/problem-library";
import { allIndustryProblems, industryLabels, getIndustryProblemById, type Industry } from "@shared/industry-problems";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

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

export async function analyzeSymptom(input: AnalysisInput): Promise<{ rootCauses: RootCause[]; primaryIndicator: ManagementIndicator }> {
  const prompt = buildAnalysisPrompt(input);

  try {
    const result = await pRetry(
      async () => {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
              {
                role: "system",
                content: buildSystemPrompt(input.industry)
              },
              {
                role: "user",
                content: prompt
              }
            ],
            max_completion_tokens: 8192,
            response_format: { type: "json_object" }
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error("No response from AI");
          }

          const parsed = JSON.parse(content);
          const rootCauses = parsed.rootCauses as RootCause[];
          
          // Determine primary indicator from the highest confidence root cause
          const primaryIndicator = rootCauses[0]?.indicator || "Manpower Indicator";
          
          return { rootCauses, primaryIndicator };
        } catch (error: any) {
          if (isRateLimitError(error)) {
            throw error;
          }
          throw new AbortError(error);
        }
      },
      {
        retries: 7,
        minTimeout: 2000,
        maxTimeout: 128000,
        factor: 2,
      }
    );

    return result;
  } catch (error) {
    console.error("AI analysis failed:", error);
    return getFallbackAnalysis(input);
  }
}

function buildSystemPrompt(userIndustry?: string): string {
  // Build a comprehensive summary of the problem library organized by category
  const categoryGroups: Record<string, typeof problemLibrary> = {};
  problemLibrary.forEach(p => {
    if (!categoryGroups[p.diagnosticCategory]) {
      categoryGroups[p.diagnosticCategory] = [];
    }
    categoryGroups[p.diagnosticCategory].push(p);
  });
  
  // Create category summaries with all problems
  const problemSummary = Object.entries(categoryGroups).map(([category, problems]) => {
    const categoryLabel = getCategoryLabel(category as any) || category;
    const problemList = problems.map(p => 
      `  • ${p.title} (${p.dominantM}→${p.indicator})`
    ).join("\n");
    return `[${categoryLabel}]\n${problemList}`;
  }).join("\n\n");

  // Build industry-specific problem knowledge base
  const industryGroups: Record<string, typeof allIndustryProblems> = {};
  allIndustryProblems.forEach(p => {
    if (!industryGroups[p.industry]) {
      industryGroups[p.industry] = [];
    }
    industryGroups[p.industry].push(p);
  });

  // Create industry summaries with their problems
  const industrySummary = Object.entries(industryGroups).map(([industry, problems]) => {
    const industryLabel = industryLabels[industry as Industry] || industry;
    const problemList = problems.map(p => 
      `  • ${p.title}: ${p.description} (${p.dominantM.join("/")}→${p.indicator})`
    ).join("\n");
    return `[${industryLabel}]\n${problemList}`;
  }).join("\n\n");

  // If user has a specific industry, highlight that knowledge
  let industryContext = "";
  if (userIndustry && industryGroups[userIndustry]) {
    const relevantProblems = industryGroups[userIndustry];
    industryContext = `\n\nUSER'S INDUSTRY (${industryLabels[userIndustry as Industry] || userIndustry}) - PRIORITIZE THESE PATTERNS:
${relevantProblems.map(p => 
  `• ${p.title}: ${p.description}
  Causes: ${p.commonCauses.slice(0, 2).join(", ")}
  Solutions: ${p.solutions.slice(0, 2).join(", ")}
  Prevention: ${p.preventionSteps.slice(0, 2).join(", ")}`
).join("\n\n")}`;
  }

  return `You are an expert business consultant for SMEs, using the 4M framework (Money, Materials, Manpower, Machinery) to diagnose operational problems.

You are part of RCI (Root Cause Identifier), a diagnostic system built on decades of hands-on consulting experience helping SMEs across Malaysia and beyond.

THE 4M FRAMEWORK:
- Money: Financial control, cash flow, budgeting, credit, receivables
- Materials: Inventory, stock control, raw materials, suppliers, wastage
- Manpower: Staff skills, training, supervision, discipline, productivity
- Machinery: Equipment, maintenance, utilisation, production efficiency

MANAGEMENT INDICATORS (CEO Weekly Report):
- Money Indicator: Tracks financial health and cash position
- Material Indicator: Tracks inventory accuracy and supply chain
- Manpower Indicator: Tracks workforce productivity and skills
- Machine Indicator: Tracks equipment uptime and efficiency

KNOWN PROBLEM PATTERNS BY CATEGORY:
${problemSummary}

INDUSTRY-SPECIFIC PROBLEM KNOWLEDGE BASE:
${industrySummary}
${industryContext}

YOUR TASK:
1. Analyze the problem and identify 2-4 root causes
2. Classify each cause into ONE of the 4Ms (Money, Materials, Manpower, Machinery)
3. Link each cause to the correct Management Indicator
4. Provide estimated impact (cost/time/efficiency)
5. Suggest prevention steps to avoid recurrence
6. Use plain language that SME owners can understand

RESPONSE FORMAT (valid JSON):
{
  "rootCauses": [
    {
      "cause": "Clear one-sentence description",
      "category": "Money|Materials|Manpower|Machinery",
      "indicator": "Money Indicator|Material Indicator|Manpower Indicator|Machine Indicator",
      "confidence": 1-5 (5 = highest),
      "explanation": "Plain language explanation of why this is happening",
      "recommendations": ["Action 1", "Action 2", "Action 3", "Action 4", "Action 5"],
      "estimatedImpact": {
        "cost": "Brief cost impact description",
        "time": "Brief time impact description",
        "efficiency": "Brief efficiency impact description"
      },
      "preventionSteps": ["Prevention step 1", "Prevention step 2", "Prevention step 3"]
    }
  ]
}

IMPORTANT RULES:
- Use only Money, Materials, Manpower, or Machinery for category (NOT Methods)
- Match indicator to category: Money→Money Indicator, Materials→Material Indicator, etc.
- Keep all language simple - no jargon or technical terms
- Make recommendations practical and implementable
- Include prevention steps to stop problems recurring`;
}

function buildAnalysisPrompt(input: AnalysisInput): string {
  const { symptom, symptomCategory, diagnosticCategory, selectedProblemId, selectedIndustryProblemId, industry, onset, responses } = input;
  
  let prompt = `PROBLEM ANALYSIS REQUEST:\n\n`;
  
  // If user selected from category-based problem library, include that context
  if (selectedProblemId) {
    const selectedProblem = getProblemById(selectedProblemId);
    if (selectedProblem) {
      prompt += `SELECTED PROBLEM FROM LIBRARY:\n`;
      prompt += `Title: ${selectedProblem.title}\n`;
      prompt += `Description: ${selectedProblem.description}\n`;
      prompt += `Typical Category: ${selectedProblem.dominantM}\n`;
      prompt += `Known Causes: ${selectedProblem.commonCauses.join(", ")}\n\n`;
    }
  }

  // If user selected from industry-specific problem library, include that context
  if (selectedIndustryProblemId) {
    const industryProblem = getIndustryProblemById(selectedIndustryProblemId);
    if (industryProblem) {
      prompt += `SELECTED INDUSTRY-SPECIFIC PROBLEM:\n`;
      prompt += `Industry: ${industryLabels[industryProblem.industry] || industryProblem.industry}\n`;
      prompt += `Title: ${industryProblem.title}\n`;
      prompt += `Description: ${industryProblem.description}\n`;
      prompt += `Primary M Categories: ${industryProblem.dominantM.join(", ")}\n`;
      prompt += `Known Causes: ${industryProblem.commonCauses.join(", ")}\n`;
      prompt += `Recommended Solutions: ${industryProblem.solutions.join(", ")}\n`;
      prompt += `Prevention Steps: ${industryProblem.preventionSteps.join(", ")}\n\n`;
    }
  }

  // Include user's industry context
  if (industry) {
    prompt += `USER'S INDUSTRY: ${industryLabels[industry as Industry] || industry}\n`;
  }
  
  prompt += `USER'S DESCRIPTION: ${symptom}\n`;
  prompt += `PROBLEM AREA: ${symptomCategory}\n`;
  
  if (diagnosticCategory) {
    prompt += `DIAGNOSTIC CATEGORY: ${getCategoryLabel(diagnosticCategory as any)}\n`;
  }
  
  prompt += `ONSET: ${onset === "sudden" ? "Happened suddenly" : "Developed gradually over time"}\n\n`;
  
  prompt += `FOLLOW-UP RESPONSES:\n`;
  Object.entries(responses).forEach(([key, value]) => {
    const keyLabels: Record<string, string> = {
      timing: "Problem timing",
      staffChanges: "Staff changes",
      processChanges: "Process changes",
      workload: "Workload changes",
      equipment: "Equipment status",
      supplier: "Supplier status"
    };
    prompt += `- ${keyLabels[key] || key}: ${value}\n`;
  });

  prompt += `\nAnalyze this problem and provide 2-4 root causes with the 4M classification, management indicator link, estimated impact, recommendations, and prevention steps. Leverage industry-specific knowledge when relevant.`;

  return prompt;
}

function getFallbackAnalysis(input: AnalysisInput): { rootCauses: RootCause[]; primaryIndicator: ManagementIndicator } {
  // If a problem was selected from category-based library, use its data
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

  // If an industry-specific problem was selected, use its data
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

  // Fallback based on symptom category
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
