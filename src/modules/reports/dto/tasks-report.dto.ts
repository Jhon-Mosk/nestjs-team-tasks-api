import { TaskPriority, TaskStatus } from 'src/modules/tasks/tasks.entity';
import { ApiProperty } from '@nestjs/swagger';

export class TasksReportDto {
  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 70 })
  doneCount!: number;

  @ApiProperty({ example: 70 })
  donePercent!: number;

  @ApiProperty({
    example: { low: 10, medium: 30, high: 60 },
    additionalProperties: { type: 'number' },
  })
  distributionByPriority!: Record<TaskPriority, number>;

  @ApiProperty({
    example: { todo: 10, in_progress: 20, done: 70, overdue: 0 },
    additionalProperties: { type: 'number' },
  })
  distributionByStatus!: Record<TaskStatus, number>;

  @ApiProperty({ example: 2 })
  overdueCount!: number;

  @ApiProperty({ example: 3600 })
  avgCompletionTime!: number;

  @ApiProperty({ example: 2400 })
  medianCompletionTime!: number;
}
