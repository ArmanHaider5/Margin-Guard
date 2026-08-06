import type {
  DocumentClassification,
  DocumentLayout,
  DocumentSection,
  DetectedTable,
  ExtractedEntity,
  NormalizedTermMapping,
  DocumentQuality,
  DocumentConfidence,
  ProcessingStageTrace,
} from "../../shared/index.js";
import type { UploadedFile, RawContent, RecognizedDocument, DocumentModel } from "../types.js";

/**
 * The shared, growing state a ProcessingStage reads from and writes to. Not a
 * strict linear `A → B` pipe — several late stages (e.g. ConfidenceEvaluator,
 * StructuredDocumentBuilder) need to see more than just the immediately-prior
 * stage's output, so stages read whatever slots they need and write only the slots
 * they own.
 */
export interface ProcessingState {
  readonly uploadedFile: UploadedFile;
  readonly raw?: RawContent;
  readonly classification?: DocumentClassification;
  readonly layout?: DocumentLayout;
  readonly recognizedDocument?: RecognizedDocument;
  readonly sections?: readonly DocumentSection[];
  readonly tables?: readonly DetectedTable[];
  readonly entities?: readonly ExtractedEntity[];
  readonly normalizedTerms?: readonly NormalizedTermMapping[];
  readonly qualityAssessment?: DocumentQuality;
  readonly confidence?: DocumentConfidence;
  readonly documentModel?: DocumentModel;
}

/**
 * Execution context threaded through every stage. `clock` is injectable specifically
 * so tests can fix it — `ProcessingTrace` timestamps must never come from
 * `Date.now()`/`new Date()` called directly inside a stage, only from `ctx.clock()`,
 * which is what makes trace output reproducible (the platform's Determinism
 * requirement — see ADR-010).
 */
export interface ProcessingContext {
  readonly clock: () => Date;
  readonly pipelineVersion: string;
  readonly traceStages: ProcessingStageTrace[];
}

export function createProcessingContext(
  pipelineVersion: string,
  clock: () => Date = () => new Date(),
): ProcessingContext {
  return { clock, pipelineVersion, traceStages: [] };
}

/**
 * A ProcessingStage represents any deterministic processing component in the
 * Document Parser — a Detector, Extractor, Analyzer, Normalizer, Validator, or
 * Builder. Each stage declares its own `version`, independent of
 * `StructuredDocument.schemaVersion` — a stage's internal logic can change version
 * without forcing an output-shape version bump, and vice versa.
 *
 * (Renamed from `PipelineStage` — naming refinement only, per Sprint 1 close-out;
 * the implementation below is unchanged from its original form.)
 */
export interface ProcessingStage {
  readonly name: string;
  readonly version: string;
  run(state: Readonly<ProcessingState>, ctx: ProcessingContext): Partial<ProcessingState>;
}

/**
 * Executes one ProcessingStage, times it via the injectable clock (never
 * wall-clock directly), records a `ProcessingStageTrace` entry (success or
 * failure), and merges the stage's returned partial state into a new
 * `ProcessingState`. Errors are traced, then re-thrown — this wrapper does not
 * decide failure-handling policy; the calling orchestrator does.
 */
export function runProcessingStage(
  stage: ProcessingStage,
  state: Readonly<ProcessingState>,
  ctx: ProcessingContext,
): ProcessingState {
  const startedAt = ctx.clock();
  try {
    const partial = stage.run(state, ctx);
    const durationMs = ctx.clock().getTime() - startedAt.getTime();
    ctx.traceStages.push({
      stage: stage.name,
      version: stage.version,
      startedAt: startedAt.toISOString(),
      durationMs,
    });
    return { ...state, ...partial };
  } catch (error) {
    const durationMs = ctx.clock().getTime() - startedAt.getTime();
    ctx.traceStages.push({
      stage: stage.name,
      version: stage.version,
      startedAt: startedAt.toISOString(),
      durationMs,
      notes: [`failed: ${error instanceof Error ? error.message : String(error)}`],
    });
    throw error;
  }
}
