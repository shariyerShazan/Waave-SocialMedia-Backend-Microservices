import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';

import type {
  PostCreatedEvent,
  PostDeleteEvent,
  PostLikedEvent,
  PostCommentEvent,
  PostSharedEvent,
  UserFollowEvent,
  UserUnfollowEvent,
} from '@app/kafka/constants/events.type';

import { FeedService } from '../feed.service';
import { FeedRedisService } from '../../redis/redis.service';

@Controller()
export class FeedConsumer {
  private readonly logger = new Logger(FeedConsumer.name);

  constructor(
    private readonly feedService: FeedService,
    private readonly redis: FeedRedisService,
  ) {}

  @EventPattern(KAFKA_TOPICS.POST_CREATED)
  async handlePostCreated(@Payload() data: PostCreatedEvent) {
    this.logger.log(`Post Created: ${data.postId}`);

    await this.feedService.fanoutPost(data.postId, data.userId, data.privacy);

    await this.redis.addToTrending(data.postId, 1);
  }

  @EventPattern(KAFKA_TOPICS.POST_DELETED)
  async handlePostDeleted(@Payload() data: PostDeleteEvent) {
    this.logger.log(`Post Deleted: ${data.postId}`);

    await this.feedService.removePostFromFeeds(data.postId, data.userId);
  }

  @EventPattern(KAFKA_TOPICS.POST_LIKED)
  async handlePostLiked(@Payload() data: PostLikedEvent) {
    await this.redis.addToTrending(data.postId, 3);
  }

  @EventPattern(KAFKA_TOPICS.POST_COMMENTED)
  async handlePostCommented(@Payload() data: PostCommentEvent) {
    await this.redis.addToTrending(data.postId, 2);
  }

  @EventPattern(KAFKA_TOPICS.POST_SHARED)
  async handlePostShared(@Payload() data: PostSharedEvent) {
    await this.redis.addToTrending(data.postId, 5);
  }

  @EventPattern(KAFKA_TOPICS.USER_PROFILE_FOLLOWED)
  async handleUserFollowed(@Payload() data: UserFollowEvent) {
    this.logger.log(`${data.followerId} followed ${data.targetId}`);

    await this.redis.clearFeed(data.followerId);
    await this.redis.invalidateFeedPages(data.followerId);
  }

  @EventPattern(KAFKA_TOPICS.USER_PROFILE_UNFOLLOWED)
  async handleUserUnfollowed(@Payload() data: UserUnfollowEvent) {
    this.logger.log(`${data.followerId} unfollowed ${data.targetId}`);

    await this.redis.clearFeed(data.followerId);
    await this.redis.invalidateFeedPages(data.followerId);
  }
}
