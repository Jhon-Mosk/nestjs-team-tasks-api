import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeTasksIndexes1776000000000 implements MigrationInterface {
  name = 'OptimizeTasksIndexes1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_deleted_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_priority"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_project_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_assignee_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_tasks_org"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_org_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_org_assignee"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_assignee"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_project"`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_tasks_tenant_time" ON "tasks" ("organization_id", "created_at" DESC) WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_tenant_assignee_time" ON "tasks" ("organization_id", "assignee_id", "created_at" DESC) WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_project" ON "tasks" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_assignee" ON "tasks" ("assignee_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_tenant_time"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_tenant_assignee_time"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_project"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_tasks_assignee"`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_tasks_deleted_at" ON "tasks" ("deleted_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_priority" ON "tasks" ("priority") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_project_status" ON "tasks" ("project_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_assignee_status" ON "tasks" ("assignee_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_assignee" ON "tasks" ("assignee_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_project" ON "tasks" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_org_assignee" ON "tasks" ("organization_id", "assignee_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_org_status" ON "tasks" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_org" ON "tasks" ("organization_id") `,
    );
  }
}
