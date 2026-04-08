import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { Project } from '../projects/projects.entity';
import { User, UserRole } from '../users/users.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';
import { Task, TaskPriority, TaskStatus } from './tasks.entity';

describe('TasksService', () => {
  let tasksService: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let userRepository: jest.Mocked<Repository<User>>;

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
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: getRepositoryToken(Project), useValue: projectRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
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
    });
  });

  describe('update', () => {
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
