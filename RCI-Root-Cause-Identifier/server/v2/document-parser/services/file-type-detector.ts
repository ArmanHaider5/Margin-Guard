import { Confidence, deriveContentHash } from "../../shared/index.js";
import type { UploadedFile, FileType, WithDiagnostics } from "../types.js";
import { createDiagnostic } from "../diagnostics.js";

const STAGE = "FileTypeDetector";

const ZIP_SIGNATURES: readonly (readonly number[])[] = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
];

const IMAGE_SIGNATURES: ReadonlyArray<{ bytes: readonly number[] }> = [
  { bytes: [0xff, 0xd8, 0xff] }, // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47] }, // PNG
  { bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF
];

function matchesSignature(content: Buffer, signature: readonly number[]): boolean {
  if (content.length < signature.length) return false;
  return signature.every((byte, index) => content[index] === byte);
}

function extensionOf(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === fileName.length - 1) return "";
  return fileName.slice(lastDot + 1).toLowerCase();
}

/** Zip-based Office formats (xlsx, docx) share the same outer container signature —
 * disambiguated by searching for each format's characteristic internal entry name,
 * which zip stores as plain, uncompressed text in each local file header. A
 * lightweight heuristic, not a full zip parse — sufficient for detection confidence,
 * never used for extraction itself (the real parser re-reads the file properly). */
function disambiguateZipBased(content: Buffer): "xlsx" | "docx" | undefined {
  const text = content.toString("latin1");
  if (text.includes("xl/workbook.xml")) return "xlsx";
  if (text.includes("word/document.xml")) return "docx";
  return undefined;
}

function detectFromMagicBytes(content: Buffer): FileType | undefined {
  if (content.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (ZIP_SIGNATURES.some((sig) => matchesSignature(content, sig))) {
    return disambiguateZipBased(content) ?? undefined;
  }
  if (IMAGE_SIGNATURES.some(({ bytes }) => matchesSignature(content, bytes))) return "image";
  return undefined;
}

function detectFromExtension(extension: string): FileType | undefined {
  switch (extension) {
    case "xlsx":
    case "xls":
      return "xlsx";
    case "csv":
      return "csv";
    case "docx":
      return "docx";
    case "pdf":
      return "pdf";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return "image";
    default:
      return undefined;
  }
}

export interface FileTypeDetectorService {
  detect(fileName: string, content: Buffer, receivedAt: Date): WithDiagnostics<UploadedFile>;
}

/**
 * Determines a file's type from both its extension and its magic bytes, and
 * corroborates the two. Extension-only detection (no recognizable magic bytes, e.g.
 * CSV) is treated as medium confidence; agreement between both signals raises
 * confidence; disagreement trusts the magic bytes (ground truth) but emits a
 * warning diagnostic, since a mislabeled extension is itself useful explainability
 * information for a reader of the output.
 */
export class FileTypeDetector implements FileTypeDetectorService {
  detect(fileName: string, content: Buffer, receivedAt: Date): WithDiagnostics<UploadedFile> {
    const extension = extensionOf(fileName);
    const fromExtension = detectFromExtension(extension);
    const fromBytes = detectFromMagicBytes(content);

    const diagnostics = [];
    let fileType: FileType;
    let detectionConfidence: Confidence;

    if (fromBytes && fromExtension && fromBytes === fromExtension) {
      fileType = fromBytes;
      detectionConfidence = Confidence.create(0.98);
    } else if (fromBytes && fromExtension && fromBytes !== fromExtension) {
      fileType = fromBytes;
      detectionConfidence = Confidence.create(0.6);
      diagnostics.push(
        createDiagnostic({
          stage: STAGE,
          origin: "Parser",
          severity: "warning",
          message: `File extension ".${extension}" does not match detected content type "${fromBytes}"`,
          recommendation: "Verify the file was not renamed or corrupted before upload.",
          recoverable: true,
          confidenceImpact: -0.2,
        }),
      );
    } else if (fromBytes) {
      fileType = fromBytes;
      detectionConfidence = Confidence.create(0.85);
    } else if (fromExtension) {
      fileType = fromExtension;
      detectionConfidence = Confidence.create(0.7);
    } else {
      fileType = "unknown";
      detectionConfidence = Confidence.create(0.1);
      diagnostics.push(
        createDiagnostic({
          stage: STAGE,
          origin: "Parser",
          severity: "error",
          message: `Could not determine file type for "${fileName}" from extension or content`,
          recommendation: "Confirm the file is one of the supported types and is not corrupted.",
          recoverable: false,
          confidenceImpact: -0.5,
        }),
      );
    }

    const uploadedFile: UploadedFile = {
      fileName,
      fileType,
      content,
      fileSizeBytes: content.length,
      contentHash: deriveContentHash(content),
      receivedAt: receivedAt.toISOString(),
      detectionConfidence,
    };

    return { value: uploadedFile, diagnostics };
  }
}
