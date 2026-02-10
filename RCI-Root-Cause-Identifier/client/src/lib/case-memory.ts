/**
 * Case Memory Local Storage
 * 
 * INSTITUTIONAL RULE: Case memory must always be client-owned.
 * All cases MUST reference a clientId.
 * Legacy entries without clientId are marked as "Unlinked (Legacy)" and hidden from default views.
 */
const STORAGE_KEY = "rci_case_memory";

export interface LocalCase {
  id: string;
  clientId?: string; // REQUIRED: All cases must belong to a client
  clientName: string;
  industry: string;
  problemStatement: string;
  diagnosticOutputs: any;
  executiveSummary: string;
  consultantNotes: string;
  status: "draft" | "finalised";
  createdAt: string;
  updatedAt: string;
  isLegacy?: boolean; // True if case has no clientId (unlinked legacy)
  legacyLabel?: string; // "Unlinked (Legacy)" label for display
}

function generateId(): string {
  return `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function migrateCase(rawCase: any): LocalCase {
  if (!rawCase || typeof rawCase !== "object") {
    const fallbackNow = new Date().toISOString();
    return {
      id: `case_${Date.now()}_empty`,
      clientName: "Unknown Client",
      industry: "general",
      problemStatement: "",
      diagnosticOutputs: {
        rootCauses: [],
        recommendations: [],
        evidenceData: {
          clientInputs: { documentsReviewed: "", interviewsConducted: "", observationsNoted: "" },
          knowledgeReferences: { rootCausePatterns: "", historicalCases: "", frameworksApplied: "" },
          reasoningTrace: "",
          assumptionsLimitations: ""
        },
        assessment: { severity: "medium", businessImpact: "medium", clientCapability: "medium", requiresIntervention: false },
        analysisDate: fallbackNow,
      },
      executiveSummary: "",
      consultantNotes: "",
      status: "draft",
      createdAt: fallbackNow,
      updatedAt: fallbackNow,
    };
  }
  
  const diagnosticOutputs = rawCase.diagnosticOutputs || {};
  const existingCreatedAt = rawCase.createdAt || new Date().toISOString();
  const existingUpdatedAt = rawCase.updatedAt || existingCreatedAt;
  
  // INSTITUTIONAL RULE: Case memory must always be client-owned.
  // Legacy entries without clientId are marked as "Unlinked (Legacy)"
  const clientId = rawCase.clientId || "";
  const isLegacy = !clientId || clientId.trim() === "";
  
  return {
    id: rawCase.id || `case_legacy_${existingCreatedAt.replace(/[^0-9]/g, "").slice(0, 14)}`,
    clientId: clientId,
    clientName: rawCase.clientName || "Unknown Client",
    industry: rawCase.industry || "general",
    problemStatement: rawCase.problemStatement || "",
    diagnosticOutputs: {
      rootCauses: diagnosticOutputs.rootCauses || [],
      recommendations: diagnosticOutputs.recommendations || [],
      evidenceData: diagnosticOutputs.evidenceData || {
        clientInputs: { documentsReviewed: "", interviewsConducted: "", observationsNoted: "" },
        knowledgeReferences: { rootCausePatterns: "", historicalCases: "", frameworksApplied: "" },
        reasoningTrace: "",
        assumptionsLimitations: ""
      },
      assessment: diagnosticOutputs.assessment || {
        severity: "medium",
        businessImpact: "medium",
        clientCapability: "medium",
        requiresIntervention: false
      },
      analysisDate: diagnosticOutputs.analysisDate || existingCreatedAt,
    },
    executiveSummary: rawCase.executiveSummary || "",
    consultantNotes: rawCase.consultantNotes || "",
    status: rawCase.status === "finalised" ? "finalised" : "draft",
    createdAt: existingCreatedAt,
    updatedAt: existingUpdatedAt,
    isLegacy: isLegacy,
    legacyLabel: isLegacy ? "Unlinked (Legacy)" : undefined,
  };
}

/**
 * Get all cases from local storage.
 * INSTITUTIONAL RULE: Case memory must always be client-owned.
 * By default, filters out legacy cases without clientId.
 * @param includeLegacy - If true, includes unlinked legacy entries
 */
export function getCases(includeLegacy: boolean = false): LocalCase[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    const allCases = parsed.map(migrateCase);
    
    // Filter: Only show cases with valid clientId by default
    if (includeLegacy) {
      return allCases;
    }
    return allCases.filter(c => !c.isLegacy);
  } catch {
    return [];
  }
}

function saveCases(cases: LocalCase[]): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch {
    console.error("Failed to save cases to localStorage");
  }
}

export function getCase(id: string): LocalCase | undefined {
  const cases = getCases();
  const found = cases.find(c => c.id === id);
  return found ? migrateCase(found) : undefined;
}

export function createCase(data: Omit<LocalCase, "id" | "createdAt" | "updatedAt" | "status" | "consultantNotes">): LocalCase {
  const cases = getCases();
  const now = new Date().toISOString();
  
  const newCase: LocalCase = {
    id: generateId(),
    clientName: data.clientName,
    industry: data.industry,
    problemStatement: data.problemStatement,
    diagnosticOutputs: data.diagnosticOutputs,
    executiveSummary: data.executiveSummary,
    consultantNotes: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  
  const updatedCases = [newCase, ...cases];
  saveCases(updatedCases);
  
  return { ...newCase };
}

export function updateCase(id: string, data: Partial<Omit<LocalCase, "id" | "createdAt">>): LocalCase | undefined {
  const cases = getCases();
  const index = cases.findIndex(c => c.id === id);
  
  if (index === -1) return undefined;
  
  const existingCase = cases[index];
  
  if (existingCase.status === "finalised") {
    return { ...existingCase };
  }
  
  const updatedCase: LocalCase = {
    ...existingCase,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  const updatedCases = [...cases];
  updatedCases[index] = updatedCase;
  saveCases(updatedCases);
  
  return { ...updatedCase };
}

export function finaliseCase(id: string): LocalCase | undefined {
  const cases = getCases();
  const index = cases.findIndex(c => c.id === id);
  
  if (index === -1) return undefined;
  
  const existingCase = cases[index];
  
  const updatedCase: LocalCase = {
    ...existingCase,
    status: "finalised",
    updatedAt: new Date().toISOString(),
  };
  
  const updatedCases = [...cases];
  updatedCases[index] = updatedCase;
  saveCases(updatedCases);
  
  return { ...updatedCase };
}

export function deleteCase(id: string): boolean {
  const cases = getCases();
  const index = cases.findIndex(c => c.id === id);
  
  if (index === -1) return false;
  
  const updatedCases = cases.filter(c => c.id !== id);
  saveCases(updatedCases);
  
  return true;
}
