import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class ChatRedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.CHAT_REDIS_HOST || 'localhost',
      port: Number(process.env.CHAT_REDIS_PORT) || 6372,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
