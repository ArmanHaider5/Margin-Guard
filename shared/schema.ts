/**
 * Margin Guard - Institutional Diagnostic System
 * 
 * Margin Guard is an institutional diagnostic and governance system designed to standardise
 * root cause identification and intervention logic while preserving professional judgement.
 * 
 * ARCHITECTURAL RULE: All diagnostics MUST belong to a Client.
 * There is NO global "Ask Margin Guard" or free-floating analysis.
 * Diagnostics cannot exist without a Client context.
 * 
 * This ensures:
 * - Proper governance and audit trails
 * - Client-specific context for all analyses
 * - Professional accountability for recommendations
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Industry types for user profiles
export type Industry = "event_management" | "retail" | "logistics" | "other";

export const industries: { id: Industry; label: string; description: string }[] = [
  { id: "event_management", label: "Event Management", description: "Conferences, weddings, corporate events, exhibitions" },
  { id: "retail", label: "Retail", description: "Shops, stores, e-commerce, consumer goods" },
  { id: "logistics", label: "Logistics", description: "Transport, warehousing, distribution, supply chain" },
  { id: "other", label: "Other Industry", description: "Manufacturing, services, or other business types" },
];

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles
export type UserRole = "admin" | "client";

// User table - enhanced with industry profile and role
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").$type<UserRole>().default("client"), // admin or client
  industry: varchar("industry").$type<Industry>(),
  companyName: varchar("company_name"),
  clientId: varchar("client_id"), // Links client users to their client
  onboardingComplete: timestamp("onboarding_complete"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Client - companies/organisations receiving diagnostic services
// Simplified model: id, name, industry, programme (optional), status, createdAt
export type ClientStatus = "active" | "archived";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry").$type<Industry>().notNull(),
  programme: varchar("programme", { length: 255 }), // Optional consulting programme
  status: varchar("status").$type<ClientStatus>().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Client Documents - uploaded files for analysis
export type DocumentType = "excel" | "word" | "powerpoint" | "pdf" | "other";
export type DocumentStatus = "uploaded" | "processing" | "processed" | "error";

export const clientDocuments = pgTable("client_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(), // REQUIRED: All documents must belong to a client
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type").$type<DocumentType>().notNull(),
  fileSize: jsonb("file_size").$type<number>().notNull(),
  filePath: varchar("file_path").notNull(), // Storage path
  status: varchar("status").$type<DocumentStatus>().default("uploaded"),
  extractedData: jsonb("extracted_data").$type<ExtractedDocumentData>(),
  processingError: text("processing_error"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Structure for extracted document data
export interface ExtractedDocumentData {
  rawText?: string;
  tables?: Array<{
    name?: string;
    headers: string[];
    rows: string[][];
    // Raw 2-D array from XLSX (header: 1) — preserves native cell types
    // (numbers, date serials, blanks).  Row 0 is always the physical first
    // row of the sheet; there is NO pre-split into header vs data rows.
    // Used by the CIL pipeline for block detection and column mapping.
    rawRows?: any[][];
  }>;
  // Structured Excel sheets for the CIL pipeline.
  // Each entry is one worksheet; rows[i][j] is a native XLSX cell value
  // (number, string, boolean, undefined — NO pre-split, row 0 is always
  // the physical first row of the sheet).
  // When present, the CIL pipeline processes this instead of tables/rawText.
  sheets?: Array<{
    name: string;
    rows: any[][];
  }>;
  keyFindings?: string[];
  dates?: string[];
  amounts?: Array<{ value: number; context: string }>;
  issues?: string[];
}

export const insertClientDocumentSchema = createInsertSchema(clientDocuments).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
  extractedData: true,
  processingError: true,
});

export type InsertClientDocument = z.infer<typeof insertClientDocumentSchema>;
export type ClientDocument = typeof clientDocuments.$inferSelect;

// Client Analyses - AI analysis results
export type AnalysisType = "quick" | "deep";
export type AnalysisStatus = "pending" | "running" | "completed" | "error";

// Analysis Mode Types
export type DiagnosticMode = "baseline" | "evidence-enriched";
export type ConfidenceLevel = "preliminary" | "low" | "substantiated";

// Context selection narrows diagnostic scope and increases relevance.
export type DiagnosticContext = "Money" | "Manpower" | "Operations" | "Systems" | "Compliance";
export const DIAGNOSTIC_CONTEXTS: DiagnosticContext[] = ["Money", "Manpower", "Operations", "Systems", "Compliance"];

// Diagnostics must be anchored to an explicit problem statement.
export const clientAnalyses = pgTable("client_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(), // REQUIRED: All analyses must belong to a client
  caseId: varchar("case_id"), // Link to diagnostic case (auto-created on analysis)
  title: varchar("title", { length: 255 }).notNull(),
  problemStatement: text("problem_statement"), // Anchors the diagnostic (nullable for legacy records)
  diagnosticContexts: text("diagnostic_contexts").array().$type<DiagnosticContext[]>(), // Context selection narrows diagnostic scope
  selectedSymptoms: text("selected_symptoms").array(), // User-selected symptom tags for alignment guardrail
  analysisType: varchar("analysis_type").$type<AnalysisType>().notNull(),
  status: varchar("status").$type<AnalysisStatus>().default("pending"),
  documentIds: text("document_ids").array(), // Documents included in this analysis
  findings: jsonb("findings").$type<AnalysisFinding[]>(),
  summary: text("summary"),
  costSavingOpportunities: jsonb("cost_saving_opportunities").$type<CostSavingOpportunity[]>(),
  predictions: jsonb("predictions").$type<RecurrencePrediction[]>(),
  processingError: text("processing_error"),
  analysisMode: varchar("analysis_mode").$type<DiagnosticMode>(), // "baseline" or "evidence-enriched"
  confidence: varchar("confidence").$type<ConfidenceLevel>(), // "preliminary" or "substantiated"
  isMockMode: boolean("is_mock_mode").default(false), // Flag for mock mode results
  mgdAnalysis: jsonb("mgd_analysis").$type<any>(), // MGD engine output (health score, root cause tree, roadmap)
  notes: jsonb("notes").$type<ConsultantNote[]>(), // Consultant notes (create/delete only)
  actionStates: jsonb("action_states").$type<Record<string, ActionState>>(), // Action tracking states keyed by "{timeframe}-{index}"
  caseWorkflow: jsonb("case_workflow").$type<CaseWorkflow>(), // Case lifecycle / workflow state
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Case Workflow — stored as a jsonb column on clientAnalyses
export type CaseWorkflowStatus = "new" | "under_review" | "action_plan_created" | "implementation_in_progress" | "monitoring" | "closed";
export type CaseWorkflowPriority = "low" | "medium" | "high" | "critical";
export interface CaseWorkflow {
  status?: CaseWorkflowStatus;
  priority?: CaseWorkflowPriority;
  assignedOwner?: string;
  targetReviewDate?: string; // ISO date string "YYYY-MM-DD"
  updatedAt?: string;
}

// Action Tracking State — stored as a Record<actionKey, ActionState> on the analysis
// actionKey format: "{timeframe}-{index}", e.g. "this-week-0", "30-days-2"
export type ActionStatus = "not_started" | "in_progress" | "completed";
export interface ActionState {
  status?: ActionStatus;
  progressNotes?: string[];
  updatedAt?: string;
  completedAt?: string;
  ownerOverride?: string;
}

// Consultant Note — stored as a JSON array on the analysis record
export type NoteType = "consultant" | "follow_up" | "implementation" | "internal";
export interface ConsultantNote {
  id: string;
  content: string;
  type: NoteType;
  createdAt: string; // ISO string
  createdBy?: string;
}

// Evidence anchor: links a finding to a specific document signal
export interface EvidenceAnchor {
  documentName: string;
  signal: string;        // metric, anomaly, or quote
  interpretation: string;
}

// Evidence-driven finding strength levels
export type EvidenceStrength = "WEAK" | "MODERATE" | "STRONG";

// Narrative tone controls language style in finding descriptions
export type NarrativeTone = "EXPLORATORY" | "DIAGNOSTIC" | "CONCLUSIVE";

// Analysis Finding structure
export interface AnalysisFinding {
  id: string;
  title: string;
  description: string;
  fourMCategory: FourMCategory;
  indicator: ManagementIndicator;
  severity: "low" | "medium" | "high" | "critical";
  frequency: number; // How many times this issue appeared
  causes: string[];
  estimatedCostImpact?: string;
  evidence: string[]; // References to source documents/data
  // Evidence-driven fields (optional for backward compatibility)
  evidenceAnchors?: EvidenceAnchor[];
  evidenceStrength?: EvidenceStrength;
  narrativeTone?: NarrativeTone;
  collapsedNote?: string;
  // Signal-driven impact and validation (vNext)
  impactObserved?: string[];
  whatToValidateNext?: string[];
  evidenceLedTitle?: string;
  insightNote?: string;
  evidenceTrail?: {
    matchedConcreteSignals: string[];
    matchedEvidenceSignals: string[];
    supportingDocuments: string[];
  };
}

// Cost Saving Opportunity
export interface CostSavingOpportunity {
  id: string;
  title: string;
  description: string;
  estimatedSavings: string;
  implementationEffort: "low" | "medium" | "high";
  relatedFindings: string[]; // Finding IDs
}

// Recurrence Prediction
export interface RecurrencePrediction {
  id: string;
  issue: string;
  likelihood: "low" | "medium" | "high";
  expectedTimeframe: string;
}

export const insertClientAnalysisSchema = createInsertSchema(clientAnalyses).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  findings: true,
  summary: true,
  costSavingOpportunities: true,
  predictions: true,
  processingError: true,
  analysisMode: true,
  confidence: true,
  isMockMode: true,
});

export type InsertClientAnalysis = z.infer<typeof insertClientAnalysisSchema>;
export type ClientAnalysis = typeof clientAnalyses.$inferSelect;

// 4M Categories (updated from 5M)
export type FourMCategory = "Money" | "Materials" | "Manpower" | "Machinery";

// Management Indicators - simple, CEO-friendly names
export type ManagementIndicator = 
  | "Money Indicator" 
  | "Material Indicator" 
  | "Manpower Indicator" 
  | "Machine Indicator";

// Map 4M to Indicator
export const categoryToIndicator: Record<FourMCategory, ManagementIndicator> = {
  Money: "Money Indicator",
  Materials: "Material Indicator",
  Manpower: "Manpower Indicator",
  Machinery: "Machine Indicator",
};

// 8 Diagnostic Categories
export type DiagnosticCategory = 
  | "financial_control"
  | "inventory_materials"
  | "production_efficiency"
  | "workforce"
  | "quality"
  | "sales_customer"
  | "strategic_management"
  | "work_execution";

export const diagnosticCategories = [
  {
    id: "financial_control" as DiagnosticCategory,
    label: "Financial Control",
    description: "Cash flow, budgeting, credit control, and financial record issues",
    primaryM: "Money" as FourMCategory,
    indicator: "Money Indicator" as ManagementIndicator,
  },
  {
    id: "inventory_materials" as DiagnosticCategory,
    label: "Inventory & Materials",
    description: "Stock control, material handling, wastage, and supply chain issues",
    primaryM: "Materials" as FourMCategory,
    indicator: "Material Indicator" as ManagementIndicator,
  },
  {
    id: "production_efficiency" as DiagnosticCategory,
    label: "Production Efficiency",
    description: "Machine utilisation, downtime, scheduling, and capacity issues",
    primaryM: "Machinery" as FourMCategory,
    indicator: "Machine Indicator" as ManagementIndicator,
  },
  {
    id: "workforce" as DiagnosticCategory,
    label: "Workforce & Staff",
    description: "Training, supervision, discipline, and productivity issues",
    primaryM: "Manpower" as FourMCategory,
    indicator: "Manpower Indicator" as ManagementIndicator,
  },
  {
    id: "quality" as DiagnosticCategory,
    label: "Quality Control",
    description: "Rework, scrap, defects, and quality compliance issues",
    primaryM: "Materials" as FourMCategory,
    indicator: "Material Indicator" as ManagementIndicator,
  },
  {
    id: "sales_customer" as DiagnosticCategory,
    label: "Sales & Customer",
    description: "Customer relations, sales processes, and market issues",
    primaryM: "Money" as FourMCategory,
    indicator: "Money Indicator" as ManagementIndicator,
  },
  {
    id: "strategic_management" as DiagnosticCategory,
    label: "Strategic & Management",
    description: "Decision-making, planning, communication, and compliance issues",
    primaryM: "Manpower" as FourMCategory,
    indicator: "Manpower Indicator" as ManagementIndicator,
  },
  {
    id: "work_execution" as DiagnosticCategory,
    label: "Work Execution",
    description: "Hidden lost time, workflow gaps, and cross-functional issues",
    primaryM: "Manpower" as FourMCategory,
    indicator: "Manpower Indicator" as ManagementIndicator,
  },
] as const;

// Estimated Impact structure
export interface EstimatedImpact {
  cost?: string;
  time?: string;
  efficiency?: string;
}

// Root Cause interface - enhanced with indicator, impact, and prevention
export type RootCauseSeverity = "low" | "medium" | "high";

export interface RootCause {
  cause: string;
  category: FourMCategory;
  indicator: ManagementIndicator;
  severity: RootCauseSeverity;
  explanation: string;
  estimatedImpact: EstimatedImpact;
}

// Problem Library Entry structure
export interface ProblemLibraryEntry {
  id: string;
  title: string;
  description: string;
  diagnosticCategory: DiagnosticCategory;
  dominantM: FourMCategory;
  indicator: ManagementIndicator;
  commonCauses: string[];
  impactNotes: EstimatedImpact;
}

// Diagnostic Session Schema - REQUIRES client context (institutional rule)
// All diagnostics MUST belong to a Client - no free-floating analysis allowed
export const diagnosticSessions = pgTable("diagnostic_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(), // REQUIRED: All diagnostics must belong to a client
  userId: varchar("user_id").notNull(), // Consultant who ran the diagnosis
  symptom: text("symptom").notNull(),
  symptomCategory: text("symptom_category").notNull(),
  diagnosticCategory: text("diagnostic_category"),
  selectedProblemId: text("selected_problem_id"),
  selectedIndustryProblemId: text("selected_industry_problem_id"), // Industry-specific problem selection
  industry: text("industry"), // User's industry context for this diagnosis
  onset: text("onset").notNull(),
  responses: jsonb("responses").notNull().$type<Record<string, string>>(),
  rootCauses: jsonb("root_causes").notNull().$type<RootCause[]>(),
  primaryIndicator: text("primary_indicator"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schema for diagnostic session - includes all fields needed for creation
export const insertDiagnosticSessionSchema = createInsertSchema(diagnosticSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertDiagnosticSession = z.infer<typeof insertDiagnosticSessionSchema>;
export type DiagnosticSession = typeof diagnosticSessions.$inferSelect;

// API request/response types - enhanced
export interface AnalyzeSymptomRequest {
  symptom: string;
  symptomCategory: string;
  diagnosticCategory?: string;
  selectedProblemId?: string; // If user selected from library
  onset: string;
  responses: Record<string, string>;
}

export interface AnalyzeSymptomResponse {
  sessionId: string;
  rootCauses: RootCause[];
  primaryIndicator: ManagementIndicator;
  createdAt: string;
}

// Follow-up questions - updated for 4M context
export const followUpQuestions = {
  timing: {
    question: "Did this problem happen suddenly or gradually?",
    options: [
      { value: "sudden", label: "Suddenly - it appeared all at once" },
      { value: "gradual", label: "Gradually - it got worse over time" },
    ],
  },
  staffChanges: {
    question: "Have there been any staff changes recently?",
    options: [
      { value: "new_staff", label: "Yes, we hired new staff" },
      { value: "staff_left", label: "Yes, some staff left" },
      { value: "no_changes", label: "No changes in staff" },
    ],
  },
  processChanges: {
    question: "Were there any process or workflow changes recently?",
    options: [
      { value: "process_changed", label: "Yes, we changed how we do things" },
      { value: "new_equipment", label: "Yes, we got new equipment or tools" },
      { value: "no_changes", label: "No, everything is the same" },
    ],
  },
  workload: {
    question: "Has your workload or order volume changed?",
    options: [
      { value: "increased", label: "Yes, it increased significantly" },
      { value: "decreased", label: "Yes, it decreased" },
      { value: "same", label: "No, it's about the same" },
    ],
  },
  equipment: {
    question: "Are there any equipment or tool issues?",
    options: [
      { value: "frequent_issues", label: "Yes, equipment has frequent problems" },
      { value: "occasional", label: "Sometimes, but not often" },
      { value: "no_issues", label: "No, equipment works fine" },
    ],
  },
  supplier: {
    question: "Have you noticed any changes with suppliers or materials?",
    options: [
      { value: "quality_changed", label: "Yes, material quality seems different" },
      { value: "delays", label: "Yes, deliveries are delayed" },
      { value: "no_changes", label: "No, suppliers are reliable" },
    ],
  },
} as const;

// 4M Category styling for UI
export const fourMCategoryColors: Record<FourMCategory, { bg: string; text: string; border: string }> = {
  Money: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  Materials: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  Manpower: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  Machinery: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
};

// Indicator styling for UI
export const indicatorColors: Record<ManagementIndicator, { bg: string; text: string }> = {
  "Money Indicator": { bg: "bg-emerald-500", text: "text-white" },
  "Material Indicator": { bg: "bg-amber-500", text: "text-white" },
  "Manpower Indicator": { bg: "bg-blue-500", text: "text-white" },
  "Machine Indicator": { bg: "bg-purple-500", text: "text-white" },
};

// Custom Problems table - user-owned knowledge base
export const customProblems = pgTable("custom_problems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  diagnosticCategory: varchar("diagnostic_category").$type<DiagnosticCategory>().notNull(),
  dominantM: varchar("dominant_m").$type<FourMCategory>().notNull(),
  indicator: varchar("indicator").$type<ManagementIndicator>().notNull(),
  commonCauses: text("common_causes").array().notNull(),
  recommendedActions: text("recommended_actions").array().notNull(),
  preventionSteps: text("prevention_steps").array().notNull(),
  impactCost: varchar("impact_cost"),
  impactTime: varchar("impact_time"),
  impactEfficiency: varchar("impact_efficiency"),
  tags: text("tags").array(),
  isFavorite: timestamp("is_favorite"),
  usageCount: jsonb("usage_count").$type<number>().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomProblemSchema = createInsertSchema(customProblems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

export type InsertCustomProblem = z.infer<typeof insertCustomProblemSchema>;
export type CustomProblem = typeof customProblems.$inferSelect;

// Case Status for Case Memory
export type CaseStatus = "draft" | "finalised";

/**
 * Diagnostic Cases - Case Memory for persisting analyses
 * 
 * INSTITUTIONAL RULE: Case memory must always be client-owned.
 * All cases MUST belong to a Client - no free-floating cases allowed.
 * Cases are displayed ONLY within the Client Overview.
 * Legacy entries without clientId are marked as "Unlinked (Legacy)" and hidden from default views.
 */
