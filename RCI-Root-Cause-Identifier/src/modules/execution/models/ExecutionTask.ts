/**
 * ExecutionTask Model
 * 
 * Represents an actionable task derived from a diagnosed root cause.
 * Tasks are the implementation units for addressing identified issues.
 * 
 * ISOLATION: This model references rootCauseId as a foreign key only.
 * It does NOT import or modify any diagnostic logic.
 */

export type ExecutionTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | "ESCALATED";

export interface ExecutionTask {
  id: string;
  rootCauseId: string;

  title: string;
  description: string;

  ownerUserId: string;
  ownerRole: "CLIENT" | "CONSULTANT" | "MANAGEMENT";

  dueDate: string; // ISO
  status: ExecutionTaskStatus;

  linkedRiskIds: string[];

  createdAt: string;
  updatedAt: string;
}
