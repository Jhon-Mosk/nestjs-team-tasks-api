import { Body, Controller, Post, Req } from '@nestjs/common';
import { Auth } from 'src/common/decorators/auth.decorator';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserRole } from '../users/users.entity';
import { CreateProjectResponseDto } from './dto/create-project-response.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Auth(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  createProject(
    @Body() dto: CreateProjectDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<CreateProjectResponseDto> {
    const actor = req.user;
    return this.projectsService.create(dto, actor);
  }
}
