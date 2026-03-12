import { DataSource } from 'typeorm';
import configuration from '../config/confuguration';

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
  entities: [],
  subscribers: [],
  migrations: [],
});
