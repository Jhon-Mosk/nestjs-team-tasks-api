import { DataSource } from 'typeorm';

/** Очищает бизнес-таблицы; `migrations` не трогаем. */
export async function truncateBusinessTables(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.query(
    `TRUNCATE TABLE tasks, projects, users, organizations RESTART IDENTITY CASCADE`,
  );
}
