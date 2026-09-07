import { ConfigurationError } from "../../shared/index.js";

/**
 * A data-driven document-type classification rule. In-code data for this sprint —
 * a stated, flagged exception to "Knowledge is data, not code" (per ADR-003 and
 * `04_MGD_KNOWLEDGE_LIBRARY.md`'s promotion path), since document taxonomy is not
 * yet a Knowledge System entity. Same registry shape, so migrating this into the
 * real Knowledge Library later requires no redesign.
 */
export interface DocumentTypeRule {
  readonly id: string;
  readonly documentType: string;
  readonly version: string;
  readonly headerPatterns: readonly RegExp[];
  readonly keywordPatterns: readonly RegExp[];
  readonly headerWeight: number;
  readonly keywordWeight: number;
}

export class DocumentTypeRuleRegistry {
  private readonly rules: DocumentTypeRule[] = [];

  register(rule: DocumentTypeRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new ConfigurationError(`Document type rule "${rule.id}" is already registered`, {
        details: { id: rule.id },
      });
    }
    this.rules.push(rule);
  }

  all(): readonly DocumentTypeRule[] {
    return this.rules;
  }
}

const BUILT_IN_RULES: readonly DocumentTypeRule[] = [
  {
    id: "balance_sheet",
    documentType: "balance_sheet",
    version: "1.0.0",
    headerPatterns: [/\bassets\b/i, /\bliabilit(y|ies)\b/i, /\bequity\b/i],
    keywordPatterns: [/balance sheet/i, /total assets/i, /total liabilities/i],
    headerWeight: 8,
    keywordWeight: 3,
  },
  {
    id: "profit_and_loss",
    documentType: "profit_and_loss",
    version: "1.0.0",
    headerPatterns: [/\brevenue\b/i, /\bexpense/i, /cost of goods/i, /net profit/i, /gross profit/i],
    keywordPatterns: [/profit\s*(and|&)\s*loss/i, /income statement/i],
    headerWeight: 8,
    keywordWeight: 3,
  },
  {
    id: "invoice",
    documentType: "invoice",
    version: "1.0.0",
    headerPatterns: [/invoice\s*no/i, /bill\s*to/i, /unit price/i, /\bqty\b|\bquantity\b/i],
    keywordPatterns: [/invoice/i, /amount due/i],
    headerWeight: 8,
    keywordWeight: 3,
  },
  {
    id: "trial_balance",
    documentType: "trial_balance",
    version: "1.0.0",
    headerPatterns: [/\baccount\b/i, /\bdebit\b/i, /\bcredit\b/i],
    keywordPatterns: [/trial balance/i],
    headerWeight: 8,
    keywordWeight: 3,
  },
  {
    id: "inventory_record",
    documentType: "inventory_record",
    version: "1.0.0",
    headerPatterns: [/\bitem\b/i, /\bstock\b/i, /closing balance/i, /\bquantity\b/i],
    keywordPatterns: [/inventory/i, /stock report/i],
    headerWeight: 6,
    keywordWeight: 2,
  },
  {
    id: "narrative_report",
    documentType: "narrative_report",
    version: "1.0.0",
    headerPatterns: [],
    keywordPatterns: [/executive summary/i, /\bfindings\b/i, /\brecommendations\b/i],
    headerWeight: 0,
    keywordWeight: 4,
  },
];

export function createDefaultDocumentTypeRuleRegistry(): DocumentTypeRuleRegistry {
  const registry = new DocumentTypeRuleRegistry();
  for (const rule of BUILT_IN_RULES) {
    registry.register(rule);
  }
  return registry;
}
