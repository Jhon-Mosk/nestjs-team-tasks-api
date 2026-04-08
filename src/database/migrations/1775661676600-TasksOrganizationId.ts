import { MigrationInterface, QueryRunner } from 'typeorm';

export class TasksOrganizationId1775661676600 implements MigrationInterface {
  name = 'TasksOrganizationId1775661676600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" ADD "organization_id" uuid`);
    await queryRunner.query(`
      UPDATE "tasks" t
      SET "organization_id" = p."organization_id"
      FROM "projects" p
      WHERE t."project_id" = p."id"
    `);
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "organization_id" SET NOT NULL`,
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_org"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_org_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_org_assignee"`);
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN "organization_id"`,
    );
  }
}
