/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class UserRedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.USER_REDIS_HOST || 'localhost',
      port: Number(process.env.USER_REDIS_PORT) || 6378,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ── Profile Cache ─────────────────────────────
  async cacheProfile(userId: string, profile: any) {
    await this.client.set(
      `user:profile:${userId}`,
      JSON.stringify(profile),
      'EX',
      3600,
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
    await this.client.expire(key, 1800);
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

  async getMutualFriends(userId1: string, userId2: string): Promise<string[]> {
    return this.client.sinter(
      `user:followers:${userId1}`,
      `user:followers:${userId2}`,
    );
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
    pipeline.set(`user:lastseen:${userId}`, Date.now().toString(), 'EX', 86400);
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
    for (const id of userIds) pipeline.sismember('online:users', id);
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
      300,
    );
  }

  async getCachedSearch(query: string): Promise<any[] | null> {
    const data = await this.client.get(`search:users:${query.toLowerCase()}`);
    return data ? JSON.parse(data) : null;
  }

  // ── General Cache ─────────────────────────────
  async setCache(key: string, data: any, ttlsec = 3600) {
    await this.client.set(`cache:${key}`, JSON.stringify(data), 'EX', ttlsec);
  }

  async getCache<T>(key: string): Promise<T | null> {
    const data = await this.client.get(`cache:${key}`);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async invalidateCache(key: string) {
    await this.client.del(`cache:${key}`);
  }

  // ── E2EE Key Bundle Cache ─────────────────────
  async invalidateKeyBundle(userId: string) {
    // Invalidate all device variants
    const stream = this.client.scanStream({
      match: `cache:keybundle:${userId}:*`,
      count: 20,
    });
    const keys: string[] = [];
    for await (const batch of stream) {
      keys.push(...(batch as string[]));
    }
    if (keys.length > 0) await this.client.del(...keys);
  }

  // ── Device Socket Mapping ─────────────────────
  async setDeviceSocket(userId: string, deviceId: string, socketId: string) {
    await this.client.hset(`user:sockets:${userId}`, deviceId, socketId);
    await this.client.expire(`user:sockets:${userId}`, 86400);
  }

  async removeDeviceSocket(userId: string, deviceId: string) {
    await this.client.hdel(`user:sockets:${userId}`, deviceId);
  }

  async getUserSockets(userId: string): Promise<Record<string, string>> {
    return this.client.hgetall(`user:sockets:${userId}`);
  }
}
