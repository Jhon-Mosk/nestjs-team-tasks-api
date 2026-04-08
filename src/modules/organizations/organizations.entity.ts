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
import { Project } from '../projects/projects.entity';
import { User } from '../users/users.entity';

@Index('idx_organizations_deleted_at', ['deletedAt'])
@Index('idx_organizations_name', ['name'])
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  name!: string;

  @Column('uuid', { name: 'owner_id', nullable: true })
  ownerId!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @OneToMany(() => User, (user) => user.organization)
  users!: User[];

  @OneToMany(() => Project, (project) => project.organization)
  projects!: Project[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
