/**
 * `adapters/document-parser/`'s public entry point. The only permitted boundary
 * between V1 and V2 for document data (ADR-008). Not called from any V1 file —
 * see `server/v2/document-parser/MIGRATION.md` for the cutover this exists to
 * eventually support.
 */
export {
  fromV1ExtractedDocumentData,
  ADAPTER_SCHEMA_VERSION,
  ADAPTER_PIPELINE_VERSION,
} from "./from-v1-extracted-document-data.js";
export type { FromV1Context, FromV1Result } from "./from-v1-extracted-document-data.js";
