// ─────────────────────────────────────────────────────────────────────────────
// MGD PIPELINE TRACE
//
// Tracks the execution of each step in the MGD pipeline for observability,
// debugging, and audit purposes.
//
// Storage: server/data/mgd-traces.json (auto-created on first write).
//
// Design principles:
//   • Never throws — all exported functions are fully try/catch wrapped.
//   • Returns null / empty on any failure path.
//   • In-process write mutex prevents concurrent JSON corruption.
//   • Newest-first ordering on list operations.
//   • [MGD][TRACE] prefix on all log lines.
//
// Step names (use TRACE_STEPS constants for consistency):
//   Document Processing, Transaction Extraction, Findings Generation,
//   Root Cause Generation, Recommendation Generation, Benchmark Generation,
//   Narrative Generation, Report Composition.
//
// Metadata keys for counts:
//   documents, transactions, findings, rootCauses, recommendations, benchmarks.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "fs";
import path               from "path";
import crypto             from "crypto";

// ── Exported interfaces ───────────────────────────────────────────────────────

export interface PipelineTraceStep {
  step:         string;
  startedAt:    string;
  completedAt:  string;
  durationMs:   number;

  inputCount?:  number;
  outputCount?: number;

  status: "completed" | "failed";

  metadata?: Record<string, unknown>;
}

export interface PipelineTrace {
  traceId:   string;
  createdAt: string;

  steps: PipelineTraceStep[];
}

// ── Step name constants ───────────────────────────────────────────────────────

export const TRACE_STEPS = {
  DOCUMENT_PROCESSING:     "Document Processing",
  TRANSACTION_EXTRACTION:  "Transaction Extraction",
  FINDINGS_GENERATION:     "Findings Generation",
  ROOT_CAUSE_GENERATION:   "Root Cause Generation",
  RECOMMENDATION_GENERATION:"Recommendation Generation",
  BENCHMARK_GENERATION:    "Benchmark Generation",
  NARRATIVE_GENERATION:    "Narrative Generation",
  REPORT_COMPOSITION:      "Report Composition",
} as const;

// ── Metadata count keys ───────────────────────────────────────────────────────

export interface TraceCounts {
  documents?:       number;
  transactions?:    number;
  findings?:        number;
  rootCauses?:      number;
  recommendations?: number;
  benchmarks?:      number;
}

// ── Storage path ──────────────────────────────────────────────────────────────

const STORE_PATH = path.resolve(process.cwd(), "server", "data", "mgd-traces.json");
const DATA_DIR   = path.dirname(STORE_PATH);

// ── In-process write mutex ────────────────────────────────────────────────────

let _writeLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next    = _writeLock.then(fn);
  _writeLock    = next.then(() => undefined, () => undefined);
  return next;
}

// ── Low-level file helpers ────────────────────────────────────────────────────

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readAll(): Promise<PipelineTrace[]> {
  try {
    await ensureDir();
    const raw    = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.warn("[MGD][TRACE] readAll — unexpected error:", (err as Error)?.message ?? err);
    }
    return [];
  }
}

async function writeAll(traces: PipelineTrace[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(traces, null, 2), "utf-8");
}

