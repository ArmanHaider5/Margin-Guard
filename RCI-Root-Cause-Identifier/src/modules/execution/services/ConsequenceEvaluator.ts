/**
 * ConsequenceEvaluator Service
 * 
 * Evaluates time-based escalation for execution tasks.
 * 
 * ISOLATION RULES:
 * - Runs independently of diagnostics
 * - Evaluates time-based escalation
 * - Outputs warnings, not recommendations
 * - No imports from diagnostic logic
 */

import { ExecutionTask } from "../models/ExecutionTask";
import { ExecutionRisk } from "../models/ExecutionRisk";
import { ExecutionConsequence } from "../models/ExecutionConsequence";

export function evaluateConsequences(
  task: ExecutionTask,
  risk: ExecutionRisk,
  consequences: ExecutionConsequence[]
) {
  const now = Date.now();
  const due = new Date(task.dueDate).getTime();
  const daysOverdue = Math.floor((now - due) / 86400000);

  if (daysOverdue <= 0) return [];

  return consequences
    .filter(c => daysOverdue >= c.triggerAfterDays)
    .map(c => ({
      taskId: task.id,
      riskId: risk.id,
      message: c.consequenceMessage,
      severityImpact: c.severityIncrease,
      daysOverdue,
    }));
}
