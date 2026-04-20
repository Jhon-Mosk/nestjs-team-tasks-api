import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QUEUE_JOBS, QUEUE_NAMES } from '../../queue/queue.constants';
import type { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserService } from '../users/user.service';
import { UserRole } from '../users/users.entity';
import { ReportsService } from './report.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let userService: Pick<jest.Mocked<UserService>, 'getById'>;
  let queue: { add: jest.Mock };

  const actor: AccessTokenPayload = {
    sub: 'actor-1',
    organizationId: 'org-1',
    role: UserRole.MANAGER,
  };

  beforeEach(async () => {
    userService = {
      getById: jest.fn(),
    };

    queue = {
      add: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: UserService,
          useValue: userService as unknown as UserService,
        },
        { provide: getQueueToken(QUEUE_NAMES.REPORTS_TASKS), useValue: queue },
      ],
    }).compile();

    service = moduleRef.get(ReportsService);
  });

  it('creates job with minimal payload when no target userId', async () => {
    queue.add.mockResolvedValue({ id: 123 });

    const res = await service.createTaskReport({}, actor);

    expect(queue.add).toHaveBeenCalledWith(QUEUE_JOBS.TASKS_REPORT, {
      organizationId: actor.organizationId,
      requestedByRole: actor.role,
      requestedByUserId: actor.sub,
    });
    expect(res.jobId).toBe('123');
    expect(res.status).toBe('processing');
    expect(userService.getById).not.toHaveBeenCalled();
  });

  it('includes targetUserId in payload when provided', async () => {
    queue.add.mockResolvedValue({ id: 'job-1' });
    userService.getById.mockResolvedValue({
      id: 'user-2',
      role: UserRole.EMPLOYEE,
    } as Awaited<ReturnType<UserService['getById']>>);

    const res = await service.createTaskReport({ userId: 'user-2' }, actor);

    expect(queue.add).toHaveBeenCalledWith(QUEUE_JOBS.TASKS_REPORT, {
      organizationId: actor.organizationId,
      requestedByRole: actor.role,
      requestedByUserId: actor.sub,
      targetUserId: 'user-2',
    });
    expect(res.jobId).toBe('job-1');
  });

  it('throws ForbiddenException when actor cannot request report for target', async () => {
    queue.add.mockResolvedValue({ id: 'job-1' });
    userService.getById.mockResolvedValue({
      id: 'user-owner',
      role: UserRole.OWNER,
    } as Awaited<ReturnType<UserService['getById']>>);

    await expect(
      service.createTaskReport({ userId: 'user-owner' }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(queue.add).not.toHaveBeenCalled();
  });
});
