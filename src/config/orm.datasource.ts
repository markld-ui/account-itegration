import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import migrations from '../module/database/migrations/index.js';
import { UserEntity } from '../module/user/entities/user.entity.js';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5132),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'password',
  database: process.env.DB_DATABASE ?? 'account-db',
  synchronize: false,
  entities: [UserEntity],
  migrations,
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  migrationsTableName: process.env.DB_MIGRATIONS_TABLE_NAME ?? 'database_migrations',
});