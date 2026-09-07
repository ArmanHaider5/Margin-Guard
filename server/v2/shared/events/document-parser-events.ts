/**
 * Event contracts for the Document Parser module. These are TYPE DEFINITIONS ONLY —
 * no event bus, emitter, or message queue exists yet, per Sprint 1's scope. A future
 * sprint may wire these to a real dispatch mechanism; until then they exist so that
 * "what can this module report happened" is documented and typed from day one,
 * independent of how it is eventually delivered.
 *
 * Every event carries `occurredAt` (ISO-8601 string, not a `Date`, so events remain
 * plain-data-serializable) and is discriminated by its `type` field.
 */

interface BaseParserEvent {
  occurredAt: string;
}

/** A document completed the full Document Parser pipeline and produced a StructuredDocument. */
export interface DocumentParsedEvent extends BaseParserEvent {
  type: "DocumentParsed";
  documentId: string;
  schemaVersion: string;
}

/** A document was rejected before or during parsing (unsupported type, unreadable, etc.). */
export interface DocumentRejectedEvent extends BaseParserEvent {
  type: "DocumentRejected";
  fileName: string;
  reason: string;
}

/** A candidate EvidenceObject was produced from a StructuredDocument. */
export interface EvidenceCreatedEvent extends BaseParserEvent {
  type: "EvidenceCreated";
  evidenceId: string;
  documentId: string;
  factType: string;
}

/** A non-fatal issue was observed during processing — surfaced, not swallowed. */
export interface ParserWarningEvent extends BaseParserEvent {
  type: "ParserWarning";
  documentId?: string;
  stage: string;
  message: string;
}

/** A DocumentQuality dimension fell below an acceptable threshold. */
export interface LowQualityDetectedEvent extends BaseParserEvent {
  type: "LowQualityDetected";
  documentId: string;
  dimension: string;
  score: number;
}

export type DocumentParserEvent =
  | DocumentParsedEvent
  | DocumentRejectedEvent
  | EvidenceCreatedEvent
  | ParserWarningEvent
  | LowQualityDetectedEvent;
