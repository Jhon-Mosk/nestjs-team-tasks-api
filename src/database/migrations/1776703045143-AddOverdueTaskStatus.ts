import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOverdueTaskStatus1776703045143 implements MigrationInterface {
  name = 'AddOverdueTaskStatus1776703045143';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."tasks_status_enum" RENAME TO "tasks_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('todo', 'in_progress', 'done', 'overdue')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "public"."tasks_status_enum" USING "status"::"text"::"public"."tasks_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'todo'`,
    );
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum_old" AS ENUM('todo', 'in_progress', 'done')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "public"."tasks_status_enum_old" USING "status"::"text"::"public"."tasks_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'todo'`,
    );
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."tasks_status_enum_old" RENAME TO "tasks_status_enum"`,
    );
  }
}
