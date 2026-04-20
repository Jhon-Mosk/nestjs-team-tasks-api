import { ForbiddenException } from '@nestjs/common';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserRole } from '../users/users.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  assertCanReadTask,
  assertCanUpdateTask,
  isAllowedToAssignTaskToOthers,
  isAllowedToReadAnyTaskInOrg,
  normalizeCreateTaskInput,
} from './tasks.policy';
import { Task, TaskPriority, TaskStatus } from './tasks.entity';

describe('TasksPolicy', () => {
  const employee: AccessTokenPayload = {
    sub: 'u-emp',
    organizationId: 'org-1',
    role: UserRole.EMPLOYEE,
  };
  const manager: AccessTokenPayload = {
    sub: 'u-mgr',
    organizationId: 'org-1',
    role: UserRole.MANAGER,
  };
  const owner: AccessTokenPayload = {
    sub: 'u-own',
    organizationId: 'org-1',
    role: UserRole.OWNER,
  };

  describe('role allowlists', () => {
    it('employee reads only own tasks; manager/owner read any', () => {
      expect(isAllowedToReadAnyTaskInOrg(UserRole.EMPLOYEE)).toBe(false);
      expect(isAllowedToReadAnyTaskInOrg(UserRole.MANAGER)).toBe(true);
      expect(isAllowedToReadAnyTaskInOrg(UserRole.OWNER)).toBe(true);
    });

    it('only owner/manager may assign to others', () => {
      expect(isAllowedToAssignTaskToOthers(UserRole.EMPLOYEE)).toBe(false);
      expect(isAllowedToAssignTaskToOthers(UserRole.MANAGER)).toBe(true);
      expect(isAllowedToAssignTaskToOthers(UserRole.OWNER)).toBe(true);
    });
  });

  describe('assertCanReadTask', () => {
    it('allows employee to read own task', () => {
      expect(() =>
        assertCanReadTask(employee, { assigneeId: employee.sub } as Task),
      ).not.toThrow();
    });

    it('forbids employee to read чужую задачу', () => {
      expect(() =>
        assertCanReadTask(employee, { assigneeId: 'someone-else' } as Task),
      ).toThrow(ForbiddenException);
    });

    it('allows manager to read any task', () => {
      expect(() =>
        assertCanReadTask(manager, { assigneeId: 'someone-else' } as Task),
      ).not.toThrow();
    });

    it('allows owner to read any task', () => {
      expect(() =>
        assertCanReadTask(owner, { assigneeId: 'someone-else' } as Task),
      ).not.toThrow();
    });
  });

  describe('normalizeCreateTaskInput', () => {
    it('forces employee assigneeId=self and forbids priority', () => {
      const dto = { assigneeId: employee.sub } as CreateTaskDto;
      expect(normalizeCreateTaskInput(employee, dto).assigneeId).toBe(
        employee.sub,
      );

      expect(() =>
        normalizeCreateTaskInput(employee, {
          priority: TaskPriority.HIGH,
        } as CreateTaskDto),
      ).toThrow(ForbiddenException);
    });

    it('forbids employee to assign to other user', () => {
      expect(() =>
        normalizeCreateTaskInput(employee, {
          assigneeId: 'other',
        } as CreateTaskDto),
      ).toThrow(ForbiddenException);
    });

    it('allows manager to assign others and set priority', () => {
      const dto = {
        assigneeId: 'other',
        priority: TaskPriority.HIGH,
      } as CreateTaskDto;
      const normalized = normalizeCreateTaskInput(manager, dto);
      expect(normalized.assigneeId).toBe('other');
      expect(normalized.priority).toBe(TaskPriority.HIGH);
    });

    it('forbids setting status=OVERDUE manually', () => {
      expect(() =>
        normalizeCreateTaskInput(owner, {
          status: TaskStatus.OVERDUE,
        } as CreateTaskDto),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertCanUpdateTask', () => {
    it('forbids employee to change assigneeId/priority', () => {
      const task = { assigneeId: employee.sub } as Task;
      expect(() =>
        assertCanUpdateTask(employee, task, {
          assigneeId: 'x',
        } as UpdateTaskDto),
      ).toThrow(ForbiddenException);
      expect(() =>
        assertCanUpdateTask(employee, task, {
          priority: TaskPriority.HIGH,
        } as UpdateTaskDto),
      ).toThrow(ForbiddenException);
    });

    it('forbids setting status=OVERDUE manually', () => {
      const task = { assigneeId: owner.sub } as Task;
      expect(() =>
        assertCanUpdateTask(owner, task, {
          status: TaskStatus.OVERDUE,
        } as UpdateTaskDto),
      ).toThrow(ForbiddenException);
    });
  });
});
