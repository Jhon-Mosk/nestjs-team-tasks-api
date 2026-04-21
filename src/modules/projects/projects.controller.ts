import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserRole } from '../users/users.entity';
import { CreateProjectResponseDto } from './dto/create-project-response.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { ListProjectsResponseDto } from './dto/list-projects-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
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

  @Auth(UserRole.OWNER, UserRole.MANAGER)
  @Get()
  listProjects(
    @Query() query: ListProjectsQueryDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<ListProjectsResponseDto> {
    const actor = req.user;
    return this.projectsService.list(query, actor);
  }

  @Auth(UserRole.OWNER, UserRole.MANAGER)
  @Get(':id')
  getProject(
    @Param('id') id: string,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<CreateProjectResponseDto> {
    const actor = req.user;
    return this.projectsService.getOne(id, actor);
  }

  @Auth(UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id')
  updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<CreateProjectResponseDto> {
    const actor = req.user;
    return this.projectsService.update(id, dto, actor);
  }

  @Auth(UserRole.OWNER, UserRole.MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProject(
    @Param('id') id: string,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<void> {
    const actor = req.user;
    return this.projectsService.softDelete(id, actor);
  }
}
