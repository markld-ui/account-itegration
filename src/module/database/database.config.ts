import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import migrations from './migrations/index.js';

export const databaseOptions = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: (config.get<string>('DB_TYPE', 'postgres') ?? 'postgres') as 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: Number(config.get<number>('DB_PORT', 5432)),
  username: config.get<string>('DB_USERNAME', 'postgres'),
  password: config.get<string>('DB_PASSWORD', 'password'),
  database: config.get<string>('DB_DATABASE', 'account-db'),
  logging: config.get<boolean>('DB_LOGGING', false),
  synchronize: false,
  migrationsRun: config.get<boolean>('DB_MIGRATIONS_RUN', false),
  migrationsTableName: config.get<string>('DB_MIGRATIONS_TABLE_NAME', 'database_migrations'),
  migrations,
  autoLoadEntities: true,
});