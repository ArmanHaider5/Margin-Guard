import { deriveCompositeId } from "../shared/index.js";
import type {
  ParserDiagnostic,
  ParserDiagnosticSeverity,
  ParserDiagnosticOrigin,
  SourceLocation,
} from "../shared/index.js";

/**
 * Builds a ParserDiagnostic with a deterministic id derived from its own content
 * (stage + severity + message + source location) — never a random UUID or a
 * call-order counter, so the same input always produces the same diagnostic id.
 */
export function createDiagnostic(params: {
  stage: string;
  origin: ParserDiagnosticOrigin;
  severity: ParserDiagnosticSeverity;
  message: string;
  recommendation: string;
  recoverable: boolean;
  confidenceImpact: number;
  sourceLocation?: SourceLocation;
}): ParserDiagnostic {
  const id = deriveCompositeId([
    params.stage,
    params.origin,
    params.severity,
    params.message,
    params.sourceLocation?.sectionId,
    params.sourceLocation?.tableId,
    params.sourceLocation?.row,
    params.sourceLocation?.column,
  ]).slice(0, 16);

  return {
    id,
    stage: params.stage,
    origin: params.origin,
    severity: params.severity,
    message: params.message,
    recommendation: params.recommendation,
    recoverable: params.recoverable,
    confidenceImpact: params.confidenceImpact,
    sourceLocation: params.sourceLocation,
  };
}
