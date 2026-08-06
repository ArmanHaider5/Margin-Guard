/**
 * Public entry point for shared event contracts. Currently holds the Document Parser
 * module's event shapes; future modules add their own sibling file here (e.g.
 * `financial-intelligence-events.ts`) and re-export it below — this barrel is the
 * one place every module-consuming event type is discoverable from.
 */
export type {
  DocumentParserEvent,
  DocumentParsedEvent,
  DocumentRejectedEvent,
  EvidenceCreatedEvent,
  ParserWarningEvent,
  LowQualityDetectedEvent,
} from "./document-parser-events.js";
