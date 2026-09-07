/**
 * ExecutionEvidence Model
 * 
 * Represents evidence uploaded to prove task completion.
 * Evidence links to tasks and provides audit trail for execution.
 * 
 * ISOLATION: This model references taskId as a foreign key only.
 * It does NOT import or modify any diagnostic logic.
 */

export interface ExecutionEvidence {
  id: string;
  taskId: string;

  fileUrl: string;
  description?: string;

  uploadedByUserId: string;
  uploadedAt: string;
}
