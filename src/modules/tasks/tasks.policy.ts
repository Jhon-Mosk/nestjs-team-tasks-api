import { ForbiddenException } from '@nestjs/common';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserRole } from '../users/users.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskPriority, TaskStatus } from './tasks.entity';

/** Видит только свои задачи; OWNER/MANAGER — любые в организации. */
const ROLES_THAT_READ_ONLY_OWN_TASKS: Set<UserRole> = new Set([
  UserRole.EMPLOYEE,
]);

/** Могут назначить исполнителем другого пользователя (не только себя). */
const CAN_ASSIGN_TASK_TO_OTHERS: Set<UserRole> = new Set([
  UserRole.OWNER,
  UserRole.MANAGER,
]);

/** Могут задать приоритет при создании. */
const CAN_SET_PRIORITY_ON_CREATE: Set<UserRole> = new Set([
  UserRole.OWNER,
  UserRole.MANAGER,
]);

/** Могут сменить исполнителя при обновлении. */
const CAN_CHANGE_ASSIGNEE_ON_UPDATE: Set<UserRole> = new Set([
  UserRole.OWNER,
  UserRole.MANAGER,
]);

/** Могут сменить приоритет при обновлении. */
const CAN_CHANGE_PRIORITY_ON_UPDATE: Set<UserRole> = new Set([
  UserRole.OWNER,
  UserRole.MANAGER,
]);

export const isAllowedToReadAnyTaskInOrg = (actorRole: UserRole): boolean =>
  !ROLES_THAT_READ_ONLY_OWN_TASKS.has(actorRole);

export const isAllowedToAssignTaskToOthers = (actorRole: UserRole): boolean =>
  CAN_ASSIGN_TASK_TO_OTHERS.has(actorRole);

export const isAllowedToSetPriorityOnCreate = (actorRole: UserRole): boolean =>
  CAN_SET_PRIORITY_ON_CREATE.has(actorRole);

export const isAllowedToChangeAssigneeOnUpdate = (
  actorRole: UserRole,
): boolean => CAN_CHANGE_ASSIGNEE_ON_UPDATE.has(actorRole);

export const isAllowedToChangePriorityOnUpdate = (
  actorRole: UserRole,
): boolean => CAN_CHANGE_PRIORITY_ON_UPDATE.has(actorRole);

export function assertCanReadTask(actor: AccessTokenPayload, task: Task) {
  if (
    ROLES_THAT_READ_ONLY_OWN_TASKS.has(actor.role) &&
    task.assigneeId !== actor.sub
  ) {
    throw new ForbiddenException('Insufficient permissions');
  }
}

export function assertCanDeleteTask(actor: AccessTokenPayload, task: Task) {
  assertCanReadTask(actor, task);
}

export type NormalizedCreateTaskInput = {
  assigneeId: string;
  priority?: TaskPriority;
  status?: TaskStatus;
};

export function normalizeCreateTaskInput(
  actor: AccessTokenPayload,
  dto: CreateTaskDto,
): NormalizedCreateTaskInput {
  if (!isAllowedToAssignTaskToOthers(actor.role)) {
    if (dto.assigneeId && dto.assigneeId !== actor.sub) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
  if (
    !isAllowedToSetPriorityOnCreate(actor.role) &&
    dto.priority !== undefined
  ) {
    throw new ForbiddenException('Insufficient permissions');
  }

  const canAssignOthers = isAllowedToAssignTaskToOthers(actor.role);
  const out: NormalizedCreateTaskInput = {
    assigneeId: canAssignOthers ? (dto.assigneeId ?? actor.sub) : actor.sub,
  };
  if (dto.status !== undefined) {
    out.status = dto.status;
  }
  if (dto.priority !== undefined) {
    out.priority = dto.priority;
  }
  return out;
}

export function assertCanUpdateTask(
  actor: AccessTokenPayload,
  task: Task,
  dto: UpdateTaskDto,
) {
  assertCanReadTask(actor, task);

  if (
    !isAllowedToChangeAssigneeOnUpdate(actor.role) &&
    dto.assigneeId !== undefined
  ) {
    throw new ForbiddenException('Insufficient permissions');
  }
  if (
    !isAllowedToChangePriorityOnUpdate(actor.role) &&
    dto.priority !== undefined
  ) {
    throw new ForbiddenException('Insufficient permissions');
  }
}
