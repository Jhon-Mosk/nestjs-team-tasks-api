import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  FindOptionsWhere,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { Project } from '../projects/projects.entity';
import { User, UserRole } from '../users/users.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { ListTasksResponseDto } from './dto/list-tasks-response.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  assertCanDeleteTask,
  assertCanReadTask,
  assertCanUpdateTask,
  normalizeCreateTaskInput,
} from './tasks.policy';
import { Task } from './tasks.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private toDto(task: Task): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      organizationId: task.organizationId,
      assigneeId: task.assigneeId,
      projectId: task.projectId,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  private async getProjectOrThrow(projectId: string, organizationId: string) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId, deletedAt: IsNull() },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async getAssigneeOrThrow(assigneeId: string, organizationId: string) {
    const user = await this.userRepository.findOne({
      where: { id: assigneeId, organizationId, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException('Assignee not found');
    return user;
  }

  async create(
    dto: CreateTaskDto,
    actor: AccessTokenPayload,
  ): Promise<TaskResponseDto> {
    const { organizationId } = actor;

    await this.getProjectOrThrow(dto.projectId, organizationId);

    const normalized = normalizeCreateTaskInput(actor, dto);
    const assigneeId = normalized.assigneeId;

    await this.getAssigneeOrThrow(assigneeId, organizationId);

    if (actor.role === UserRole.EMPLOYEE && assigneeId !== actor.sub) {
      throw new ForbiddenException('Insufficient permissions');
    }

    try {
      const taskData: DeepPartial<Task> = {
        title: dto.title,
        description: dto.description,
        organizationId,
        assigneeId,
        projectId: dto.projectId,
        dueDate: dto.dueDate,
      };
      if (dto.status !== undefined) {
        taskData.status = dto.status;
      }
      if (normalized.priority !== undefined) {
        taskData.priority = normalized.priority;
      }

      const task = await this.taskRepository.save(
        this.taskRepository.create(taskData),
      );
      return this.toDto(task);
    } catch (err: unknown) {
      if (
        err instanceof QueryFailedError &&
        (err as unknown as { driverError?: { code?: string } }).driverError
          ?.code === '23505'
      ) {
        throw new ConflictException('Task already exists');
      }
      throw err;
    }
  }

  async list(
    query: ListTasksQueryDto,
    actor: AccessTokenPayload,
  ): Promise<ListTasksResponseDto> {
    const { organizationId, role, sub } = actor;
    const { currentPage, itemsPerPage, status, assigneeId, priority } = query;

    const where: FindOptionsWhere<Task> = {
      organizationId,
      deletedAt: IsNull(),
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;

    if (role === UserRole.EMPLOYEE) {
      where.assigneeId = sub;
    } else if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    const [tasks, total] = await this.taskRepository.findAndCount({
      where,
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      order: { createdAt: 'DESC' },
    });

    return {
      items: tasks.map((t) => this.toDto(t)),
      totalItems: total,
      totalPages: Math.ceil(total / itemsPerPage),
      currentPage,
      itemsPerPage,
    };
  }

  async getOne(
    id: string,
    actor: AccessTokenPayload,
  ): Promise<TaskResponseDto> {
    const { organizationId } = actor;
    const task = await this.taskRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
    if (!task) throw new NotFoundException('Task not found');
    assertCanReadTask(actor, task);
    return this.toDto(task);
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    actor: AccessTokenPayload,
  ): Promise<TaskResponseDto> {
    const { organizationId } = actor;
    const task = await this.taskRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
    if (!task) throw new NotFoundException('Task not found');

    assertCanUpdateTask(actor, task, dto);

    // Re-assign is allowed only for OWNER/MANAGER (policy already blocks employee).
    if (dto.assigneeId) {
      await this.getAssigneeOrThrow(dto.assigneeId, organizationId);
    }

    const saved = await this.taskRepository.save({ ...task, ...dto });
    return this.toDto(saved);
  }

  async softDelete(id: string, actor: AccessTokenPayload): Promise<void> {
    const { organizationId } = actor;
    const task = await this.taskRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
    if (!task) throw new NotFoundException('Task not found');
    assertCanDeleteTask(actor, task);
    await this.taskRepository.softDelete({ id, organizationId });
  }
}
