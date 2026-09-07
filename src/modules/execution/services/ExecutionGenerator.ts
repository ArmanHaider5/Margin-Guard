/**
 * ExecutionGenerator Service
 * 
 * Generates execution tasks from diagnosed root causes.
 * 
 * ISOLATION RULES:
 * - Accepts root cause objects already produced by diagnostics
 * - Does NOT alter diagnostic confidence or scoring
 * - Uses deterministic templates per rootCauseId
 * - No imports from diagnostic logic (bulk-analyzer, evidence-signals, etc.)
 */

import { ExecutionTask } from "../models/ExecutionTask";
import { ExecutionRisk } from "../models/ExecutionRisk";
import { ExecutionConsequence } from "../models/ExecutionConsequence";
import { v4 as uuid } from "uuid";

export function generateExecutionFromRootCause(
  rootCauseId: string,
  rootCauseTitle: string
): {
  tasks: ExecutionTask[];
  risks: ExecutionRisk[];
  consequences: ExecutionConsequence[];
} {
  const taskId = uuid();
  const riskId = uuid();

  const task: ExecutionTask = {
    id: taskId,
    rootCauseId,
    title: `Address root cause: ${rootCauseTitle}`,
    description: `Execution action generated from validated diagnostic finding.`,
    ownerUserId: "",
    ownerRole: "CLIENT",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: "PENDING",
    linkedRiskIds: [riskId],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const risk: ExecutionRisk = {
    id: riskId,
    rootCauseId,
    riskStatement: `Failure to resolve "${rootCauseTitle}" may escalate operational disruption.`,
    baseSeverity: 3,
    escalationThresholdDays: 3,
    createdAt: new Date().toISOString(),
  };

  const consequence: ExecutionConsequence = {
    id: uuid(),
    riskId,
    triggerAfterDays: 3,
    consequenceMessage:
      "If unresolved, probability of downtime, cost leakage, or service degradation increases.",
    severityIncrease: 1,
    createdAt: new Date().toISOString(),
  };

  return {
    tasks: [task],
    risks: [risk],
    consequences: [consequence],
  };
}
