/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// redis/user-redis.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class PostRedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.POST_REDIS_HOST || 'localhost',
      port: Number(process.env.POST_REDIS_PORT) || 6374,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
  }

  async cachePost(postId: string, post: any) {
    await this.client.set(
      `post:${postId}`,
      JSON.stringify(post),
      'EX',
      1800, // 30 min
    );
  }

  async getCachedPost(postId: string): Promise<any | null> {
    const data = await this.client.get(`post:${postId}`);
    return data ? JSON.parse(data) : null;
  }

  async invalidatePost(postId: string) {
    await this.client.del(`post:${postId}`);
  }

  async incrementLike(postId: string): Promise<number> {
    const key = `post:${postId}:likes`;
    const count = await this.client.incr(key);
    await this.client.expire(key, 3600);
    await this.markDirty('likes', postId);
    return count;
  }

  async decrementLike(postId: string): Promise<number> {
    const key = `post:${postId}:likes`;
    const count = await this.client.decr(key);
    await this.client.expire(key, 3600);
    await this.markDirty('likes', postId);
    return Math.max(0, count);
  }

  async initLikeCount(postId: string, count: number) {
    const key = `post:${postId}:likes`;
    const exists = await this.client.exists(key);
    if (!exists) {
      await this.client.set(key, count, 'EX', 3600);
    }
  }

  async getLikeCount(postId: string): Promise<number | null> {
    const val = await this.client.get(`post:${postId}:likes`);
    return val !== null ? parseInt(val) : null;
  }

  async incrementView(postId: string, userId: string): Promise<number> {
    const viewKey = `post:${postId}:viewed:${userId}`;
    const alreadySeen = await this.client.exists(viewKey);

    if (alreadySeen) return 0;
    await this.client.set(viewKey, '1', 'EX', 3600);

    const countKey = `post:${postId}:views`;
    const count = await this.client.incr(countKey);
    await this.client.expire(countKey, 3600);
    await this.markDirty('views', postId);

    return count;
  }

  async addToTrending(postId: string, score: number) {
    await this.client.zincrby('trending:posts:global', score, postId);
    await this.client.expire('trending:posts:global', 86400);
  }

  async getTrending(limit = 20): Promise<string[]> {
    return this.client.zrevrange('trending:posts:global', 0, limit - 1);
  }

  private async markDirty(type: string, postId: string) {
    await this.client.sadd(`dirty:posts:${type}`, postId);
  }

  async getDirtyPostIds(type: string): Promise<string[]> {
    return this.client.smembers(`dirty:posts:${type}`);
  }

  async clearDirty(type: string) {
    await this.client.del(`dirty:posts:${type}`);
  }

  async userLikedPost(userId: string, postId: string): Promise<boolean> {
    return (await this.client.sismember(`user:${userId}:liked`, postId)) === 1;
  }

  async addUserLike(userId: string, postId: string) {
    await this.client.sadd(`user:${userId}:liked`, postId);
    await this.client.expire(`user:${userId}:liked`, 86400);
  }

  async removeUserLike(userId: string, postId: string) {
    await this.client.srem(`user:${userId}:liked`, postId);
  }

  async getUserLikedSet(
    userId: string,
    postIds: string[],
  ): Promise<Set<string>> {
    if (!postIds.length) return new Set();
    const pipeline = this.client.pipeline();
    for (const id of postIds) {
      pipeline.sismember(`user:${userId}:liked`, id);
    }
    const results = await pipeline.exec();
    const liked = new Set<string>();
    results?.forEach(([, val], i) => {
      if (val === 1) liked.add(postIds[i]);
    });
    return liked;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
