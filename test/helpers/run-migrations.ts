import { AppDataSource } from '../../src/database/data-source';

/** Отдельное подключение для CLI-миграций; после destroy Nest поднимает свой пул. */
export async function runMigrationsOnce(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
}
