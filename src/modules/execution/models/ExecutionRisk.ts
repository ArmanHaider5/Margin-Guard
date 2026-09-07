/**
 * ExecutionRisk Model
 * 
 * Represents a risk associated with a root cause during execution.
 * Risks can trigger escalation if not addressed within threshold.
 * 
 * ISOLATION: This model references rootCauseId as a foreign key only.
 * It does NOT import or modify any diagnostic logic.
 */

export interface ExecutionRisk {
  id: string;
  rootCauseId: string;

  riskStatement: string;
  baseSeverity: number; // 1–5

  escalationThresholdDays: number;

  createdAt: string;
}
