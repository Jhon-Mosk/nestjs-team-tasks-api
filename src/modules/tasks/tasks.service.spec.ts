import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { Project } from '../projects/projects.entity';
import { REDIS_CLIENT } from '../redis/redis.provider';
import { User, UserRole } from '../users/users.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksListCacheService } from './tasks-list-cache.service';
import { TasksService } from './tasks.service';
import { Task, TaskPriority, TaskStatus } from './tasks.entity';

describe('TasksService', () => {
  let tasksService: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let redis: { get: jest.Mock; set: jest.Mock; incr: jest.Mock };

  const orgId = 'org-1';

  const owner: AccessTokenPayload = {
    sub: 'u-owner',
    organizationId: orgId,
    role: UserRole.OWNER,
  };
  const employee: AccessTokenPayload = {
    sub: 'u-emp',
    organizationId: orgId,
    role: UserRole.EMPLOYEE,
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(1),
    };

    taskRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Task>>;

    projectRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Project>>;

    userRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        TasksListCacheService,
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: getRepositoryToken(Project), useValue: projectRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
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

    tasksService = module.get(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('employee can create only for himself (assignee forced)', async () => {
      const dto = {
        title: 'T',
        description: 'D',
        projectId: 'p-1',
        dueDate: new Date(),
        assigneeId: employee.sub,
      } as CreateTaskDto;

      projectRepository.findOne.mockResolvedValue({
        id: dto.projectId,
        organizationId: orgId,
      } as Project);
      userRepository.findOne.mockResolvedValue({
        id: employee.sub,
        organizationId: orgId,
      } as User);

      const saved = {
        id: 't-1',
        title: dto.title,
        description: dto.description,
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        organizationId: orgId,
        assigneeId: employee.sub,
        projectId: dto.projectId,
        dueDate: dto.dueDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Task;

      taskRepository.create.mockReturnValue(saved);
      taskRepository.save.mockResolvedValue(saved);

      const result = await tasksService.create(dto, employee);
      expect(result.assigneeId).toBe(employee.sub);
      expect(result.organizationId).toBe(orgId);
      expect(redis.incr).toHaveBeenCalledWith(`tasks:list:ver:${orgId}`);
    });

    it('employee cannot create task for other user', async () => {
      const dto = {
        title: 'T',
        description: 'D',
        projectId: 'p-1',
        dueDate: new Date(),
        assigneeId: 'u-other',
      } as CreateTaskDto;

      projectRepository.findOne.mockResolvedValue({
        id: dto.projectId,
        organizationId: orgId,
      } as Project);

      await expect(tasksService.create(dto, employee)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when project not found in org', async () => {
      const dto = {
        title: 'T',
        description: 'D',
        projectId: 'p-missing',
        dueDate: new Date(),
      } as CreateTaskDto;

      projectRepository.findOne.mockResolvedValue(null);

      await expect(tasksService.create(dto, owner)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: dto.projectId,
          organizationId: orgId,
          deletedAt: IsNull(),
        },
      });
    });
  });

  describe('list', () => {
    it('employee list forces assigneeId=self ignoring query.assigneeId', async () => {
      const query = {
        currentPage: 1,
        itemsPerPage: 10,
        assigneeId: 'u-other',
      } as ListTasksQueryDto;

      taskRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await tasksService.list(query, employee);
      expect(result.items).toEqual([]);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(taskRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
            assigneeId: employee.sub,
            deletedAt: IsNull(),
          }) as unknown,
        }),
      );
      expect(redis.set).toHaveBeenCalled();
    });

    it('cache hit skips DB', async () => {
      const cached = {
        items: [],
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
        itemsPerPage: 10,
      };
      redis.get.mockImplementation((key: string) => {
        if (key.startsWith('tasks:list:ver:')) return Promise.resolve(null);
        return Promise.resolve(JSON.stringify(cached));
      });

      const query = { currentPage: 1, itemsPerPage: 10 } as ListTasksQueryDto;
      const result = await tasksService.list(query, owner);

      expect(result).toEqual(cached);
      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(taskRepository.findAndCount).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('bumps list cache after successful update', async () => {
      const task = {
        id: 't-1',
        organizationId: orgId,
        assigneeId: owner.sub,
        deletedAt: null,
      } as Task;

      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.save.mockResolvedValue({ ...task, title: 'New' } as Task);

      await tasksService.update(
        task.id,
        { title: 'New' } as UpdateTaskDto,
        owner,
      );
      expect(redis.incr).toHaveBeenCalledWith(`tasks:list:ver:${orgId}`);
    });

    it('employee cannot change priority', async () => {
      const task = {
        id: 't-1',
        organizationId: orgId,
        assigneeId: employee.sub,
        deletedAt: null,
      } as Task;

      taskRepository.findOne.mockResolvedValue(task);

      await expect(
        tasksService.update(
          task.id,
          { priority: TaskPriority.HIGH } as UpdateTaskDto,
          employee,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('softDelete', () => {
    it('throws NotFoundException when task not found in org', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(
        tasksService.softDelete('t-1', owner),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
