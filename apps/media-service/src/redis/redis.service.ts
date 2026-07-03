import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class MediaRedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.MEDIA_REDIS_HOST || 'localhost',
      port: Number(process.env.MEDIA_REDIS_PORT) || 6376,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async setMedia(mediaId: string, data: any, ttl = 3600) {
    await this.client.set(`media:${mediaId}`, JSON.stringify(data), 'EX', ttl);
  }

  async getMedia<T>(mediaId: string): Promise<T | null> {
    const data = await this.client.get(`media:${mediaId}`);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as T;
  }

  async deleteMedia(mediaId: string) {
    await this.client.del(`media:${mediaId}`);
  }

  async deleteMany(mediaIds: string[]) {
    if (!mediaIds.length) return;

    const keys = mediaIds.map((id) => `media:${id}`);

    await this.client.del(...keys);
  }
}
