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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { ApiErrorResponses } from 'src/common/swagger/api-error-responses';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { ListTasksResponseDto } from './dto/list-tasks-response.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Auth()
  @ApiOperation({ summary: 'Create task' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiErrorResponses({
    unauthorized: true,
    forbidden: true,
    notFound: true,
    conflict: true,
    unprocessable: true,
  })
  @Post()
  createTask(
    @Body() dto: CreateTaskDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(dto, req.user);
  }

  @Auth()
  @ApiOperation({ summary: 'List tasks (pagination + filters)' })
  @ApiOkResponse({ type: ListTasksResponseDto })
  @ApiErrorResponses({ unauthorized: true, unprocessable: true })
  @Get()
  listTasks(
    @Query() query: ListTasksQueryDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<ListTasksResponseDto> {
    return this.tasksService.list(query, req.user);
  }

  @Auth()
  @ApiOperation({ summary: 'Get task by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiErrorResponses({ unauthorized: true, forbidden: true, notFound: true })
  @Get(':id')
  getTask(
    @Param('id') id: string,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<TaskResponseDto> {
    return this.tasksService.getOne(id, req.user);
  }

  @Auth()
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiErrorResponses({
    unauthorized: true,
    forbidden: true,
    notFound: true,
    unprocessable: true,
  })
  @Patch(':id')
  updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(id, dto, req.user);
  }

  @Auth()
  @ApiOperation({ summary: 'Soft-delete task' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiErrorResponses({ unauthorized: true, forbidden: true, notFound: true })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTask(
    @Param('id') id: string,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<void> {
    return this.tasksService.softDelete(id, req.user);
  }
}
