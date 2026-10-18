import { Module } from '@nestjs/common';
import { UserModule } from './module/user/user.module.js';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './module/database/database.module.js';

@Module({
  imports: [UserModule, ConfigModule.forRoot(), DatabaseModule],
})
export class AppModule {}
