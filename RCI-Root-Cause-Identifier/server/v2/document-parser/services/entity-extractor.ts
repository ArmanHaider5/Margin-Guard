import { Confidence, deriveCompositeId } from "../../shared/index.js";
import type { DetectedTable, EntityType, ExtractedEntity, SourceLocation } from "../../shared/index.js";
import type { WithDiagnostics } from "../types.js";

interface EntityPattern {
  readonly type: EntityType;
  readonly pattern: RegExp;
  readonly confidence: number;
  readonly parseObservedValue: (match: string) => string | number | boolean;
}

const CURRENCY_AMOUNT = /(?:RM|USD|MYR|\$|€|£)\s?-?[\d,]+(?:\.\d{1,2})?/;
const BARE_DECIMAL_AMOUNT = /\b-?\d{1,3}(?:,\d{3})*\.\d{2}\b/;
const DATE_SLASH = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/;
const DATE_ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const DATE_MONTH_NAME = /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/;
const PERCENTAGE = /\b-?\d+(?:\.\d+)?\s?%/;
const REFERENCE_ID = /\b[A-Z]{2,6}[-/]\d{2,8}(?:[-/]\d{1,4})?\b/;
const QUANTITY_WITH_UNIT = /\b\d+(?:\.\d+)?\s?(?:units?|pcs?|kg|hrs?|hours?|days?|boxes?)\b/i;
const CAPITALIZED_SEQUENCE = /\b(?:[A-Z][a-z]+\s){1,3}[A-Z][a-z]+\b/;

function parseAmount(match: string): number {
  const numeric = match.replace(/[^0-9.-]/g, "");
  return Number.parseFloat(numeric);
}

function parseDate(match: string): string {
  const parsed = new Date(match);
  return Number.isNaN(parsed.getTime()) ? match : parsed.toISOString().slice(0, 10);
}

function parsePercentage(match: string): number {
  return Number.parseFloat(match.replace("%", "").trim());
}

function parseQuantity(match: string): number {
  return Number.parseFloat(match);
}

const PATTERNS: readonly EntityPattern[] = [
  { type: "amount", pattern: CURRENCY_AMOUNT, confidence: 0.85, parseObservedValue: parseAmount },
  { type: "amount", pattern: BARE_DECIMAL_AMOUNT, confidence: 0.55, parseObservedValue: parseAmount },
  { type: "date", pattern: DATE_ISO, confidence: 0.85, parseObservedValue: parseDate },
  { type: "date", pattern: DATE_SLASH, confidence: 0.7, parseObservedValue: parseDate },
  { type: "date", pattern: DATE_MONTH_NAME, confidence: 0.8, parseObservedValue: parseDate },
  { type: "percentage", pattern: PERCENTAGE, confidence: 0.8, parseObservedValue: parsePercentage },
  { type: "reference_id", pattern: REFERENCE_ID, confidence: 0.65, parseObservedValue: (m) => m },
  { type: "quantity", pattern: QUANTITY_WITH_UNIT, confidence: 0.6, parseObservedValue: parseQuantity },
  { type: "organization_name", pattern: CAPITALIZED_SEQUENCE, confidence: 0.35, parseObservedValue: (m) => m },
];

function extractFromCell(
  cellValue: string,
  sourceLocation: SourceLocation,
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const matchedTypes = new Set<EntityType>();

  for (const { type, pattern, confidence, parseObservedValue } of PATTERNS) {
    // Within one entity TYPE, the first pattern to match wins (priority order,
    // e.g. currency-prefixed amounts before bare-decimal amounts) — this avoids
    // double-counting the same fact (e.g. "RM1,000.00" matching both an amount
    // pattern with a currency prefix and a looser bare-decimal pattern). ACROSS
    // different types, every match is kept — a single line legitimately containing
    // a date, a reference id, and an amount should produce all three.
    if (matchedTypes.has(type)) continue;
    const match = pattern.exec(cellValue);
    if (match) {
      matchedTypes.add(type);
      const rawValue = match[0];
      const id = deriveCompositeId([
        "entity",
        type,
        rawValue,
        sourceLocation.tableId,
        sourceLocation.row,
        sourceLocation.column,
        sourceLocation.charOffset,
      ]).slice(0, 16);
      entities.push({
        id,
        type,
        sourceLocation,
        rawValue,
        observedValue: parseObservedValue(rawValue),
        confidence: Confidence.create(confidence),
      });
    }
  }
  return entities;
}

export interface EntityExtractorService {
  extract(tables: readonly DetectedTable[], fallbackText?: string): WithDiagnostics<readonly ExtractedEntity[]>;
}

/**
 * Regex-based, deterministic fact extraction. Scans structured table cells when
 * tables were detected (the common case for financial/operational documents); falls
 * back to scanning raw text only when no tables exist at all (e.g. a purely
 * narrative document) — this avoids double-extracting the same values once from a
 * table cell and again from the same text when it's merely a flattened view of the
 * same table.
 */
export class EntityExtractor implements EntityExtractorService {
  extract(tables: readonly DetectedTable[], fallbackText?: string): WithDiagnostics<readonly ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    if (tables.length > 0) {
      for (const table of tables) {
        table.rows.forEach((row, rowIndex) => {
          row.forEach((cell, columnIndex) => {
            if (cell.trim().length === 0) return;
            entities.push(
              ...extractFromCell(cell, {
                tableId: table.id,
                sectionId: table.sectionId,
                row: rowIndex,
                column: columnIndex,
              }),
            );
          });
        });
      }
    } else if (fallbackText) {
      // Narrative text: scan line by line so each match still carries a (coarse)
      // location, rather than one giant charOffset-less blob.
      fallbackText.split("\n").forEach((line, lineIndex) => {
        entities.push(...extractFromCell(line, { charOffset: lineIndex }));
      });
    }

    return { value: entities, diagnostics: [] };
  }
}
