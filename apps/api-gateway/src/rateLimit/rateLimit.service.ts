import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.API_GATEWAY_REDIS_HOST || 'localhost',
      port: Number(process.env.API_GATEWAY_REDIS_PORT) || 6377,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async consume(key: string, limit: number, window: number) {
    const total = await this.client.incr(key);

    if (total === 1) {
      await this.client.expire(key, window);
    }

    const ttl = await this.client.ttl(key);

    return {
      allowed: total <= limit,
      remaining: Math.max(limit - total, 0),
      reset: ttl,
    };
  }
}
