import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../projects/projects.entity';
import { User } from '../users/users.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  OVERDUE = 'overdue',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/** Частичные индексы: только строки с deleted_at IS NULL. + FK по project_id и assignee_id. */
@Index('idx_tasks_tenant_time', ['organizationId', 'createdAt'], {
  where: '"deleted_at" IS NULL',
})
@Index(
  'idx_tasks_tenant_assignee_time',
  ['organizationId', 'assigneeId', 'createdAt'],
  {
    where: '"deleted_at" IS NULL',
  },
)
@Index('idx_tasks_project', ['projectId'])
@Index('idx_tasks_assignee', ['assigneeId'])
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status!: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.LOW })
  priority!: TaskPriority;

  @Column('uuid', { name: 'organization_id', nullable: false })
  organizationId!: string;

  @Column('uuid', { name: 'assignee_id', nullable: false })
  assigneeId!: string;

  @ManyToOne(() => User, (user) => user.tasks)
  @JoinColumn({ name: 'assignee_id' })
  assignee!: User;

  @Column('uuid', { name: 'project_id', nullable: false })
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'due_date' })
  dueDate!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
