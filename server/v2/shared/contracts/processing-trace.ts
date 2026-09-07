/** One stage's execution record within a ProcessingTrace. `durationMs` is derived
 * from the pipeline's injectable clock (see `document-parser/pipeline/`), never
 * `Date.now()` directly, so traces remain reproducible in tests. */
export interface ProcessingStageTrace {
  readonly stage: string;
  readonly version: string;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly notes?: readonly string[];
}

/**
 * The complete, ordered execution record of a StructuredDocument's pipeline run —
 * the concrete mechanism behind the platform's explainability principle
 * (`00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md` Chapter 8): every StructuredDocument can
 * answer "what happened, in what order, using which stage versions" on demand.
 */
export interface ProcessingTrace {
  readonly pipelineVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly stages: readonly ProcessingStageTrace[];
}
