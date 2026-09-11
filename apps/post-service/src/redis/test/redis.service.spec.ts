import { Test, TestingModule } from '@nestjs/testing';
import { PostRedisService } from '../redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('PostRedisService', () => {
  let redisService: PostRedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      quit: jest.fn().mockResolvedValue('OK'),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      decr: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      zincrby: jest.fn().mockResolvedValue('1'),
      zrevrange: jest.fn().mockResolvedValue([]),
      sadd: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
      sismember: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue({
        sismember: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      }),
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PostRedisService],
    }).compile();

    redisService = module.get<PostRedisService>(PostRedisService);
  });

  it('should be defined', () => {
    expect(redisService).toBeDefined();
  });

  describe('onModuleDestroy', () => {
    it('should call quit on redis client', async () => {
      await redisService.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('Post Caching', () => {
    it('should cache post', async () => {
      const post = { id: 'p1', content: 'hello' };
      await redisService.cachePost('p1', post);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'post:p1',
        JSON.stringify(post),
        'EX',
        1800,
      );
    });

    it('should get cached post', async () => {
      const post = { id: 'p1', content: 'hello' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(post));

      const res = await redisService.getCachedPost('p1');
      expect(res).toEqual(post);
      expect(mockRedisClient.get).toHaveBeenCalledWith('post:p1');
    });

    it('should return null if no cached post', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const res = await redisService.getCachedPost('p1');
      expect(res).toBeNull();
    });

    it('should invalidate post', async () => {
      await redisService.invalidatePost('p1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('post:p1');
    });
  });

  describe('Likes', () => {
    it('should increment like count and mark dirty', async () => {
      mockRedisClient.incr.mockResolvedValue(5);
      const count = await redisService.incrementLike('p1');

      expect(count).toBe(5);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('post:p1:likes');
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'post:p1:likes',
        3600,
      );
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'dirty:posts:likes',
        'p1',
      );
    });

    it('should decrement like count and ensure non-negative value', async () => {
      mockRedisClient.decr.mockResolvedValue(-1);
      const count = await redisService.decrementLike('p1');

      expect(count).toBe(0);
      expect(mockRedisClient.decr).toHaveBeenCalledWith('post:p1:likes');
    });

    it('should init like count if not exists', async () => {
      mockRedisClient.exists.mockResolvedValue(0);
      await redisService.initLikeCount('p1', 10);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'post:p1:likes',
        10,
        'EX',
        3600,
      );
    });

    it('should not init like count if already exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);
      await redisService.initLikeCount('p1', 10);

      expect(mockRedisClient.set).not.toHaveBeenCalledWith(
        'post:p1:likes',
        10,
        'EX',
        3600,
      );
    });

    it('should get like count', async () => {
      mockRedisClient.get.mockResolvedValue('15');
      const count = await redisService.getLikeCount('p1');

      expect(count).toBe(15);
    });
  });

  describe('Views and Trending', () => {
    it('should return 0 when view already seen', async () => {
      mockRedisClient.exists.mockResolvedValue(1);
      const count = await redisService.incrementView('p1', 'u1');

      expect(count).toBe(0);
      expect(mockRedisClient.incr).not.toHaveBeenCalled();
    });

    it('should increment view count when not seen', async () => {
      mockRedisClient.exists.mockResolvedValue(0);
      mockRedisClient.incr.mockResolvedValue(10);

      const count = await redisService.incrementView('p1', 'u1');

      expect(count).toBe(10);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'post:p1:viewed:u1',
        '1',
        'EX',
        3600,
      );
    });

    it('should add to trending and get trending', async () => {
      await redisService.addToTrending('p1', 5);
      expect(mockRedisClient.zincrby).toHaveBeenCalledWith(
        'trending:posts:global',
        5,
        'p1',
      );

      mockRedisClient.zrevrange.mockResolvedValue(['p1', 'p2']);
      const res = await redisService.getTrending(10);
      expect(res).toEqual(['p1', 'p2']);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'trending:posts:global',
        0,
        9,
      );
    });
  });

  describe('Dirty State and User Likes', () => {
    it('should get and clear dirty post ids', async () => {
      mockRedisClient.smembers.mockResolvedValue(['p1']);
      const dirty = await redisService.getDirtyPostIds('likes');
      expect(dirty).toEqual(['p1']);

      await redisService.clearDirty('likes');
      expect(mockRedisClient.del).toHaveBeenCalledWith('dirty:posts:likes');
    });

    it('should check userLikedPost, addUserLike, removeUserLike', async () => {
      mockRedisClient.sismember.mockResolvedValue(1);
      const liked = await redisService.userLikedPost('u1', 'p1');
      expect(liked).toBe(true);

      await redisService.addUserLike('u1', 'p1');
      expect(mockRedisClient.sadd).toHaveBeenCalledWith('user:u1:liked', 'p1');

      await redisService.removeUserLike('u1', 'p1');
      expect(mockRedisClient.srem).toHaveBeenCalledWith('user:u1:liked', 'p1');
    });

    it('should return empty set if getUserLikedSet called with empty postIds', async () => {
      const set = await redisService.getUserLikedSet('u1', []);
      expect(set.size).toBe(0);
    });

    it('should return set of liked post IDs from pipeline', async () => {
      const mockPipeline = {
        sismember: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 0],
        ]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const set = await redisService.getUserLikedSet('u1', ['p1', 'p2']);
      expect(set.has('p1')).toBe(true);
      expect(set.has('p2')).toBe(false);
    });
  });
});
