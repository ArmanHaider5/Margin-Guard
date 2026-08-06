import { deriveCompositeId, Confidence } from "../../shared/index.js";
import type { FinancialEvidence, FinancialSignal } from "../../shared/index.js";
import { FinancialSignalRuleRegistry, createDefaultFinancialSignalRuleRegistry } from "./financial-signal-rules.js";

export interface FinancialSignalGeneratorService {
  generate(documentId: string, evidence: readonly FinancialEvidence[]): readonly FinancialSignal[];
}

/**
 * Applies the FinancialSignalRuleRegistry to a document's classified
 * FinancialEvidence, producing FinancialSignal records. Per the mandatory Evidence
 * Chain, every FinancialSignal references the specific FinancialEvidence
 * record(s) that triggered it — never an empty `financialEvidenceIds`. This is
 * the Financial Intelligence module's terminal output for this sprint: no
 * Finding, Root Cause, Recommendation, or Report is produced beyond this point.
 */
export class FinancialSignalGenerator implements FinancialSignalGeneratorService {
  constructor(private readonly rules: FinancialSignalRuleRegistry = createDefaultFinancialSignalRuleRegistry()) {}

  generate(documentId: string, evidence: readonly FinancialEvidence[]): readonly FinancialSignal[] {
    const signals: FinancialSignal[] = [];

    for (const rule of this.rules.all()) {
      const triggeringEvidence = evidence.filter((e) => rule.triggeringEvidenceTypes.includes(e.type));
      if (triggeringEvidence.length === 0) continue;

      // Average confidence across the triggering evidence, plus a small,
      // documented corroboration bonus when more than one independent evidence
      // record supports the same signal — capped at 0.9, never overstating
      // certainty from a foundation-level rule match alone.
      const averageConfidence =
        triggeringEvidence.reduce((sum, e) => sum + e.confidence.value, 0) / triggeringEvidence.length;
      const corroborationBonus = 0.05 * (triggeringEvidence.length - 1);
      const confidence = Math.min(0.9, averageConfidence + corroborationBonus);

      signals.push({
        id: deriveCompositeId(["financial-signal", rule.signalType, documentId, ...triggeringEvidence.map((e) => e.id)]).slice(0, 16),
        type: rule.signalType,
        financialEvidenceIds: triggeringEvidence.map((e) => e.id),
        documentId,
        confidence: Confidence.create(confidence),
        basis: `Triggered by ${triggeringEvidence.length} FinancialEvidence record(s) of type(s): ${Array.from(new Set(triggeringEvidence.map((e) => e.type))).join(", ")}.`,
      });
    }

    return signals;
  }
}
