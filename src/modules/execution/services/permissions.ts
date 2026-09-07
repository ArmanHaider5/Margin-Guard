/**
 * Execution Permissions
 * 
 * Permission helpers for execution module.
 */

export function canModifyExecution(userRole: string) {
  return userRole === "CONSULTANT" || userRole === "MANAGEMENT";
}
