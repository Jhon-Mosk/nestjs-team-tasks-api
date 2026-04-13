import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { REDIS_CLIENT } from '../redis/redis.provider';
import { UserRole } from '../users/users.entity';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import {
  TasksListCacheService,
  tasksListCacheEntryKey,
  tasksListFiltersHash,
  tasksListScope,
} from './tasks-list-cache.service';

describe('TasksListCacheService (keys)', () => {
  const owner: AccessTokenPayload = {
    sub: 'u1',
    organizationId: 'org-1',
    role: UserRole.OWNER,
  };
  const employee: AccessTokenPayload = {
    sub: 'u-emp',
    organizationId: 'org-1',
    role: UserRole.EMPLOYEE,
  };

  it('tasksListScope separates employee vs staff', () => {
    expect(tasksListScope(employee)).toBe(`emp:${employee.sub}`);
    expect(tasksListScope(owner)).toBe('staff');
  });

  it('tasksListFiltersHash ignores assigneeId for employee (matches list query)', () => {
    const q1 = {
      currentPage: 1,
      itemsPerPage: 10,
      assigneeId: 'other',
    } as ListTasksQueryDto;
    const q2 = {
      currentPage: 1,
      itemsPerPage: 10,
    } as ListTasksQueryDto;
    expect(tasksListFiltersHash(employee, q1)).toBe(
      tasksListFiltersHash(employee, q2),
    );
  });

  it('tasksListCacheEntryKey includes org, version, scope, hash', () => {
    const query = { currentPage: 1, itemsPerPage: 10 } as ListTasksQueryDto;
    const key = tasksListCacheEntryKey('org-1', 2, owner, query);
    expect(key).toMatch(/^tasks:list:org-1:v2:staff:[a-f0-9]{16}$/);
  });
});

describe('TasksListCacheService (redis)', () => {
  let service: TasksListCacheService;
  let redis: jest.Mocked<Pick<Redis, 'get' | 'set' | 'incr'>>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksListCacheService,
        { provide: REDIS_CLIENT, useValue: redis },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'tasksListCacheTtlSec') return 300;
              throw new Error(`unexpected ${key}`);
            },
          },
        },
      ],
    }).compile();

    service = module.get(TasksListCacheService);
  });

  it('set uses EX ttl from config', async () => {
    redis.set.mockResolvedValue('OK');
    await service.set('k', {
      items: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      itemsPerPage: 10,
    });
    expect(redis.set).toHaveBeenCalledWith('k', expect.any(String), 'EX', 300);
  });
});
