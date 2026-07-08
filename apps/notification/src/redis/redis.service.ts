/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class NotificationRedisService implements OnModuleDestroy {
  private client: Redis;
  private publisher: Redis;
  private subscriber: Redis;
  private readonly socketHandlers: Array<
    (data: { userId: string; notification: unknown }) => void
  > = [];

  constructor() {
    const opts = {
      host: process.env.NOTIFICATION_REDIS_HOST || 'localhost',
      port: Number(process.env.NOTIFICATION_REDIS_PORT) || 6375,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    };

    this.client = new Redis(opts);
    this.publisher = new Redis(opts);
    this.subscriber = new Redis(opts);
    this.setupSubscriber();
  }

  private setupSubscriber() {
    this.subscriber.subscribe('notifications:push');
    this.subscriber.on('message', (channel, raw) => {
      try {
        const data = JSON.parse(raw);
        this.socketHandlers.forEach((h) => h(data));
      } catch {}
    });
  }

  onPushNotification(handler: (data: any) => void) {
    this.socketHandlers.push(handler);
  }

  // ── Unread Count ──────────────────────────────
  async incrementUnread(userId: string): Promise<number> {
    const key = `notif:unread:${userId}`;
    const count = await this.client.incr(key);
    await this.client.expire(key, 86400);
    return count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const val = await this.client.get(`notif:unread:${userId}`);
    return parseInt(val || '0');
  }

  async resetUnreadCount(userId: string): Promise<void> {
    await this.client.del(`notif:unread:${userId}`);
  }

  async decrementUnread(userId: string): Promise<void> {
    const key = `notif:unread:${userId}`;
    const count = await this.client.decr(key);
    if (count < 0) await this.client.set(key, '0');
  }

  // ── Publish to Socket ─────────────────────────
  async publishToSocket(userId: string, notification: any) {
    await this.publisher.publish(
      'notifications:push',
      JSON.stringify({ userId, notification }),
    );
  }

  // ── Deduplication ─────────────────────────────
  async isDuplicate(
    userId: string,
    type: string,
    refId: string,
  ): Promise<boolean> {
    const key = `notif:dedup:${userId}:${type}:${refId}`;
    const exists = await this.client.exists(key);
    if (!exists) {
      await this.client.set(key, '1', 'EX', 3600); // 1 hour
    }
    return exists === 1;
  }

  // ── Socket ID store ───────────────────────────
  async setUserSocket(userId: string, socketId: string) {
    await this.client.set(`notif:socket:${userId}`, socketId, 'EX', 86400);
  }

  async getUserSocket(userId: string): Promise<string | null> {
    return this.client.get(`notif:socket:${userId}`);
  }

  async removeUserSocket(userId: string) {
    await this.client.del(`notif:socket:${userId}`);
  }

  async onModuleDestroy() {
    await Promise.all([
      this.client.quit(),
      this.publisher.quit(),
      this.subscriber.quit(),
    ]);
  }
}
