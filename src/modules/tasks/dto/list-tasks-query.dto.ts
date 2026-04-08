import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TaskPriority, TaskStatus } from '../tasks.entity';

export class ListTasksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  currentPage: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  itemsPerPage: number = 20;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
