import { Inject, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_TOKEN } from './redis.constant.js';

@Injectable()
class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS_TOKEN) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== 'end') {
      await this.redis.quit();
    }
  }
}

@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      useFactory: () =>
        new Redis({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
        }),
    },
    RedisLifecycle,
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
