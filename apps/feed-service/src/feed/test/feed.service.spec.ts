import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from '../feed.service';
import { FeedRedisService } from '../../redis/redis.service';
import { PostGrpcClient } from '@app/clients/clients/post-grpc.client';
import { UserGrpcClient } from '@app/clients/clients/user-grpc.client';
import { FeedEnrichmentService } from '../enrichments/enrichment.service';

describe('FeedService', () => {
  let service: FeedService;
  let redis: any;
  let postClient: any;
  let userClient: any;
  let enrichment: any;

  beforeEach(async () => {
    redis = {
      getCachedFeedPage: jest.fn().mockResolvedValue(null),
      cacheFeedPage: jest.fn().mockResolvedValue(undefined),
      feedExists: jest.fn().mockResolvedValue(true),
      getFeedPage: jest.fn().mockResolvedValue({ postIds: ['p1', 'p2'] }),
      getFeedByCursor: jest
        .fn()
        .mockResolvedValue({ postIds: ['p2'], nextCursor: 'p2' }),
      isCelebrity: jest.fn().mockResolvedValue(false),
      addCelebrityPost: jest.fn().mockResolvedValue(undefined),
      batchPushToFeeds: jest.fn().mockResolvedValue(undefined),
      pushToFeed: jest.fn().mockResolvedValue(undefined),
      batchRemoveFromFeeds: jest.fn().mockResolvedValue(undefined),
      getTrendingPostIds: jest.fn().mockResolvedValue(['p1', 'p2', 'p3']),
      getMergedCelebrityPosts: jest.fn().mockResolvedValue([]),
      invalidateFeedPages: jest.fn().mockResolvedValue(undefined),
    };

    postClient = {
      getPostsByIds: jest.fn().mockResolvedValue({
        posts: [
          { id: 'p1', content: 'Post 1' },
          { id: 'p2', content: 'Post 2' },
        ],
      }),
      getRecentPostsByAuthors: jest.fn().mockResolvedValue({
        posts: [{ id: 'p1' }, { id: 'p2' }],
      }),
    };

    userClient = {
      getFollowingIds: jest.fn().mockResolvedValue(['u2']),
      getFollowerIds: jest.fn().mockResolvedValue(['u3', 'u4']),
    };

    enrichment = {
      enrichPosts: jest
        .fn()
        .mockImplementation((posts) => Promise.resolve(posts)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: FeedRedisService, useValue: redis },
        { provide: PostGrpcClient, useValue: postClient },
        { provide: UserGrpcClient, useValue: userClient },
        { provide: FeedEnrichmentService, useValue: enrichment },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFeed', () => {
    it('should return cached feed page if available on page 1 without cursor', async () => {
      const cached = [{ id: 'p1', content: 'Cached Post' }];
      redis.getCachedFeedPage.mockResolvedValue(cached);

      const result = await service.getFeed('u1', 1, 10);

      expect(result).toEqual({
        success: true,
        posts: cached,
        total: 1,
        nextCursor: 'p1',
        hasMore: false,
      });
      expect(postClient.getPostsByIds).not.toHaveBeenCalled();
    });

    it('should build feed from scratch if feed does not exist in Redis', async () => {
      redis.feedExists.mockResolvedValue(false);

      await service.getFeed('u1', 1, 10);

      expect(userClient.getFollowingIds).toHaveBeenCalledWith('u1');
      expect(postClient.getRecentPostsByAuthors).toHaveBeenCalledWith(
        ['u2'],
        'u1',
        10,
      );
      expect(redis.batchPushToFeeds).toHaveBeenCalled();
    });

    it('should return empty result if no post IDs found in Redis feed', async () => {
      redis.getFeedPage.mockResolvedValue({ postIds: [] });

      const result = await service.getFeed('u1', 1, 10);

      expect(result).toEqual({
        success: true,
        posts: [],
        total: 0,
        nextCursor: null,
        hasMore: false,
      });
    });

    it('should fetch feed by cursor if cursor parameter is provided', async () => {
      const result = await service.getFeed('u1', 1, 10, 'p1');

      expect(redis.getFeedByCursor).toHaveBeenCalledWith('u1', 'p1', 10);
      expect(result.success).toBe(true);
    });

    it('should return empty response if postClient returns no posts for post IDs', async () => {
      postClient.getPostsByIds.mockResolvedValue({ posts: [] });

      const result = await service.getFeed('u1', 1, 10);

      expect(result).toEqual({
        success: true,
        posts: [],
        total: 0,
        nextCursor: null,
        hasMore: false,
      });
    });
  });

  describe('fanoutPost', () => {
    it('should handle celebrity fanout by pushing to celebrity list', async () => {
      redis.isCelebrity.mockResolvedValue(true);

      await service.fanoutPost('p100', 'celeb1', 'PUBLIC');

      expect(redis.addCelebrityPost).toHaveBeenCalledWith('celeb1', 'p100');
      expect(userClient.getFollowerIds).not.toHaveBeenCalled();
    });

    it('should fanout post to followers and author feed for normal user', async () => {
      redis.isCelebrity.mockResolvedValue(false);
      userClient.getFollowerIds.mockResolvedValue(['f1', 'f2']);

      await service.fanoutPost('p101', 'u1', 'PUBLIC');

      expect(redis.batchPushToFeeds).toHaveBeenCalledWith(
        ['f1', 'f2'],
        ['p101'],
      );
      expect(redis.pushToFeed).toHaveBeenCalledWith('u1', 'p101');
      expect(redis.invalidateFeedPages).toHaveBeenCalled();
    });

    it('should push to empty target list if privacy is PRIVATE', async () => {
      redis.isCelebrity.mockResolvedValue(false);
      userClient.getFollowerIds.mockResolvedValue(['f1']);

      await service.fanoutPost('p102', 'u1', 'PRIVATE');

      expect(redis.batchPushToFeeds).toHaveBeenCalledWith([], ['p102']);
    });

    it('should return early if author has no followers', async () => {
      redis.isCelebrity.mockResolvedValue(false);
      userClient.getFollowerIds.mockResolvedValue([]);

      await service.fanoutPost('p103', 'u1', 'PUBLIC');

      expect(redis.batchPushToFeeds).not.toHaveBeenCalled();
    });
  });

  describe('removePostFromFeeds', () => {
    it('should remove post from followers and author feeds', async () => {
      userClient.getFollowerIds.mockResolvedValue(['f1', 'f2']);

      await service.removePostFromFeeds('p1', 'u1');

      expect(redis.batchRemoveFromFeeds).toHaveBeenCalledWith(
        ['f1', 'f2', 'u1'],
        'p1',
      );
    });
  });

  describe('getExploreFeed', () => {
    it('should return empty result if no trending posts found', async () => {
      redis.getTrendingPostIds.mockResolvedValue([]);

      const result = await service.getExploreFeed('u1', 1, 10);

      expect(result).toEqual({
        success: true,
        posts: [],
        total: 0,
        nextCursor: null,
        hasMore: false,
      });
    });

    it('should fetch and enrich trending posts for explore feed', async () => {
      redis.getTrendingPostIds.mockResolvedValue(['p1', 'p2', 'p3']);

      const result = await service.getExploreFeed('u1', 1, 2);

      expect(postClient.getPostsByIds).toHaveBeenCalledWith(['p1', 'p2'], 'u1');
      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getTrendingPosts', () => {
    it('should return empty result if trending list is empty', async () => {
      redis.getTrendingPostIds.mockResolvedValue([]);

      const result = await service.getTrendingPosts(10);

      expect(result).toEqual({
        success: true,
        posts: [],
        total: 0,
        nextCursor: null,
        hasMore: false,
      });
    });

    it('should fetch and enrich top trending posts', async () => {
      redis.getTrendingPostIds.mockResolvedValue(['p1', 'p2']);

      const result = await service.getTrendingPosts(2);

      expect(postClient.getPostsByIds).toHaveBeenCalledWith(['p1', 'p2'], '');
      expect(result.success).toBe(true);
      expect(result.posts.length).toBe(2);
    });
  });
});
