import { Test, TestingModule } from '@nestjs/testing';
import { FeedResolver } from '../feed.resolver';
import { FeedGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';

describe('FeedResolver', () => {
  let resolver: FeedResolver;
  let feedClient: jest.Mocked<FeedGrpcClient>;

  beforeEach(async () => {
    const mockFeedGrpcClient = {
      getFeed: jest.fn(),
      getExploreFeed: jest.fn(),
      getTrendingPosts: jest.fn(),
      invalidateFeed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedResolver,
        { provide: FeedGrpcClient, useValue: mockFeedGrpcClient },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<FeedResolver>(FeedResolver);
    feedClient = module.get(FeedGrpcClient);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('feed', () => {
    it('should call feedClient.getFeed', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      feedClient.getFeed.mockResolvedValue({ posts: [] } as any);

      const res = await resolver.feed(ctx, 1, 20, 'c1');
      expect(feedClient.getFeed).toHaveBeenCalledWith('u1', 1, 20, 'c1');
      expect(res).toEqual({ posts: [] });
    });
  });

  describe('exploreFeed', () => {
    it('should call feedClient.getExploreFeed', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      feedClient.getExploreFeed.mockResolvedValue({ posts: [] } as any);

      const res = await resolver.exploreFeed(ctx, 1, 20);
      expect(feedClient.getExploreFeed).toHaveBeenCalledWith('u1', 1, 20);
      expect(res).toEqual({ posts: [] });
    });
  });

  describe('trendingPosts', () => {
    it('should call feedClient.getTrendingPosts', async () => {
      feedClient.getTrendingPosts.mockResolvedValue({ posts: [] } as any);

      const res = await resolver.trendingPosts(20);
      expect(feedClient.getTrendingPosts).toHaveBeenCalledWith(20);
      expect(res).toEqual({ posts: [] });
    });
  });

  describe('invalidateFeed', () => {
    it('should call feedClient.invalidateFeed', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      feedClient.invalidateFeed.mockResolvedValue({ success: true });

      const res = await resolver.invalidateFeed(ctx);
      expect(feedClient.invalidateFeed).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ success: true });
    });
  });
});
