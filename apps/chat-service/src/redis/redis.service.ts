/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class ChatRedisService implements OnModuleDestroy {
  private publisher: Redis;
  private subscriber: Redis;
  private general: Redis;

  private messageHandlers: ((data: any) => void)[] = [];

  constructor() {
    const options = {
      host: process.env.CHAT_REDIS_HOST || 'localhost',
      port: Number(process.env.CHAT_REDIS_PORT) || 6372,
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
    this.subscriber.psubscribe('chat:*', (err) => {
      if (err) console.error('Subscribe error:', err);
    });

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      try {
        const data = JSON.parse(message);
        this.messageHandlers.forEach((handler) =>
          handler({
            channel,
            data,
          }),
        );
      } catch (err) {
        console.error('Parse error:', err);
      }
    });
  }

  onMessage(handler: (data: any) => void) {
    this.messageHandlers.push(handler);
  }

  // ── Publish ───────────────────────────────────
  async publish(channel: string, data: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(data));
  }

  // ── Online Presence ───────────────────────────
  async setUserOnline(userId: string, socketId: string) {
    const pipeline = this.general.pipeline();
    pipeline.hset('chat:online:users', userId, socketId);
    pipeline.set(`chat:lastseen:${userId}`, Date.now().toString(), 'EX', 86400);
    await pipeline.exec();

    // Broadcast online status
    await this.publish('chat:presence', {
      type: 'online',
      userId,
      socketId,
      timestamp: Date.now(),
    });
  }

  async setUserOffline(userId: string) {
    const pipeline = this.general.pipeline();
    pipeline.hdel('chat:online:users', userId);
    pipeline.set(`chat:lastseen:${userId}`, Date.now().toString(), 'EX', 86400);
    await pipeline.exec();

    await this.publish('chat:presence', {
      type: 'offline',
      userId,
      lastSeen: Date.now(),
      timestamp: Date.now(),
    });
  }

  async getUserSocketId(userId: string): Promise<string | null> {
    return this.general.hget('chat:online:users', userId);
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.general.hexists('chat:online:users', userId)) === 1;
  }

  async getOnlineUsers(userIds: string[]): Promise<Set<string>> {
    if (!userIds.length) return new Set();

    const pipeline = this.general.pipeline();
    for (const id of userIds) {
      pipeline.hexists('chat:online:users', id);
    }

    const results = await pipeline.exec();
    const online = new Set<string>();
    results?.forEach(([, val], i) => {
      if (val === 1) online.add(userIds[i]);
    });
    return online;
  }

  async getLastSeen(userId: string): Promise<number> {
    const val = await this.general.get(`chat:lastseen:${userId}`);
    return parseInt(val || '0');
  }

  // ── Typing Indicator ──────────────────────────
  async setTyping(conversationId: string, userId: string, userName: string) {
    // 3 সেকেন্ড পর auto expire
    await this.general.set(
      `chat:typing:${conversationId}:${userId}`,
      userName,
      'EX',
      3,
    );

    await this.publish(`chat:conversation:${conversationId}`, {
      type: 'typing_start',
      userId,
      userName,
      conversationId,
    });
  }

  async clearTyping(conversationId: string, userId: string) {
    await this.general.del(`chat:typing:${conversationId}:${userId}`);

    await this.publish(`chat:conversation:${conversationId}`, {
      type: 'typing_stop',
      userId,
      conversationId,
    });
  }

  async getTypingUsers(conversationId: string): Promise<string[]> {
    const stream = this.general.scanStream({
      match: `chat:typing:${conversationId}:*`,
      count: 100,
    });

    const keys: string[] = [];
    for await (const batch of stream) {
      keys.push(...batch);
    }

    if (!keys.length) return [];

    const pipeline = this.general.pipeline();
    for (const key of keys) {
      pipeline.get(key);
    }

    const results = await pipeline.exec();
    return results?.map(([, val]) => val as string).filter(Boolean) || [];
  }

  // ── Message Cache ─────────────────────────────
  async cacheRecentMessages(conversationId: string, messages: any[]) {
    await this.general.set(
      `chat:messages:${conversationId}`,
      JSON.stringify(messages),
      'EX',
      300, // 5 min
    );
  }

  async getRecentMessages(conversationId: string): Promise<any[] | null> {
    const data = await this.general.get(`chat:messages:${conversationId}`);
    return data ? JSON.parse(data) : null;
  }

  async invalidateMessageCache(conversationId: string) {
    await this.general.del(`chat:messages:${conversationId}`);
  }

  // ── Unread Count Cache ────────────────────────
  async getUnreadCount(
    userId: string,
    conversationId: string,
  ): Promise<number> {
    const val = await this.general.get(
      `chat:unread:${userId}:${conversationId}`,
    );
    return parseInt(val || '0');
  }

  async setUnreadCount(userId: string, conversationId: string, count: number) {
    await this.general.set(
      `chat:unread:${userId}:${conversationId}`,
      count.toString(),
      'EX',
      86400,
    );
  }

  async clearUnread(userId: string, conversationId: string) {
    await this.general.del(`chat:unread:${userId}:${conversationId}`);
  }
}
