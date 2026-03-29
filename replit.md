# RCI (Root Cause Identifier) - EDX Consulting Platform

## Overview

RCI (Root Cause Identifier) is an AI-powered diagnostic consulting platform under the EDX brand, designed to assist consultants in identifying root causes of operational problems in SMEs. It leverages the 4M framework (Money, Manpower, Materials, Machinery) and AI-assisted analysis, governed by curated knowledge libraries. The platform supports two user types: Admin/Consultant for managing diagnostics and reports, and Clients for viewing their specific analyses. Key features include AI-powered root cause analysis using a vast knowledge base (119 manufacturing root causes across 3 tiers, 146+ industry-specific problems across 13+ industries), document parsing, professional PDF report generation, and a management dashboard. The platform has significantly enhanced its Event Management domain capabilities, including expanded root causes, dedicated causal chains, EM-specific financial impact buckets, and tailored recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript (SPA)
- **Bundler**: Vite
- **Routing**: Wouter
- **Server State**: TanStack Query v5
- **Local State**: React hooks and Context API
- **UI Components**: Shadcn UI (built on Radix UI) with "new-york" style
- **Styling**: Tailwind CSS with CSS custom properties
- **Font**: Inter
- **Design Philosophy**: Utilitarian, productivity-focused with clear information hierarchy and minimal visual distraction.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM)
- **Dev Server**: tsx + Vite
- **Production Build**: esbuild (server), Vite (client)
- **File Uploads**: Multer (to `uploads/`, 50MB limit)
- **Authentication**: Replit OpenID Connect (OIDC) via Passport.js with PostgreSQL session store
- **PDF Generation**: PDFKit
- **Core Modules**:
    - `server/core/`: AI and bulk analysis pipelines.
    - `server/diagnostics/`: Expert root cause engine and diagnostic exports.
    - `server/signals/`: Signal processing, normalization, and mapping.
    - `server/industries/`: Industry profiles, detection, and specific root cause libraries (e.g., `manufacturing-root-cause-library.ts` as authoritative source).
    - `server/documents/`: Document parsing.
    - `server/reports/`: Report generation.
    - `server/system/`: Core system components (routes, DB, auth).

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations proxy)
- **Model**: GPT-5
- **Critical Governance Rule**: AI selects from curated knowledge libraries (`shared/root-cause-library.ts`, `shared/recommendation-archetypes.ts`, `shared/problem-library.ts`, `shared/industry-problems.ts`) and does not freely generate content.
- **Analysis Pipeline**: `bulk-analyzer.ts` and `diagnostic-composer.ts` orchestrate knowledge-governed analysis. Deep Diagnostic uses real signal extraction from documents.
- **Findings Polish Pipeline**: Evidence-led titles, severity calibration, and concise insight notes.
- **Causality Reweighting**: Prioritization of operational root causes and a guardrail to ensure operational causes surface before financial ones.
- **Symptom-Root Cause Alignment Guardrail**: Post-analysis validation that promotes aligned findings and demotes misaligned ones based on symptom tags.
- **Deep Diagnostic Hard-Fail**: Pipeline returns empty findings with a clear message if no signals are detected or root causes pass the evidence threshold.
- **Observed Symptoms**: User-selected symptoms directly boost root cause scores.
- **Manufacturing V2 Real Signal Extraction**: Uses document-derived signal extraction and evidence-driven enrichment.
- **Retry Logic**: `p-retry` for API resilience.

### Data Layer
- **Database**: PostgreSQL (via `@neondatabase/serverless` and `pg`)
- **ORM**: Drizzle ORM
- **Schema**: Defined in `shared/schema.ts`
- **Migrations**: Drizzle Kit
- **Validation**: `drizzle-zod`
- **Architectural Rule**: All diagnostics are client-bound.

### Shared Code (`shared/` directory)
Contains code shared by frontend and backend, including schema, knowledge bases (root causes, recommendations, problems), diagnostic and analysis builders, evidence signal extraction, and export types.

### Key Routing Structure
- `/admin`: Consultant dashboard and client management.
- `/management`: Read-only management overview.
- `/clients/:clientId/diagnostics/new`: Start new diagnostics.
- `/client/*`: Client portal.
- `/demo`: Demo mode.
- `/api/execution/*`: Execution module routes.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Neon Serverless**: PostgreSQL driver.
- **pg**: Node.js PostgreSQL client.

### AI Services
- **OpenAI API**: Accessed via Replit AI Integrations proxy for diagnostic analysis.

### Authentication
- **Replit OIDC**: OpenID Connect authentication.
- **express-session** with **connect-pg-simple**: Session management.

### Document Processing
- **xlsx**: Excel/CSV parsing.
- **mammoth**: Word document (.docx) text extraction.
- **pdf-parse**: PDF text extraction.
- **pdfkit**: PDF generation.

### Key NPM Packages
- `drizzle-orm`, `drizzle-kit`, `drizzle-zod`, `zod`
- `openai`
- `p-retry`, `p-limit`
- `multer`
- `passport`
- `memoizee`
- `date-fns`
- `@tanstack/react-query`
- `wouter`
- `lucide-react`