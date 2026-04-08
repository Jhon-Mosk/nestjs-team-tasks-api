import { TaskPriority, TaskStatus } from '../tasks.entity';

export class TaskResponseDto {
  id!: string;
  title!: string;
  description!: string;
  status!: TaskStatus;
  priority!: TaskPriority;
  organizationId!: string;
  assigneeId!: string;
  projectId!: string;
  dueDate!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
