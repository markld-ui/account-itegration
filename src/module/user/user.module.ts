import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity.js';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { RedisModule } from '../../config/redis/redis.module.js';
import { KafkaModule } from '../../config/kafka/kafka.module.js';
import { UserKafkaController } from './user.kafka-controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), RedisModule, KafkaModule],
  controllers: [UserController, UserKafkaController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
