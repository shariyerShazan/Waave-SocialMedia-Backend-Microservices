/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// redis/user-redis.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserRedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private config: ConfigService) {
    this.client = new Redis({
      host: process.env.USER_REDIS_HOST || 'localhost',
      port: Number(process.env.USER_REDIS_PORT) || 6378,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
  }

  // ── Profile Cache ─────────────────────────────
  async cacheProfile(userId: string, profile: any) {
    await this.client.set(
      `user:profile:${userId}`,
      JSON.stringify(profile),
      'EX',
      3600, // 1 hour
    );
  }

  async getCachedProfile(userId: string): Promise<any | null> {
    const data = await this.client.get(`user:profile:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async invalidateProfile(userId: string) {
    await this.client.del(`user:profile:${userId}`);
  }

  async cacheFollowerIds(userId: string, ids: string[]) {
    const key = `user:followers:${userId}`;
    if (ids.length === 0) {
      await this.client.del(key);
      return;
    }
    await this.client.del(key);
    await this.client.sadd(key, ...ids);
    await this.client.expire(key, 1800); // 30 min
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    return this.client.smembers(`user:followers:${userId}`);
  }

  async addFollower(userId: string, followerId: string) {
    await this.client.sadd(`user:followers:${userId}`, followerId);
  }

  async removeFollower(userId: string, followerId: string) {
    await this.client.srem(`user:followers:${userId}`, followerId);
  }

  // ── Mutual Friends Cache ──────────────────────
  async getMutualFriends(userId1: string, userId2: string): Promise<string[]> {
    const key1 = `user:followers:${userId1}`;
    const key2 = `user:followers:${userId2}`;
    return this.client.sinter(key1, key2);
  }

  // ── Online Presence ───────────────────────────
  async setOnline(userId: string) {
    const pipeline = this.client.pipeline();
    pipeline.sadd('online:users', userId);
    pipeline.set(`user:lastseen:${userId}`, Date.now().toString(), 'EX', 3600);
    await pipeline.exec();
  }

  async setOffline(userId: string) {
    const pipeline = this.client.pipeline();
    pipeline.srem('online:users', userId);
    pipeline.set(
      `user:lastseen:${userId}`,
      Date.now().toString(),
      'EX',
      86400, // 24 hours
    );
    await pipeline.exec();
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.client.sismember('online:users', userId)) === 1;
  }

  async getLastSeen(userId: string): Promise<number> {
    const val = await this.client.get(`user:lastseen:${userId}`);
    return parseInt(val || '0');
  }

  async getOnlineUsers(userIds: string[]): Promise<Set<string>> {
    if (!userIds.length) return new Set();
    const pipeline = this.client.pipeline();
    for (const id of userIds) {
      pipeline.sismember('online:users', id);
    }
    const results = await pipeline.exec();
    const online = new Set<string>();
    results?.forEach(([, val], i) => {
      if (val === 1) online.add(userIds[i]);
    });
    return online;
  }

  // ── Search Cache ──────────────────────────────
  async cacheSearch(query: string, results: any[]) {
    await this.client.set(
      `search:users:${query.toLowerCase()}`,
      JSON.stringify(results),
      'EX',
      300, // 5 min
    );
  }

  async getCachedSearch(query: string): Promise<any[] | null> {
    const data = await this.client.get(`search:users:${query.toLowerCase()}`);
    return data ? JSON.parse(data) : null;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
