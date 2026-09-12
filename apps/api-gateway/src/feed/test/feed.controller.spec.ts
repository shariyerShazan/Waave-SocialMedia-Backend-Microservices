import { Test, TestingModule } from '@nestjs/testing';
import { FeedController } from '../feed.controller';
import { FeedGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('FeedController', () => {
  let controller: FeedController;
  let feedClient: jest.Mocked<FeedGrpcClient>;

  beforeEach(async () => {
    const mockFeedGrpcClient = {
      getFeed: jest.fn(),
      getExploreFeed: jest.fn(),
      getTrendingPosts: jest.fn(),
      invalidateFeed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [{ provide: FeedGrpcClient, useValue: mockFeedGrpcClient }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FeedController>(FeedController);
    feedClient = module.get(FeedGrpcClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFeed', () => {
    it('should call feedClient.getFeed', async () => {
      const req = { user: { userId: 'u1' } } as any;
      feedClient.getFeed.mockResolvedValue({ posts: [] } as any);

      const res = await controller.getFeed(req, '1', '20', 'cursor1');
      expect(feedClient.getFeed).toHaveBeenCalledWith('u1', 1, 20, 'cursor1');
      expect(res).toEqual({ posts: [] });
    });
  });

  describe('getExploreFeed', () => {
    it('should call feedClient.getExploreFeed', async () => {
      const req = { user: { userId: 'u1' } } as any;
      feedClient.getExploreFeed.mockResolvedValue({ posts: [] } as any);

      const res = await controller.getExploreFeed(req, '2', '10');
      expect(feedClient.getExploreFeed).toHaveBeenCalledWith('u1', 2, 10);
      expect(res).toEqual({ posts: [] });
    });
  });

  describe('getTrendingPosts', () => {
    it('should call feedClient.getTrendingPosts', async () => {
      feedClient.getTrendingPosts.mockResolvedValue({ posts: [] } as any);

      const res = await controller.getTrendingPosts('15');
      expect(feedClient.getTrendingPosts).toHaveBeenCalledWith(15);
      expect(res).toEqual({ posts: [] });
    });
  });

  describe('invalidateFeed', () => {
    it('should call feedClient.invalidateFeed', async () => {
      const req = { user: { userId: 'u1' } } as any;
      feedClient.invalidateFeed.mockResolvedValue({ success: true });

      const res = await controller.invalidateFeed(req);
      expect(feedClient.invalidateFeed).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ success: true });
    });
  });
});
