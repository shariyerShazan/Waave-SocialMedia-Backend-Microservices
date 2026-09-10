import { Test, TestingModule } from '@nestjs/testing';
import { FeedRedisService } from '../redis.service';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

jest.mock('ioredis');

describe('FeedRedisService', () => {
  let service: FeedRedisService;
  let mockPipeline: any;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockPipeline = {
      lpush: jest.fn().mockReturnThis(),
      ltrim: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      lrem: jest.fn().mockReturnThis(),
      lrange: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 1],
        [null, 'OK'],
        [null, 1],
      ]),
    };

    mockRedisClient = {
      pipeline: jest.fn().mockReturnValue(mockPipeline),
      lrem: jest.fn().mockResolvedValue(1),
      lrange: jest.fn().mockResolvedValue(['p1', 'p2']),
      llen: jest.fn().mockResolvedValue(2),
      exists: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      lpush: jest.fn().mockResolvedValue(1),
      ltrim: jest.fn().mockResolvedValue('OK'),
      expire: jest.fn().mockResolvedValue(1),
      zrevrange: jest.fn().mockResolvedValue(['p1', 'p2']),
      get: jest.fn().mockResolvedValue('10000'),
      set: jest.fn().mockResolvedValue('OK'),
      zincrby: jest.fn().mockResolvedValue(1),
      zrem: jest.fn().mockResolvedValue(1),
      scanStream: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedRedisService],
    }).compile();

    service = module.get<FeedRedisService>(FeedRedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('pushToFeed', () => {
    it('should push post ID, trim feed, and set TTL', async () => {
      await service.pushToFeed('u1', 'p1');

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.lpush).toHaveBeenCalledWith('feed:u1', 'p1');
      expect(mockPipeline.ltrim).toHaveBeenCalledWith('feed:u1', 0, 999);
      expect(mockPipeline.expire).toHaveBeenCalledWith('feed:u1', 86400);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('batchPushToFeeds', () => {
    it('should return early if userIds or postIds are empty', async () => {
      await service.batchPushToFeeds([], ['p1']);
      await service.batchPushToFeeds(['u1'], []);

      expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
    });

    it('should push post IDs to multiple user feeds in chunks', async () => {
      const userIds = Array.from({ length: 600 }, (_, i) => `u${i}`);
      await service.batchPushToFeeds(userIds, ['p1', 'p2']);

      expect(mockRedisClient.pipeline).toHaveBeenCalledTimes(2);
      expect(mockPipeline.lpush).toHaveBeenCalledWith('feed:u0', 'p1', 'p2');
    });
  });

  describe('removeFromFeed', () => {
    it('should remove post from single feed', async () => {
      await service.removeFromFeed('u1', 'p1');

      expect(mockRedisClient.lrem).toHaveBeenCalledWith('feed:u1', 0, 'p1');
    });
  });

  describe('batchRemoveFromFeeds', () => {
    it('should batch remove post from multiple user feeds', async () => {
      await service.batchRemoveFromFeeds(['u1', 'u2'], 'p1');

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.lrem).toHaveBeenCalledWith('feed:u1', 0, 'p1');
      expect(mockPipeline.lrem).toHaveBeenCalledWith('feed:u2', 0, 'p1');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('getFeedPage', () => {
    it('should return postIds and total for page', async () => {
      mockRedisClient.lrange.mockResolvedValue(['p1', 'p2']);
      mockRedisClient.llen.mockResolvedValue(10);

      const result = await service.getFeedPage('u1', 1, 5);

      expect(result).toEqual({ postIds: ['p1', 'p2'], total: 10 });
      expect(mockRedisClient.lrange).toHaveBeenCalledWith('feed:u1', 0, 4);
    });
  });

  describe('getFeedByCursor', () => {
    it('should fetch feed with null cursor starting at 0', async () => {
      mockRedisClient.lrange.mockResolvedValue(['p1', 'p2']);
      mockRedisClient.llen.mockResolvedValue(2);

      const result = await service.getFeedByCursor('u1', null, 5);

      expect(result.postIds).toEqual(['p1', 'p2']);
      expect(result.nextCursor).toBeNull();
    });

    it('should fetch feed using cursor index', async () => {
      mockRedisClient.lrange
        .mockResolvedValueOnce(['p1', 'p2', 'p3']) // full feed for getFeedIndex
        .mockResolvedValueOnce(['p3']); // page result

      mockRedisClient.llen.mockResolvedValue(5);

      const result = await service.getFeedByCursor('u1', 'p2', 1);

      expect(result.postIds).toEqual(['p3']);
    });

    it('should start at index 0 if cursor is not found in feed', async () => {
      mockRedisClient.lrange
        .mockResolvedValueOnce(['p1', 'p2']) // getFeedIndex search returns -1
        .mockResolvedValueOnce(['p1', 'p2']); // range from 0

      mockRedisClient.llen.mockResolvedValue(2);

      const result = await service.getFeedByCursor('u1', 'invalid_cursor', 5);

      expect(result.postIds).toEqual(['p1', 'p2']);
    });
  });

  describe('getFeedLength & feedExists & clearFeed', () => {
    it('should check feed length', async () => {
      mockRedisClient.llen.mockResolvedValue(15);
      expect(await service.getFeedLength('u1')).toBe(15);
    });

    it('should check if feed exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);
      expect(await service.feedExists('u1')).toBe(true);

      mockRedisClient.exists.mockResolvedValue(0);
      expect(await service.feedExists('u2')).toBe(false);
    });

    it('should clear feed', async () => {
      await service.clearFeed('u1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('feed:u1');
    });
  });

  describe('Celebrity Posts', () => {
    it('should add celebrity post', async () => {
      await service.addCelebrityPost('celeb1', 'p1');

      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        'celebrity:posts:celeb1',
        'p1',
      );
      expect(mockRedisClient.ltrim).toHaveBeenCalledWith(
        'celebrity:posts:celeb1',
        0,
        99,
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'celebrity:posts:celeb1',
        86400,
      );
    });

    it('should get celebrity posts', async () => {
      mockRedisClient.lrange.mockResolvedValue(['p1']);
      const posts = await service.getCelebrityPosts('celeb1');

      expect(posts).toEqual(['p1']);
      expect(mockRedisClient.lrange).toHaveBeenCalledWith(
        'celebrity:posts:celeb1',
        0,
        19,
      );
    });

    it('should get merged celebrity posts', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, ['p1', 'p2']],
        [null, ['p3']],
      ]);

      const merged = await service.getMergedCelebrityPosts(['c1', 'c2'], 2);

      expect(merged.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array if celebIds is empty', async () => {
      const merged = await service.getMergedCelebrityPosts([], 10);
      expect(merged).toEqual([]);
    });
  });

  describe('Trending & Celebrities', () => {
    it('should get trending post IDs', async () => {
      mockRedisClient.zrevrange.mockResolvedValue(['p1', 'p2']);
      const trending = await service.getTrendingPostIds(2);

      expect(trending).toEqual(['p1', 'p2']);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'trending:posts:global',
        0,
        1,
      );
    });

    it('should check if user is celebrity', async () => {
      mockRedisClient.get.mockResolvedValue('10000');
      expect(await service.isCelebrity('u1')).toBe(true);

      mockRedisClient.get.mockResolvedValue('500');
      expect(await service.isCelebrity('u2')).toBe(false);
    });

    it('should set follower count', async () => {
      await service.setFollowerCount('u1', 5000);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'user:followerCount:u1',
        '5000',
        'EX',
        3600,
      );
    });
  });

  describe('Cache Feed Page & Invalidation', () => {
    it('should cache feed page', async () => {
      await service.cacheFeedPage('u1', 1, [{ id: 'p1' }]);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'feed:page:u1:1',
        JSON.stringify([{ id: 'p1' }]),
        'EX',
        300,
      );
    });

    it('should get cached feed page', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([{ id: 'p1' }]));

      const cached = await service.getCachedFeedPage('u1', 1);

      expect(cached).toEqual([{ id: 'p1' }]);
    });

    it('should return null if cached feed page does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const cached = await service.getCachedFeedPage('u1', 1);

      expect(cached).toBeNull();
    });

    it('should invalidate feed pages via scanStream', async () => {
      const stream = new EventEmitter();
      mockRedisClient.scanStream.mockReturnValue(stream);

      const invalidatePromise = service.invalidateFeedPages('u1');

      stream.emit('data', ['feed:page:u1:1', 'feed:page:u1:2']);
      stream.emit('end');

      await invalidatePromise;

      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'feed:page:u1:1',
        'feed:page:u1:2',
      );
    });
  });

  describe('Trending Score Mutations', () => {
    it('should add to trending with default score 1', async () => {
      await service.addToTrending('p1');
      expect(mockRedisClient.zincrby).toHaveBeenCalledWith(
        'trending:posts:global',
        1,
        'p1',
      );
    });

    it('should remove from trending', async () => {
      await service.removeFromTrending('p1');
      expect(mockRedisClient.zrem).toHaveBeenCalledWith(
        'trending:posts:global',
        'p1',
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit redis client on destroy', async () => {
      await service.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
