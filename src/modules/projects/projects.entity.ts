import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../organizations/organizations.entity';
import { Task } from '../tasks/tasks.entity';

@Index('idx_projects_org', ['organizationId'])
@Index('idx_projects_deleted_at', ['deletedAt'])
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column('uuid', { name: 'organization_id', nullable: false })
  organizationId!: string;

  @ManyToOne(() => Organization, (organization) => organization.projects)
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @OneToMany(() => Task, (task) => task.project)
  tasks!: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
