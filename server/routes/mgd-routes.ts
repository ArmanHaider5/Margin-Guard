// ─────────────────────────────────────────────────────────────────────────────
// MGD ROUTES — API Endpoints for Margin Guard Diagnostics
//
// Exposes the full MGD operational intelligence pipeline through stable REST
// endpoints for frontend rendering, executive reports, dashboards, and exports.
//
// All routes are under /api/mgd
// All routes are wrapped in try/catch — never crash the process.
// All responses are valid JSON with { success: true|false, ... }.
//
// Auth: every route below is registered with `authMiddleware` (passed in by
// the caller — server/system/routes.ts passes [isAuthenticated, isAdmin],
// its own existing, already-established admin-route pattern) EXCEPT
// GET /api/mgd/health, a liveness probe that reveals no client data and is
// left public by design, matching common health-check convention. Frontend
// route gating in client/src/App.tsx (only admin-role users are ever routed
// to an /mgd/* page) is preserved unchanged and untouched — this is a
// defense-in-depth addition, not a replacement for it.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import { promises as fs } from "fs";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import multer from "multer";
import type { Express, Request, RequestHandler, Response } from "express";
import {
  runMGDPipeline,
  estimateOperationalHealth,
} from "../mgd/mgd-pipeline";
import { generateMGDPdfReport } from "../mgd/pdf-export";
import { generateOperationalFindings } from "../mgd/findings-engine";
import { generateRootCauses }          from "../mgd/root-cause-engine";
import { generateOperationalRecommendations } from "../mgd/recommendation-engine";
import { generateBenchmarkResults }    from "../mgd/benchmark-engine";
import { generateExecutiveNarrative }  from "../mgd/executive-narrative-engine";
import {
  saveReport,
  getReport,
  listReports,
  deleteReport,
} from "../mgd/report-store";
import {
  listTraces,
  getTrace,
} from "../mgd/pipeline-trace";
import { storage }      from "../system/storage";
import { detectBlocks } from "../cil/block-detector";
import { mapColumns }   from "../cil/column-mapper";
import { parseRow }     from "../cil/row-parser";
import { classifyDocument } from "../cil/document-classifier";
import { FINDING_CATEGORIES } from "../mgd/finding-categories";
import type { BusinessConcernInput } from "../mgd/diagnostic-scope";
import { deriveContentHash } from "../v2/shared/utils/deterministic-id";
import { parseDocument, detectFileType } from "../documents/document-parser";
// runCilPipeline is intentionally NOT statically imported here — it pulls in
// server/system/db.ts at module load time (real DB connection setup), which
// breaks this file's existing test suite (server/routes/__tests__/
// mgd-routes.test.ts is designed to run without a real database — see its
// own header comment). Imported dynamically inside
// processMGDDocumentInBackground below, so it only loads when an upload is
// actually processed, never merely by importing mgd-routes.ts.

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeArray(v: unknown): any[] {
  return Array.isArray(v) ? v.filter(x => x != null) : [];
}

// Human-selected diagnostic area validation — see
// docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md. Restricts any
// consultant-selected area to the exact, fixed Finding Category vocabulary;
// this is an integrity check against a known enum, never a classification
// or inference of the value from anything the consultant typed.
const VALID_DIAGNOSTIC_AREAS: ReadonlySet<string> = new Set(Object.values(FINDING_CATEGORIES));

function safeAreas(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of v) {
    if (typeof a === "string" && VALID_DIAGNOSTIC_AREAS.has(a) && !seen.has(a)) {
      seen.add(a);
      out.push(a);
    }
  }
  return out;
}

/**
 * Parse the request body's businessConcerns into the richer
 * BusinessConcernInput[] shape: plain strings pass through unchanged
 * (legacy/back-compat callers); an object entry is normalised to
 * {text, selectedAreas} with selectedAreas validated via safeAreas above.
 * Never infers selectedAreas from the concern's own text.
 */
function parseBusinessConcerns(v: unknown): BusinessConcernInput[] {
  return safeArray(v)
    .map((c: unknown): BusinessConcernInput | null => {
      if (typeof c === "string") {
        const text = c.trim();
        return text ? text : null;
      }
      if (c && typeof c === "object") {
        const text = String((c as any).text ?? "").trim();
        if (!text) return null;
        const selectedAreas = safeAreas((c as any).selectedAreas);
        return selectedAreas.length > 0 ? { text, selectedAreas } : text;
      }
      return null;
    })
    .filter((c): c is BusinessConcernInput => c !== null);
}

function safeMetrics(v: unknown): Record<string, number> {
  if (v != null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, number>;
  }
  return {};
}

function ok(res: Response, payload: object): void {
  res.json({ success: true, ...payload });
}

function fail(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, error: message });
}

// ── MGD Consultant Access — authorization helpers ──────────────────────────────
// The top-level `guard` (isAuthenticated + isAdminOrConsultant, passed in by
// server/system/routes.ts) only proves the caller is an authenticated admin
// or consultant. Everything below enforces the finer-grained rules on top of
// that: certain routes stay admin-only regardless of the top-level guard,
// and consultant access to any specific client's data is checked against
// consultantClientAssignments — never trusted from the request body/query.

/** Resolves the real authenticated user (id + role) for this request, via
 *  the same req.user.claims.sub → storage.getUser lookup isAdmin/
 *  isAdminOrConsultant already use. Returns null if unresolvable. */
async function currentUser(req: Request): Promise<{ id: string; role: string } | null> {
  const userId = (req as any).user?.claims?.sub;
  if (!userId) return null;
  const user = await storage.getUser(userId);
  if (!user) return null;
  return { id: user.id, role: user.role ?? "client" };
}

/** Extra middleware layered ON TOP OF `guard` for the handful of MGD routes
 *  that must remain admin-only even though the top-level guard now also
 *  admits consultants (DELETE reports/:id, export-pdf, traces, and the raw
 *  pipeline-stage debugging endpoints). Does not affect any other route. */
