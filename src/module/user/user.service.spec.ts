import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';
import GetUserFilterDto from './dto/get-users-filter.dto.js';

describe('UserService', () => {
  let service: UserService;
  let repository: {
    checkExistUser: ReturnType<typeof vi.fn>;
    createUser: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    deleteUser: ReturnType<typeof vi.fn>;
  };
  let redis: { del: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repository = {
      checkExistUser: vi.fn(),
      createUser: vi.fn(),
      findById: vi.fn(),
      deleteUser: vi.fn(),
    };
    redis = { del: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: repository,
        },
        { provide: 'REDIS_TOKEN', useValue: redis },
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