/** Sort newest-first by createdAt ISO string. */
function newestFirst(traces: PipelineTrace[]): PipelineTrace[] {
  return [...traces].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Exported functions ────────────────────────────────────────────────────────

/**
 * Create and persist a new empty PipelineTrace.
 * Returns the new trace (never null — returns a shell trace on error).
 */
export async function startTrace(): Promise<PipelineTrace> {
  const trace: PipelineTrace = {
    traceId:   crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    steps:     [],
  };

  try {
    await withLock(async () => {
      const existing = await readAll();
      await writeAll([trace, ...existing]);
    });

    console.log(`[MGD][TRACE] startTrace — traceId=${trace.traceId}`);
  } catch (err) {
    console.error("[MGD][TRACE] startTrace — persist error:", (err as Error)?.message ?? err);
    // Return the in-memory trace even if persist failed — pipeline can still run.
  }

  return trace;
}

/**
 * Append a completed step to an existing trace.
 *
 * @param traceId  The trace to update.
 * @param step     Full PipelineTraceStep — caller is responsible for timing fields.
 *
 * Returns the updated trace, or null if the trace was not found.
 */
export async function addTraceStep(
  traceId: string,
  step: PipelineTraceStep,
): Promise<PipelineTrace | null> {
  try {
    if (!traceId) return null;

    let updated: PipelineTrace | null = null;

    await withLock(async () => {
      const all   = await readAll();
      const idx   = all.findIndex(t => t.traceId === traceId);
      if (idx === -1) {
        console.warn(`[MGD][TRACE] addTraceStep — traceId=${traceId} not found`);
        return;
      }
      all[idx] = { ...all[idx], steps: [...all[idx].steps, step] };
      updated  = all[idx];
      await writeAll(all);
    });

    if (updated) {
      console.log(
        `[MGD][TRACE] addTraceStep — traceId=${traceId}` +
        ` step="${step.step}" status=${step.status}` +
        ` durationMs=${step.durationMs}` +
        (step.outputCount !== undefined ? ` out=${step.outputCount}` : ""),
      );
    }

    return updated;
  } catch (err) {
    console.error("[MGD][TRACE] addTraceStep — error:", (err as Error)?.message ?? err);
    return null;
  }
}

/**
 * Retrieve the final persisted state of a trace after all steps are complete.
 * Alias of getTrace — included as a named lifecycle function for call-site clarity.
 *
 * Returns null if not found or on error.
 */
export async function completeTrace(traceId: string): Promise<PipelineTrace | null> {
  try {
    if (!traceId) return null;

    const all   = await readAll();
    const trace = all.find(t => t.traceId === traceId) ?? null;

    console.log(
      `[MGD][TRACE] completeTrace — traceId=${traceId}` +
      ` found=${trace !== null}` +
      (trace ? ` steps=${trace.steps.length}` : ""),
    );

    return trace;
  } catch (err) {
    console.error("[MGD][TRACE] completeTrace — error:", (err as Error)?.message ?? err);
    return null;
  }
}

/**
 * Retrieve a trace by its traceId.
 * Returns null if not found or on any error.
 */
export async function getTrace(traceId: string): Promise<PipelineTrace | null> {
  try {
    if (!traceId) return null;

    const all   = await readAll();
    const trace = all.find(t => t.traceId === traceId) ?? null;

    console.log(
      `[MGD][TRACE] getTrace — traceId=${traceId} found=${trace !== null}`,
    );

    return trace;
  } catch (err) {
    console.error("[MGD][TRACE] getTrace — error:", (err as Error)?.message ?? err);
    return null;
  }
}

/**
 * List all stored traces, newest first.
 * Returns empty array on any error.
 */
export async function listTraces(): Promise<PipelineTrace[]> {
  try {
    const all    = await readAll();
    const sorted = newestFirst(all);

    console.log(`[MGD][TRACE] listTraces — total=${sorted.length}`);

    return sorted;
  } catch (err) {
    console.error("[MGD][TRACE] listTraces — error:", (err as Error)?.message ?? err);
    return [];
  }
}

// ── Utility: build a step with automatic timing ───────────────────────────────

/**
 * Helper for callers that mark their own start time and want the step
 * assembled automatically at completion.
 *
 * Usage:
 *   const stepStart = Date.now();
 *   const output    = await runSomething();
 *   await addTraceStep(traceId, makeStep({
 *     step:        TRACE_STEPS.FINDINGS_GENERATION,
 *     startedAt:   new Date(stepStart).toISOString(),
 *     status:      "completed",
 *     inputCount:  transactions.length,
 *     outputCount: output.length,
 *     metadata:    { industry },
 *   }));
 */
export function makeStep(params: {
  step:         string;
  startedAt:    string;
  status:       "completed" | "failed";
  inputCount?:  number;
  outputCount?: number;
  metadata?:    Record<string, unknown>;
}): PipelineTraceStep {
  const completedAt = new Date().toISOString();
  const durationMs  = Date.now() - new Date(params.startedAt).getTime();

  return {
    step:         params.step,
    startedAt:    params.startedAt,
    completedAt,
    durationMs:   Math.max(0, durationMs),
    status:       params.status,
    inputCount:   params.inputCount,
    outputCount:  params.outputCount,
    metadata:     params.metadata,
  };
}
