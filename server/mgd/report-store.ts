// ─────────────────────────────────────────────────────────────────────────────
// MGD REPORT STORE
//
// JSON-file-backed persistence for StoredMGDReport records.
// Storage path: server/data/mgd-reports.json (relative to cwd).
//
// Design principles:
//   • No database — plain JSON file, auto-created on first write.
//   • Top-level try/catch on every exported function — never throws.
//   • Returns empty array / null / false on any failure path.
//   • Newest-first ordering on all list operations.
//   • File access is serialised via a simple in-process mutex to prevent
//     concurrent writes from corrupting the JSON.
//   • [MGD][STORE] prefix on all log lines.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "fs";
import path               from "path";
import crypto             from "crypto";
import type { MGDReport } from "./report-composer";

// ── Exported interfaces ───────────────────────────────────────────────────────

export interface StoredMGDReport {
  id:          string;
  clientId?:   string;
  clientName?: string;
  industry?:   string;
  createdAt:   string;
  report:      MGDReport;
  runtimeMs:   number;
}

// ── Storage path ──────────────────────────────────────────────────────────────

// Resolved from cwd (RCI-Root-Cause-Identifier/) which is fixed by the workflow.
const STORE_PATH = path.resolve(process.cwd(), "server", "data", "mgd-reports.json");
const DATA_DIR   = path.dirname(STORE_PATH);

// ── In-process write mutex ─────────────────────────────────────────────────────
// Prevents concurrent reads-modify-writes from racing each other.

let _writeLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = _writeLock.then(fn);
  // Swallow errors so the lock chain never breaks
  _writeLock = next.then(() => undefined, () => undefined);
  return next;
}

// ── Low-level file helpers ────────────────────────────────────────────────────

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readAll(): Promise<StoredMGDReport[]> {
  try {
    await ensureDir();
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    // ENOENT = file doesn't exist yet — return empty, not an error
    if (err?.code !== "ENOENT") {
      console.warn("[MGD][STORE] readAll — unexpected error:", err?.message ?? err);
    }
    return [];
  }
}

async function writeAll(records: StoredMGDReport[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(records, null, 2), "utf-8");
}

/** Sort newest-first by createdAt ISO string (lexicographic — valid for ISO 8601). */
function newestFirst(records: StoredMGDReport[]): StoredMGDReport[] {
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Exported CRUD functions ───────────────────────────────────────────────────

/**
 * Persist a new MGD report and return the stored record.
 * Returns null on any failure.
 *
 * `params.id`, when supplied, becomes this record's id instead of a freshly
 * generated one — used by POST /api/mgd/run so the id it embeds into the
 * response's `report.id` (report-composer.ts) is the exact same id the
 * record is persisted under, making the two always agree. Callers that omit
 * it keep the original behaviour (a fresh random id per save).
 */
export async function saveReport(params: {
  id?:         string;
  clientId?:   string;
  clientName?: string;
  industry?:   string;
  report:      MGDReport;
  runtimeMs:   number;
}): Promise<StoredMGDReport | null> {
  try {
    const record: StoredMGDReport = {
      id:          params.id ?? crypto.randomUUID(),
      clientId:    params.clientId,
      clientName:  params.clientName,
      industry:    params.industry,
      createdAt:   new Date().toISOString(),
      report:      params.report,
      runtimeMs:   params.runtimeMs,
    };

    await withLock(async () => {
      const existing = await readAll();
      // Prepend so newest is always first in the file
      const updated  = [record, ...existing];
      await writeAll(updated);
    });

    console.log(
      `[MGD][STORE] saveReport — id=${record.id} ` +
      `clientId=${record.clientId ?? "none"} ` +
      `runtimeMs=${record.runtimeMs}`,
    );

    return record;
  } catch (err) {
    console.error("[MGD][STORE] saveReport — error:", err);
    return null;
  }
}

/**
 * Retrieve a single stored report by id.
 * Returns null if not found or on any error.
 */
export async function getReport(id: string): Promise<StoredMGDReport | null> {
  try {
    if (!id) return null;
    const all    = await readAll();
    const record = all.find(r => r.id === id) ?? null;

    console.log(
      `[MGD][STORE] getReport — id=${id} found=${record !== null}`,
    );

    return record;
  } catch (err) {
    console.error("[MGD][STORE] getReport — error:", err);
    return null;
  }
}

/**
 * List all stored reports, optionally filtered by clientId.
 * Always returns newest-first. Returns empty array on any error.
 */
export async function listReports(clientId?: string): Promise<StoredMGDReport[]> {
  try {
    const all     = await readAll();
    const sorted  = newestFirst(all);
    const results = clientId
      ? sorted.filter(r => r.clientId === clientId)
      : sorted;

    console.log(
      `[MGD][STORE] listReports — total=${all.length} ` +
      `filtered=${results.length} ` +
      `clientId=${clientId ?? "all"}`,
    );

    return results;
  } catch (err) {
    console.error("[MGD][STORE] listReports — error:", err);
    return [];
  }
}

/**
 * Delete a stored report by id.
 * Returns true if the record was found and removed, false otherwise.
 */
export async function deleteReport(id: string): Promise<boolean> {
  try {
    if (!id) return false;

    let removed = false;

    await withLock(async () => {
      const existing = await readAll();
      const filtered = existing.filter(r => {
        if (r.id === id) { removed = true; return false; }
        return true;
      });
      if (removed) await writeAll(filtered);
    });

    console.log(
      `[MGD][STORE] deleteReport — id=${id} removed=${removed}`,
    );

    return removed;
  } catch (err) {
    console.error("[MGD][STORE] deleteReport — error:", err);
    return false;
  }
}
