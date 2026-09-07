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
import { FINDING_CATEGORIES } from "../mgd/finding-categories";
import type { BusinessConcernInput } from "../mgd/diagnostic-scope";

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

// ── Route registration ────────────────────────────────────────────────────────

/**
 * @param authMiddleware Applied, in order, to every route below except
 *   GET /api/mgd/health. Defaults to `[]` (no guard) only so this function
 *   remains directly callable/testable in isolation — server/system/routes.ts,
 *   the sole production caller, always passes [isAuthenticated, isAdmin].
 */
export function registerMGDRoutes(app: Express, authMiddleware: RequestHandler[] = []): void {
  const guard = authMiddleware;

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

        for (const docId of selectedDocIds) {
          try {
            const doc = await storage.getClientDocument(docId);
            if (!doc) {
              console.log(`[AUDIT] ${docId} — NOT FOUND IN DB`);
              continue;
            }

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
                    "unknown" as any,
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
  app.post("/api/mgd/estimate-health", ...guard, (req: Request, res: Response) => {
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
  app.post("/api/mgd/findings", ...guard, (req: Request, res: Response) => {
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
  app.post("/api/mgd/root-causes", ...guard, (req: Request, res: Response) => {
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
  app.post("/api/mgd/recommendations", ...guard, (req: Request, res: Response) => {
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
  app.post("/api/mgd/benchmarks", ...guard, (req: Request, res: Response) => {
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
  app.post("/api/mgd/narrative", ...guard, (req: Request, res: Response) => {
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
  app.post("/api/mgd/export-pdf", ...guard, async (req: Request, res: Response) => {
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
  // List all stored reports, optionally filtered by ?clientId=
  app.get("/api/mgd/reports", ...guard, async (req: Request, res: Response) => {
    try {
      const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
      console.log(`[MGD][REPORTS] GET /api/mgd/reports — clientId=${clientId ?? "all"}`);
      const reports = await listReports(clientId);
      console.log(`[MGD][REPORTS] GET /api/mgd/reports — returned ${reports.length} record(s)`);
      ok(res, { reports });
    } catch (err) {
      console.error("[MGD][REPORTS] GET /api/mgd/reports — error:", err);
      fail(res, 500, "Failed to list reports");
    }
  });

  // ── GET /api/mgd/reports/:id ─────────────────────────────────────────────────
  // Retrieve a single stored report by id.
  app.get("/api/mgd/reports/:id", ...guard, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`[MGD][REPORTS] GET /api/mgd/reports/${id}`);
      const report = await getReport(id);
      if (!report) {
        console.log(`[MGD][REPORTS] GET /api/mgd/reports/${id} — not found`);
        return fail(res, 404, `Report "${id}" not found`);
      }
      console.log(`[MGD][REPORTS] GET /api/mgd/reports/${id} — found`);
      ok(res, { report });
    } catch (err) {
      console.error("[MGD][REPORTS] GET /api/mgd/reports/:id — error:", err);
      fail(res, 500, "Failed to retrieve report");
    }
  });

  // ── DELETE /api/mgd/reports/:id ──────────────────────────────────────────────
  // Delete a single stored report by id.
  app.delete("/api/mgd/reports/:id", ...guard, async (req: Request, res: Response) => {
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
  app.get("/api/mgd/traces", ...guard, async (_req: Request, res: Response) => {
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
  app.get("/api/mgd/traces/:id", ...guard, async (req: Request, res: Response) => {
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

  console.log("[MGD][API] Routes registered: GET /api/mgd/{health,reports,reports/:id,traces,traces/:id}, DELETE /api/mgd/reports/:id, POST /api/mgd/{run,estimate-health,findings,root-causes,recommendations,benchmarks,narrative,export-pdf}");
}
