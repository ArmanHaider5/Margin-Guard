import type { OntologyTerm } from "../shared/index.js";

/**
 * The Document Parser's v1 term registry, hand-authored and transcribed directly
 * from the approved architecture documents. Per `04_MGD_KNOWLEDGE_LIBRARY.md`'s
 * promotion-path principle: this is deliberately v1, code-based data, not yet the
 * full governed Knowledge Library (`docs/04_MGD_KNOWLEDGE_LIBRARY.md`) — once that
 * Library is implemented, this array's content migrates into it wholesale, in the
 * same shape, without a redesign.
 *
 * Every entry's `sourceReference` must point at a real section of an approved
 * document. Synonyms are realistic labels a consultant would actually see in an SME
 * spreadsheet or report header — never invented business concepts.
 */
export const ONTOLOGY_CORE_TERMS: readonly OntologyTerm[] = [
  { canonicalTerm: "Organisation", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.1", category: "ontology-core", synonyms: ["Organization", "Company", "Client", "Business Entity"] },
  { canonicalTerm: "Department", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.2", category: "ontology-core", synonyms: ["Dept", "Division", "Function"] },
  { canonicalTerm: "Business Unit", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.3", category: "ontology-core", synonyms: ["BU", "Segment"] },
  { canonicalTerm: "Location", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.4", category: "ontology-core", synonyms: ["Site", "Facility", "Branch"] },
  { canonicalTerm: "Process", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.5", category: "ontology-core", synonyms: ["Workflow Process"] },
  { canonicalTerm: "Activity", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.6", category: "ontology-core", synonyms: ["Task", "Step"] },
  { canonicalTerm: "Transaction", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.7", category: "ontology-core", synonyms: ["Txn", "Trans", "Entry"] },
  { canonicalTerm: "Document", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.8", category: "ontology-core", synonyms: ["File", "Record"] },
  { canonicalTerm: "Evidence", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.9", category: "ontology-core", synonyms: ["Proof", "Source Fact"] },
  { canonicalTerm: "Signal", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.10", category: "ontology-core", synonyms: ["Indicator", "Pattern"] },
  { canonicalTerm: "Metric", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.11", category: "ontology-core", synonyms: ["Measure", "Measurement"] },
  { canonicalTerm: "KPI", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.12", category: "ontology-core", synonyms: ["Key Performance Indicator"] },
  { canonicalTerm: "Financial Ratio", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.13", category: "ontology-core", synonyms: ["Fin Ratio"] },
  { canonicalTerm: "Operational Ratio", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.14", category: "ontology-core", synonyms: ["Ops Ratio"] },
  { canonicalTerm: "Knowledge Rule", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.15", category: "ontology-core", synonyms: ["Rule"] },
  { canonicalTerm: "Finding", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.16", category: "ontology-core", synonyms: ["Observation"] },
  { canonicalTerm: "Root Cause", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.17", category: "ontology-core", synonyms: ["Cause", "RC"] },
  { canonicalTerm: "Recommendation", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.18", category: "ontology-core", synonyms: ["Rec", "Action Item"] },
  { canonicalTerm: "Opportunity", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.19", category: "ontology-core", synonyms: ["Value Opportunity"] },
  { canonicalTerm: "Risk", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.20", category: "ontology-core", synonyms: ["Exposure"] },
  { canonicalTerm: "Benchmark", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.21", category: "ontology-core", synonyms: ["Target", "Standard"] },
  { canonicalTerm: "Insight", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.22", category: "ontology-core", synonyms: ["Conclusion"] },
  { canonicalTerm: "Narrative", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.23", category: "ontology-core", synonyms: ["Summary Narrative", "Explanation"] },
  { canonicalTerm: "Decision", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.24", category: "ontology-core", synonyms: ["Determination"] },
  { canonicalTerm: "Action", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.25", category: "ontology-core", synonyms: ["Executed Step"] },
  { canonicalTerm: "Outcome", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.26", category: "ontology-core", synonyms: ["Result"] },
  { canonicalTerm: "Performance", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.27", category: "ontology-core", synonyms: ["Performance Level"] },
  { canonicalTerm: "Improvement", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.28", category: "ontology-core", synonyms: ["Gain", "Uplift"] },
  { canonicalTerm: "Maturity", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.29", category: "ontology-core", synonyms: ["Maturity Level"] },
  { canonicalTerm: "Consultant", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.30", category: "ontology-core", synonyms: ["Advisor", "Analyst"] },
  { canonicalTerm: "Diagnostic", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.31", category: "ontology-core", synonyms: ["Assessment", "Engagement"] },
  { canonicalTerm: "Report", sourceReference: "00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md §3.32", category: "ontology-core", synonyms: ["Deliverable"] },
];

/**
 * Financial Object Model terms not already covered by ONTOLOGY_CORE_TERMS above
 * (e.g. "Transaction" and "Financial Ratio" are Ontology-core terms this list does
 * not re-declare, to avoid two entries competing to match the same label).
 */
export const FINANCIAL_OBJECT_MODEL_TERMS: readonly OntologyTerm[] = [
  { canonicalTerm: "Financial Account", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Account", "GL Account", "COA Account"] },
  { canonicalTerm: "Account Group", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Account Category", "Account Class"] },
  { canonicalTerm: "Ledger Entry", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["GL Entry", "Journal Line"] },
  { canonicalTerm: "Posting", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Journal Posting"] },
  { canonicalTerm: "Balance", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Bal", "Closing Balance", "Account Balance"] },
  { canonicalTerm: "Variance", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Var", "Budget Variance"] },
  { canonicalTerm: "Period", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Fiscal Period", "Reporting Period"] },
  { canonicalTerm: "Working Capital Component", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Working Capital Item"] },
  { canonicalTerm: "Cash Movement", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Cash Flow Item", "Cash Transaction"] },
  { canonicalTerm: "Asset", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Assets"] },
  { canonicalTerm: "Liability", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Liabilities"] },
  { canonicalTerm: "Equity", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Owner's Equity", "Shareholders Equity"] },
  { canonicalTerm: "Revenue", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Rev", "Sales", "Income", "Turnover"] },
  { canonicalTerm: "Expense", sourceReference: "05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4.2", category: "financial-object-model", synonyms: ["Exp", "Cost", "Expenditure", "Costs"] },
];

export const BUILT_IN_ONTOLOGY_TERMS: readonly OntologyTerm[] = [
  ...ONTOLOGY_CORE_TERMS,
  ...FINANCIAL_OBJECT_MODEL_TERMS,
];
