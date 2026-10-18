import { MigrationInterface, QueryRunner } from 'typeorm';

export default class AddUserBalance1792200000000 implements MigrationInterface {
  name = 'AddUserBalance1792200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "balance" varchar NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."balance" IS 'Баланс в копейках'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "user" DROP COLUMN "balance"');
  }
}
