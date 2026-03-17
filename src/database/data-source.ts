import 'reflect-metadata';
import configuration from 'src/config/confuguration';
import { Organization } from 'src/modules/organizations/organizations.entity';
import { Project } from 'src/modules/projects/projects.entity';
import { Task } from 'src/modules/tasks/tasks.entity';
import { User } from 'src/modules/users/users.entity';
import { DataSource } from 'typeorm';

const { database } = configuration();
const { host, port, user, password, name } = database;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host,
  port,
  username: user,
  password,
  database: name,
  synchronize: false,
  logging: true,
  entities: [User, Organization, Project, Task],
  subscribers: [],
  migrations: ['src/database/migrations/*.ts'],
});
