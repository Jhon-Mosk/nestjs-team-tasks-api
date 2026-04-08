import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateProjectResponseDto } from './dto/create-project-response.dto';
import { CreateProjectDto } from './dto/create-project.dto';
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

    const project = await this.projectRepository.save(
      this.projectRepository.create({
        name: dto.name,
        organizationId,
      }),
    );
    return {
      id: project.id,
      name: project.name,
      organizationId: project.organizationId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
