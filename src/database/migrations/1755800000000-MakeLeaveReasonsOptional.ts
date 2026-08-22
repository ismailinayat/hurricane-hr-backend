import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeLeaveReasonsOptional1755800000000 implements MigrationInterface {
  name = 'MakeLeaveReasonsOptional1755800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leaves" ALTER COLUMN "reason" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leaves" ALTER COLUMN "reason" SET NOT NULL`);
  }
}