const requireAdmin: RequestHandler = async (req, res, next) => {
  const user = await currentUser(req as Request);
  if (!user || user.role !== "admin") {
    fail(res as Response, 403, "Admin access required");
    return;
  }
  next();
};

/** Extra middleware for routes scoped to one :id client param. Admins pass
 *  through unrestricted; consultants must have an explicit assignment row
 *  for that exact clientId — never inferred from anything else on the
 *  request. Any other role (shouldn't reach here past `guard`) is rejected. */
const requireClientAccess: RequestHandler = async (req, res, next) => {
  const user = await currentUser(req as Request);
  if (!user) { fail(res as Response, 401, "Unauthorized"); return; }
  if (user.role === "admin") { next(); return; }
  if (user.role !== "consultant") { fail(res as Response, 403, "MGD access required"); return; }
  const clientId = (req as Request).params.id;
  const assigned = await storage.isClientAssignedToUser(user.id, clientId);
  if (!assigned) { fail(res as Response, 403, "You are not assigned to this client."); return; }
  next();
};

// ── MGD-scoped document upload ─────────────────────────────────────────────────
// Deliberately separate from server/system/routes.ts's admin `upload`
// instance and `/api/admin/clients/:id/documents` route — consultants must
// never be routed through the admin document endpoints. Same storage
// location/limits/allowed-extensions as the admin uploader, just declared
// locally so this route has no dependency on admin-route internals.
const MGD_UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!existsSync(MGD_UPLOADS_DIR)) {
  mkdirSync(MGD_UPLOADS_DIR, { recursive: true });
}

const mgdUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MGD_UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    },
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
  },
});

/** Parses + runs the CIL pipeline against one just-uploaded MGD document, the
 *  same two-stage processing server/system/routes.ts's admin upload path
 *  performs, so a consultant-uploaded document is just as usable by
 *  POST /api/mgd/run's extraction step as an admin-uploaded one. Never
 *  awaited by the request handler — fire-and-forget, matching the admin
 *  path's own background-processing convention. */
async function processMGDDocumentInBackground(docId: string): Promise<void> {
  try {
    const doc = await storage.getClientDocument(docId);
    if (!doc) return;

    await storage.updateClientDocument(doc.id, { status: "processing" });

    let extractedData;
    try {
      extractedData = await parseDocument(doc.filePath, doc.fileType);
    } catch (parseErr) {
      await storage.updateClientDocument(doc.id, {
        status: "error",
        processingError: parseErr instanceof Error ? parseErr.message : "Failed to parse document",
        processedAt: new Date(),
      });
      return;
    }

    await storage.updateClientDocument(doc.id, {
      status: "processed",
      extractedData,
      processedAt: new Date(),
    });

    try {
      const { runCilPipeline } = await import("../cil/cil-pipeline");
      await runCilPipeline(doc.id, doc.clientId, doc.fileName, extractedData);
    } catch (cilErr) {
      console.error(`[MGD][CLIENTS] CIL pipeline error for "${doc.fileName}":`, cilErr);
      // Non-fatal — the document is already marked processed.
    }
  } catch (err) {
    console.error(`[MGD][CLIENTS] Document ${docId} processing failed:`, err);
    await storage.updateClientDocument(docId, {
      status: "error",
      processingError: err instanceof Error ? err.message : "Failed to process document",
    }).catch(() => {});
  }
}

// ── Route registration ────────────────────────────────────────────────────────

/**
 * @param authMiddleware Applied, in order, to every route below except
 *   GET /api/mgd/health. Defaults to `[]` (no guard) only so this function
 *   remains directly callable/testable in isolation — server/system/routes.ts,
 *   the sole production caller, always passes [isAuthenticated, isAdmin].
 */
