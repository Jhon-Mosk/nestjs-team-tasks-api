import { UserRole } from '../users/users.entity';

const ALLOWED_CREATE_TASK_REPORT_ROLES: Record<UserRole, Set<UserRole>> = {
  [UserRole.OWNER]: new Set([UserRole.MANAGER, UserRole.EMPLOYEE]),
  [UserRole.MANAGER]: new Set([UserRole.EMPLOYEE]),
  [UserRole.EMPLOYEE]: new Set([]),
};

export const canRequestTaskReportForTarget = (
  actorRole: UserRole,
  actorId: string,
  targetId: string,
  targetRole: UserRole,
): boolean => {
  if (actorId === targetId) {
    return true;
  }

  return ALLOWED_CREATE_TASK_REPORT_ROLES[actorRole]?.has(targetRole) ?? false;
};
