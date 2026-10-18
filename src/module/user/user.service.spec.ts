import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';
import GetUserFilterDto from './dto/get-users-filter.dto.js';
import { KafkaService } from '../../config/kafka/kafka.service.js';
import {
  BalanceChangedStatus,
  EventNameEnum,
  TransactionType,
} from './user.types.js';

describe('UserService', () => {
  let service: UserService;
  let repository: {
    checkExistUser: ReturnType<typeof vi.fn>;
    createUser: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
    changeBalance: ReturnType<typeof vi.fn>;
  };
  let redis: { del: ReturnType<typeof vi.fn> };
  let kafka: { produce: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repository = {
      checkExistUser: vi.fn(),
      createUser: vi.fn(),
      findById: vi.fn(),
      deleteUser: vi.fn(),
      changeBalance: vi.fn(),
    };
    redis = { del: vi.fn() };
    kafka = { produce: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: repository,
        },
        { provide: 'REDIS_TOKEN', useValue: redis },
        { provide: KafkaService, useValue: kafka },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should remove the login cache entry before deleting the user', async () => {
    repository.findById.mockResolvedValue({ userId: 'user-1', login: 'ivan' });
    const callOrder: string[] = [];
    redis.del.mockImplementation(async () => {
      callOrder.push('redis');
    });
    repository.deleteUser.mockImplementation(async () => {
      callOrder.push('database');
    });

    await service.remove('user-1');

    expect(redis.del).toHaveBeenCalledWith('ivan');
    expect(callOrder).toEqual(['redis', 'database']);
  });

  it('adds integer kopecks without losing precision', async () => {
    repository.findById.mockResolvedValue({ balance: '9007199254740993' });
    await service.changeBalance({
      userId: 'u1',
      amount: '7',
      transactionId: 't1',
      transactionType: TransactionType.DEPOSIT,
    });
    expect(repository.changeBalance).toHaveBeenCalledWith({
      userId: 'u1',
      balance: '9007199254741000',
    });
    expect(kafka.produce).toHaveBeenCalledWith({
      eventName: EventNameEnum.BalanceChanged,
      data: {
        transactionId: 't1',
        status: BalanceChangedStatus.COMPLETED,
        amount: '7',
        recipient: undefined,
      },
    });
  });

  it('withdraws funds and forwards transfer context after success', async () => {
    repository.findById.mockResolvedValue({ balance: '1000' });
    await service.changeBalance({
      userId: 'u1',
      amount: '300',
      transactionId: 't1',
      transactionType: TransactionType.WITHDRAWL,
      recipient: 'u2',
    });
    expect(repository.changeBalance).toHaveBeenCalledWith({
      userId: 'u1',
      balance: '700',
    });
    expect(kafka.produce).toHaveBeenCalledWith({
      eventName: EventNameEnum.BalanceChanged,
      data: {
        transactionId: 't1',
        status: BalanceChangedStatus.COMPLETED,
        amount: '300',
        recipient: 'u2',
      },
    });
  });

  it.each([
    ['insufficient funds', { balance: '50' }, '100', TransactionType.WITHDRAWL],
    ['missing user', null, '100', TransactionType.DEPOSIT],
    ['negative amount', { balance: '100' }, '-1', TransactionType.DEPOSIT],
    ['unsupported type', { balance: '100' }, '1', 'TRANSFER'],
  ])(
    'publishes FAILED for %s without changing balance',
    async (_name, user, amount, type) => {
      repository.findById.mockResolvedValue(user);
      await service.changeBalance({
        userId: 'u1',
        amount,
        transactionId: 't1',
        transactionType: type as TransactionType,
        recipient: 'u2',
      });
      expect(repository.changeBalance).not.toHaveBeenCalled();
      expect(kafka.produce).toHaveBeenCalledWith({
        eventName: EventNameEnum.BalanceChanged,
        data: {
          transactionId: 't1',
          status: BalanceChangedStatus.FAILED,
        },
      });
    },
  );

  it('publishes FAILED when the database update fails', async () => {
    repository.findById.mockResolvedValue({ balance: '100' });
    repository.changeBalance.mockRejectedValue(new Error('DB unavailable'));
    await service.changeBalance({
      userId: 'u1',
      amount: '10',
      transactionId: 't1',
      transactionType: TransactionType.DEPOSIT,
    });
    expect(kafka.produce).toHaveBeenCalledWith({
      eventName: EventNameEnum.BalanceChanged,
      data: {
        transactionId: 't1',
        status: BalanceChangedStatus.FAILED,
      },
    });
  });

  it('propagates a broker failure instead of reporting a DB failure after updating balance', async () => {
    repository.findById.mockResolvedValue({ balance: '100' });
    kafka.produce.mockRejectedValue(new Error('Broker unavailable'));
    await expect(
      service.changeBalance({
        userId: 'u1',
        amount: '10',
        transactionId: 't1',
        transactionType: TransactionType.DEPOSIT,
      }),
    ).rejects.toThrow('Broker unavailable');
    expect(kafka.produce).toHaveBeenCalledTimes(1);
  });

  it('should keep the database user when removing the Redis entry fails', async () => {
    repository.findById.mockResolvedValue({ userId: 'user-1', login: 'ivan' });
    redis.del.mockRejectedValue(new Error('Redis unavailable'));

    await expect(service.remove('user-1')).rejects.toThrow('Redis unavailable');

    expect(repository.deleteUser).not.toHaveBeenCalled();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ConflictException when user already exists', async () => {
    repository.checkExistUser.mockResolvedValue(true);

    await expect(
      service.create({
        login: 'ivan',
        phone: '+79001112233',
        firstName: 'Ivan',
        lastName: 'Ivanov',
        middleName: 'Ivanovich',
        email: 'ivan@example.com',
        password: 'StrongPassword123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should transform numeric filtering params into numbers', () => {
    const dto = plainToInstance(GetUserFilterDto, {
      userIds: ['1', '2'],
      phones: ['+79001112233'],
      take: '20',
      skip: '10',
    });

    expect(dto.take).toBe(20);
    expect(dto.skip).toBe(10);
    expect(typeof dto.take).toBe('number');
    expect(typeof dto.skip).toBe('number');
  });
});
