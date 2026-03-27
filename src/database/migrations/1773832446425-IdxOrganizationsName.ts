import { MigrationInterface, QueryRunner } from 'typeorm';

export class IdxOrganizationsName1773832446425 implements MigrationInterface {
  name = 'IdxOrganizationsName1773832446425';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_organizations_name" ON "organizations" ("name") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_organizations_name"`);
  }
}
