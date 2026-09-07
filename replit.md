# Margin Guard - Scope Optix Platform

## Overview
Margin Guard is an AI-powered consulting platform branded under Scope Optix. It serves as a tool for consultants to win and manage client contracts by analyzing operational data and identifying root causes using the 4M framework (Money, Materials, Manpower, Machinery).

**Two User Types:**
- **Admin (Consultant)**: Manages knowledge base, client organizations, uploads documents, runs AI analyses, and generates PDF reports
- **Clients (Paying Companies)**: View their issues, diagnoses, and solutions through a dedicated portal

The platform supports 13 industries with 146+ industry-specific problems, features demo mode for pitching potential clients, and includes comprehensive PDF report generation with Scope Optix branding.

## User Preferences
Preferred communication style: Simple, everyday language.
Target users: Malaysian SME owners (non-technical)

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript (SPA)
- **Routing**: Wouter
- **State Management**: TanStack Query v5 (server state), React hooks (local state)
- **UI Framework**: Shadcn UI (built on Radix UI)
- **Styling**: Tailwind CSS with "new-york" style variant
- **Design Philosophy**: Utilitarian, productivity-focused, flat, neutral color palette, Inter font for readability.

### Key Pages

**Counsellor View (Full Access):**
- Admin Dashboard: Overview of all clients and analyses, Ask Margin Guard input
- Client Management: Create/edit client organizations
- Client Detail: View client info, upload documents, manage analyses, Case Memory
- **Diagnostic Setup** (`/clients/:clientId/diagnostics/new`): Single canonical route for starting diagnostics
  - Accessed via "Run New Diagnostic" button in Client Overview or "Analyze" button in Clients list
  - Automatically binds clientId from route params (no manual client selection)
  - Shows "Client context missing." if clientId is invalid
  - After analysis completion, redirects back to Client Overview
- Analysis Results: View findings, download PDF reports
- Cases Page: List/manage all diagnostic cases
- Case Detail: Full case view with editable drafts

**Management View (Read-Only):**
- Management Dashboard: `/management` - Client list, diagnostics summary, 4M distribution
- Management Client Detail: `/management/clients/:id` - Read-only client summary, no free-text notes
- Management Case Detail: `/management/cases/:id` - Read-only diagnostic summary

**Client Portal Pages:**
- Client Dashboard: Summary of issues and recent analyses
- Issues Page: All identified issues with filtering and details
- Analysis Detail: Full view of a specific analysis

**Demo/Shared Pages:**
- Landing, Onboarding, Demo Mode (Diagnose), Results, History, Knowledge

### Operational Views
Two logical views for admin users (no permissions yet, just UI separation):

1. **Counsellor View**: Full client access, full diagnostic detail, editable drafts, consultant notes
   - Access via: `/admin/*` routes
   - Features: Run analyses, edit cases, view notes, full 4M breakdown

2. **Management View**: Read-only summary for oversight
   - Access via: `/management/*` routes
   - Features: Client list, diagnostics summary, aggregated 4M distribution
   - Restrictions: NO free-text notes visible, NO edit capabilities

### Backend
- **Framework**: Express.js with TypeScript (Node.js)
- **Build System**: Vite (development), esbuild (production)
- **Module System**: ES Modules (ESM)
- **Authentication**: Replit Auth (OpenID Connect) with `connect-pg-simple` for session storage
- **File Uploads**: Multer for handling document uploads (Excel, Word, PowerPoint)
- **Storage Layer**: PostgreSQL with Drizzle ORM

### Data Models
**INSTITUTIONAL RULE: All diagnostics MUST belong to a Client. No free-floating analysis allowed.**

- `clients`: Client companies (id, name, industry, programme, status, createdAt). Client deletion is restricted to authorised roles and cascades to delete all associated diagnosticCases, clientDocuments, and clientAnalyses.
- `users`: User accounts with role (admin/client), industry, clientId
- `clientDocuments`: Uploaded files for analysis (requires clientId)
- `clientAnalyses`: Analysis records with findings, cost savings, predictions (requires clientId)
- `diagnosticSessions`: Diagnostic session data (requires clientId)
- `diagnosticCases`: Case Memory - persistent case records with Draft/Finalised status (requires clientId)

### Case Memory
Persistence layer for diagnostic cases:
- **Purpose**: Save and reopen past analyses for real client engagements
- **Fields**: Client name, industry, problem statement, diagnostic outputs (snapshot), executive summary, consulting scope, consultant notes, timestamp, status (Draft/Finalised)
- **Auto-Save**: Cases are automatically created when "Run Analysis" is triggered; outputs are saved automatically when analysis completes
- **Workflow**: Draft cases are editable; finalised cases are read-only (cannot be modified even by re-running analysis)
- **Access**: Consultants only (admin role)
- **Pages**: `/admin/cases` (list/manage), `/admin/cases/:id` (detail view)
- **Integration**: "View Case" link on analysis results (replaces manual save button)
- **Note**: No auto-update to Knowledge Library, no AI learning - persistence only

### Document Parser (`server/document-parser.ts`)
Parses uploaded files:
- **Excel (.xlsx)**: Extracts sheet data as rows/columns
- **Word (.docx)**: Extracts text content via mammoth
- **PowerPoint (.pptx)**: Extracts slide text

### AI Bulk Analyzer (`server/bulk-analyzer.ts`)

**MOCK_MODE Flag** (default: true):
- When MOCK_MODE is true, skips all external AI API calls
- Returns deterministic mock diagnostic results
- Uses the SAME data structures as real execution
- Mock results vary based on industry, context, and analysis mode
- Mock mode is a wrapper ONLY - does NOT change business logic

