import * as crypto from 'node:crypto';
import * as argon2 from 'argon2';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserDto } from './dto/user.dto.js';
import GetUserFilterDto from './dto/get-users-filter.dto.js';
import { UserRepository } from './user.repository.js';
import { REDIS_TOKEN } from '../../config/redis/redis.constant.js';
import { KafkaService } from '../../config/kafka/kafka.service.js';
import {
  BalanceChangedStatus,
  EventBalanceChangedData,
  EventNameEnum,
  EventTransactionSavedData,
  TransactionType,
} from './user.types.js';

@Injectable()
export class UserService {
  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly userRepository: UserRepository,
    private readonly kafkaService: KafkaService,
  ) {}

  async create(user: CreateUserDto): Promise<UserDto> {
    const userExists = await this.userRepository.checkExistUser({
      login: user.login,
      phone: user.phone,
    });

    if (userExists) {
      throw new ConflictException('User already exist');
    }

    const salt = crypto.randomBytes(32);
    const hash = await argon2.hash(user.password, { salt });

    const createdUser = await this.userRepository.createUser({
      ...user,
      passwordHash: hash,
      passwordSalt: salt.toString('hex'),
    });

    return new UserDto(createdUser);
  }

  async findAll(filter: GetUserFilterDto): Promise<{ items: UserDto[]; total: number }> {
    const { items, total } = await this.userRepository.findAndCount({
      userIds: filter?.userIds,
      phones: filter?.phones,
      login: filter?.login,
      take: filter?.take,
      skip: filter?.skip,
    });

    return {
      items: items.map((user) => new UserDto(user)),
      total,
    };
  }

  async findOne(id: string): Promise<UserDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return new UserDto(user);
  }

  async verification({ login, password }: { login: string; password: string }): Promise<boolean> {
    const user = await this.userRepository.findByLogin(login);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return argon2.verify(user.passwordHash, password);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDto> {
    const currentUser = await this.userRepository.findById(id);

    if (!currentUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const payload: Partial<CreateUserDto & { passwordHash: string; passwordSalt: string }> = {
      ...updateUserDto,
    };

    if (updateUserDto.password) {
      const salt = crypto.randomBytes(32);
      payload.passwordHash = await argon2.hash(updateUserDto.password, { salt });
      payload.passwordSalt = salt.toString('hex');
      delete payload.password;
    }

    await this.userRepository.updateUser({ userId: id, ...payload });

    const updatedUser = await this.userRepository.findById(id);

    if (!updatedUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return new UserDto(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    await this.redis.del(user.login);
    await this.userRepository.deleteUser(id);
  }

  async changeBalance(params: EventTransactionSavedData): Promise<void> {
    const { userId, amount, transactionType, transactionId, recipient } =
      params;
    let data: EventBalanceChangedData;

    try {
      if (!/^[1-9]\d*$/.test(amount))
        throw new ConflictException('Invalid amount');
      const user = await this.userRepository.findById(userId);
      if (!user) throw new NotFoundException('User not found');

      const currentBalance = BigInt(user.balance);
      const value = BigInt(amount);
      let newBalance: bigint;
      if (transactionType === TransactionType.DEPOSIT) {
        newBalance = currentBalance + value;
      } else if (transactionType === TransactionType.WITHDRAWL) {
        newBalance = currentBalance - value;
      } else {
        throw new ConflictException('Invalid transaction type');
      }
      if (newBalance < 0n) throw new ConflictException('Insufficient funds');

      await this.userRepository.changeBalance({
        userId,
        balance: newBalance.toString(),
      });
      data = {
        transactionId,
        status: BalanceChangedStatus.COMPLETED,
        recipient,
        amount,
      };
    } catch {
      data = { transactionId, status: BalanceChangedStatus.FAILED };
    }

    // A broker failure must propagate; it does not mean the DB update failed.
    await this.kafkaService.produce({
      eventName: EventNameEnum.BalanceChanged,
      data,
    });
  }
}
