// feed/feed.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { FeedService } from './feed.service';
import { FeedRedisService } from '../redis/redis.service';

@Controller()
export class FeedGrpcController {
  constructor(
    private feedService: FeedService,
    private redis: FeedRedisService,
  ) { }

  @GrpcMethod('FeedService', 'GetFeed')
  getFeed(data: {
    userId: string;
    page: number;
    limit: number;
    cursor: string;
  }) {
    return this.feedService.getFeed(
      data.userId,
      data.page || 1,
      data.limit || 20,
      data.cursor || undefined,
    );
  }

  @GrpcMethod('FeedService', 'GetExploreFeed')
  getExploreFeed(data: { userId: string; page: number; limit: number }) {
    return this.feedService.getExploreFeed(
      data.userId,
      data.page || 1,
      data.limit || 20,
    );
  }

  @GrpcMethod('FeedService', 'GetTrendingPosts')
  getTrendingPosts(data: { limit: number }) {
    return this.feedService.getTrendingPosts(data.limit || 20);
  }

  @GrpcMethod('FeedService', 'InvalidateFeed')
  async invalidateFeed(data: { userId: string }) {
    await this.redis.clearFeed(data.userId);
    await this.redis.invalidateFeedPages(data.userId);
    return { success: true };
  }
}
