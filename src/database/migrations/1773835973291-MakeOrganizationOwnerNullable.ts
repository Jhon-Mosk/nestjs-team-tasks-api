import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrganizationOwnerNullable1773835973291 implements MigrationInterface {
  name = 'MakeOrganizationOwnerNullable1773835973291';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP CONSTRAINT "FK_e08c0b40ce104f44edf060126fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "owner_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD CONSTRAINT "FK_e08c0b40ce104f44edf060126fe" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP CONSTRAINT "FK_e08c0b40ce104f44edf060126fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "owner_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD CONSTRAINT "FK_e08c0b40ce104f44edf060126fe" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
