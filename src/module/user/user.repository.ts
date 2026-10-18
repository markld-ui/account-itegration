import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { UserEntity } from './entities/user.entity.js';
import { CheckExistUserParams, FindUserParams } from './user.types.js';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createUser<T extends DeepPartial<UserEntity>>(entity: T): Promise<UserEntity> {
    return this.userRepository.save(entity);
  }

  async findById(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { userId } });
  }

  async findByLogin(login: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { login } });
  }

  async findAndCount(
    params: FindUserParams = {},
  ): Promise<{ items: UserEntity[]; total: number }> {
    const query = this.qb(params);
    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async updateUser(params: DeepPartial<UserEntity>): Promise<void> {
    await this.userRepository.update({ userId: params.userId }, params);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userRepository.delete({ userId });
  }

  async checkExistUser(params: CheckExistUserParams): Promise<boolean> {
    const query = this.userRepository.createQueryBuilder('user');

    query.where('(user.login = :login OR user.phone = :phone)', {
      login: params.login,
      phone: params.phone,
    });

    const result = await query.getOne();

    return Boolean(result);
  }

  private qb(params: FindUserParams = {}, alias = 'user'): SelectQueryBuilder<UserEntity> {
    const query = this.userRepository.createQueryBuilder(alias);

    if (params.userIds?.length) {
      query.andWhere(`${alias}.userId IN (:...userIds)`, { userIds: params.userIds });
    }

    if (params.phones?.length) {
      query.andWhere(`${alias}.phone IN (:...phones)`, { phones: params.phones });
    }

    if (params.login) {
      query.andWhere(`${alias}.login = :login`, { login: params.login });
    }

    if (params.take) {
      query.take(params.take);
    }

    if (params.skip) {
      query.skip(params.skip);
    }

    return query;
  }
}
