# RCI (Root Cause Identifier) - EDX Consulting Platform

## Overview

RCI (Root Cause Identifier) is an AI-powered diagnostic consulting platform branded under EDX (Efficiency, Deployment, Excellence). It helps consultants identify root causes of operational problems in SMEs (Small and Medium Enterprises) using the 4M framework (Money, Manpower, Materials, Machinery) and AI-assisted analysis.

The platform has two primary user types:
- **Admin/Consultant**: Manages knowledge base, client organizations, uploads documents, runs AI diagnostics, and generates PDF reports
- **Clients (Paying Companies)**: View their issues, diagnoses, and solutions through a dedicated read-only portal

Key capabilities include AI-powered root cause analysis governed by curated knowledge libraries (not free-form AI generation), support for 13+ industries with 146+ industry-specific problems, document parsing (Excel, Word, PDF, PowerPoint), PDF report generation with professional branding, and a management dashboard view.

The main application lives in the `RCI-Root-Cause-Identifier/` directory. The root-level `package.json` contains shared utility dependencies, while `.replit_integration_files/` contains Replit-provided integration utilities (chat, audio, image, batch processing).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript (Single Page Application)
- **Bundler**: Vite with `@vitejs/plugin-react`
- **Routing**: Wouter (lightweight React router)
- **Server State**: TanStack Query v5 for data fetching/caching
- **Local State**: React hooks and Context API (e.g., `RoleContext` for view mode switching)
- **UI Components**: Shadcn UI (built on Radix UI primitives) with "new-york" style variant
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Font**: Inter via Google Fonts CDN
- **Design Philosophy**: Utilitarian, productivity-focused — clear information hierarchy, minimal visual distraction, flat neutral color palette

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Dev Server**: tsx + Vite dev middleware (`server/index-dev.ts`)
- **Production Build**: esbuild bundles server; Vite bundles client to `dist/public/`
- **File Uploads**: Multer with disk storage in `uploads/` directory (50MB limit)
- **Authentication**: Replit OpenID Connect (OIDC) via Passport.js with PostgreSQL session store (`connect-pg-simple`)
- **PDF Generation**: PDFKit for multiple report types (diagnostic exports, analysis reports, consulting proposals)
- **Server Directory Structure**:
  - `server/core/` — AI analyzer, bulk analyzer (main analysis pipeline)
  - `server/diagnostics/` — Expert root cause engine, scorer, diagnostic matrix, diagnostic export
  - `server/signals/` — Signal normalizer, aggregator, graph, map engine, category dominance, diagnostic chains, signal normalization library
  - `server/industries/` — Industry profiles, industry detection, manufacturing root causes/KPIs/vocabulary. `manufacturing-root-causes.ts` exports typed `ManufacturingRootCause[]` with consulting-grade schema: `id`, `name`, `tier` (1=operational, 2=process, 3=management), `category` (4M), `description`, `triggers`, `supportSignals`, optional `diagnosticChains` and `relatedKPIs`
  - `server/documents/` — Document parser
  - `server/reports/` — Report generator, export PDF generator
  - `server/system/` — Routes, database, storage, authentication
  - `server/` (root) — app.ts, index-dev.ts, index-prod.ts

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations proxy — uses `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`)
- **Model**: GPT-5 (as configured in `ai-analyzer.ts`)
- **Critical Governance Rule**: AI does NOT freely generate root causes or recommendations. It selects ONLY from curated knowledge libraries:
  - `shared/root-cause-library.ts` — Authoritative root cause entries with unique IDs
  - `shared/recommendation-archetypes.ts` — Pre-approved intervention patterns
  - `shared/problem-library.ts` — 146+ categorized operational problems
  - `shared/industry-problems.ts` — Industry-specific problem definitions
