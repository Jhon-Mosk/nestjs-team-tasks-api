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
import { Auth } from 'src/common/decorators/auth.decorator';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { ListTasksResponseDto } from './dto/list-tasks-response.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Auth()
  @Post()
  createTask(
    @Body() dto: CreateTaskDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(dto, req.user);
  }

  @Auth()
  @Get()
  listTasks(
    @Query() query: ListTasksQueryDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<ListTasksResponseDto> {
    return this.tasksService.list(query, req.user);
  }

  @Auth()
  @Get(':id')
  getTask(
    @Param('id') id: string,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<TaskResponseDto> {
    return this.tasksService.getOne(id, req.user);
  }

  @Auth()
  @Patch(':id')
  updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(id, dto, req.user);
  }

  @Auth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTask(
    @Param('id') id: string,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<void> {
    return this.tasksService.softDelete(id, req.user);
  }
}
