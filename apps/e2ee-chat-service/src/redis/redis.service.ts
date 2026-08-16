/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface E2eeRedisMessage {
  channel: string;
  data: Record<string, unknown>;
}

@Injectable()
export class E2eeChatRedisService implements OnModuleDestroy {
  private publisher: Redis;
  private subscriber: Redis;
  private general: Redis;

  private messageHandlers: ((payload: E2eeRedisMessage) => void)[] = [];

  constructor() {
    const options = {
      host: process.env.E2EE_CHAT_REDIS_HOST || 'localhost',
      port: Number(process.env.E2EE_CHAT_REDIS_PORT) || 6371,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    };

    this.publisher = new Redis(options);
    this.subscriber = new Redis(options);
    this.general = new Redis(options);

    this.setupSubscriber();
  }

  async onModuleDestroy() {
    await Promise.all([
      this.publisher.quit(),
      this.subscriber.quit(),
      this.general.quit(),
    ]);
  }

  private setupSubscriber() {
    this.subscriber.psubscribe('e2ee:*', (err) => {
      if (err) console.error('E2EE Redis subscribe error:', err);
    });

    this.subscriber.on('pmessage', (_pattern, channel, message) => {
      try {
        const data = JSON.parse(message) as Record<string, unknown>;
        this.messageHandlers.forEach((handler) => handler({ channel, data }));
      } catch (err) {
        console.error('E2EE Redis parse error:', err);
      }
    });
  }

  onMessage(handler: (payload: E2eeRedisMessage) => void) {
    this.messageHandlers.push(handler);
  }