- **Analysis Pipeline**: `bulk-analyzer.ts` orchestrates knowledge-governed analysis; `diagnostic-composer.ts` produces rule-based narrative synthesis (no AI-generated prose in reports). Deep Diagnostic with uploaded documents bypasses mock mode and uses `runSignalDrivenDeepAnalysis` — real signal extraction from documents via `extractConcreteSignals` + `extractEvidenceSignalsFromDocuments`, scored against Knowledge Library root causes. Manufacturing delegates to `generateManufacturingV2Result` which has its own signal extraction. Baseline/Quick modes still use mock when MOCK_MODE=true.
- **Findings Polish Pipeline**: Generic evidence anchors are filtered out; findings get evidence-led titles (`[Signal] → [Consequence]`), severity calibrated to evidence strength (WEAK→medium cap, MODERATE→high cap, STRONG→critical), and concise insight notes replacing templated "What This Indicates"
- **Manufacturing Causality Reweighting**: In Manufacturing V2 path, operational root causes (Machinery/Materials +20%, Manpower +10%) are prioritized over financial outcomes (Money -15% unless financially documented). Causal ordering ensures at least 1 operational cause surfaces before Money when operational evidence exists (enforced across ALL industries, not just Manufacturing). Executive summary warns if Money is the only surfaced category.
- **Symptom-Root Cause Alignment Guardrail**: Post-analysis validation in `analysis-builder.ts`, applied centrally in `runBulkAnalysis`. Detects symptom tags from problem statement text (HIGH_TURNOVER/KNOWLEDGE_LOSS → Manpower, MISSED_DEADLINES/FIRE_FIGHTING_CULTURE → Materials/Machinery). Misaligned findings are demoted to secondary with "downstream impact" note; aligned findings are promoted to top. No findings are removed. Only activates when symptoms are detected AND at least one aligned finding exists.
- **Deep Diagnostic Hard-Fail**: When documents are uploaded but the signal extractor returns zero signals OR no root causes pass the evidence threshold, the pipeline returns empty findings with a clear message ("No operational or financial signals detected. Please upload Ops, Maintenance, QC, or Finance documents."). No fallback/safe-floor logic — either evidence supports findings or the diagnostic explicitly fails. Both generic and Manufacturing V2 paths enforce this.
- **Observed Symptoms as Scoring Input**: User-selected symptoms (`selectedSymptoms`) directly boost root cause scores (+12 per matching `symptomTag`) during selection in both generic signal-driven and Manufacturing V2 scoring paths. This is in addition to the post-analysis alignment guardrail.
- **Manufacturing V2 Real Signal Extraction**: Manufacturing V2 now uses `extractConcreteSignals` + `extractEvidenceSignalsFromDocuments` for real document-derived signal extraction and evidence-driven enrichment, replacing the previous fallback signal generation. `isMockMode` is false for Deep Diagnostic with documents.
- **Retry Logic**: `p-retry` with rate limit detection for API resilience

### Data Layer
- **Database**: PostgreSQL (via `@neondatabase/serverless` driver + `pg` Pool)
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` using `drizzle-orm/pg-core`
- **Migrations**: Drizzle Kit (`drizzle-kit push`) with config in `drizzle.config.ts`
- **Validation**: `drizzle-zod` for generating Zod schemas from Drizzle tables
- **Key Tables**: `users`, `sessions`, `clients`, `clientDocuments`, `clientAnalyses`, `diagnosticSessions`, `diagnosticCases`, `customProblems`
- **Architectural Rule**: All diagnostics MUST belong to a Client — no free-floating analyses allowed

### Shared Code (`shared/` directory)
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` — Database schema, types, and Zod validators
- `root-cause-library.ts` — Institutional root cause knowledge base
- `recommendation-archetypes.ts` — Pre-approved recommendation templates
- `problem-library.ts` — Categorized operational problems
- `industry-problems.ts` — Industry-specific problem definitions
- `diagnostic-composer.ts` — Rule-based narrative composition
- `analysis-builder.ts` — Knowledge-governed output assembly
- `evidence-signals.ts` — Document-based evidence extraction (semantic phrase matching, 200+ terms, 80+ regex patterns across 4M categories)
- `export-types.ts` — TypeScript types for PDF export configurations

### Key Routing Structure
- `/admin` — Consultant dashboard, client management, analysis
- `/management` — Read-only management overview dashboard
- `/clients/:clientId/diagnostics/new` — Canonical route for starting diagnostics (always bound to a client)
- `/client/*` — Client portal (read-only view of their issues/analyses)
- `/demo` — Demo mode for pitching potential clients (no auth required)
- `/api/execution/*` — Execution module routes (separate route file)

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets` → `./attached_assets/`

## External Dependencies

### Database
- **PostgreSQL** — Primary data store, connected via `DATABASE_URL` environment variable
- **Neon Serverless** (`@neondatabase/serverless`) — PostgreSQL driver (Neon-compatible)
- **pg** — Standard Node.js PostgreSQL client (used for session store and connection pooling)

### AI Services
- **OpenAI API** — Accessed through Replit AI Integrations proxy
  - `AI_INTEGRATIONS_OPENAI_BASE_URL` — API base URL
  - `AI_INTEGRATIONS_OPENAI_API_KEY` — API key
  - Used for diagnostic analysis (root cause matching, not free generation)

### Authentication
- **Replit OIDC** — OpenID Connect authentication via `ISSUER_URL` (defaults to `https://replit.com/oidc`)
- **Session Management** — `express-session` with `connect-pg-simple` PostgreSQL store
- **Environment Variables**: `REPL_ID`, `SESSION_SECRET`, `ISSUER_URL`

### Document Processing
- **xlsx** — Excel/CSV file parsing (header-value paired text output for signal extraction)
- **mammoth** — Word document (.docx) text extraction
- **pdf-parse** — PDF text extraction (body text + tables)
- **pdfkit** — PDF generation (reports, exports)
- **Text extraction validation** — Documents with <100 chars of extracted text are marked as extraction failures with user-facing error messages

### Key NPM Packages
- `drizzle-orm` + `drizzle-kit` — Database ORM and migration tooling
- `drizzle-zod` + `zod` — Schema validation
- `openai` — OpenAI SDK
- `p-retry` + `p-limit` — Retry logic and concurrency control for API calls
- `multer` — File upload handling
- `passport` — Authentication middleware
- `memoizee` — Function memoization (OIDC config caching)
- `date-fns` — Date formatting
- `@tanstack/react-query` — Server state management
- `wouter` — Client-side routing
- `lucide-react` — Icon library