import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('ADMIN', 'EMPLOYEE')`);
    await queryRunner.query(`CREATE TYPE "users_status_enum" AS ENUM ('ACTIVE', 'INACTIVE')`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "employeeCode" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying,
        "passwordHash" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'EMPLOYEE',
        "status" "users_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "joiningDate" date NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_employeeCode" UNIQUE ("employeeCode"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_employeeCode" ON "users" ("employeeCode")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);

    await queryRunner.query(
      `CREATE TYPE "attendance_status_enum" AS ENUM ('PRESENT', 'ABSENT', 'INCOMPLETE')`,
    );
    await queryRunner.query(`
      CREATE TABLE "attendance" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "employeeId" uuid NOT NULL,
        "attendanceDate" date NOT NULL,
        "clockIn" timestamptz,
        "clockOut" timestamptz,
        "totalWorkingSeconds" integer NOT NULL DEFAULT 0,
        "status" "attendance_status_enum" NOT NULL DEFAULT 'INCOMPLETE',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attendance_employee_date" UNIQUE ("employeeId", "attendanceDate"),
        CONSTRAINT "FK_attendance_employee" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_employeeId" ON "attendance" ("employeeId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_attendanceDate" ON "attendance" ("attendanceDate")`,
    );

    await queryRunner.query(
      `CREATE TYPE "leaves_leavetype_enum" AS ENUM ('CASUAL', 'SICK', 'ANNUAL', 'UNPAID', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "leaves_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "leaves" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "employeeId" uuid NOT NULL,
        "leaveType" "leaves_leavetype_enum" NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "reason" text NOT NULL,
        "status" "leaves_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejectionReason" text,
        "reviewedBy" uuid,
        "reviewedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leaves" PRIMARY KEY ("id"),
        CONSTRAINT "FK_leaves_employee" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leaves_reviewer" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_leaves_employeeId" ON "leaves" ("employeeId")`);
    await queryRunner.query(`CREATE INDEX "IDX_leaves_status" ON "leaves" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_leaves_startDate" ON "leaves" ("startDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_leaves_endDate" ON "leaves" ("endDate")`);

    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "tokenHash" character varying NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "used" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_password_reset_tokens_tokenHash" UNIQUE ("tokenHash"),
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_userId" ON "password_reset_tokens" ("userId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "token_blacklist" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "jti" character varying NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_token_blacklist_jti" UNIQUE ("jti"),
        CONSTRAINT "PK_token_blacklist" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_token_blacklist_jti" ON "token_blacklist" ("jti")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "token_blacklist"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE "leaves"`);
    await queryRunner.query(`DROP TYPE "leaves_status_enum"`);
    await queryRunner.query(`DROP TYPE "leaves_leavetype_enum"`);
    await queryRunner.query(`DROP TABLE "attendance"`);
    await queryRunner.query(`DROP TYPE "attendance_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "users_status_enum"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
