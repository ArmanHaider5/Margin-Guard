import {
  users,
  diagnosticSessions,
  customProblems,
  clients,
  clientDocuments,
  clientAnalyses,
  diagnosticCases,
  type User,
  type UpsertUser,
  type UserRole,
  type DiagnosticSession,
  type RootCause,
  type ManagementIndicator,
  type Industry,
  type CustomProblem,
  type InsertCustomProblem,
  type Client,
  type InsertClient,
  type ClientDocument,
  type InsertClientDocument,
  type ClientAnalysis,
  type InsertClientAnalysis,
  type AnalysisFinding,
  type CostSavingOpportunity,
  type RecurrencePrediction,
  type ConsultantNote,
  type ActionState,
  type CaseWorkflow,
  type ExtractedDocumentData,
  type FourMCategory,
  type DiagnosticCategory,
  type DiagnosticCase,
  type InsertDiagnosticCase,
  type CaseStatus,
  type DiagnosticOutputSnapshot,
  type ConsultingScopeData,
  type RootCausePatternSnapshot,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, count, and } from "drizzle-orm";

export interface IStorage {
  // User Management
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: { industry?: Industry; companyName?: string }): Promise<User | undefined>;
  updateUserRole(id: string, role: UserRole): Promise<User | undefined>;
  
  // Diagnostic Sessions - INSTITUTIONAL RULE: All diagnostics MUST belong to a client
  createDiagnosticSession(userId: string, session: {
    clientId: string; // REQUIRED: All diagnostics must belong to a client
    symptom: string;
    symptomCategory: string;
    diagnosticCategory?: string;
    selectedProblemId?: string;
    selectedIndustryProblemId?: string;
    industry?: string;
    onset: string;
    responses: Record<string, string>;
    rootCauses: RootCause[];
    primaryIndicator?: ManagementIndicator;
  }): Promise<DiagnosticSession>;
  getDiagnosticSession(id: string): Promise<DiagnosticSession | undefined>;
  getUserDiagnosticSessions(userId: string): Promise<DiagnosticSession[]>;
  getClientDiagnosticSessions(clientId: string): Promise<DiagnosticSession[]>;
  
  // Custom Problems - User Knowledge Base
  createCustomProblem(problem: InsertCustomProblem): Promise<CustomProblem>;
  getCustomProblem(id: string, userId: string): Promise<CustomProblem | undefined>;
  getUserCustomProblems(userId: string): Promise<CustomProblem[]>;
  updateCustomProblem(id: string, userId: string, data: Partial<InsertCustomProblem>): Promise<CustomProblem | undefined>;
  deleteCustomProblem(id: string, userId: string): Promise<boolean>;
  toggleFavorite(id: string, userId: string): Promise<CustomProblem | undefined>;
  
  // Knowledge Insights
  getKnowledgeInsights(userId: string): Promise<{
    totalCustomProblems: number;
    totalDiagnoses: number;
    topCategories: { category: string; count: number }[];
    thisMonthDiagnoses: number;
  }>;
  
  // Client Organizations (Admin only)
  createClient(data: InsertClient): Promise<Client>;
  getClient(id: string): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  
  // Client Documents
  createClientDocument(data: InsertClientDocument): Promise<ClientDocument>;
  getClientDocument(id: string): Promise<ClientDocument | undefined>;
  getClientDocuments(clientId: string): Promise<ClientDocument[]>;
  updateClientDocument(id: string, data: Partial<{
    status: ClientDocument["status"];
    extractedData: ExtractedDocumentData;
    processingError: string;
    processedAt: Date;
  }>): Promise<ClientDocument | undefined>;
  deleteClientDocument(id: string): Promise<boolean>;
  
  // Client Analyses
  createClientAnalysis(data: InsertClientAnalysis): Promise<ClientAnalysis>;
  getClientAnalysis(id: string): Promise<ClientAnalysis | undefined>;
  getClientAnalyses(clientId: string): Promise<ClientAnalysis[]>;
  updateClientAnalysis(id: string, data: Partial<{
    status: ClientAnalysis["status"];
    caseId: string;
    findings: AnalysisFinding[];
    summary: string;
    costSavingOpportunities: CostSavingOpportunity[];
    predictions: RecurrencePrediction[];
    processingError: string;
    analysisMode: ClientAnalysis["analysisMode"];
    confidence: ClientAnalysis["confidence"];
    isMockMode: boolean;
    completedAt: Date;
  }>): Promise<ClientAnalysis | undefined>;
  deleteClientAnalysis(id: string): Promise<boolean>;
  
  // Admin Dashboard Stats
  getAdminStats(): Promise<{
    totalClients: number;
    activeClients: number;
    totalAnalyses: number;
    totalDocuments: number;
    recentActivity: Array<{
      type: "client" | "analysis" | "document";
      id: string;
      name: string;
      date: Date;
    }>;
  }>;
  
  // Diagnostic Cases - Case Memory
  createDiagnosticCase(data: InsertDiagnosticCase): Promise<DiagnosticCase>;
  getDiagnosticCase(id: string): Promise<DiagnosticCase | undefined>;
  getAllDiagnosticCases(createdBy?: string): Promise<DiagnosticCase[]>;
  getDiagnosticCasesByClientId(clientId: string): Promise<DiagnosticCase[]>;
  updateDiagnosticCase(id: string, data: Partial<{
    clientName: string;
    industry: string;
    problemStatement: string;
    analysisId: string;
    diagnosticOutputs: DiagnosticOutputSnapshot;
    executiveSummary: string;
    consultingScope: ConsultingScopeData;
    consultantNotes: string;
    status: CaseStatus;
    rootCausePatternId: string;
    rootCauseSnapshot: RootCausePatternSnapshot;
  }>): Promise<DiagnosticCase | undefined>;
  deleteDiagnosticCase(id: string): Promise<boolean>;
  finaliseDiagnosticCase(id: string): Promise<DiagnosticCase | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, data: { industry?: Industry; companyName?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        onboardingComplete: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // INSTITUTIONAL RULE: All diagnostics MUST belong to a client
  async createDiagnosticSession(userId: string, session: {
    clientId: string; // REQUIRED: All diagnostics must belong to a client
    symptom: string;
    symptomCategory: string;
    diagnosticCategory?: string;
    selectedProblemId?: string;
    selectedIndustryProblemId?: string;
    industry?: string;
    onset: string;
    responses: Record<string, string>;
    rootCauses: RootCause[];
    primaryIndicator?: ManagementIndicator;
  }): Promise<DiagnosticSession> {
    const [diagnosticSession] = await db
      .insert(diagnosticSessions)
      .values({
        clientId: session.clientId,
        userId,
        symptom: session.symptom,
        symptomCategory: session.symptomCategory,
        diagnosticCategory: session.diagnosticCategory || null,
        selectedProblemId: session.selectedProblemId || null,
        selectedIndustryProblemId: session.selectedIndustryProblemId || null,
        industry: session.industry || null,
        onset: session.onset,
        responses: session.responses,
        rootCauses: session.rootCauses,
        primaryIndicator: session.primaryIndicator || null,
      })
      .returning();
    return diagnosticSession;
  }

  async getDiagnosticSession(id: string): Promise<DiagnosticSession | undefined> {
    const [session] = await db
      .select()
      .from(diagnosticSessions)
      .where(eq(diagnosticSessions.id, id));
    return session;
  }

  async getUserDiagnosticSessions(userId: string): Promise<DiagnosticSession[]> {
    return await db
      .select()
      .from(diagnosticSessions)
      .where(eq(diagnosticSessions.userId, userId))
      .orderBy(desc(diagnosticSessions.createdAt));
  }

  // Custom Problems - User Knowledge Base
  async createCustomProblem(problem: InsertCustomProblem): Promise<CustomProblem> {
    const [customProblem] = await db
      .insert(customProblems)
      .values(problem as any)
      .returning();
    return customProblem;
  }

  async getCustomProblem(id: string, userId: string): Promise<CustomProblem | undefined> {
    const [problem] = await db
      .select()
      .from(customProblems)
      .where(sql`${customProblems.id} = ${id} AND ${customProblems.userId} = ${userId}`);
    return problem;
  }

  async getUserCustomProblems(userId: string): Promise<CustomProblem[]> {
    return await db
      .select()
      .from(customProblems)
      .where(eq(customProblems.userId, userId))
      .orderBy(desc(customProblems.createdAt));
  }

  async updateCustomProblem(id: string, userId: string, data: Partial<InsertCustomProblem>): Promise<CustomProblem | undefined> {
    const [problem] = await db
      .update(customProblems)
      .set({
        ...data,
        updatedAt: new Date(),
      } as any)
      .where(sql`${customProblems.id} = ${id} AND ${customProblems.userId} = ${userId}`)
      .returning();
    return problem;
  }

  async deleteCustomProblem(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(customProblems)
      .where(sql`${customProblems.id} = ${id} AND ${customProblems.userId} = ${userId}`)
      .returning();
    return result.length > 0;
  }

  async toggleFavorite(id: string, userId: string): Promise<CustomProblem | undefined> {
    const existing = await this.getCustomProblem(id, userId);
    if (!existing) return undefined;
    
    const [problem] = await db
      .update(customProblems)
      .set({
        isFavorite: existing.isFavorite ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(sql`${customProblems.id} = ${id} AND ${customProblems.userId} = ${userId}`)
      .returning();
    return problem;
  }

  // Knowledge Insights
  async getKnowledgeInsights(userId: string): Promise<{
    totalCustomProblems: number;
    totalDiagnoses: number;
    topCategories: { category: string; count: number }[];
    thisMonthDiagnoses: number;
  }> {
    // Count custom problems
    const [customCount] = await db
      .select({ count: count() })
      .from(customProblems)
      .where(eq(customProblems.userId, userId));

    // Count total diagnoses
    const [diagnosesCount] = await db
      .select({ count: count() })
      .from(diagnosticSessions)
      .where(eq(diagnosticSessions.userId, userId));

    // Count this month's diagnoses
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const [monthCount] = await db
      .select({ count: count() })
      .from(diagnosticSessions)
      .where(sql`${diagnosticSessions.userId} = ${userId} AND ${diagnosticSessions.createdAt} >= ${startOfMonth}`);

    // Get top categories
    const topCategories = await db
      .select({
        category: diagnosticSessions.diagnosticCategory,
        count: count(),
      })
      .from(diagnosticSessions)
      .where(eq(diagnosticSessions.userId, userId))
      .groupBy(diagnosticSessions.diagnosticCategory)
      .orderBy(desc(count()))
      .limit(5);

    return {
      totalCustomProblems: customCount?.count || 0,
      totalDiagnoses: diagnosesCount?.count || 0,
      topCategories: topCategories.map(tc => ({
        category: tc.category || 'Unknown',
        count: tc.count,
      })),
      thisMonthDiagnoses: monthCount?.count || 0,
    };
  }

  // Update user role
  async updateUserRole(id: string, role: UserRole): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Get client diagnostic sessions
  async getClientDiagnosticSessions(clientId: string): Promise<DiagnosticSession[]> {
    // Get users belonging to this client organization
    const clientUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clientId, clientId));
    
    if (clientUsers.length === 0) return [];
    
    const userIds = clientUsers.map(u => u.id);
    return await db
      .select()
      .from(diagnosticSessions)
      .where(sql`${diagnosticSessions.userId} = ANY(${userIds})`)
      .orderBy(desc(diagnosticSessions.createdAt));
  }

  // Client Organizations
  async createClient(data: InsertClient): Promise<Client> {
    const [org] = await db
      .insert(clients)
      .values(data as any)
      .returning();
    return org;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [org] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));
    return org;
  }

  async getAllClients(): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .orderBy(desc(clients.createdAt));
  }

  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [org] = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(clients.id, id))
      .returning();
    return org;
  }

  // Client deletion is restricted to authorised roles for data hygiene.
  async deleteClient(id: string): Promise<boolean> {
    // Cascade delete: remove all associated records before deleting client
    await db.delete(diagnosticCases).where(eq(diagnosticCases.clientId, id));
    await db.delete(clientDocuments).where(eq(clientDocuments.clientId, id));
    await db.delete(clientAnalyses).where(eq(clientAnalyses.clientId, id));
    
    const result = await db
      .delete(clients)
      .where(eq(clients.id, id))
      .returning();
    return result.length > 0;
  }

  // Client Documents
  async createClientDocument(data: InsertClientDocument): Promise<ClientDocument> {
    const [doc] = await db
      .insert(clientDocuments)
      .values(data as any)
      .returning();
    return doc;
  }

  async getClientDocument(id: string): Promise<ClientDocument | undefined> {
    const [doc] = await db
      .select()
      .from(clientDocuments)
      .where(eq(clientDocuments.id, id));
    return doc;
  }

  async getClientDocuments(clientId: string): Promise<ClientDocument[]> {
    return await db
      .select()
      .from(clientDocuments)
      .where(eq(clientDocuments.clientId, clientId))
      .orderBy(desc(clientDocuments.uploadedAt));
  }

  async updateClientDocument(id: string, data: Partial<{
    status: ClientDocument["status"];
    extractedData: ExtractedDocumentData;
    processingError: string;
    processedAt: Date;
  }>): Promise<ClientDocument | undefined> {
    const [doc] = await db
      .update(clientDocuments)
      .set(data)
      .where(eq(clientDocuments.id, id))
      .returning();
    return doc;
  }

  async deleteClientDocument(id: string): Promise<boolean> {
    const result = await db
      .delete(clientDocuments)
      .where(eq(clientDocuments.id, id))
      .returning();
    return result.length > 0;
  }

  // Client Analyses
  async createClientAnalysis(data: InsertClientAnalysis): Promise<ClientAnalysis> {
    const [analysis] = await db
      .insert(clientAnalyses)
      .values(data as any)
      .returning();
    return analysis;
  }

  async getClientAnalysis(id: string): Promise<ClientAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(clientAnalyses)
      .where(eq(clientAnalyses.id, id));
    return analysis;
  }

  async getClientAnalyses(clientId: string): Promise<ClientAnalysis[]> {
    return await db
      .select()
      .from(clientAnalyses)
      .where(eq(clientAnalyses.clientId, clientId))
      .orderBy(desc(clientAnalyses.createdAt));
  }

  async updateClientAnalysis(id: string, data: Partial<{
    status: ClientAnalysis["status"];
    caseId: string;
    findings: AnalysisFinding[];
    summary: string;
    costSavingOpportunities: CostSavingOpportunity[];
    predictions: RecurrencePrediction[];
    processingError: string;
    analysisMode: ClientAnalysis["analysisMode"];
    confidence: ClientAnalysis["confidence"];
    isMockMode: boolean;
    completedAt: Date;
    notes: ConsultantNote[];
  }>): Promise<ClientAnalysis | undefined> {
    const [analysis] = await db
      .update(clientAnalyses)
      .set(data)
      .where(eq(clientAnalyses.id, id))
      .returning();
    return analysis;
  }

  async addAnalysisNote(id: string, note: ConsultantNote): Promise<ClientAnalysis | undefined> {
    const current = await this.getClientAnalysis(id);
    if (!current) return undefined;
    const existing: ConsultantNote[] = (current as any).notes ?? [];
    return this.updateClientAnalysis(id, { notes: [...existing, note] });
  }

  async deleteAnalysisNote(id: string, noteId: string): Promise<ClientAnalysis | undefined> {
    const current = await this.getClientAnalysis(id);
    if (!current) return undefined;
    const existing: ConsultantNote[] = (current as any).notes ?? [];
    return this.updateClientAnalysis(id, { notes: existing.filter(n => n.id !== noteId) });
  }

  async updateActionState(
    id: string,
    actionKey: string,
    patch: { status?: string; progressNote?: string; ownerOverride?: string }
  ): Promise<ClientAnalysis | undefined> {
    const current = await this.getClientAnalysis(id);
    if (!current) return undefined;
    const existing: Record<string, ActionState> = (current as any).actionStates ?? {};
    const prev: ActionState = existing[actionKey] ?? {};
    const now = new Date().toISOString();
    const updated: ActionState = {
      ...prev,
      updatedAt: now,
    };
    if (patch.status !== undefined) {
      updated.status = patch.status as ActionState["status"];
      if (patch.status === "completed") updated.completedAt = now;
      else updated.completedAt = prev.completedAt; // preserve if reverting
    }
    if (patch.progressNote !== undefined && patch.progressNote.trim() !== "") {
      updated.progressNotes = [...(prev.progressNotes ?? []), patch.progressNote.trim()];
    }
    if (patch.ownerOverride !== undefined) {
      updated.ownerOverride = patch.ownerOverride;
    }
    return this.updateClientAnalysis(id, {
      actionStates: { ...existing, [actionKey]: updated },
    });
  }

  async updateCaseWorkflow(
    id: string,
    patch: Partial<Pick<CaseWorkflow, "status" | "priority" | "assignedOwner" | "targetReviewDate">>
  ): Promise<ClientAnalysis | undefined> {
    const current = await this.getClientAnalysis(id);
    if (!current) return undefined;
    const prev: CaseWorkflow = (current as any).caseWorkflow ?? {};
    const updated: CaseWorkflow = {
      ...prev,
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      updatedAt: new Date().toISOString(),
    };
    return this.updateClientAnalysis(id, { caseWorkflow: updated });
  }

  async deleteClientAnalysis(id: string): Promise<boolean> {
    const result = await db
      .delete(clientAnalyses)
      .where(eq(clientAnalyses.id, id))
      .returning();
    return result.length > 0;
  }

  // Admin Dashboard Stats
  async getAdminStats(): Promise<{
    totalClients: number;
    activeClients: number;
    totalAnalyses: number;
    totalDocuments: number;
    recentActivity: Array<{
      type: "client" | "analysis" | "document";
      id: string;
      name: string;
      date: Date;
    }>;
  }> {
    // Count clients
    const [totalClientsResult] = await db
      .select({ count: count() })
      .from(clients);
    
    const [activeClientsResult] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.status, "active"));
    
    // Count analyses
    const [analysesResult] = await db
      .select({ count: count() })
      .from(clientAnalyses);
    
    // Count documents
    const [documentsResult] = await db
      .select({ count: count() })
      .from(clientDocuments);
    
    // Get recent activity (last 10 items)
    const recentClients = await db
      .select({ id: clients.id, name: clients.name, date: clients.createdAt })
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .limit(5);
    
    const recentAnalyses = await db
      .select({ id: clientAnalyses.id, name: clientAnalyses.title, date: clientAnalyses.createdAt })
      .from(clientAnalyses)
      .orderBy(desc(clientAnalyses.createdAt))
      .limit(5);
    
    const recentDocs = await db
      .select({ id: clientDocuments.id, name: clientDocuments.fileName, date: clientDocuments.uploadedAt })
      .from(clientDocuments)
      .orderBy(desc(clientDocuments.uploadedAt))
      .limit(5);
    
    // Combine and sort recent activity
    const recentActivity: Array<{ type: "client" | "analysis" | "document"; id: string; name: string; date: Date }> = [
      ...recentClients.map(c => ({ type: "client" as const, id: c.id, name: c.name, date: c.date! })),
      ...recentAnalyses.map(a => ({ type: "analysis" as const, id: a.id, name: a.name, date: a.date! })),
      ...recentDocs.map(d => ({ type: "document" as const, id: d.id, name: d.name, date: d.date! })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
    
    return {
      totalClients: totalClientsResult?.count || 0,
      activeClients: activeClientsResult?.count || 0,
      totalAnalyses: analysesResult?.count || 0,
      totalDocuments: documentsResult?.count || 0,
      recentActivity,
    };
  }

  // Diagnostic Cases - Case Memory
  async createDiagnosticCase(data: InsertDiagnosticCase): Promise<DiagnosticCase> {
    const [diagnosticCase] = await db
      .insert(diagnosticCases)
      .values(data as any)
      .returning();
    return diagnosticCase;
  }

  async getDiagnosticCase(id: string): Promise<DiagnosticCase | undefined> {
    const [diagnosticCase] = await db
      .select()
      .from(diagnosticCases)
      .where(eq(diagnosticCases.id, id));
    return diagnosticCase;
  }

  async getAllDiagnosticCases(createdBy?: string): Promise<DiagnosticCase[]> {
    if (createdBy) {
      return await db
        .select()
        .from(diagnosticCases)
        .where(eq(diagnosticCases.createdBy, createdBy))
        .orderBy(desc(diagnosticCases.updatedAt));
    }
    return await db
      .select()
      .from(diagnosticCases)
      .orderBy(desc(diagnosticCases.updatedAt));
  }

  async getDiagnosticCasesByClientId(clientId: string): Promise<DiagnosticCase[]> {
    return await db
      .select()
      .from(diagnosticCases)
      .where(eq(diagnosticCases.clientId, clientId))
      .orderBy(desc(diagnosticCases.updatedAt));
  }

  async updateDiagnosticCase(id: string, data: Partial<{
    clientName: string;
    industry: string;
    problemStatement: string;
    analysisId: string;
    diagnosticOutputs: DiagnosticOutputSnapshot;
    executiveSummary: string;
    consultingScope: ConsultingScopeData;
    consultantNotes: string;
    status: CaseStatus;
    rootCausePatternId: string;
    rootCauseSnapshot: RootCausePatternSnapshot;
  }>): Promise<DiagnosticCase | undefined> {
    const [diagnosticCase] = await db
      .update(diagnosticCases)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(diagnosticCases.id, id))
      .returning();
    return diagnosticCase;
  }

  async deleteDiagnosticCase(id: string): Promise<boolean> {
    const result = await db
      .delete(diagnosticCases)
      .where(eq(diagnosticCases.id, id))
      .returning();
    return result.length > 0;
  }

  async finaliseDiagnosticCase(id: string): Promise<DiagnosticCase | undefined> {
    const [diagnosticCase] = await db
      .update(diagnosticCases)
      .set({ status: "finalised", updatedAt: new Date() })
      .where(eq(diagnosticCases.id, id))
      .returning();
    return diagnosticCase;
  }
}

export const storage = new DatabaseStorage();
