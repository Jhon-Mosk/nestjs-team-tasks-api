import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserRole } from '../users/users.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './projects.entity';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let projectsService: ProjectsService;
  let projectsRepository: jest.Mocked<Repository<Project>>;

  beforeEach(async () => {
    projectsRepository = {
      exists: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
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

      expect(result).toEqual(project);
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
  });
});
