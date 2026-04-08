import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserRole } from '../users/users.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './projects.entity';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let projectsService: ProjectsService;
  let projectsRepository: jest.Mocked<Repository<Project>>;

  beforeEach(async () => {
    projectsRepository = {
      exists: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Project>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
      ],
    }).compile();

    projectsService = module.get(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project', async () => {
      const dto = { name: 'Test Project' } as CreateProjectDto;
      const actor = {
        sub: 'user-1',
        organizationId: '123',
        role: UserRole.OWNER,
      } as AccessTokenPayload;
      const project = {
        id: '123',
        name: 'Test Project',
        organizationId: '123',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Project;

      projectsRepository.exists.mockResolvedValue(false);
      projectsRepository.create.mockReturnValue(project);
      projectsRepository.save.mockResolvedValue(project);

      const result = await projectsService.create(dto, actor);

      expect(result).toEqual({
        id: project.id,
        name: project.name,
        organizationId: project.organizationId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(projectsRepository.exists).toHaveBeenCalledWith({
        where: {
          name: dto.name,
          organizationId: actor.organizationId,
          deletedAt: IsNull(),
        },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(projectsRepository.create).toHaveBeenCalledWith({
        name: dto.name,
        organizationId: actor.organizationId,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(projectsRepository.save).toHaveBeenCalledWith(project);
    });

    it('throws ConflictException when active project name exists in org', async () => {
      const dto = { name: 'Dup' } as CreateProjectDto;
      const actor = {
        sub: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as AccessTokenPayload;

      projectsRepository.exists.mockResolvedValue(true);

      await expect(projectsService.create(dto, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws ConflictException when DB raises unique violation (23505) on save', async () => {
      const dto = { name: 'Dup' } as CreateProjectDto;
      const actor = {
        sub: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as AccessTokenPayload;

      const projectToSave = {
        name: dto.name,
        organizationId: actor.organizationId,
      } as Project;

      projectsRepository.exists.mockResolvedValue(false);
      projectsRepository.create.mockReturnValue(projectToSave);

      const err = new QueryFailedError('INSERT INTO projects ...', [], {
        code: '23505',
      } as unknown as Error);
      projectsRepository.save.mockRejectedValue(err);

      await expect(projectsService.create(dto, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('list', () => {
    it('returns paginated list of projects in org', async () => {
      const actor = {
        sub: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as AccessTokenPayload;
      const query = {
        currentPage: 1,
        itemsPerPage: 10,
      } as ListProjectsQueryDto;

      const project = {
        id: 'p-1',
        name: 'P1',
        organizationId: actor.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Project;

      projectsRepository.findAndCount.mockResolvedValue([[project], 1]);

      const result = await projectsService.list(query, actor);

      expect(result).toEqual({
        items: [
          {
            id: project.id,
            name: project.name,
            organizationId: project.organizationId,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(projectsRepository.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: actor.organizationId, deletedAt: IsNull() },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getOne', () => {
    it('throws NotFoundException when project not found in org', async () => {
      const actor = {
        sub: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as AccessTokenPayload;

      projectsRepository.findOne.mockResolvedValue(null);

      await expect(projectsService.getOne('p-1', actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws ConflictException when renaming to existing active name in org', async () => {
      const actor = {
        sub: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as AccessTokenPayload;
      const dto = { name: 'Dup' } as UpdateProjectDto;

      const existing = {
        id: 'p-1',
        name: 'Old',
        organizationId: actor.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Project;

      projectsRepository.findOne.mockResolvedValue(existing);
      projectsRepository.exists.mockResolvedValue(true);

      await expect(
        projectsService.update(existing.id, dto, actor),
      ).rejects.toBeInstanceOf(ConflictException);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(projectsRepository.exists).toHaveBeenCalledWith({
        where: {
          id: Not(existing.id),
          name: dto.name,
          organizationId: actor.organizationId,
          deletedAt: IsNull(),
        },
      });
    });
  });

  describe('softDelete', () => {
    it('throws NotFoundException when project not found in org', async () => {
      const actor = {
        sub: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as AccessTokenPayload;

      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        projectsService.softDelete('p-1', actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('soft deletes by id+organizationId', async () => {
      const actor = {
        sub: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as AccessTokenPayload;

      const project = {
        id: 'p-1',
        name: 'P1',
        organizationId: actor.organizationId,
      } as Project;

      projectsRepository.findOne.mockResolvedValue(project);

      await projectsService.softDelete(project.id, actor);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(projectsRepository.softDelete).toHaveBeenCalledWith({
        id: project.id,
        organizationId: actor.organizationId,
      });
    });
  });
});
