import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeSymptom } from "../core/ai-analyzer";
import { z } from "zod";
import { problemLibrary } from "@shared/problem-library";
import { getCauseById } from "@shared/root-cause-library";
import { allIndustryProblems, getProblemsByIndustry, industryLabels, getIndustryStats, getTotalProblemCount, type Industry } from "@shared/industry-problems";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parseDocument, detectFileType } from "../documents/document-parser";
import { runBulkAnalysis } from "../core/bulk-analyzer";
import { generateAnalysisReport } from "../reports/report-generator";
import { generateExportPDF } from "../reports/export-pdf-generator";
import { generateDiagnosticExport } from "../diagnostics/diagnostic-export";
import executionRoutes from "../../src/modules/execution/routes/execution.routes";
import { diagnosticHandler } from "../api/diagnostic-route";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS COMPARISON HELPER
// Compares two completed analyses for the same client and produces a structured
// delta object that powers the Progress Snapshot UI section.
// No AI dependency — fully deterministic.
// ─────────────────────────────────────────────────────────────────────────────

function _normTitle(t: string): string {
  return (t || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function computeProgressComparison(current: any, previous: any): object {
  const currentHealth: number | null = current.mgdAnalysis?.healthScore?.overallScore ?? null;
  const previousHealth: number | null = previous.mgdAnalysis?.healthScore?.overallScore ?? null;
  const healthScoreDelta = (currentHealth != null && previousHealth != null)
    ? Math.round(currentHealth - previousHealth)
    : undefined;

  const currentFindings: any[] = current.findings ?? [];
  const previousFindings: any[] = previous.findings ?? [];

  const currentNorm = new Set(currentFindings.map(f => _normTitle(f.title)).filter(Boolean));
  const previousNorm = new Set(previousFindings.map(f => _normTitle(f.title)).filter(Boolean));

  const findingsDelta = currentFindings.length - previousFindings.length;

  const recurringFindings = currentFindings
    .filter(f => previousNorm.has(_normTitle(f.title)))
    .map(f => f.title as string)
    .filter(Boolean)
    .slice(0, 5);

  const resolvedFindings = previousFindings
    .filter(f => !currentNorm.has(_normTitle(f.title)))
    .map(f => f.title as string)
    .filter(Boolean)
    .slice(0, 5);

  const newFindings = currentFindings
    .filter(f => !previousNorm.has(_normTitle(f.title)))
    .map(f => f.title as string)
    .filter(Boolean)
    .slice(0, 5);

  const currentCats = new Set(
    currentFindings.map(f => (f.category || f.fourMCategory) as string).filter(Boolean)
  );
  const previousCats = new Set(
    previousFindings.map(f => (f.category || f.fourMCategory) as string).filter(Boolean)
  );
  const recurringCategories = [...currentCats].filter(c => previousCats.has(c));

  // Deterministic summary sentence
  const improved = healthScoreDelta != null && healthScoreDelta > 0;
  const worsened = healthScoreDelta != null && healthScoreDelta < 0;
  const catLabel = recurringCategories.length > 0 ? recurringCategories.join("/") : "key";

  let summary: string;
  if (improved && resolvedFindings.length > 0 && recurringFindings.length === 0) {
    summary = "Operational health has improved and previous issues appear resolved. The intervention is taking effect.";
  } else if (improved && recurringFindings.length > 0) {
    summary = `Operational health has improved, but ${catLabel} issues remain unresolved from the previous diagnostic.`;
  } else if (worsened && recurringFindings.length > 0) {
    summary = `The current diagnostic shows recurring ${catLabel}-related instability with limited structural improvement since the previous assessment.`;
  } else if (resolvedFindings.length > 0 && newFindings.length > 0) {
    summary = "Some previous findings appear resolved, though new execution-related issues have emerged that require attention.";
  } else if (recurringFindings.length > 0 && resolvedFindings.length === 0) {
    summary = "The same root causes persist from the previous diagnostic. Corrective actions may not have been implemented or sustained.";
  } else if (resolvedFindings.length > 0 && newFindings.length === 0) {
    summary = "Previous findings appear resolved. No significant new issues have emerged since the last diagnostic.";
  } else {
    summary = "The current diagnostic is broadly consistent with the previous assessment. Continued monitoring is recommended.";
  }

  return {
    previousAnalysisId: previous.id,
    previousAnalysisDate: (previous.completedAt ?? previous.createdAt)?.toISOString?.() ?? String(previous.completedAt ?? previous.createdAt),
    healthScoreDelta,
    findingsDelta,
    recurringFindings,
    resolvedFindings,
    newFindings,
    recurringCategories,
    summary,
  };
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.docx', '.doc', '.pptx', '.ppt', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload Excel, Word, PowerPoint, or PDF files.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Mount execution routes
  app.use("/api/execution", executionRoutes);

  // Auth routes - returns null for unauthenticated users (not 401)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null);
      }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Development route - make current user an admin
  app.post('/api/auth/become-admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.updateUserRole(userId, "admin");
      res.json(user);
    } catch (error) {
      console.error("Error becoming admin:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Update user profile (industry, company name)
  app.patch('/api/auth/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { industry, companyName } = req.body;
      const user = await storage.updateUserProfile(userId, { industry, companyName });
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get problem library for frontend (public endpoint)
  app.get("/api/problems", async (req, res) => {
    try {
      const { category } = req.query;
      let problems = problemLibrary;
      
      if (category && typeof category === "string") {
        problems = problemLibrary.filter(p => p.diagnosticCategory === category);
      }
      
      res.json(problems);
    } catch (error) {
      console.error("Get problems error:", error);
      res.status(500).json({ error: "Failed to retrieve problems" });
    }
  });

  // Analyze symptom and create diagnostic session (protected)
  // INSTITUTIONAL RULE: All diagnostics MUST belong to a client
  app.post("/api/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // INSTITUTIONAL RULE: clientId is REQUIRED - no free-floating analysis allowed
      const requestSchema = z.object({
        clientId: z.string().min(1, "Client organization is required - all diagnostics must belong to a client"),
        symptom: z.string().min(10),
        symptomCategory: z.string(),
        diagnosticCategory: z.string().optional(),
        selectedProblemId: z.string().optional(),
        selectedIndustryProblemId: z.string().optional(),
        industry: z.string().optional(),
        onset: z.string(),
        responses: z.record(z.string()),
      });

      const data = requestSchema.parse(req.body);

      // Use AI to analyze and get root causes (with industry context)
      const { rootCauses, primaryIndicator } = await analyzeSymptom(data);

      // Store the session linked to user and client organization
      const session = await storage.createDiagnosticSession(userId, {
        clientId: data.clientId,
        symptom: data.symptom,
        symptomCategory: data.symptomCategory,
        diagnosticCategory: data.diagnosticCategory,
        selectedProblemId: data.selectedProblemId,
        selectedIndustryProblemId: data.selectedIndustryProblemId,
        industry: data.industry,
        onset: data.onset,
        responses: data.responses,
        rootCauses,
        primaryIndicator,
      });

      res.json({
        sessionId: session.id,
        rootCauses: session.rootCauses,
        primaryIndicator: session.primaryIndicator,
        createdAt: session.createdAt,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to analyze symptom" 
      });
    }
  });

  // Get specific diagnostic session (protected)
  app.get("/api/sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const session = await storage.getDiagnosticSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      // Verify ownership
      const userId = req.user.claims.sub;
      if (session.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(session);
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ error: "Failed to retrieve session" });
    }
  });

  // Get user's diagnostic sessions (protected)
  app.get("/api/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getUserDiagnosticSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ error: "Failed to retrieve sessions" });
    }
  });

  // ============================================
  // KNOWLEDGE MANAGEMENT ROUTES
  // ============================================

  // Get RCI Catalog (pre-loaded problem library)
  app.get("/api/knowledge/catalog", async (req, res) => {
    try {
      const { category } = req.query;
      let problems = problemLibrary;
      
      if (category && typeof category === "string") {
        problems = problemLibrary.filter(p => p.diagnosticCategory === category);
      }
      
      res.json(problems);
    } catch (error) {
      console.error("Get catalog error:", error);
      res.status(500).json({ error: "Failed to retrieve catalog" });
    }
  });

  // Get user's custom problems (protected)
  app.get("/api/knowledge/custom", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const problems = await storage.getUserCustomProblems(userId);
      res.json(problems);
    } catch (error) {
      console.error("Get custom problems error:", error);
      res.status(500).json({ error: "Failed to retrieve custom problems" });
    }
  });

  // Create custom problem (protected)
  app.post("/api/knowledge/custom", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const requestSchema = z.object({
        title: z.string().min(3).max(255),
        description: z.string().min(10),
        diagnosticCategory: z.string(),
        dominantM: z.enum(["Money", "Materials", "Manpower", "Machinery"]),
        indicator: z.enum(["Money Indicator", "Material Indicator", "Manpower Indicator", "Machine Indicator"]),
        commonCauses: z.array(z.string()).min(1),
        recommendedActions: z.array(z.string()).min(1),
        preventionSteps: z.array(z.string()).min(1),
        impactCost: z.string().optional(),
        impactTime: z.string().optional(),
        impactEfficiency: z.string().optional(),
        tags: z.array(z.string()).optional(),
      });

      const data = requestSchema.parse(req.body);
      
      const problem = await storage.createCustomProblem({
        userId,
        ...data,
      });
      
      res.status(201).json(problem);
    } catch (error) {
      console.error("Create custom problem error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to create custom problem" 
      });
    }
  });

  // Update custom problem (protected)
  app.patch("/api/knowledge/custom/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const requestSchema = z.object({
        title: z.string().min(3).max(255).optional(),
        description: z.string().min(10).optional(),
        diagnosticCategory: z.string().optional(),
        dominantM: z.enum(["Money", "Materials", "Manpower", "Machinery"]).optional(),
        indicator: z.enum(["Money Indicator", "Material Indicator", "Manpower Indicator", "Machine Indicator"]).optional(),
        commonCauses: z.array(z.string()).min(1).optional(),
        recommendedActions: z.array(z.string()).min(1).optional(),
        preventionSteps: z.array(z.string()).min(1).optional(),
        impactCost: z.string().optional(),
        impactTime: z.string().optional(),
        impactEfficiency: z.string().optional(),
        tags: z.array(z.string()).optional(),
      });

      const data = requestSchema.parse(req.body);
      
      const problem = await storage.updateCustomProblem(id, userId, data);
      
      if (!problem) {
        return res.status(404).json({ error: "Problem not found or access denied" });
      }
      
      res.json(problem);
    } catch (error) {
      console.error("Update custom problem error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to update custom problem" 
      });
    }
  });

  // Delete custom problem (protected)
  app.delete("/api/knowledge/custom/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const deleted = await storage.deleteCustomProblem(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Problem not found or access denied" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Delete custom problem error:", error);
      res.status(500).json({ error: "Failed to delete custom problem" });
    }
  });

  // Toggle favorite on custom problem (protected)
  app.post("/api/knowledge/custom/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const problem = await storage.toggleFavorite(id, userId);
      
      if (!problem) {
        return res.status(404).json({ error: "Problem not found or access denied" });
      }
      
      res.json(problem);
    } catch (error) {
      console.error("Toggle favorite error:", error);
      res.status(500).json({ error: "Failed to toggle favorite" });
    }
  });

  // Get knowledge insights (protected)
  app.get("/api/knowledge/insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const insights = await storage.getKnowledgeInsights(userId);
      res.json(insights);
    } catch (error) {
      console.error("Get insights error:", error);
      res.status(500).json({ error: "Failed to retrieve insights" });
    }
  });

  // ============================================
  // INDUSTRY PROBLEMS ROUTES
  // ============================================

  // Get all industry problems (with optional filters)
  app.get("/api/industry-problems", async (req, res) => {
    try {
      const { industry } = req.query;
      
      if (industry && typeof industry === "string") {
        const problems = getProblemsByIndustry(industry as Industry);
        return res.json(problems);
      }
      
      res.json(allIndustryProblems);
    } catch (error) {
      console.error("Get industry problems error:", error);
      res.status(500).json({ error: "Failed to retrieve industry problems" });
    }
  });

  // Get list of supported industries with problem counts
  app.get("/api/industries", async (_req, res) => {
    try {
      const stats = getIndustryStats();
      const industries = Object.entries(industryLabels).map(([id, label]) => ({
        id,
        label,
        problemCount: stats[id as Industry] || 0
      }));
      
      res.json({
        industries,
        totalProblems: getTotalProblemCount()
      });
    } catch (error) {
      console.error("Get industries error:", error);
      res.status(500).json({ error: "Failed to retrieve industries" });
    }
  });

  // ============================================
  // ADMIN ROUTES - Client Management
  // ============================================

  // Middleware to check admin role
  const isAdmin = async (req: any, res: any, next: any) => {
    console.log("[isAdmin] Starting check");
    console.log("[isAdmin] req.isAuthenticated():", req.isAuthenticated());
    console.log("[isAdmin] req.user?.claims?.sub:", req.user?.claims?.sub);
    
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      console.log("[isAdmin] FAILED auth check");
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    console.log("[isAdmin] DB user:", user);
    if (!user || user.role !== "admin") {
      console.log("[isAdmin] FAILED admin check - user:", user?.role);
      return res.status(403).json({ error: "Admin access required" });
    }
    console.log("[isAdmin] PASSED");
    next();
  };

  // Get admin dashboard stats
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ error: "Failed to retrieve stats" });
    }
  });

  // Update user role (make user admin)
  app.patch("/api/admin/users/:id/role", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!["admin", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      const user = await storage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // ============================================
  // CLIENT ORGANIZATION ROUTES (Admin only)
  // ============================================

  // Get all client organizations
  app.get("/api/admin/clients", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ error: "Failed to retrieve clients" });
    }
  });

  // Create client - simplified model: name, industry, programme (optional), status
  // Auth: admin role required (counsellor = admin in current model)
  app.post("/api/admin/clients", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Defensive log: confirm authenticated user context
      const userId = req.user?.claims?.sub;
      console.log(`[Client Create] User ${userId} creating client`);
      
      const clientSchema = z.object({
        name: z.string().min(1),
        industry: z.string(),
        programme: z.string().optional(),
        status: z.enum(["active", "archived"]).optional(),
      });
      const data = clientSchema.parse(req.body);
      
      const client = await storage.createClient({
        name: data.name,
        industry: data.industry as any,
        programme: data.programme,
        status: data.status,
      });
      res.status(201).json(client);
    } catch (error) {
      console.error("Create client error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create client" });
    }
  });

  // Get single client organization
  app.get("/api/admin/clients/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Get client error:", error);
      res.status(500).json({ error: "Failed to retrieve client" });
    }
  });

  // Update client - simplified model: name, industry, programme (optional), status
  app.patch("/api/admin/clients/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        industry: z.string().optional(),
        programme: z.string().optional().nullable(),
        status: z.enum(["active", "archived"]).optional(),
      });
      const data = updateSchema.parse(req.body);
      const client = await storage.updateClient(req.params.id, data);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Update client error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  // Client deletion is restricted to authorised roles for data hygiene.
  app.delete("/api/admin/clients/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // ============================================
  // CLIENT DOCUMENT ROUTES (Admin only)
  // ============================================

  // Get all documents for a client
  app.get("/api/admin/clients/:clientId/documents", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const documents = await storage.getClientDocuments(req.params.clientId);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to retrieve documents" });
    }
  });

  async function processDocumentInBackground(docId: string) {
    try {
      const doc = await storage.getClientDocument(docId);
      if (!doc) return;
      
      console.log(`AUTO-PROCESS: Starting ${doc.fileName} (type=${doc.fileType}, path=${doc.filePath})`);
      await storage.updateClientDocument(doc.id, { status: "processing" });
      
      let extractedData;
      try {
        extractedData = await parseDocument(doc.filePath, doc.fileType);
      } catch (parseErr) {
        const errMsg = parseErr instanceof Error ? parseErr.message : "Unknown parser error";
        console.error(`AUTO-PROCESS: ${doc.fileName} — parser threw exception: ${errMsg}`);
        await storage.updateClientDocument(doc.id, {
          status: "error",
          processingError: `Parser error: ${errMsg}`,
          processedAt: new Date(),
        });
        return;
      }
      
      const textLen = extractedData.rawText?.length || 0;
      console.log(`AUTO-PROCESS: ${doc.fileName} — extracted ${textLen} chars of text`);
      
      if (textLen < 100) {
        const warnMsg = doc.fileType === 'pdf' 
          ? "No readable text detected (likely scanned PDF). Signal extraction will be limited."
          : "Very little text extracted. Signal extraction will be limited.";
        
        console.warn(`AUTO-PROCESS: ${doc.fileName} — text extraction short (${textLen} chars), marking processed with warning`);
        await storage.updateClientDocument(doc.id, {
          status: "processed",
          extractedData,
          processingError: warnMsg,
          processedAt: new Date(),
        });
        return;
      }
      
      console.log(`AUTO-PROCESS: ${doc.fileName} — first 300 chars: ${extractedData.rawText?.slice(0, 300)}`);
      
      await storage.updateClientDocument(doc.id, {
        status: "processed",
        extractedData,
        processingError: null,
        processedAt: new Date(),
      });
      console.log(`AUTO-PROCESS: Document ${doc.fileName} processed successfully (${textLen} chars)`);
    } catch (err) {
      console.error(`AUTO-PROCESS: Document ${docId} failed:`, err);
      await storage.updateClientDocument(docId, {
        status: "error",
        processingError: err instanceof Error ? err.message : "Failed to process document",
      }).catch(() => {});
    }
  }

  // Upload documents for a client
  app.post("/api/admin/clients/:clientId/documents", isAuthenticated, isAdmin, upload.array('files', 10), async (req: any, res) => {
    try {
      const clientId = req.params.clientId;
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploadedDocs = [];
      for (const file of files) {
        const fileType = detectFileType(file.originalname);
        const doc = await storage.createClientDocument({
          clientId: clientId,
          fileName: file.originalname,
          fileType,
          fileSize: file.size,
          filePath: file.path,
          status: "uploaded",
        });
        uploadedDocs.push(doc);
      }

      res.status(201).json(uploadedDocs);

      for (const doc of uploadedDocs) {
        processDocumentInBackground(doc.id);
      }
    } catch (error) {
      console.error("Upload documents error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to upload documents" });
    }
  });

  // Process a document (extract data)
  app.post("/api/admin/documents/:id/process", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const doc = await storage.getClientDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      await storage.updateClientDocument(doc.id, { status: "processing" });

      try {
        const extractedData = await parseDocument(doc.filePath, doc.fileType);
        const updatedDoc = await storage.updateClientDocument(doc.id, {
          status: "processed",
          extractedData,
          processedAt: new Date(),
        });
        res.json(updatedDoc);
      } catch (parseError) {
        await storage.updateClientDocument(doc.id, {
          status: "error",
          processingError: parseError instanceof Error ? parseError.message : "Failed to parse document",
        });
        throw parseError;
      }
    } catch (error) {
      console.error("Process document error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to process document" });
    }
  });

  // Batch reprocess all documents for a client
  app.post("/api/admin/clients/:clientId/documents/reprocess", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const clientId = req.params.clientId;
      const docs = await storage.getClientDocuments(clientId);
      if (!docs || docs.length === 0) {
        return res.status(404).json({ error: "No documents found" });
      }
      const toProcess = docs.filter(d => d.status !== "processing");
      for (const doc of toProcess) {
        processDocumentInBackground(doc.id);
      }
      res.json({ message: `Reprocessing ${toProcess.length} document(s)`, count: toProcess.length });
    } catch (error) {
      console.error("Reprocess documents error:", error);
      res.status(500).json({ error: "Failed to reprocess documents" });
    }
  });

  // Get single document
  app.get("/api/admin/documents/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const doc = await storage.getClientDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({ error: "Failed to retrieve document" });
    }
  });

  // Delete a document
  app.delete("/api/admin/documents/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const doc = await storage.getClientDocument(req.params.id);
      if (doc && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
      const deleted = await storage.deleteClientDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ============================================
  // CLIENT ANALYSIS ROUTES (Admin only)
  // ============================================

  // Get all analyses for a client
  app.get("/api/admin/clients/:clientId/analyses", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const analyses = await storage.getClientAnalyses(req.params.clientId);
      res.json(analyses);
    } catch (error) {
      console.error("Get analyses error:", error);
      res.status(500).json({ error: "Failed to retrieve analyses" });
    }
  });

  // Get single analysis
  app.get("/api/admin/analyses/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const analysis = await storage.getClientAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Compute progress comparison if there is a previous completed analysis for this client
      let progressComparison: object | undefined;
      if (analysis.status === "completed" && analysis.clientId) {
        const allForClient = await storage.getClientAnalyses(analysis.clientId);
        const previous = allForClient.find(
          a => a.id !== analysis.id && a.status === "completed" && a.mgdAnalysis != null
        );
        if (previous) {
          progressComparison = computeProgressComparison(analysis, previous);
        }
      }

      res.json({ ...analysis, progressComparison });
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ error: "Failed to retrieve analysis" });
    }
  });

  // Create a new analysis
  app.post("/api/admin/clients/:clientId/analyses", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const analysisSchema = z.object({
        title: z.string().min(1),
        problemStatement: z.string().min(1),
        analysisType: z.enum(["quick", "deep"]),
        documentIds: z.array(z.string()).optional(),
        diagnosticContexts: z.array(z.string()).optional(),
        selectedSymptoms: z.array(z.string()).optional(),
      });
      const data = analysisSchema.parse(req.body);
      
      const analysis = await storage.createClientAnalysis({
        clientId: req.params.clientId,
        title: data.title,
        problemStatement: data.problemStatement,
        analysisType: data.analysisType,
        documentIds: data.documentIds,
        diagnosticContexts: data.diagnosticContexts as any,
        selectedSymptoms: data.selectedSymptoms,
        status: "pending",
      });
      res.status(201).json(analysis);
    } catch (error) {
      console.error("Create analysis error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create analysis" });
    }
  });

  // Export enables offline review and institutional reporting.
  app.get("/api/admin/analyses/:id/report", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const analysis = await storage.getClientAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      const client = await storage.getClient(analysis.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const pdfBuffer = await generateAnalysisReport({ analysis, client });

      // Filename format: ClientName_AnalysisType_Date.pdf
      const clientName = client.name.replace(/[^a-zA-Z0-9]/g, '_');
      const analysisType = analysis.analysisType === "quick" ? "QuickAnalysis" : "DeepAnalysis";
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${clientName}_${analysisType}_${dateStr}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Generate report error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate report" });
    }
  });

  // Generate export PDF (matches Export Preview structure)
  app.post("/api/admin/export/pdf", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const exportSchema = z.object({
        exportType: z.enum(["executive_diagnostic_summary", "consulting_proposal_pack", "diagnostic_appendix"]),
        coverPage: z.object({
          clientName: z.string(),
          engagementTitle: z.string(),
          engagementSubtitle: z.string().optional(),
          assessmentDate: z.string(),
          preparedBy: z.object({
            firmName: z.string(),
            consultantName: z.string().optional(),
          }),
          confidentialityNotice: z.string(),
          documentReference: z.string().optional(),
        }),
        executiveSummary: z.object({
          situationOverview: z.string(),
          keyFindings: z.array(z.string()),
          businessImpact: z.string(),
          recommendedDirection: z.string(),
          interventionAssessment: z.string(),
          nextStepOptions: z.array(z.string()),
        }).optional(),
        interventionAssessment: z.object({
          severity: z.enum(["low", "medium", "high"]),
          businessImpact: z.enum(["low", "medium", "high"]),
          clientCapability: z.enum(["low", "medium", "high"]),
        }).optional(),
        consultingScope: z.object({
          phase1: z.object({ objectives: z.string(), activities: z.string(), outputs: z.string() }),
          phase2: z.object({ objectives: z.string(), activities: z.string(), outputs: z.string() }),
          phase3: z.object({ objectives: z.string(), activities: z.string(), outputs: z.string() }),
        }).optional(),
        evidenceTraceability: z.object({
          clientInputs: z.object({
            documentsReviewed: z.string(),
            interviewsConducted: z.string(),
            observationsNoted: z.string(),
          }),
          knowledgeReferences: z.object({
            rootCausePatterns: z.string(),
            historicalCases: z.string(),
            frameworksApplied: z.string(),
          }),
          reasoningTrace: z.string(),
          assumptionsLimitations: z.string(),
        }).optional(),
        interventionRequired: z.boolean().optional(),
        includeAppendix: z.boolean().optional(),
      });

      const data = exportSchema.parse(req.body);
      const pdfBuffer = await generateExportPDF(data);

      const filename = `${data.coverPage.engagementTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${data.coverPage.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Generate export PDF error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate export PDF" });
    }
  });

  // Generate PERNAS-ready diagnostic export PDF
  app.post("/api/admin/diagnostic-export", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const exportSchema = z.object({
        clientName: z.string(),
        industry: z.string(),
        problemStatement: z.string(),
        createdAt: z.string(),
        status: z.string(),
        executiveSummary: z.string().optional(),
        diagnosticOutputs: z.object({
          rootCauses: z.array(z.object({
            category: z.string(),
            causes: z.array(z.any()),
          })).optional(),
          recommendations: z.array(z.object({
            category: z.string(),
            recommendations: z.array(z.any()),
          })).optional(),
          findings: z.array(z.any()).optional(),
        }),
      });

      const data = exportSchema.parse(req.body);
      const pdfBuffer = await generateDiagnosticExport(data);

      const filename = `Diagnostic_Export_${data.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Generate diagnostic export error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate diagnostic export" });
    }
  });

  // Run/execute an analysis
  app.post("/api/admin/analyses/:id/run", isAuthenticated, isAdmin, async (req: any, res) => {
    // DEBUG: Entry point log - confirms this endpoint is being hit
    console.log("RCI ANALYZER ENTRY POINT HIT", {
      analysisId: req.params.id,
      timestamp: new Date().toISOString()
    });
    
    try {
      const userId = req.user.claims.sub;
      const analysis = await storage.getClientAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // INSTITUTIONAL RULE: Diagnostics must be run within a Client context
      if (!analysis.clientId) {
        return res.status(400).json({ error: "Diagnostics must be run within a Client context." });
      }

      const client = await storage.getClient(analysis.clientId);
      if (!client) {
        return res.status(404).json({ error: "Diagnostics must be run within a Client context." });
      }

      // Auto-create a case when analysis starts (if not already linked)
      let caseId = analysis.caseId;
      if (!caseId) {
        const newCase = await storage.createDiagnosticCase({
          clientId: client.id,
          analysisId: analysis.id, // Link to source analysis
          clientName: client.name,
          industry: client.industry,
          problemStatement: analysis.title,
          createdBy: userId,
          status: "draft",
        });
        caseId = newCase.id;
        await storage.updateClientAnalysis(analysis.id, { caseId });
      } else {
        // GOVERNANCE RULE: Only Draft diagnostics can be rerun
        const linkedCase = await storage.getDiagnosticCase(caseId);
        if (linkedCase && linkedCase.status === "finalised") {
          return res.status(400).json({ 
            error: "Cannot rerun analysis for a finalised case. Finalised cases are read-only." 
          });
        }
      }

      // Diagnostic mode is finalised once and treated as the single source of truth.
      // Mode is determined by document selection BEFORE execution:
      // - If documentIds specified and not empty → "deep" (Evidence-Enriched)
      // - Else → "baseline" (Preliminary)
      const diagnosticMode = (analysis.documentIds && analysis.documentIds.length > 0) ? "deep" : "baseline";
      
      // Persist mode on the diagnostic record BEFORE execution
      await storage.updateClientAnalysis(analysis.id, { 
        status: "running",
        analysisMode: diagnosticMode === "deep" ? "evidence-enriched" : "baseline",
      });

      try {
        const documents = await storage.getClientDocuments(analysis.clientId);
        const docsToAnalyze = diagnosticMode === "deep" && analysis.documentIds && analysis.documentIds.length > 0
          ? documents.filter(d => analysis.documentIds!.includes(d.id))
          : documents;

        // Diagnostics must be anchored to an explicit problem statement.
        // Context selection narrows diagnostic scope and increases relevance.
        const result = await runBulkAnalysis({
          documents: docsToAnalyze,
          industry: client.industry,
          analysisType: analysis.analysisType,
          clientName: client.name,
          mode: diagnosticMode,
          problemStatement: analysis.problemStatement || "General operational assessment",
          diagnosticContexts: analysis.diagnosticContexts || undefined,
          selectedSymptoms: analysis.selectedSymptoms || undefined,
        });

        // Derive signals from matched evidence across all findings
        const extractedSignals: string[] = Array.from(new Set(
          result.findings.flatMap(f => [
            ...(f.evidenceTrail?.matchedConcreteSignals ?? []),
            ...(f.evidenceTrail?.matchedEvidenceSignals ?? []),
          ])
        ));

        // No KPI values available at this pipeline stage — engine will use available signals only
        const extractedKPIData: Record<string, number> = {};

        const mgdAnalysis = (result as any).mgdAnalysis ?? null;

        const updatedAnalysis = await storage.updateClientAnalysis(analysis.id, {
          status: "completed",
          findings: result.findings,
          summary: result.summary,
          costSavingOpportunities: result.costSavingOpportunities,
          predictions: result.predictions,
          analysisMode: result.analysisMode,
          confidence: result.confidence,
          isMockMode: result.isMockMode,
          mgdAnalysis,
          completedAt: new Date(),
        });

        // Auto-save outputs to the linked case (only if draft)
        if (caseId) {
          try {
            const linkedCase = await storage.getDiagnosticCase(caseId);
            if (linkedCase && linkedCase.status === "draft") {
              const updatedCase = await storage.updateDiagnosticCase(caseId, {
                analysisId: analysis.id, // Ensure bidirectional link
                diagnosticOutputs: {
                  findings: result.findings,
                  costSavingOpportunities: result.costSavingOpportunities,
                  predictions: result.predictions,
                  analysisType: analysis.analysisType,
                  analysisDate: new Date().toISOString(),
                },
                executiveSummary: result.summary,
              });
              if (!updatedCase) {
                console.error(`Case save warning: Failed to update case ${caseId}`);
              }
            }
          } catch (caseSaveError) {
            // Log case save failure but don't fail the whole analysis
            console.error(`Case Memory save failed for case ${caseId}:`, caseSaveError);
            // Analysis completed successfully, but case wasn't saved - this is a non-critical error
          }
        }

        res.json(updatedAnalysis);
      } catch (analysisError) {
        await storage.updateClientAnalysis(analysis.id, {
          status: "error",
          processingError: analysisError instanceof Error ? analysisError.message : "Analysis failed",
        });
        throw analysisError;
      }
    } catch (error) {
      console.error("Run analysis error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to run analysis" });
    }
  });

  // Delete an analysis
  app.delete("/api/admin/analyses/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteClientAnalysis(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete analysis error:", error);
      res.status(500).json({ error: "Failed to delete analysis" });
    }
  });

  // ============ CASE MEMORY API ROUTES ============
  // INSTITUTIONAL RULE: Case memory must always be client-owned.
  // Cases are displayed ONLY within the Client Overview.
  // Legacy entries without clientId are marked as "Unlinked (Legacy)" and hidden from default views.

  // Get all cases - filters out legacy entries without valid clientId by default
  // Use ?includeLegacy=true to include unlinked legacy entries
  app.get("/api/admin/cases", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const includeLegacy = req.query.includeLegacy === "true";
      const allCases = await storage.getAllDiagnosticCases();
      
      // Filter: Only show cases with valid clientId (institutional rule)
      // Legacy entries without clientId are hidden from default views
      const filteredCases = includeLegacy 
        ? allCases 
        : allCases.filter(c => c.clientId && c.clientId.trim() !== "");
      
      res.json(filteredCases);
    } catch (error) {
      console.error("Get cases error:", error);
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  // Get single case - includes legacy flag for unlinked cases
  app.get("/api/admin/cases/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const diagnosticCase = await storage.getDiagnosticCase(req.params.id);
      if (!diagnosticCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      // INSTITUTIONAL RULE: Case memory must always be client-owned.
      // Legacy entries without clientId are marked as "Unlinked (Legacy)"
      const isLegacy = !diagnosticCase.clientId || diagnosticCase.clientId.trim() === "";
      
      res.json({
        ...diagnosticCase,
        isLegacy,
        legacyLabel: isLegacy ? "Unlinked (Legacy)" : null,
      });
    } catch (error) {
      console.error("Get case error:", error);
      res.status(500).json({ error: "Failed to fetch case" });
    }
  });

  // Get cases by client - display saved diagnostics per client
  app.get("/api/admin/clients/:clientId/cases", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      const cases = await storage.getDiagnosticCasesByClientId(req.params.clientId);
      res.json(cases);
    } catch (error) {
      console.error("Get cases by client error:", error);
      res.status(500).json({ error: "Failed to fetch cases for this client" });
    }
  });

  // Create new case
  app.post("/api/admin/cases", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // INSTITUTIONAL RULE: All cases MUST belong to a client
      const caseSchema = z.object({
        clientId: z.string().min(1, "Client organization is required - all cases must belong to a client"),
        clientName: z.string().min(1, "Client name is required"),
        industry: z.string().min(1, "Industry is required"),
        problemStatement: z.string().min(1, "Problem statement is required"),
        diagnosticOutputs: z.any().optional(),
        executiveSummary: z.string().optional(),
        consultingScope: z.any().optional(),
        consultantNotes: z.string().optional(),
        status: z.enum(["draft", "finalised"]).optional(),
      });

      const data = caseSchema.parse(req.body);
      const newCase = await storage.createDiagnosticCase({
        ...data,
        createdBy: userId,
        status: data.status || "draft",
      });
      res.status(201).json(newCase);
    } catch (error) {
      console.error("Create case error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create case" });
    }
  });

  // Update case
  app.patch("/api/admin/cases/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const existingCase = await storage.getDiagnosticCase(req.params.id);
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      if (existingCase.status === "finalised") {
        return res.status(400).json({ error: "Cannot edit a finalised case" });
      }
      
      const updateSchema = z.object({
        clientName: z.string().optional(),
        industry: z.string().optional(),
        problemStatement: z.string().optional(),
        diagnosticOutputs: z.any().optional(),
        executiveSummary: z.string().optional(),
        consultingScope: z.any().optional(),
        consultantNotes: z.string().optional(),
        status: z.enum(["draft", "finalised"]).optional(),
      });

      const data = updateSchema.parse(req.body);
      const updatedCase = await storage.updateDiagnosticCase(req.params.id, data);
      res.json(updatedCase);
    } catch (error) {
      console.error("Update case error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update case" });
    }
  });

  // Finalise case
  app.post("/api/admin/cases/:id/finalise", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const existingCase = await storage.getDiagnosticCase(req.params.id);
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      if (existingCase.status === "finalised") {
        return res.status(400).json({ error: "Case is already finalised" });
      }
      
      const finalisedCase = await storage.finaliseDiagnosticCase(req.params.id);
      res.json(finalisedCase);
    } catch (error) {
      console.error("Finalise case error:", error);
      res.status(500).json({ error: "Failed to finalise case" });
    }
  });

  // RCI Brain v2: Attach a root cause pattern to a case
  // Snapshots the pattern's current fields — does NOT mutate the source RootCauseEntry
  app.post("/api/admin/cases/:id/attach-pattern", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const existingCase = await storage.getDiagnosticCase(req.params.id);
      if (!existingCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      if (existingCase.status === "finalised") {
        return res.status(400).json({ error: "Cannot modify a finalised case" });
      }

      const attachSchema = z.object({
        rootCauseId: z.string().min(1),
      });

      const { rootCauseId } = attachSchema.parse(req.body);
      const rootCauseEntry = getCauseById(rootCauseId);

      if (!rootCauseEntry) {
        return res.status(404).json({ error: "Root cause pattern not found in library" });
      }

      const snapshot = {
        patternName: rootCauseEntry.title,
        validationChecklist: rootCauseEntry.validationChecklist || [],
        antiPatterns: rootCauseEntry.antiPatterns || [],
        highLeverageFix: rootCauseEntry.highLeverageFix || "",
        preventionStrategy: rootCauseEntry.preventionStrategy || "",
      };

      const updatedCase = await storage.updateDiagnosticCase(req.params.id, {
        rootCausePatternId: rootCauseId,
        rootCauseSnapshot: snapshot,
      });

      res.json(updatedCase);
    } catch (error) {
      console.error("Attach pattern error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to attach pattern to case" });
    }
  });

  // Delete case
  app.delete("/api/admin/cases/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteDiagnosticCase(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Case not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete case error:", error);
      res.status(500).json({ error: "Failed to delete case" });
    }
  });

  // ============ CLIENT PORTAL API ROUTES ============
  
  // Get client dashboard summary
  app.get("/api/client/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.clientId) {
        return res.status(400).json({ error: "Not linked to an organization" });
      }

      const organization = await storage.getClient(user.clientId);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const analyses = await storage.getClientAnalyses(user.clientId);
      const completedAnalyses = analyses.filter(a => a.status === "completed");
      
      let totalIssues = 0;
      let criticalIssues = 0;
      
      completedAnalyses.forEach(analysis => {
        const findings = analysis.findings || [];
        totalIssues += findings.length;
        criticalIssues += findings.filter(f => f.severity === "critical" || f.severity === "high").length;
      });

      res.json({
        organization,
        stats: {
          totalAnalyses: completedAnalyses.length,
          totalIssues,
          criticalIssues,
        },
        recentAnalyses: completedAnalyses.slice(0, 5),
      });
    } catch (error) {
      console.error("Client dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Get all analyses for client's organization
  app.get("/api/client/analyses", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.clientId) {
        return res.status(400).json({ error: "Not linked to an organization" });
      }

      const analyses = await storage.getClientAnalyses(user.clientId);
      const completedAnalyses = analyses.filter(a => a.status === "completed");
      res.json(completedAnalyses);
    } catch (error) {
      console.error("Client analyses error:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  // Get specific analysis details for client
  app.get("/api/client/analyses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Must be linked to an organization
      if (!user.clientId) {
        return res.status(403).json({ error: "Not linked to an organization" });
      }
      
      const analysis = await storage.getClientAnalysis(req.params.id);
      
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Verify organization ownership
      if (analysis.clientId !== user.clientId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Only return completed analyses to clients
      if (analysis.status !== "completed") {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Client analysis detail error:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  // Get all issues across all analyses for client
  app.get("/api/client/issues", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.clientId) {
        return res.status(400).json({ error: "Not linked to an organization" });
      }

      const analyses = await storage.getClientAnalyses(user.clientId);
      const completedAnalyses = analyses.filter(a => a.status === "completed");
      
      const issues = completedAnalyses.flatMap(analysis => 
        (analysis.findings || []).map(finding => ({
          ...finding,
          analysisId: analysis.id,
          analysisTitle: analysis.title,
          analysisDate: analysis.completedAt,
        }))
      );

      res.json(issues);
    } catch (error) {
      console.error("Client issues error:", error);
      res.status(500).json({ error: "Failed to fetch issues" });
    }
  });

  app.post("/api/diagnostic-route", diagnosticHandler);

  const httpServer = createServer(app);

  return httpServer;
}
