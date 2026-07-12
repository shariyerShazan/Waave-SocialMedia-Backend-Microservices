/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// feed/feed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PostGrpcClient } from './clients/post-grpc.client';
import { UserGrpcClient } from './clients/user-grpc.client';
import { FeedRedisService } from '../redis/redis.service';
import { FeedEnrichmentService } from './enrich/enrichment.service';

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly redis: FeedRedisService,
    private readonly postClient: PostGrpcClient,
    private readonly userClient: UserGrpcClient,
    private readonly enrichment: FeedEnrichmentService,
  ) {}

  // ── Get Feed ──────────────────────────────────
  async getFeed(userId: string, page: number, limit: number, cursor?: string) {
    if (!cursor && page === 1) {
      const cached = await this.redis.getCachedFeedPage(userId, page);
      if (cached?.length) {
        this.logger.debug(`Feed cache HIT for ${userId}`);
        return {
          success: true,
          posts: cached,
          total: cached.length,
          nextCursor: cached[cached.length - 1]?.id || null,
          hasMore: cached.length === limit,
        };
      }
    }

    const feedExists = await this.redis.feedExists(userId);
    if (!feedExists) {
      await this.buildFeedFromScratch(userId);
    }

    let postIds: string[];
    let nextCursor: string | null = null;

    if (cursor) {
      const result = await this.redis.getFeedByCursor(userId, cursor, limit);
      postIds = result.postIds;
      nextCursor = result.nextCursor;
    } else {
      const result = await this.redis.getFeedPage(userId, page, limit);
      postIds = result.postIds;
    }

    if (!postIds.length) {
      return {
        success: true,
        posts: [],
        total: 0,
        nextCursor: null,
        hasMore: false,
      };
    }

    const followingIds = await this.userClient.getFollowingIds(userId);
    const celebPosts = await this.getCelebrityPostIds(followingIds);

    const allPostIds = this.mergeAndDedupe(postIds, celebPosts, limit);

    const postsResult = await this.postClient.getPostsByIds(allPostIds, userId);

    if (!postsResult?.posts?.length) {
      return {
        success: true,
        posts: [],
        total: 0,
        nextCursor: null,
        hasMore: false,
      };
    }
    const enriched = await this.enrichment.enrichPosts(postsResult.posts);

    if (page === 1 && !cursor) {
      await this.redis.cacheFeedPage(userId, page, enriched);
    }

    return {
      success: true,
      posts: enriched,
      total: enriched.length,
      nextCursor: nextCursor || enriched[enriched.length - 1]?.id || null,
      hasMore: allPostIds.length === limit,
    };
  }

  // ── Fanout — Post Created ─────────────────────
  async fanoutPost(
    postId: string,
    authorId: string,
    privacy: string,
  ): Promise<void> {
    this.logger.log(`Fanning out post ${postId} by ${authorId}`);

    const isCeleb = await this.redis.isCelebrity(authorId);

    if (isCeleb) {
      await this.redis.addCelebrityPost(authorId, postId);
      this.logger.log(`Celebrity fanout: post ${postId} → celebrity list`);
      return;
    }

    const followerIds = await this.userClient.getFollowerIds(authorId);

    if (!followerIds.length) {
      this.logger.debug(`No followers for ${authorId}`);
      return;
    }

    let targetIds = followerIds;
    if (privacy === 'PRIVATE') {
      targetIds = [];
    }

    await this.redis.batchPushToFeeds(targetIds, postId);

    await this.redis.pushToFeed(authorId, postId);

    await this.invalidateFeedCaches(targetIds);

    this.logger.log(`Fanned out post ${postId} to ${targetIds.length} feeds`);
  }

  // ── Remove Post from Feeds ────────────────────
  async removePostFromFeeds(postId: string, authorId: string): Promise<void> {
    const followerIds = await this.userClient.getFollowerIds(authorId);
    const allIds = [...followerIds, authorId];

    await this.redis.batchRemoveFromFeeds(allIds, postId);
    this.logger.log(`Removed post ${postId} from ${allIds.length} feeds`);
  }

  // ── Build Feed from Scratch (Cold Start) ──────
  private async buildFeedFromScratch(userId: string): Promise<void> {
    this.logger.log(`Building feed from scratch for ${userId}`);

    const followingIds = await this.userClient.getFollowingIds(userId);

    if (!followingIds.length) return;

    // const recentPostIds: string[] = [];
    const chunkSize = 10;
    for (let i = 0; i < followingIds.length; i += chunkSize) {
      const chunk = followingIds.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (followId) => {
          try {
            const result = await this.postClient.getPostsByIds([], userId);
          } catch (err: any) {
            console.log(err);
          }
        }),
      );
    }

    const trending = await this.redis.getTrendingPostIds(50);
    if (trending.length) {
      await this.redis.batchPushToFeeds([userId], trending[0]);
    }
  }

  // ── Explore Feed ──────────────────────────────
  async getExploreFeed(userId: string, page: number, limit: number) {
    const trendingIds = await this.redis.getTrendingPostIds(limit * 2);

    if (!trendingIds.length) {
      return {
        success: true,
        posts: [],
        total: 0,
        nextCursor: null,
        hasMore: false,
      };
    }

    const start = (page - 1) * limit;
    const pageIds = trendingIds.slice(start, start + limit);

    const postsResult = await this.postClient.getPostsByIds(pageIds, userId);

    const enriched = await this.enrichment.enrichPosts(
      postsResult?.posts || [],
    );

    return {
      success: true,
      posts: enriched,
      total: trendingIds.length,
      nextCursor: null,
      hasMore: start + limit < trendingIds.length,
    };
  }

  // ── Trending ──────────────────────────────────
  async getTrendingPosts(limit: number) {
    const postIds = await this.redis.getTrendingPostIds(limit);

    if (!postIds.length) {
      return {
        success: true,
        posts: [],
        total: 0,
        nextCursor: null,
        hasMore: false,
      };
    }

    const postsResult = await this.postClient.getPostsByIds(postIds, '');

    const enriched = await this.enrichment.enrichPosts(
      postsResult?.posts || [],
    );

    return {
      success: true,
      posts: enriched,
      total: enriched.length,
      nextCursor: null,
      hasMore: false,
    };
  }

  // ── Celebrity Posts Merge ─────────────────────
  private async getCelebrityPostIds(followingIds: string[]): Promise<string[]> {
    if (!followingIds.length) return [];

    const results = await Promise.all(
      followingIds.map(async (id) => ({
        id,
        celeb: await this.redis.isCelebrity(id),
      })),
    );

    const celebIds = results.filter((r) => r.celeb).map((r) => r.id);

    return this.redis.getMergedCelebrityPosts(celebIds, 10);
  }

  // ── Merge + Dedupe ────────────────────────────
  private mergeAndDedupe(
    feedPosts: string[],
    celebPosts: string[],
    limit: number,
  ): string[] {
    const seen = new Set<string>();
    const merged: string[] = [];

    let ci = 0;
    for (const postId of feedPosts) {
      if (merged.length >= limit) break;

      if (ci < celebPosts.length && merged.length % 5 === 4) {
        const celebPost = celebPosts[ci++];
        if (!seen.has(celebPost)) {
          seen.add(celebPost);
          merged.push(celebPost);
        }
      }

      if (!seen.has(postId)) {
        seen.add(postId);
        merged.push(postId);
      }
    }

    return merged;
  }

  private async invalidateFeedCaches(userIds: string[]): Promise<void> {
    const sample = userIds.slice(0, 100);
    await Promise.all(sample.map((id) => this.redis.invalidateFeedPages(id)));
  }
}