export const diagnosticCases = pgTable("diagnostic_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(), // REQUIRED: All cases must belong to a client
  analysisId: varchar("analysis_id"), // Link to source analysis for bidirectional reference
  clientName: varchar("client_name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 100 }).notNull(),
  problemStatement: text("problem_statement").notNull(),
  diagnosticOutputs: jsonb("diagnostic_outputs").$type<DiagnosticOutputSnapshot>(),
  executiveSummary: text("executive_summary"),
  consultingScope: jsonb("consulting_scope").$type<ConsultingScopeData>(),
  consultantNotes: text("consultant_notes"),
  status: varchar("status").$type<CaseStatus>().default("draft"),
  // Margin Guard Brain v2: Optional link to a root cause pattern from the knowledge library
  // Used by "Use in Case" workflow — snapshot is frozen at time of attachment
  rootCausePatternId: varchar("root_cause_pattern_id"),
  rootCauseSnapshot: jsonb("root_cause_snapshot").$type<RootCausePatternSnapshot>(),
  createdBy: varchar("created_by").notNull(), // Consultant user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Diagnostic Output Snapshot - frozen analysis results
export interface DiagnosticOutputSnapshot {
  findings?: AnalysisFinding[];
  rootCauses?: RootCause[];
  primaryIndicator?: ManagementIndicator;
  fourMDistribution?: Record<FourMCategory, number>;
  costSavingOpportunities?: CostSavingOpportunity[];
  predictions?: RecurrencePrediction[];
  analysisType?: AnalysisType;
  analysisDate?: string;
}

// Margin Guard Brain v2: Snapshot of a root cause pattern attached to a case
// Frozen at time of attachment — does NOT mutate the source RootCauseEntry
export interface RootCausePatternSnapshot {
  patternName: string;
  validationChecklist: string[];
  antiPatterns: string[];
  highLeverageFix: string;
  preventionStrategy: string;
}

// Consulting Scope Data
export interface ConsultingScopeData {
  interventionRequired: boolean;
  scopeItems?: string[];
  estimatedDuration?: string;
  estimatedCost?: string;
  priority?: "low" | "medium" | "high" | "critical";
  recommendedApproach?: string;
}

export const insertDiagnosticCaseSchema = createInsertSchema(diagnosticCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDiagnosticCase = z.infer<typeof insertDiagnosticCaseSchema>;
export type DiagnosticCase = typeof diagnosticCases.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// CORE INTELLIGENCE LAYER (CIL) — Transaction Model
//
// Stores structured economic activity extracted from uploaded documents.
// All uploaded business documents (inventory sheets, invoices, sales records,
// logistics schedules) are normalised into this single transaction model.
//
// Architectural rule: CIL transactions are ADDITIVE — they do not replace
// existing document processing. They add a structured economic layer on top.
// ─────────────────────────────────────────────────────────────────────────────

export type CilEntityType    = "item" | "customer" | "vehicle" | "staff" | "unknown";
export type CilTxType        = "outgoing" | "incoming" | "sale" | "loss" | "refund" | "adjustment" | "dispatch_event" | "asset_damage" | "inventory_loss";
export type CilDocClass      = "inventory_record" | "movement_log" | "sales_sheet" | "invoice" | "quotation" | "logistics_schedule" | "loss_record" | "dispatch_log" | "damage_record" | "event_record" | "unknown";

export const cilTransactions = pgTable("cil_transactions", {
  id:                   varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId:             varchar("client_id").notNull(),
  documentId:           varchar("document_id"),               // FK → client_documents.id
  entityType:           varchar("entity_type").$type<CilEntityType>().default("unknown"),
  entityName:           varchar("entity_name", { length: 512 }),
  transactionType:      varchar("transaction_type").$type<CilTxType>().notNull(),
  quantity:             real("quantity"),
  value:                real("value"),                        // monetary value in RM
  date:                 varchar("date", { length: 64 }),
  documentClassification: varchar("document_classification").$type<CilDocClass>().default("unknown"),
  referenceId:          varchar("reference_id", { length: 255 }),
  sourceFile:           varchar("source_file", { length: 512 }),
  rawText:              text("raw_text"),                     // original extracted row
  netQuantity:          real("net_quantity"),                 // outgoing - incoming
  netValue:             real("net_value"),                    // value - refund
  debugTrace:           jsonb("debug_trace"),                 // mapping trace for debug view
  createdAt:            timestamp("created_at").defaultNow(),
});

export const insertCilTransactionSchema = createInsertSchema(cilTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertCilTransaction = z.infer<typeof insertCilTransactionSchema>;
export type CilTransaction = typeof cilTransactions.$inferSelect;
