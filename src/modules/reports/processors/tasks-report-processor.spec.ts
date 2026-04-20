import { Test } from '@nestjs/testing';
import type { Job } from 'bullmq';
import { FindOperator } from 'typeorm';
import { TaskPriority, TaskStatus } from '../../tasks/tasks.entity';
import { TasksService } from '../../tasks/tasks.service';
import { UserService } from '../../users/user.service';
import { UserRole } from '../../users/users.entity';
import { TasksReportDto } from '../dto/tasks-report.dto';
import { ReportsEventsService } from '../reports-events.service';
import type { TasksReportJobPayload } from '../types/task-report-job-payload';
import { TasksReportProcessor } from './tasks-report-processor';

type FindUsersResult = Awaited<ReturnType<UserService['findAll']>>;
type FindTasksResult = Awaited<ReturnType<TasksService['findAll']>>;

function makeJob(
  id: string,
  data: TasksReportJobPayload,
): Job<TasksReportJobPayload, TasksReportDto, 'tasks-report'> {
  return { id, data } as unknown as Job<
    TasksReportJobPayload,
    TasksReportDto,
    'tasks-report'
  >;
}

describe('TasksReportProcessor', () => {
  let processor: TasksReportProcessor;
  let users: { findAll: jest.MockedFunction<UserService['findAll']> };
  let tasks: { findAll: jest.MockedFunction<TasksService['findAll']> };
  let events: {
    emitTaskReportDone: jest.MockedFunction<
      ReportsEventsService['emitTaskReportDone']
    >;
    emitTaskReportFailed: jest.MockedFunction<
      ReportsEventsService['emitTaskReportFailed']
    >;
  };

  beforeEach(async () => {
    users = { findAll: jest.fn() };
    tasks = { findAll: jest.fn() };
    events = {
      emitTaskReportDone: jest.fn(),
      emitTaskReportFailed: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksReportProcessor,
        { provide: UserService, useValue: users },
        { provide: TasksService, useValue: tasks },
        { provide: ReportsEventsService, useValue: events },
      ],
    }).compile();

    processor = moduleRef.get(TasksReportProcessor);
  });

  it('EMPLOYEE: uses only self as assigneeIds', async () => {
    tasks.findAll.mockResolvedValue([]);
    const job = makeJob('1', {
      organizationId: 'org-1',
      requestedByUserId: 'u-emp',
      requestedByRole: UserRole.EMPLOYEE,
    });

    await processor.process(job);

    expect(users.findAll).not.toHaveBeenCalled();
    expect(tasks.findAll).toHaveBeenCalled();
    const [, payload] = events.emitTaskReportDone.mock.calls[0]!;
    expect(payload.jobId).toBe('1');
    expect(payload.report.total).toEqual(expect.any(Number));
  });

  it('MANAGER: uses self + all employees', async () => {
    users.findAll.mockResolvedValue([
      { id: 'e1' },
      { id: 'e2' },
    ] as unknown as FindUsersResult);
    tasks.findAll.mockResolvedValue([]);

    const job = makeJob('2', {
      organizationId: 'org-1',
      requestedByUserId: 'u-mgr',
      requestedByRole: UserRole.MANAGER,
    });

    await processor.process(job);

    // manager only queries employees
    expect(users.findAll).toHaveBeenCalledTimes(1);
    expect(users.findAll).toHaveBeenCalledWith(
      { role: UserRole.EMPLOYEE },
      expect.objectContaining({
        sub: 'u-mgr',
        organizationId: 'org-1',
        role: UserRole.MANAGER,
      }),
    );

    // TasksService.findAll called with In([...]) - we only validate it includes those ids
    const whereArg = tasks.findAll.mock.calls[0]![0] as unknown as {
      assigneeId: FindOperator<string>;
    };
    expect(whereArg.assigneeId.value).toEqual(
      expect.arrayContaining(['u-mgr', 'e1', 'e2']),
    );
  });

  it('OWNER: uses self + managers + employees', async () => {
    users.findAll
      .mockResolvedValueOnce([{ id: 'e1' }] as unknown as FindUsersResult) // employees
      .mockResolvedValueOnce([{ id: 'm1' }] as unknown as FindUsersResult); // managers
    tasks.findAll.mockResolvedValue([]);

    const job = makeJob('3', {
      organizationId: 'org-1',
      requestedByUserId: 'u-own',
      requestedByRole: UserRole.OWNER,
    });

    await processor.process(job);

    expect(users.findAll).toHaveBeenCalledTimes(2);
    expect(users.findAll.mock.calls[0]![0]).toEqual({
      role: UserRole.EMPLOYEE,
    });
    expect(users.findAll.mock.calls[1]![0]).toEqual({ role: UserRole.MANAGER });

    const whereArg = tasks.findAll.mock.calls[0]![0] as unknown as {
      assigneeId: FindOperator<string>;
    };
    expect(whereArg.assigneeId.value).toEqual(
      expect.arrayContaining(['u-own', 'e1', 'm1']),
    );
  });

  it('targetUserId: narrows to only that user (no users.findAll)', async () => {
    tasks.findAll.mockResolvedValue([]);

    const job = makeJob('4', {
      organizationId: 'org-1',
      requestedByUserId: 'u-own',
      requestedByRole: UserRole.OWNER,
      targetUserId: 'target-1',
    });

    await processor.process(job);

    expect(users.findAll).not.toHaveBeenCalled();
    const whereArg = tasks.findAll.mock.calls[0]![0] as unknown as {
      assigneeId: FindOperator<string>;
    };
    expect(whereArg.assigneeId.value).toEqual(['target-1']);
  });

  it('computes donePercent, overdueCount, avg/median completion time', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    // DONE task completion times: 10s and 30s => avg=20, median=20
    const t1 = {
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: new Date(now - 60_000),
      createdAt: new Date(now - 10_000),
      updatedAt: new Date(now),
    };
    const t2 = {
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: new Date(now + 60_000),
      createdAt: new Date(now - 30_000),
      updatedAt: new Date(now),
    };
    // overdue (not DONE)
    const t3 = {
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date(now - 1),
      createdAt: new Date(now - 5_000),
      updatedAt: new Date(now - 1_000),
    };
    tasks.findAll.mockResolvedValue([t1, t2, t3] as unknown as FindTasksResult);

    const job = makeJob('5', {
      organizationId: 'org-1',
      requestedByUserId: 'u-emp',
      requestedByRole: UserRole.EMPLOYEE,
    });

    const report = await processor.process(job);

    expect(report.total).toBe(3);
    expect(report.doneCount).toBe(2);
    expect(report.donePercent).toBeCloseTo((2 / 3) * 100);
    expect(report.overdueCount).toBe(1);
    expect(report.avgCompletionTime).toBeCloseTo(20);
    expect(report.medianCompletionTime).toBeCloseTo(20);
    const [, payload] = events.emitTaskReportDone.mock.calls[0]!;
    expect(payload.jobId).toBe('5');
    expect(payload.report.total).toEqual(expect.any(Number));
  });

  it('emits failed event when processing throws', async () => {
    tasks.findAll.mockRejectedValue(new Error('db down'));
    const job = makeJob('6', {
      organizationId: 'org-1',
      requestedByUserId: 'u-emp',
      requestedByRole: UserRole.EMPLOYEE,
    });

    await expect(processor.process(job)).rejects.toThrow('db down');
    expect(events.emitTaskReportFailed).toHaveBeenCalledWith('u-emp', {
      jobId: '6',
      error: 'db down',
    });
  });
});
