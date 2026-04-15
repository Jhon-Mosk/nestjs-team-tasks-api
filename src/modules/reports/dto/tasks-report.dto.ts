import { TaskPriority, TaskStatus } from 'src/modules/tasks/tasks.entity';

export class TasksReportDto {
  total!: number;
  doneCount!: number;
  donePercent!: number;
  distributionByPriority!: Record<TaskPriority, number>;
  distributionByStatus!: Record<TaskStatus, number>;
  overdueCount!: number;
  avgCompletionTime!: number;
  medianCompletionTime!: number;
}
