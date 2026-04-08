import { MigrationInterface, QueryRunner } from 'typeorm';

export class UqProjectsOrgNameActive1775649480095 implements MigrationInterface {
  name = 'UqProjectsOrgNameActive1775649480095';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_projects_org_name_active" ON "projects" ("organization_id", "name") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."uq_projects_org_name_active"`,
    );
  }
}
