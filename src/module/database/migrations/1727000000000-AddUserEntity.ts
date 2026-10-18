import { MigrationInterface, QueryRunner } from 'typeorm';

export default class AddUserEntity1727000000000 implements MigrationInterface {
  name = 'AddUserEntity1727000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`
      CREATE TABLE "user" (
        "user_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "phone" character varying(20) NOT NULL,
        "login" character varying(50) NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "middleName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "passwordSalt" character varying NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("user_id"),
        CONSTRAINT "UQ_user_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user"');
  }
}
