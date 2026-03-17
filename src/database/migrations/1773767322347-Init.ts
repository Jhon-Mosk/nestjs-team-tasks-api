import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1773767322347 implements MigrationInterface {
  name = 'Init1773767322347';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('owner', 'manager', 'employee')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'employee', "organization_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_org_role" ON "users" ("organization_id", "role") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('todo', 'in_progress', 'done')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_priority_enum" AS ENUM('low', 'medium', 'high')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'todo', "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'low', "assignee_id" uuid NOT NULL, "project_id" uuid NOT NULL, "due_date" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
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
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "organization_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_projects_deleted_at" ON "projects" ("deleted_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_projects_org" ON "projects" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organizations_deleted_at" ON "organizations" ("deleted_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_21a659804ed7bf61eb91688dea7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_855d484825b715c545349212c7f" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_585c8ce06628c70b70100bfb842" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_585c8ce06628c70b70100bfb842"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_855d484825b715c545349212c7f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_21a659804ed7bf61eb91688dea7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_organizations_deleted_at"`,
    );
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP INDEX "public"."idx_projects_org"`);
    await queryRunner.query(`DROP INDEX "public"."idx_projects_deleted_at"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_project"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_assignee"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_assignee_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_project_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_priority"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_deleted_at"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_org_role"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_email"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_deleted_at"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
