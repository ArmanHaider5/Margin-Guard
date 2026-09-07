/**
 * ExecutionConsequence Model
 * 
 * Represents a consequence that triggers after a risk goes unaddressed.
 * Consequences escalate severity over time if tasks remain incomplete.
 * 
 * ISOLATION: This model references riskId as a foreign key only.
 * It does NOT import or modify any diagnostic logic.
 */

export interface ExecutionConsequence {
  id: string;
  riskId: string;

  triggerAfterDays: number;

  consequenceMessage: string;
  severityIncrease: number;

  createdAt: string;
}
