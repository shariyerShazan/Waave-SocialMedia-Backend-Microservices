/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// redis/user-redis.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const FEED_MAX_SIZE = 1000;
const FEED_TTL = 86400;
const CELEBRITY_LIMIT = 10_000;

@Injectable()
export class FeedRedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.FEED_REDIS_HOST || 'localhost',
      port: Number(process.env.FEED_REDIS_PORT) || 6373,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async pushToFeed(userId: string, postId: string): Promise<void> {
    const key = `feed:${userId}`;
    const pipeline = this.client.pipeline();

    pipeline.lpush(key, postId);
    pipeline.ltrim(key, 0, FEED_MAX_SIZE - 1); // max 1000
    pipeline.expire(key, FEED_TTL);

    await pipeline.exec();
  }

  // Batch push — fanout এ ব্যবহার
  async batchPushToFeeds(userIds: string[], postId: string): Promise<void> {
    if (!userIds.length) return;

    // Chunk করো — খুব বড় pipeline avoid করতে
    const chunkSize = 500;
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      const pipeline = this.client.pipeline();

      for (const userId of chunk) {
        const key = `feed:${userId}`;
        pipeline.lpush(key, postId);
        pipeline.ltrim(key, 0, FEED_MAX_SIZE - 1);
        pipeline.expire(key, FEED_TTL);
      }

      await pipeline.exec();
    }
  }

  // Feed থেকে post remove করো (post delete হলে)
  async removeFromFeed(userId: string, postId: string): Promise<void> {
    await this.client.lrem(`feed:${userId}`, 0, postId);
  }

  // Batch remove from feeds
  async batchRemoveFromFeeds(userIds: string[], postId: string): Promise<void> {
    const pipeline = this.client.pipeline();
    for (const userId of userIds) {
      pipeline.lrem(`feed:${userId}`, 0, postId);
    }
    await pipeline.exec();
  }

  // ── Feed Read ─────────────────────────────────

  // Page-based read
  async getFeedPage(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ postIds: string[]; total: number }> {
    const key = `feed:${userId}`;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [postIds, total] = await Promise.all([
      this.client.lrange(key, start, end),
      this.client.llen(key),
    ]);

    return { postIds, total };
  }

  // Cursor-based read (infinite scroll)
  async getFeedByCursor(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ postIds: string[]; nextCursor: string | null }> {
    const key = `feed:${userId}`;

    let start = 0;
    if (cursor) {
      // Cursor = last postId এর index
      const idx = await this.getFeedIndex(userId, cursor);
      start = idx !== -1 ? idx + 1 : 0;
    }

    const postIds = await this.client.lrange(key, start, start + limit - 1);
    const total = await this.client.llen(key);

    const nextCursor =
      start + limit < total ? postIds[postIds.length - 1] : null;

    return { postIds, nextCursor };
  }

  private async getFeedIndex(userId: string, postId: string): Promise<number> {
    const feed = await this.client.lrange(`feed:${userId}`, 0, -1);
    return feed.indexOf(postId);
  }

  // Feed এ কতো post আছে
  async getFeedLength(userId: string): Promise<number> {
    return this.client.llen(`feed:${userId}`);
  }

  // Feed আছে কিনা (cold start check)
  async feedExists(userId: string): Promise<boolean> {
    return (await this.client.exists(`feed:${userId}`)) === 1;
  }

  // Feed clear করো (invalidate)
  async clearFeed(userId: string): Promise<void> {
    await this.client.del(`feed:${userId}`);
  }

  // ── Celebrity Posts ───────────────────────────
  // Celebrity user দের posts আলাদা রাখো
  // Feed read এর সময় merge করো

  async addCelebrityPost(authorId: string, postId: string): Promise<void> {
    const key = `celebrity:posts:${authorId}`;
    await this.client.lpush(key, postId);
    await this.client.ltrim(key, 0, 99); // max 100 posts
    await this.client.expire(key, FEED_TTL);
  }

  async getCelebrityPosts(authorId: string): Promise<string[]> {
    return this.client.lrange(`celebrity:posts:${authorId}`, 0, 19);
  }

  // User যাদের follow করে তাদের celebrity posts
  async getMergedCelebrityPosts(
    celebIds: string[],
    limit: number,
  ): Promise<string[]> {
    if (!celebIds.length) return [];

    const pipeline = this.client.pipeline();
    for (const id of celebIds) {
      pipeline.lrange(`celebrity:posts:${id}`, 0, 9);
    }

    const results = await pipeline.exec();
    const allPosts: string[] = [];

    results?.forEach(([, posts]) => {
      if (Array.isArray(posts)) allPosts.push(...posts);
    });

    // Shuffle করো (random order)
    return allPosts.sort(() => Math.random() - 0.5).slice(0, limit);
  }

  // ── Trending ──────────────────────────────────
  async getTrendingPostIds(limit: number): Promise<string[]> {
    return this.client.zrevrange('trending:posts:global', 0, limit - 1);
  }

  // ── Celebrity Check ───────────────────────────
  async isCelebrity(userId: string): Promise<boolean> {
    const count = await this.client.get(`user:followerCount:${userId}`);
    return parseInt(count || '0') >= CELEBRITY_LIMIT;
  }

  async setFollowerCount(userId: string, count: number): Promise<void> {
    await this.client.set(
      `user:followerCount:${userId}`,
      count.toString(),
      'EX',
      3600,
    );
  }

  // ── Feed Cache (full page cache) ──────────────
  async cacheFeedPage(
    userId: string,
    page: number,
    data: any[],
  ): Promise<void> {
    await this.client.set(
      `feed:page:${userId}:${page}`,
      JSON.stringify(data),
      'EX',
      300, // 5 min
    );
  }

  async getCachedFeedPage(userId: string, page: number): Promise<any[] | null> {
    const data = await this.client.get(`feed:page:${userId}:${page}`);
    return data ? JSON.parse(data) : null;
  }

  async invalidateFeedPages(userId: string): Promise<void> {
    const stream = this.client.scanStream({
      match: `feed:page:${userId}:*`,
      count: 100,
    });

    stream.on('data', async (keys: string[]) => {
      if (keys.length) await this.client.del(...keys);
    });
  }
}
