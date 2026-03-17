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
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Index('idx_tasks_project', ['project_id'])
@Index('idx_tasks_assignee', ['assignee_id'])
@Index('idx_tasks_assignee_status', ['assignee_id', 'status'])
@Index('idx_tasks_project_status', ['project_id', 'status'])
@Index('idx_tasks_priority', ['priority'])
@Index('idx_tasks_org', ['organization_id'])
@Index('idx_tasks_deleted_at', ['deleted_at'])
@Index('idx_tasks_org_status', ['organization_id', 'status'])
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
  deletedAt!: Date;
}
