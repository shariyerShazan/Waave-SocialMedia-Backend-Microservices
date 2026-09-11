import { Test, TestingModule } from '@nestjs/testing';
import { FeedGrpcController } from '../feed.grpc.controller';
import { FeedService } from '../feed.service';
import { FeedRedisService } from '../../redis/redis.service';

describe('FeedGrpcController', () => {
  let controller: FeedGrpcController;
  let mockFeedService: any;
  let mockRedisService: any;

  beforeEach(async () => {
    mockFeedService = {
      getFeed: jest.fn().mockResolvedValue({ success: true, posts: [] }),
      getExploreFeed: jest.fn().mockResolvedValue({ success: true, posts: [] }),
      getTrendingPosts: jest
        .fn()
        .mockResolvedValue({ success: true, posts: [] }),
    };

    mockRedisService = {
      clearFeed: jest.fn().mockResolvedValue(undefined),
      invalidateFeedPages: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedGrpcController],
      providers: [
        { provide: FeedService, useValue: mockFeedService },
        { provide: FeedRedisService, useValue: mockRedisService },
      ],
    }).compile();

    controller = module.get<FeedGrpcController>(FeedGrpcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFeed', () => {
    it('should delegate to feedService.getFeed with fallback pagination parameters', async () => {
      await controller.getFeed({
        userId: 'u1',
        page: 0,
        limit: 0,
        cursor: '',
      });

      expect(mockFeedService.getFeed).toHaveBeenCalledWith(
        'u1',
        1,
        20,
        undefined,
      );
    });

    it('should pass provided page, limit, and cursor parameters', async () => {
      await controller.getFeed({
        userId: 'u1',
        page: 2,
        limit: 15,
        cursor: 'cursor-123',
      });

      expect(mockFeedService.getFeed).toHaveBeenCalledWith(
        'u1',
        2,
        15,
        'cursor-123',
      );
    });
  });

  describe('getExploreFeed', () => {
    it('should delegate to feedService.getExploreFeed', async () => {
      await controller.getExploreFeed({ userId: 'u1', page: 1, limit: 10 });

      expect(mockFeedService.getExploreFeed).toHaveBeenCalledWith('u1', 1, 10);
    });
  });

  describe('getTrendingPosts', () => {
    it('should delegate to feedService.getTrendingPosts', async () => {
      await controller.getTrendingPosts({ limit: 5 });

      expect(mockFeedService.getTrendingPosts).toHaveBeenCalledWith(5);
    });
  });

  describe('invalidateFeed', () => {
    it('should clear feed and invalidate feed pages in Redis', async () => {
      const res = await controller.invalidateFeed({ userId: 'u1' });

      expect(mockRedisService.clearFeed).toHaveBeenCalledWith('u1');
      expect(mockRedisService.invalidateFeedPages).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ success: true });
    });
  });
});