**Dual-Mode Diagnostic Engine:**
Diagnostic mode reflects evidence usage, not user intent. Mode is derived STRICTLY from document availability.

- **Baseline Mode** ("Baseline (Preliminary)"): Runs when selectedDocuments.length === 0
  - Uses problem description + industry context for pattern matching
  - Output marked with confidence: "preliminary"
  - Enables honest first-pass diagnostics without fabricating evidence
- **Deep Mode** ("Deep Diagnostic (Evidence-Enriched)"): Runs when selectedDocuments.length > 0
  - Uses document content for comprehensive pattern matching
  - Output marked with confidence: "substantiated"

Mode is set after document selection, stored on the diagnostic record, and used consistently across mode banner, status badges, and executive summary.

**Context Weighting:**
Context reflects user focus, evidence determines truth. Diagnostic contexts (Money, Manpower, Operations, Systems, Compliance) are PRIORITY signals, not hard filters:
- CONTEXT_BOOST = 10 for root causes matching selected contexts
- EVIDENCE_BOOST = 5 for causes with strong evidence support
- Context mapping: Money→Money, Manpower→Manpower, Operations→Materials+Machinery, Systems→Machinery, Compliance→Money+Manpower
- Causes within selected contexts receive higher initial weighting
- Causes outside selected contexts may still appear if strongly supported by evidence
- Root causes are NOT hidden or blocked purely based on context
- When out-of-context causes appear: "While the diagnostic focused on [selected contexts], evidence indicates additional contributing factors."
- Executive Summary includes context focus phrase (e.g., "with focus on money and operations factors")

**Evidence Signal Extraction (`shared/evidence-signals.ts`):**
Document evidence reinforces or suppresses root cause confidence based on factual signals.
- Extracts structured evidence signals from uploaded documents (Deep Analysis ONLY)
- Term-based rules for each 4M category:
  - Money: overdue, receivable, late payment, cash shortfall, aged debt, etc.
  - Manpower: turnover, resignation, short staffed, training gap, etc.
  - Machinery: breakdown, downtime, machine failure, maintenance overdue, etc.
  - Materials: supplier delay, stockout, inventory mismatch, quality rejection, etc.
- Signal strength: weak (1-2 matches), medium (3-4), strong (5+)
- Confidence weighting: weak +4, medium +8, strong +12 (cap +15 per root cause)
- Penalty: -3 if signals exist but none match root cause category
- Quick Analysis: No evidence signals applied
- Evidence does NOT create new root causes - only influences confidence

**Layered Evidence Approach (Deep Analysis):**
- `documentSignals`: Raw phrase matching for general symptom detection
- `evidenceSignals`: Structured 4M-category signals with strength weighting
- Both contribute to confidence scoring in Deep Analysis mode

**Diagnostic Composer Narrative Rules (`shared/diagnostic-composer.ts`):**
Transforms selected root causes into coherent diagnostic narrative with mode-specific language.

Quick Analysis:
- No mention of documents
- Language framed as initial diagnostic based on stated issues and patterns
- Tentative phrasing ("may be affecting", "suggests", "preliminary")

Deep Analysis with Evidence Signals:
- Executive Summary includes: "Findings are supported by review of operational and financial records."
- If dominant root cause category aligns with strong evidence, adds alignment phrase
  (e.g., "Documented cash flow and financial records reinforce the primary financial root cause identified.")
- Primary Findings with matching evidence receive note: "Supporting evidence observed in uploaded records."

Guardrails:
- No AI language
- No confidence percentages
- No technical references
- No document listing or text quoting
- Deep Analysis feels conclusive but professional

**Analysis Types:**
- **Quick Analysis**: Fast pattern detection, 5-10 key findings
- **Deep Analysis**: Comprehensive analysis with cost savings, predictions, and evidence-enriched narrative

**Output Fields:**
- `analysisMode`: "baseline" | "evidence-enriched"
- `confidence`: "preliminary" | "substantiated"
- `isMockMode`: boolean (indicates mock mode results)

Returns: findings with 4M category, severity, causes, estimated cost impact, plus mode indicators

### PDF Report Generator (`server/report-generator.ts`)
Generates professional PDF reports with Scope Optix branding:
- Cover page with statistics
- Executive summary
- 4M distribution charts
- Detailed findings
- Cost saving opportunities
- Predictions and risk analysis
- Recommendations

### Problem Library
- **Category-Based Library**: 80+ pre-defined operational problems
- **Industry-Specific Library**: 150+ problems across 13 industries

### AI Integration
- **Provider**: Replit AI Integrations (OpenAI-compatible)
- **Model**: GPT-4o
- **Purpose**: Analyze documents to identify root causes
- **Error Handling**: Retry logic (p-retry), graceful degradation

## Security
- Admin routes protected with `isAdmin` middleware
- Client routes scoped to user's `clientId`
- File uploads stored in `uploads/` directory
- First user becomes admin automatically

## External Dependencies

### Third-Party Services
1. **Replit Auth**: User authentication via OpenID Connect
2. **PostgreSQL Database**: Neon serverless PostgreSQL
3. **Replit AI Integrations**: GPT-4o for AI analysis

### Document Processing
- **xlsx**: Excel file parsing
- **mammoth**: Word document parsing
- **multer**: File upload handling
- **pdfkit**: PDF generation

### UI Component Libraries
- **Radix UI**: Headless accessible components
- **Shadcn UI**: Pre-styled components
- **Lucide React**: Icon library

### Utility Libraries
- **TanStack Query v5**: Server state management
- **React Hook Form**: Form state with Zod resolver
- **Zod**: Runtime schema validation
- **Wouter**: Client-side routing
- **p-retry**: Retry logic for API calls
