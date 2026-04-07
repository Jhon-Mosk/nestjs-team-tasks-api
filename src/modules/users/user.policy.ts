import { UserRole } from './users.entity';

const ALLOWED_CREATE_USER_ROLES: Record<UserRole, Set<UserRole>> = {
  [UserRole.OWNER]: new Set([UserRole.MANAGER, UserRole.EMPLOYEE]),
  [UserRole.MANAGER]: new Set([UserRole.EMPLOYEE]),
  [UserRole.EMPLOYEE]: new Set([]),
};

export const isAllowedToCreateUser = (
  actorRole: UserRole,
  userRole: UserRole,
): boolean => {
  return ALLOWED_CREATE_USER_ROLES[actorRole].has(userRole) || false;
};