  async publish(channel: string, data: Record<string, unknown>): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(data));
  }

  // ── Multi-device presence ─────────────────────
  private deviceOnlineKey(userId: string, deviceId: string) {
    return `e2ee:online:${userId}:${deviceId}`;
  }

  private userDevicesKey(userId: string) {
    return `e2ee:user:devices:${userId}`;
  }

  private socketKey(userId: string, deviceId: string) {
    return `e2ee:socket:user:${userId}:device:${deviceId}`;
  }

  async setDeviceOnline(
    userId: string,
    deviceId: string,
    socketId: string,
  ): Promise<void> {
    const pipeline = this.general.pipeline();
    pipeline.set(this.deviceOnlineKey(userId, deviceId), socketId, 'EX', 86400);
    pipeline.set(this.socketKey(userId, deviceId), socketId, 'EX', 86400);
    pipeline.sadd(this.userDevicesKey(userId), deviceId);
    pipeline.set(`e2ee:lastseen:${userId}`, Date.now().toString(), 'EX', 86400);
    await pipeline.exec();

    await this.publish('e2ee:presence', {
      type: 'device_online',
      userId,
      deviceId,
      socketId,
      timestamp: Date.now(),
    });
  }

  async setDeviceOffline(userId: string, deviceId: string): Promise<void> {
    const pipeline = this.general.pipeline();
    pipeline.del(this.deviceOnlineKey(userId, deviceId));
    pipeline.del(this.socketKey(userId, deviceId));
    pipeline.srem(this.userDevicesKey(userId), deviceId);
    pipeline.set(`e2ee:lastseen:${userId}`, Date.now().toString(), 'EX', 86400);
    await pipeline.exec();

    const remaining = await this.general.scard(this.userDevicesKey(userId));
    if (remaining === 0) {
      await this.general.del(this.userDevicesKey(userId));
    }

    await this.publish('e2ee:presence', {
      type: 'device_offline',
      userId,
      deviceId,
      lastSeen: Date.now(),
      timestamp: Date.now(),
    });
  }

  async getOnlineDevices(userId: string): Promise<string[]> {
    const deviceIds = await this.general.smembers(this.userDevicesKey(userId));
    if (!deviceIds.length) return [];

    const pipeline = this.general.pipeline();
    for (const deviceId of deviceIds) {
      pipeline.exists(this.deviceOnlineKey(userId, deviceId));
    }
    const results = await pipeline.exec();

    const online: string[] = [];
    results?.forEach(([, exists], i) => {
      if (exists === 1) online.push(deviceIds[i]);
    });
    return online;
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const devices = await this.getOnlineDevices(userId);
    return devices.length > 0;
  }

  async getDeviceSocketId(
    userId: string,
    deviceId: string,
  ): Promise<string | null> {
    return this.general.get(this.socketKey(userId, deviceId));
  }

  async getOnlineUsers(userIds: string[]): Promise<Set<string>> {
    if (!userIds.length) return new Set();

    const pipeline = this.general.pipeline();
    for (const id of userIds) {
      pipeline.scard(this.userDevicesKey(id));
    }
    const results = await pipeline.exec();
    const online = new Set<string>();

    await Promise.all(
      userIds.map(async (id, i) => {
        const count = results?.[i]?.[1] as number;
        if (count > 0 && (await this.isUserOnline(id))) {
          online.add(id);
        }
      }),
    );

    return online;
  }

  // ── Typing ────────────────────────────────────
  async setTyping(conversationId: string, userId: string, deviceId: string) {
    await this.general.set(
      `e2ee:typing:${conversationId}:${userId}:${deviceId}`,
      '1',
      'EX',
      3,
    );

    await this.publish(`e2ee:conversation:${conversationId}`, {
      type: 'typing_start',
      userId,
      deviceId,
      conversationId,
    });
  }

  async clearTyping(conversationId: string, userId: string, deviceId: string) {
    await this.general.del(
      `e2ee:typing:${conversationId}:${userId}:${deviceId}`,
    );

    await this.publish(`e2ee:conversation:${conversationId}`, {
      type: 'typing_stop',
      userId,
      deviceId,
      conversationId,
    });
  }

  // ── Unread counts ─────────────────────────────
  async getUnreadCount(
    userId: string,
    conversationId: string,
  ): Promise<number> {
    const val = await this.general.get(
      `e2ee:unread:${userId}:${conversationId}`,
    );
    return parseInt(val || '0', 10);
  }

  async setUnreadCount(userId: string, conversationId: string, count: number) {
    await this.general.set(
      `e2ee:unread:${userId}:${conversationId}`,
      count.toString(),
      'EX',
      86400,
    );
  }

  async incrUnread(userId: string, conversationId: string, by = 1) {
    const key = `e2ee:unread:${userId}:${conversationId}`;
    await this.general.incrby(key, by);
    await this.general.expire(key, 86400);
  }

  async clearUnread(userId: string, conversationId: string) {
    await this.general.del(`e2ee:unread:${userId}:${conversationId}`);
  }

  // ── Message cache ─────────────────────────────
  async cacheRecentMessages(
    conversationId: string,
    userId: string,
    deviceId: string,
    messages: unknown[],
  ) {
    await this.general.set(
      `e2ee:messages:${conversationId}:${userId}:${deviceId}`,
      JSON.stringify(messages),
      'EX',
      300,
    );
  }

  async getRecentMessages(
    conversationId: string,
    userId: string,
    deviceId: string,
  ): Promise<unknown[] | null> {
    const data = await this.general.get(
      `e2ee:messages:${conversationId}:${userId}:${deviceId}`,
    );
    return data ? JSON.parse(data) : null;
  }

  async invalidateMessageCache(conversationId: string) {
    const stream = this.general.scanStream({
      match: `e2ee:messages:${conversationId}:*`,
      count: 100,
    });

    const keys: string[] = [];
    for await (const batch of stream) {
      keys.push(...batch);
    }

    if (keys.length) {
      await this.general.del(...keys);
    }
  }

  // ── Rate limit ────────────────────────────────
  async checkRateLimit(
    key: string,
    limit: number,
    windowSec: number,
  ): Promise<boolean> {
    const redisKey = `e2ee:ratelimit:${key}`;
    const current = await this.general.incr(redisKey);
    if (current === 1) {
      await this.general.expire(redisKey, windowSec);
    }
    return current <= limit;
  }

  private groupNotifMembersKey(conversationId: string) {
    return `e2ee:group:notif:members:${conversationId}`;
  }

  async getGroupNotifMembers(conversationId: string): Promise<any> {
    const data = await this.general.get(
      this.groupNotifMembersKey(conversationId),
    );

    return data ? JSON.parse(data) : null;
  }

  async setGroupNotifMembers(
    conversationId: string,
    data: unknown,
    ttl = 60,
  ): Promise<void> {
    await this.general.set(
      this.groupNotifMembersKey(conversationId),
      JSON.stringify(data),
      'EX',
      ttl,
    );
  }

  async invalidateGroupNotifMembers(conversationId: string): Promise<void> {
    await this.general.del(this.groupNotifMembersKey(conversationId));
  }
}
