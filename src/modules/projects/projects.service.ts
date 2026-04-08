import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, IsNull, Not, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateProjectResponseDto } from './dto/create-project-response.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectResponseDto } from './dto/list-project-response.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { ListProjectsResponseDto } from './dto/list-projects-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './projects.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(
    dto: CreateProjectDto,
    actor: AccessTokenPayload,
  ): Promise<CreateProjectResponseDto> {
    const { organizationId } = actor;

    const projectExists = await this.projectRepository.exists({
      where: { name: dto.name, organizationId, deletedAt: IsNull() },
    });
    if (projectExists) {
      throw new ConflictException('Project already exists');
    }

    let project: Project;
    try {
      project = await this.projectRepository.save(
        this.projectRepository.create({
          name: dto.name,
          organizationId,
        }),
      );
    } catch (err: unknown) {
      // Race condition hardening: DB unique index is the source of truth.
      if (
        err instanceof QueryFailedError &&
        // Postgres unique violation
        (err as unknown as { driverError?: { code?: string } }).driverError
          ?.code === '23505'
      ) {
        throw new ConflictException('Project already exists');
      }
      throw err;
    }
    return {
      id: project.id,
      name: project.name,
      organizationId: project.organizationId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async list(
    query: ListProjectsQueryDto,
    actor: AccessTokenPayload,
  ): Promise<ListProjectsResponseDto> {
    const { currentPage, itemsPerPage } = query;
    const { organizationId } = actor;

    const [projects, total] = await this.projectRepository.findAndCount({
      where: { organizationId, deletedAt: IsNull() },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      order: { createdAt: 'DESC' },
    });

    return {
      items: projects.map(
        (project) =>
          ({
            id: project.id,
            name: project.name,
            organizationId: project.organizationId,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          }) as ListProjectResponseDto,
      ),
      totalItems: total,
      totalPages: Math.ceil(total / itemsPerPage),
      currentPage,
      itemsPerPage,
    } as ListProjectsResponseDto;
  }

  async getById(id: string, actor: AccessTokenPayload): Promise<Project> {
    const { organizationId } = actor;
    const project = await this.projectRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async getOne(
    id: string,
    actor: AccessTokenPayload,
  ): Promise<CreateProjectResponseDto> {
    const project = await this.getById(id, actor);
    return {
      id: project.id,
      name: project.name,
      organizationId: project.organizationId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    actor: AccessTokenPayload,
  ): Promise<CreateProjectResponseDto> {
    const { organizationId } = actor;
    const project = await this.getById(id, actor);

    if (typeof dto.name === 'string' && dto.name !== project.name) {
      const projectExists = await this.projectRepository.exists({
        where: {
          id: Not(project.id),
          name: dto.name,
          organizationId,
          deletedAt: IsNull(),
        },
      });
      if (projectExists) throw new ConflictException('Project already exists');
    }

    let saved: Project;
    try {
      saved = await this.projectRepository.save({
        ...project,
        ...dto,
      });
    } catch (err: unknown) {
      if (
        err instanceof QueryFailedError &&
        (err as unknown as { driverError?: { code?: string } }).driverError
          ?.code === '23505'
      ) {
        throw new ConflictException('Project already exists');
      }
      throw err;
    }

    return {
      id: saved.id,
      name: saved.name,
      organizationId: saved.organizationId,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async softDelete(id: string, actor: AccessTokenPayload): Promise<void> {
    const { organizationId } = actor;
    const project = await this.projectRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.projectRepository.softDelete({ id, organizationId });
  }
}