export function registerMGDRoutes(app: Express, authMiddleware: RequestHandler[] = []): void {
  const guard = authMiddleware;
  // Admin-only / client-scoped sub-guards, layered ON TOP OF `guard` for
  // specific routes. Skipped (like `guard` itself) when authMiddleware is
  // omitted — the same "no guard means fully open, for direct
  // callability/testability" contract `guard`'s own default already
  // establishes; in production `guard` is never empty (server/system/
  // routes.ts always passes [isAuthenticated, isAdminOrConsultant]), so this
  // has no production security effect.
  const adminOnly: RequestHandler[]    = guard.length > 0 ? [requireAdmin]        : [];
  const clientScoped: RequestHandler[] = guard.length > 0 ? [requireClientAccess] : [];

  // ── GET /api/mgd/health ─────────────────────────────────────────────────────
  // Health probe — no pipeline invocation, returns immediately. Deliberately
  // NOT behind `guard` — see file header.
  app.get("/api/mgd/health", (_req: Request, res: Response) => {
    console.log("[MGD][API] GET /api/mgd/health");
    ok(res, {
      system:  "MGD",
      version: "MGD-V1",
      status:  "operational",
    });
  });

  // ── Flat-table extraction helper ───────────────────────────────────────────
  // Used when detectBlocks returns 0 (summary/pivot/frequency tables that have
  // no repeating operational block structure, e.g. "Freq of Sales by Customer").
  //
  // Strategy:
  //   1. Scan the first 30 rows for the real header row (first row with ≥2
  //      non-empty cells where cell[0] is a non-numeric string label).
  //   2. Run mapColumns on those headers — proper synonyms win automatically.
  //   3. If no recognised column, fall back to the last non-empty column as
  //      the "value" column (covers year-count, total, jumlah, etc.).
  //   4. Emit one synthetic transaction per data row that has a non-empty
  //      string entity name and at least one positive numeric value.
  function extractFlatTableTransactions(
    rawRows:    any[][],
    srcName:    string,
    fileName:   string,
    documentId: string,
    clientId:   string,
  ): any[] {
    const results: any[] = [];

    // ── 1. Find header row ───────────────────────────────────────────────
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
      const row = rawRows[i];
      const nonEmpty = row.filter((c: any) => c !== null && c !== undefined && c !== "");
      if (nonEmpty.length < 2) continue;
      const first = String(row[0] ?? "").trim();
      if (first && isNaN(Number(first))) { headerIdx = i; break; }
    }
    if (headerIdx === -1) {
      console.log(`[MGD][FLAT] "${srcName}" — no header row found in first 30 rows`);
      return [];
    }

    const headers = (rawRows[headerIdx] as any[]).map((h: any) =>
      String(h ?? "").toLowerCase().trim(),
    );
    console.log(`[MGD][FLAT] "${srcName}" — header row ${headerIdx}: ${JSON.stringify(headers.slice(0, 8))}`);

    // Classify using ONLY this source's own headers and data rows — not
    // workbook-wide text — so each flat table is classified on its own
    // evidence boundary.
    const sheetRawText = rawRows
      .slice(headerIdx + 1)
      .map((r: any[]) => (Array.isArray(r) ? r : []).map((c: any) => String(c ?? "")).join(" "))
      .join(" ");
    const { docClass: sheetDocClass } = classifyDocument(sheetRawText, headers, { structuredEvidence: true });

    // ── 2. Map recognised columns ────────────────────────────────────────
    const { columnMap } = mapColumns(headers);
    let valueColIdx: number | undefined =
      columnMap.quantityOut ?? columnMap.value ?? columnMap.balance ?? columnMap.quantityIn;

    // ── 3. Fallback: "total"/"jumlah" column or last non-empty column ────
    if (valueColIdx === undefined) {
      for (let c = 1; c < headers.length; c++) {
        if (/total|jumlah|sum|grand|kekerapan|freq/.test(headers[c])) {
          valueColIdx = c; break;
        }
      }
    }
    if (valueColIdx === undefined) {
      for (let c = headers.length - 1; c >= 1; c--) {
        if (headers[c]) { valueColIdx = c; break; }
      }
    }
    if (valueColIdx === undefined) {
      console.log(`[MGD][FLAT] "${srcName}" — no value column found`);
      return [];
    }
    console.log(`[MGD][FLAT] "${srcName}" — value column = ${valueColIdx} ("${headers[valueColIdx]}")`);

    // ── Detect customer frequency table ──────────────────────────────────
    // A frequency/pivot table (e.g. "Sales Freq by Customer") has most column
    // headers as numeric year/month values.  In that case each data row is a
    // CLIENT (not an inventory item) and the numeric cells are event counts.
    const nonEmptyHeaders = headers.filter((h: string) => h !== "");
    const numericHdrCount = nonEmptyHeaders.filter((h: string) => !isNaN(Number(h))).length;
    const isFrequencyTable =
      nonEmptyHeaders.length > 1 &&
      (numericHdrCount / nonEmptyHeaders.length) > 0.4;

    console.log(
      `[MGD][FLAT] "${srcName}" — isFrequencyTable=${isFrequencyTable} ` +
      `(${numericHdrCount}/${nonEmptyHeaders.length} numeric headers)`,
    );

    // ── 4. Emit one record per data row ──────────────────────────────────
    for (let i = headerIdx + 1; i < rawRows.length; i++) {
      const row  = rawRows[i] as any[];
      const name = String(row[0] ?? "").trim();
      if (!name || !isNaN(Number(name))) continue;    // skip blanks / sub-totals

      // Always use the full row-sum of numeric cells as the event count.
      // (The single "value column" is unreliable for sparse frequency matrices
      //  where the last column may be empty for many rows.)
      const rowSum = (row as any[])
        .slice(1)
        .reduce((acc: number, c: any) => acc + (isNaN(Number(c)) ? 0 : Number(c)), 0);

      // Also check the designated value column as a floor
      const colVal = Number(row[valueColIdx]);
      const qty    = rowSum > 0 ? rowSum : (!isNaN(colVal) && colVal > 0 ? colVal : 0);

      if (qty <= 0) continue;

      if (isFrequencyTable) {
        // Customer-frequency: each row is a CLIENT, not an inventory item.
        // entityName = generic service label  |  remarks = the actual client name.
        // This prevents the findings engine from treating 103 clients as
        // "103 distinct inventory items" and generating warehouse findings.
        results.push({
          entityName:             "Event Services",
          description:            srcName,
          transactionType:        "outbound",
          quantity:               qty,   // buildStats reads tx.quantity
          quantityOut:            qty,
          value:                  qty,
          remarks:                name,  // client name → hasCustomerRefs fires
          documentClassification: "customer_frequency",
          sourceFile:             fileName,
          documentId,
          clientId,
        });
      } else {
        results.push({
          entityName:  name,
          description: srcName,
          transactionType: "outbound",
          quantity:        qty,
          quantityOut:     qty,
          value:           qty,
          documentClassification: sheetDocClass,
          sourceFile:      fileName,
          documentId,
          clientId,
        });
      }
    }
    console.log(`[MGD][FLAT] "${srcName}" — extracted ${results.length} record(s) from flat table`);
    return results;
  }

  // ── POST /api/mgd/run ───────────────────────────────────────────────────────
  // Full pipeline: findings → root causes → recommendations → benchmarks →
  // narrative → composed report.
  //
  // When `selectedDocuments` (array of document IDs) is present in the body,
  // this handler loads each document from storage, extracts transactions from
  // any structured spreadsheet sheets via detectBlocks → mapColumns → parseRow,
  // and continues as baseline analysis if no transactions could be extracted.
  app.post("/api/mgd/run", ...guard, async (req: Request, res: Response) => {
    console.log("[MGD][ROUTE_VERSION]", "EXTRACTION_BUILD_V1");
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/run — start");
    try {
      const body = req.body ?? {};

      // ── MGD Consultant Access — client scoping ─────────────────────────────
      // A consultant may only run a diagnostic against a client they are
      // explicitly assigned to. Never trusts body.clientId on its own — it
      // must be cross-checked against consultantClientAssignments. Rejected
      // outright (403) rather than silently substituting an assigned client
      // or proceeding without one.
      const requester = await currentUser(req);
      if (requester?.role === "consultant") {
        const requestedClientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
        if (!requestedClientId) {
          return fail(res, 403, "A clientId is required.");
        }
        const assigned = await storage.isClientAssignedToUser(requester.id, requestedClientId);
        if (!assigned) {
          return fail(res, 403, "You are not assigned to this client.");
        }
      }

      // ── Consultant context ─────────────────────────────────────────────────
      const rawNotes = safeArray(body.consultantNotes);
      const consultantNotes = rawNotes.map((n: any) => {
        const relatedArea = typeof n.relatedArea === "string" && VALID_DIAGNOSTIC_AREAS.has(n.relatedArea)
          ? n.relatedArea
          : undefined;
        return {
          title:       String(n.title       ?? "").trim(),
          category:    String(n.category    ?? "").trim(),
          observation: String(n.observation ?? "").trim(),
          ...(relatedArea ? { relatedArea } : {}),
        };
      }).filter((n: any) => n.title || n.observation);

      const businessConcerns: BusinessConcernInput[] = parseBusinessConcerns(body.businessConcerns);

      // ── Document → transaction extraction ─────────────────────────────────
      const selectedDocIds: string[] = safeArray(body.selectedDocuments)
        .filter((id: unknown) => typeof id === "string" && id.trim().length > 0);

      const transactions: any[] = [];
      const documents:    any[] = [];

      if (selectedDocIds.length > 0) {
        console.log(`[MGD][EXTRACT] Loading ${selectedDocIds.length} selected document(s)`);

        // Request-scoped only — never persisted, never shared across requests.
        // Guards against byte-identical evidence being selected more than once
        // in the same diagnostic run, without touching upload persistence, the
        // schema, or the wizard. See duplicate-evidence forensic investigation.
        const seenContentHashes = new Set<string>();

        for (const docId of selectedDocIds) {
          try {
            const doc = await storage.getClientDocument(docId);
            if (!doc) {
              console.log(`[AUDIT] ${docId} — NOT FOUND IN DB`);
              continue;
            }

            // ── Duplicate-content guard (Phase 1) ──────────────────────────
            // Hashes the actual uploaded file bytes — never filename, never
            // file size alone — so two distinct documents sharing a name are
            // never conflated, and content genuinely re-selected within this
            // same request is excluded from both extraction and the
            // downstream `documents` collection, not just extraction.
            const fileBytes   = await fs.readFile(doc.filePath);
            const contentHash = deriveContentHash(fileBytes);
            if (seenContentHashes.has(contentHash)) {
              console.log(`[MGD][EXTRACT] Skipping duplicate document content: ${doc.fileName}`);
              continue;
            }
            seenContentHashes.add(contentHash);

            documents.push(doc);

            const hasExtractedData = doc.extractedData != null;
            const sheets           = doc.extractedData?.sheets  ?? [];
            const tables           = doc.extractedData?.tables  ?? [];
            const hasSheets        = sheets.length > 0;
            const hasTables        = tables.length > 0;
            const tablesWithRaw    = tables.filter((t: any) => Array.isArray(t.rawRows) && t.rawRows.length > 0);

            console.log(
              `[AUDIT] "${doc.fileName}" | type=${doc.fileType} | ` +
              `extractedData=${hasExtractedData ? "Y" : "N"} | ` +
              `sheets=${sheets.length} | ` +
              `tables=${tables.length} (rawRows in ${tablesWithRaw.length})`,
            );

            // ── Build unified raw sources ──────────────────────────────────
            const rawSources: Array<{ name: string; rawRows: any[][] }> = [];

            if (hasSheets) {
              for (const s of sheets) {
                const rows = Array.isArray(s.rows) ? s.rows : [];
                if (rows.length > 0) rawSources.push({ name: s.name, rawRows: rows });
              }
            } else {
              for (const t of tables) {
                // PATH B-1: rawRows already stored (current uploads)
                if (Array.isArray(t.rawRows) && t.rawRows.length > 0) {
                  rawSources.push({ name: t.name ?? "table", rawRows: t.rawRows });
                } else if (
                  Array.isArray(t.headers) && t.headers.length > 0 &&
                  Array.isArray(t.rows)    && t.rows.length    > 0
                ) {
                  // PATH B-2 (FIX 1): legacy uploads — reconstruct rawRows from
                  // pre-split headers + rows so detectBlocks can run normally.
                  const reconstructed: any[][] = [t.headers, ...t.rows];
                  console.log(
                    `[MGD][RECONSTRUCT] "${doc.fileName}" table="${t.name ?? "?"}" ` +
                    `headers=${t.headers.length} rows=${t.rows.length}`,
                  );
                  rawSources.push({ name: t.name ?? "table", rawRows: reconstructed });
                }
              }
            }

            if (rawSources.length === 0) {
              console.log(`[AUDIT]   → SKIP: no usable data (no sheets, rawRows, or headers+rows)`);
              if (tables.length > 0) {
                const t0 = tables[0];
                console.log(`[AUDIT]   → table[0] name="${t0.name}" headers=${JSON.stringify((t0.headers ?? []).slice(0, 8))} rows=${(t0.rows ?? []).length} rawRows=${(t0.rawRows ?? []).length}`);
              }
              continue;
            }

            const dataPath = hasSheets ? "sheets" : "tables/rawRows";
            let docRows = 0; let docBlocks = 0; let docTxs = 0;
            let firstSampleLogged = false;

            for (const source of rawSources) {
              const { name: srcName, rawRows } = source;
              docRows += rawRows.length;

              const blocks = detectBlocks(rawRows);
              docBlocks += blocks.length;

              console.log(`[AUDIT]   source="${srcName}" path=${dataPath} rows=${rawRows.length} blocks=${blocks.length}`);

              // Log first two rows of this source for diagnosis
              if (rawRows.length > 0) {
                console.log(`[AUDIT]   row[0]:`, JSON.stringify((rawRows[0] ?? []).slice(0, 10)));
              }
              if (rawRows.length > 1) {
                console.log(`[AUDIT]   row[1]:`, JSON.stringify((rawRows[1] ?? []).slice(0, 10)));
              }

              if (blocks.length === 0) {
                // ── Flat-table fallback ─────────────────────────────────────
                // Summary / pivot / frequency sheets (e.g. "Freq of Sales by
                // Customer") have no repeating block structure but still contain
                // real operational data (entity names + numeric counts / totals).
                const flatTxs = extractFlatTableTransactions(
                  rawRows, srcName, doc.fileName, doc.id, doc.clientId,
                );
                if (flatTxs.length > 0) {
                  console.log(`[AUDIT]   → FLAT TABLE FALLBACK: ${flatTxs.length} record(s) from "${srcName}"`);
                  for (const tx of flatTxs) { transactions.push(tx); docTxs++; }
                } else {
                  console.log(`[AUDIT]   → detectBlocks=0, flat-table=0 — no data in "${srcName}"`);
                }
                continue;
              }

              for (const block of blocks) {
                const blockDataRows: string[][] = rawRows
                  .slice(block.startRow, block.endRow + 1)
                  .map((r: any[]) => (Array.isArray(r) ? r : []).map((v: any) => String(v ?? "").trim()));

                const { columnMap, mappingTrace } = mapColumns(block.headers);

                // Classify using ONLY this block's own headers and data
                // rows — not workbook-wide text — so each block is
                // classified on its own evidence boundary.
                const blockRawText = blockDataRows.map(r => r.join(" ")).join(" ");
                const { docClass: blockDocClass } = classifyDocument(blockRawText, block.headers, { structuredEvidence: true });

                // FIX 3: accept traditional financial columns OR EM operational signals
                const hasMeaningful =
                  columnMap.quantityOut             !== undefined ||
                  columnMap.quantityIn              !== undefined ||
                  columnMap.value                   !== undefined ||
                  columnMap.balance                 !== undefined ||
                  columnMap.operationalDelay        !== undefined ||
                  columnMap.dispatchStatus          !== undefined ||
                  columnMap.recoveryStatus          !== undefined ||
                  columnMap.operationalSubstitution !== undefined;

                console.log(
                  `[AUDIT]   block entity="${block.entityName ?? "?"}" type=${block.blockType} ` +
                  `dataRows=${blockDataRows.length} meaningful=${hasMeaningful}`,
                );
                console.log(`[AUDIT]   headers:`, JSON.stringify(block.headers.slice(0, 10)));
                console.log(`[AUDIT]   columnMap:`, JSON.stringify(mappingTrace));

                if (!hasMeaningful) {
                  console.log(`[AUDIT]   → SKIP block: no meaningful columns (need qty/value/balance or EM operational signal)`);
                  continue;
                }

                let blockTxs = 0;
                for (const row of blockDataRows) {
                  const nonEmpty = row.filter(c => c !== "");
                  if (nonEmpty.length === 0) continue;

                  const parsedTxs = parseRow(
                    row,
                    block.headers,
                    columnMap,
                    blockDocClass,
                    block.entityName ?? "",
                  );

                  // Log one sample row + parseRow result per document
                  if (!firstSampleLogged) {
                    firstSampleLogged = true;
                    console.log(`[AUDIT]   sample row:`, JSON.stringify(row.slice(0, 10)));
                    console.log(`[AUDIT]   parseRow result:`, JSON.stringify(parsedTxs.slice(0, 2)));
                  }

                  for (const tx of parsedTxs) {
                    transactions.push({
                      ...tx,
                      sourceFile: doc.fileName,
                      documentId: doc.id,
                      clientId:   doc.clientId,
                    });
                    docTxs++;
                    blockTxs++;
                  }
                }

                console.log(`[AUDIT]   block transactions=${blockTxs}`);
              }
            }

            console.log(`[AUDIT] "${doc.fileName}" TOTAL rows=${docRows} blocks=${docBlocks} transactions=${docTxs}`);
          } catch (docErr) {
            console.error(`[AUDIT] Error processing document ${docId}:`, docErr);
          }
        }

        console.log("[MGD] Extraction Complete", {
          documents:    selectedDocIds.length,
          transactions: transactions.length,
        });

        if (transactions.length === 0) {
          console.log(
            `[MGD][EXTRACT] No transactions extracted from documents — ` +
            `continuing as baseline analysis (industry + concerns + notes only). ` +
            `Documents attached for context but columns were not parseable as transaction records.`
          );
        }
      }

      // ── Merge with any inline transactions from body (fallback / legacy) ──
      const finalTransactions = transactions.length > 0
        ? transactions
        : safeArray(body.transactions);

      // ── Run pipeline ───────────────────────────────────────────────────────
      const result = await runMGDPipeline({
        clientName:        body.clientName   ?? undefined,
        industry:          body.industry     ?? undefined,
        transactions:      finalTransactions,
        documents,
        metrics:           safeMetrics(body.metrics),
        consultantNotes:   consultantNotes.length   > 0 ? consultantNotes   : undefined,
        businessConcerns:  businessConcerns.length  > 0 ? businessConcerns  : undefined,
      });

      console.log(
        `[MGD][API] POST /api/mgd/run — ` +
        `findings=${result.steps.findingsCount}, ` +
        `rootCauses=${result.steps.rootCauseCount}, ` +
        `recs=${result.steps.recommendationCount}, ` +
        `benchmarks=${result.steps.benchmarkCount}, ` +
        `health=${result.steps.healthScore} (${result.steps.healthScoreSource}), ` +
        `traceId=${result.traceId}, ` +
        `pipelineMs=${result.runtimeMs}, totalMs=${Date.now() - t0}`,
      );

      // ── Canonical report identity ───────────────────────────────────────
      // Generated up front and embedded into the composed report BEFORE
      // persistence and BEFORE the response is sent, so `saved.id` (the
      // StoredMGDReport this becomes) and `report.id` (what every consumer —
      // Report Viewer, Presentation Mode, PDF export — sees) are always the
      // exact same value. This is the one canonical report handoff: every
      // later stage resolves the report via GET /api/mgd/reports/:id using
      // this id, never via a passed-around copy of the object itself.
      const reportId = crypto.randomUUID();
      const reportWithId = { ...result.report, id: reportId };

      const saved = await saveReport({
        id:         reportId,
        clientId:   body.clientId   ?? undefined,
        clientName: body.clientName ?? undefined,
        industry:   body.industry   ?? undefined,
        report:     reportWithId,
        runtimeMs:  result.runtimeMs,
      });

      if (!saved) {
        // Persistence failed — the diagnostic itself still succeeded, so we
        // still return the computed report (with its id, even though that
        // id was never actually saved) rather than discarding real work.
        // Every consumer must already tolerate `report.id` referring to a
        // record that GET /api/mgd/reports/:id cannot find (see the Report
        // Viewer's and Presentation Mode's own "report not found" states).
        console.error("[MGD][API] POST /api/mgd/run — saveReport failed; report was not persisted");
      }

      ok(res, {
        report:    reportWithId,
        runtimeMs: result.runtimeMs,
        traceId:   result.traceId,
        steps:     result.steps,
      });

    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/run — FATAL:", err);
      fail(res, 500, "Pipeline execution failed");
    }
  });

  // ── POST /api/mgd/estimate-health ──────────────────────────────────────────
  // Estimate operational health score from findings, root causes, benchmarks.
  app.post("/api/mgd/estimate-health", ...guard, ...adminOnly, (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/estimate-health — start");
    try {
      const body = req.body ?? {};
      const findings    = safeArray(body.findings);
      const rootCauses  = safeArray(body.rootCauses);
      const benchmarks  = safeArray(body.benchmarks);
      const score = estimateOperationalHealth(findings, rootCauses, benchmarks);
      console.log(
        `[MGD][API] POST /api/mgd/estimate-health — ` +
        `score=${score}, ` +
        `findings=${findings.length}, rootCauses=${rootCauses.length}, benchmarks=${benchmarks.length}, ` +
        `ms=${Date.now() - t0}`,
      );
      ok(res, { estimatedHealthScore: score });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/estimate-health — error:", err);
      fail(res, 500, "Health estimation failed");
    }
  });

  // ── POST /api/mgd/findings ──────────────────────────────────────────────────
  // Generate operational findings from transaction data.
  app.post("/api/mgd/findings", ...guard, ...adminOnly, (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/findings — start");
    try {
      const body = req.body ?? {};
      const transactions = safeArray(body.transactions);
      const documents    = safeArray(body.documents);
      const industry     = typeof body.industry === "string" ? body.industry : undefined;
      const findings = generateOperationalFindings({ transactions, documents, industry });
      console.log(
        `[MGD][API] POST /api/mgd/findings — ` +
        `count=${findings.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { findings, count: findings.length });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/findings — error:", err);
      fail(res, 500, "Findings generation failed");
    }
  });

  // ── POST /api/mgd/root-causes ───────────────────────────────────────────────
  // Map findings to systemic root causes.
  app.post("/api/mgd/root-causes", ...guard, ...adminOnly, (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/root-causes — start");
    try {
      const body     = req.body ?? {};
      const findings = safeArray(body.findings);
      const industry = typeof body.industry === "string" ? body.industry : undefined;
      const rootCauses = generateRootCauses({ findings, industry });
      console.log(
        `[MGD][API] POST /api/mgd/root-causes — ` +
        `count=${rootCauses.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { rootCauses, count: rootCauses.length });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/root-causes — error:", err);
      fail(res, 500, "Root cause generation failed");
    }
  });

  // ── POST /api/mgd/recommendations ──────────────────────────────────────────
  // Generate prioritised corrective recommendations.
  app.post("/api/mgd/recommendations", ...guard, ...adminOnly, (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/recommendations — start");
    try {
      const body      = req.body ?? {};
      const findings  = safeArray(body.findings);
      const rootCauses = safeArray(body.rootCauses);
      const industry  = typeof body.industry === "string" ? body.industry : undefined;
      const recommendations = generateOperationalRecommendations({ findings, rootCauses, industry });
      console.log(
        `[MGD][API] POST /api/mgd/recommendations — ` +
        `count=${recommendations.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { recommendations, count: recommendations.length });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/recommendations — error:", err);
      fail(res, 500, "Recommendations generation failed");
    }
  });

  // ── POST /api/mgd/benchmarks ────────────────────────────────────────────────
  // Compare operational metrics against industry benchmarks.
  app.post("/api/mgd/benchmarks", ...guard, ...adminOnly, (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/benchmarks — start");
    try {
      const body     = req.body ?? {};
      const metrics  = safeMetrics(body.metrics);
      const industry = typeof body.industry === "string" ? body.industry : undefined;
      const benchmarks = generateBenchmarkResults({ metrics, industry });
      console.log(
        `[MGD][API] POST /api/mgd/benchmarks — ` +
        `count=${benchmarks.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { benchmarks, count: benchmarks.length });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/benchmarks — error:", err);
      fail(res, 500, "Benchmark generation failed");
    }
  });

  // ── POST /api/mgd/narrative ─────────────────────────────────────────────────
  // Generate a 7-section executive narrative from pipeline outputs.
  app.post("/api/mgd/narrative", ...guard, ...adminOnly, (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/narrative — start");
    try {
      const body            = req.body ?? {};
      const findings        = safeArray(body.findings);
      const rootCauses      = safeArray(body.rootCauses);
      const recommendations = safeArray(body.recommendations);
      const industry        = typeof body.industry === "string" ? body.industry : undefined;
      const operationalHealthScore =
        typeof body.operationalHealthScore === "number" &&
        isFinite(body.operationalHealthScore)
          ? body.operationalHealthScore
          : undefined;
      const narrative = generateExecutiveNarrative({
        findings,
        rootCauses,
        recommendations,
        operationalHealthScore,
        industry,
      });
      console.log(
        `[MGD][API] POST /api/mgd/narrative — ` +
        `7 sections generated, ` +
        `findings=${findings.length}, rootCauses=${rootCauses.length}, ` +
        `recs=${recommendations.length}, ms=${Date.now() - t0}`,
      );
      ok(res, { narrative });
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/narrative — error:", err);
      fail(res, 500, "Narrative generation failed");
    }
  });

  // ── POST /api/mgd/export-pdf ────────────────────────────────────────────────
  // Export the EXACT persisted report identified by `reportId` — never a
  // freshly re-run diagnostic. This deliberately does not accept raw
  // transactions/documents/metrics: the report a user is viewing is already
  // fully composed and persisted (POST /api/mgd/run), so exporting it means
  // reading that same record back, not re-deriving a new one from scratch.
  // A missing or unknown reportId is a clear 400/404 error — never a
  // fallback to an empty or freshly-computed "successful" report.
  app.post("/api/mgd/export-pdf", ...guard, ...adminOnly, async (req: Request, res: Response) => {
    const t0 = Date.now();
    console.log("[MGD][API] POST /api/mgd/export-pdf — start");
    try {
      const body = req.body ?? {};
      const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";

      if (!reportId) {
        console.log("[MGD][API] POST /api/mgd/export-pdf — missing reportId");
        return fail(res, 400, "reportId is required — export always targets an already-generated, persisted report.");
      }

      const stored = await getReport(reportId);
      if (!stored) {
        console.log(`[MGD][API] POST /api/mgd/export-pdf — report "${reportId}" not found`);
        return fail(res, 404, `Report "${reportId}" not found`);
      }

      // Generate PDF directly from the persisted, already-composed report —
      // no pipeline invocation, no re-derivation of any analytical content.
      const pdfBuffer = await generateMGDPdfReport(stored.report);

      const safeName = (stored.clientName ?? stored.report.metadata.clientName ?? "mgd-report")
        .replace(/[^a-z0-9]/gi, "-").toLowerCase().replace(/-+/g, "-").slice(0, 40);
      const filename = `${safeName}-mgd-report.pdf`;

      console.log(
        `[MGD][API] POST /api/mgd/export-pdf — reportId=${reportId} ` +
        `pdf=${pdfBuffer.length} bytes, totalMs=${Date.now() - t0}`,
      );

      res
        .set("Content-Type",        "application/pdf")
        .set("Content-Disposition", `attachment; filename="${filename}"`)
        .set("Content-Length",      String(pdfBuffer.length))
        .send(pdfBuffer);
    } catch (err) {
      console.error("[MGD][API] POST /api/mgd/export-pdf — FATAL:", err);
      fail(res, 500, "PDF export failed");
    }
  });

  // ── GET /api/mgd/reports ────────────────────────────────────────────────────
  // List stored reports, optionally filtered by ?clientId=. Admins see every
  // report, unrestricted, exactly as before. Consultants are ALWAYS scoped
  // to their own assigned clients — an explicit ?clientId= is honoured only
  // when it is itself one of their assigned clients (never a way to widen
  // access beyond the assignment table); with no ?clientId=, the result is
  // pre-filtered to assigned clients only rather than returned unfiltered.
  app.get("/api/mgd/reports", ...guard, async (req: Request, res: Response) => {
    try {
      const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
      console.log(`[MGD][REPORTS] GET /api/mgd/reports — clientId=${clientId ?? "all"}`);

      const requester = guard.length > 0 ? await currentUser(req) : null;

      if (requester && requester.role !== "admin") {
        if (requester.role !== "consultant") {
          return fail(res, 403, "MGD access required");
        }
        const assigned = await storage.getAssignedClients(requester.id);
        const assignedIds = new Set(assigned.map(c => c.id));

        if (clientId) {
          if (!assignedIds.has(clientId)) {
            return fail(res, 403, "You are not assigned to this client.");
          }
          const reports = await listReports(clientId);
          console.log(`[MGD][REPORTS] GET /api/mgd/reports — consultant scoped, returned ${reports.length} record(s)`);
          return ok(res, { reports });
        }

        const all = await listReports();
        const reports = all.filter(r => r.clientId != null && assignedIds.has(r.clientId));
        console.log(`[MGD][REPORTS] GET /api/mgd/reports — consultant scoped, returned ${reports.length} record(s)`);
        return ok(res, { reports });
      }

      const reports = await listReports(clientId);
      console.log(`[MGD][REPORTS] GET /api/mgd/reports — returned ${reports.length} record(s)`);
      ok(res, { reports });
    } catch (err) {
      console.error("[MGD][REPORTS] GET /api/mgd/reports — error:", err);
      fail(res, 500, "Failed to list reports");
    }
  });

  // ── GET /api/mgd/reports/:id ─────────────────────────────────────────────────
  // Retrieve a single stored report by id. Admins: unrestricted. Consultants:
  // rejected unless the report has a clientId AND that client is one they
  // are explicitly assigned to — a report with a missing/null clientId has
  // nothing to verify against and is rejected outright, never allowed
  // through by default.
  app.get("/api/mgd/reports/:id", ...guard, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`[MGD][REPORTS] GET /api/mgd/reports/${id}`);
      const report = await getReport(id);
      if (!report) {
        console.log(`[MGD][REPORTS] GET /api/mgd/reports/${id} — not found`);
        return fail(res, 404, `Report "${id}" not found`);
      }

      const requester = guard.length > 0 ? await currentUser(req) : null;
      if (requester && requester.role !== "admin") {
        if (requester.role !== "consultant") {
          return fail(res, 403, "MGD access required");
        }
        if (!report.clientId || !(await storage.isClientAssignedToUser(requester.id, report.clientId))) {
          return fail(res, 403, "You are not assigned to this client.");
        }
      }

      console.log(`[MGD][REPORTS] GET /api/mgd/reports/${id} — found`);
      ok(res, { report });
    } catch (err) {
      console.error("[MGD][REPORTS] GET /api/mgd/reports/:id — error:", err);
      fail(res, 500, "Failed to retrieve report");
    }
  });

  // ── DELETE /api/mgd/reports/:id ──────────────────────────────────────────────
  // Delete a single stored report by id. Admin-only — even for a consultant
  // who is assigned to that report's client; deletion is never granted by
  // assignment alone.
  app.delete("/api/mgd/reports/:id", ...guard, ...adminOnly, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`[MGD][REPORTS] DELETE /api/mgd/reports/${id}`);
      const deleted = await deleteReport(id);
      if (!deleted) {
        console.log(`[MGD][REPORTS] DELETE /api/mgd/reports/${id} — not found`);
        return fail(res, 404, `Report "${id}" not found`);
      }
      console.log(`[MGD][REPORTS] DELETE /api/mgd/reports/${id} — deleted`);
      ok(res, { deleted: true });
    } catch (err) {
      console.error("[MGD][REPORTS] DELETE /api/mgd/reports/:id — error:", err);
      fail(res, 500, "Failed to delete report");
    }
  });

  // ── GET /api/mgd/traces ──────────────────────────────────────────────────────
  // List all stored pipeline traces, newest first.
  app.get("/api/mgd/traces", ...guard, ...adminOnly, async (_req: Request, res: Response) => {
    try {
      console.log("[MGD][TRACES] GET /api/mgd/traces");
      const traces = await listTraces();
      console.log(`[MGD][TRACES] GET /api/mgd/traces — returned ${traces.length} trace(s)`);
      ok(res, { traces });
    } catch (err) {
      console.error("[MGD][TRACES] GET /api/mgd/traces — error:", err);
      fail(res, 500, "Failed to list traces");
    }
  });

  // ── GET /api/mgd/traces/:id ───────────────────────────────────────────────────
  // Retrieve a single pipeline trace by traceId.
  app.get("/api/mgd/traces/:id", ...guard, ...adminOnly, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`[MGD][TRACES] GET /api/mgd/traces/${id}`);
      const trace = await getTrace(id);
      if (!trace) {
        console.log(`[MGD][TRACES] GET /api/mgd/traces/${id} — not found`);
        return fail(res, 404, `Trace "${id}" not found`);
      }
      console.log(`[MGD][TRACES] GET /api/mgd/traces/${id} — found (steps=${trace.steps.length})`);
      ok(res, { trace });
    } catch (err) {
      console.error("[MGD][TRACES] GET /api/mgd/traces/:id — error:", err);
      fail(res, 500, "Failed to retrieve trace");
    }
  });

  // ── GET /api/mgd/clients ────────────────────────────────────────────────────
  // MGD-scoped client listing — deliberately separate from GET
  // /api/admin/clients (which returns every client, unrestricted, and stays
  // admin-only). Admins get every client, same as the admin endpoint.
  // Consultants get only their explicitly assigned clients.
  app.get("/api/mgd/clients", ...guard, async (req: Request, res: Response) => {
    try {
      const requester = guard.length > 0 ? await currentUser(req) : null;
      if (guard.length > 0 && !requester) {
        return fail(res, 401, "Unauthorized");
      }

      const clientsList = (!requester || requester.role === "admin")
        ? await storage.getAllClients()
        : await storage.getAssignedClients(requester.id);

      console.log(`[MGD][CLIENTS] GET /api/mgd/clients — returned ${clientsList.length} client(s)`);
      ok(res, { clients: clientsList });
    } catch (err) {
      console.error("[MGD][CLIENTS] GET /api/mgd/clients — error:", err);
      fail(res, 500, "Failed to list clients");
    }
  });

  // ── GET /api/mgd/clients/:id/documents ──────────────────────────────────────
  // MGD-scoped document listing for one client. Deliberately separate from
  // GET /api/admin/clients/:id/documents. `clientScoped` enforces the
  // assignment check for consultants (admins pass through unrestricted).
  app.get("/api/mgd/clients/:id/documents", ...guard, ...clientScoped, async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id;
      const client = await storage.getClient(clientId);
      if (!client) return fail(res, 404, "Client not found");

      const documents = await storage.getClientDocuments(clientId);
      console.log(`[MGD][CLIENTS] GET /api/mgd/clients/${clientId}/documents — returned ${documents.length} document(s)`);
      ok(res, { documents });
    } catch (err) {
      console.error("[MGD][CLIENTS] GET /api/mgd/clients/:id/documents — error:", err);
      fail(res, 500, "Failed to list client documents");
    }
  });

  // ── POST /api/mgd/clients/:id/documents ─────────────────────────────────────
  // MGD-scoped document upload for one client. Deliberately separate from
  // POST /api/admin/clients/:id/documents — consultants must never be routed
  // through the admin upload endpoint. `clientScoped` runs BEFORE the multer
  // upload middleware, so an unassigned consultant's files are rejected
  // before anything is written to disk. Does not support reprocessing or
  // deletion — those remain admin-only, unavailable here by design.
  app.post("/api/mgd/clients/:id/documents", ...guard, ...clientScoped, mgdUpload.array('files', 10), async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id;
      const client = await storage.getClient(clientId);
      if (!client) return fail(res, 404, "Client not found");

      const files = (req as any).files as Express.Multer.File[];
      if (!files || files.length === 0) return fail(res, 400, "No files uploaded");

      const uploadedDocs = [];
      for (const file of files) {
        const fileType = detectFileType(file.originalname);
        const doc = await storage.createClientDocument({
          clientId,
          fileName: file.originalname,
          fileType,
          fileSize: file.size,
          filePath: file.path,
          status: "uploaded",
        });
        uploadedDocs.push(doc);
      }

      console.log(`[MGD][CLIENTS] POST /api/mgd/clients/${clientId}/documents — uploaded ${uploadedDocs.length} document(s)`);
      ok(res, { documents: uploadedDocs });

      for (const doc of uploadedDocs) {
        processMGDDocumentInBackground(doc.id);
      }
    } catch (err) {
      console.error("[MGD][CLIENTS] POST /api/mgd/clients/:id/documents — error:", err);
      fail(res, 500, "Failed to upload documents");
    }
  });

  console.log("[MGD][API] Routes registered: GET /api/mgd/{health,reports,reports/:id,traces,traces/:id,clients,clients/:id/documents}, POST /api/mgd/{run,estimate-health,findings,root-causes,recommendations,benchmarks,narrative,export-pdf,clients/:id/documents}, DELETE /api/mgd/reports/:id");
}
