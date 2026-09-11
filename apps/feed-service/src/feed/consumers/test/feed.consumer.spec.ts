import { Test, TestingModule } from '@nestjs/testing';
import { FeedConsumer } from '../feed.consumer';
import { FeedService } from '../../feed.service';
import { FeedRedisService } from '../../../redis/redis.service';

describe('FeedConsumer', () => {
  let consumer: FeedConsumer;
  let mockFeedService: any;
  let mockRedisService: any;

  beforeEach(async () => {
    mockFeedService = {
      fanoutPost: jest.fn().mockResolvedValue(undefined),
      removePostFromFeeds: jest.fn().mockResolvedValue(undefined),
    };

    mockRedisService = {
      addToTrending: jest.fn().mockResolvedValue(undefined),
      clearFeed: jest.fn().mockResolvedValue(undefined),
      invalidateFeedPages: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedConsumer],
      providers: [
        { provide: FeedService, useValue: mockFeedService },
        { provide: FeedRedisService, useValue: mockRedisService },
      ],
    }).compile();

    consumer = module.get<FeedConsumer>(FeedConsumer);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handlePostCreated', () => {
    it('should fanout post and add to trending score', async () => {
      const data: any = { postId: 'p1', userId: 'u1', privacy: 'PUBLIC' };
      await consumer.handlePostCreated(data);

      expect(mockFeedService.fanoutPost).toHaveBeenCalledWith(
        'p1',
        'u1',
        'PUBLIC',
      );
      expect(mockRedisService.addToTrending).toHaveBeenCalledWith('p1', 1);
    });
  });

  describe('handlePostDeleted', () => {
    it('should remove post from feeds', async () => {
      const data: any = { postId: 'p1', userId: 'u1' };
      await consumer.handlePostDeleted(data);

      expect(mockFeedService.removePostFromFeeds).toHaveBeenCalledWith(
        'p1',
        'u1',
      );
    });
  });

  describe('handlePostLiked', () => {
    it('should add to trending score with weight 3', async () => {
      const data: any = { postId: 'p1', userId: 'u1', authorId: 'u2' };
      await consumer.handlePostLiked(data);

      expect(mockRedisService.addToTrending).toHaveBeenCalledWith('p1', 3);
    });
  });

  describe('handlePostCommented', () => {
    it('should add to trending score with weight 2', async () => {
      const data: any = { postId: 'p1', userId: 'u1', authorId: 'u2' };
      await consumer.handlePostCommented(data);

      expect(mockRedisService.addToTrending).toHaveBeenCalledWith('p1', 2);
    });
  });

  describe('handlePostShared', () => {
    it('should add to trending score with weight 5', async () => {
      const data: any = { postId: 'p1', userId: 'u1', authorId: 'u2' };
      await consumer.handlePostShared(data);

      expect(mockRedisService.addToTrending).toHaveBeenCalledWith('p1', 5);
    });
  });

  describe('handleUserFollowed', () => {
    it('should clear feed and invalidate pages for follower', async () => {
      const data: any = { followerId: 'u1', targetId: 'u2' };
      await consumer.handleUserFollowed(data);

      expect(mockRedisService.clearFeed).toHaveBeenCalledWith('u1');
      expect(mockRedisService.invalidateFeedPages).toHaveBeenCalledWith('u1');
    });
  });

  describe('handleUserUnfollowed', () => {
    it('should clear feed and invalidate pages for follower', async () => {
      const data: any = { followerId: 'u1', targetId: 'u2' };
      await consumer.handleUserUnfollowed(data);

      expect(mockRedisService.clearFeed).toHaveBeenCalledWith('u1');
      expect(mockRedisService.invalidateFeedPages).toHaveBeenCalledWith('u1');
    });
  });
});
