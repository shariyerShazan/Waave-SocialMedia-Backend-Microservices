import { Test, TestingModule } from '@nestjs/testing';
import { UserRedisService } from '../redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('UserRedisService', () => {
  let redisService: UserRedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      quit: jest.fn().mockResolvedValue('OK'),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
      sinter: jest.fn().mockResolvedValue([]),
      sismember: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue({
        sadd: jest.fn(),
        srem: jest.fn(),
        set: jest.fn(),
        sismember: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      }),
      scanStream: jest.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          await Promise.resolve();
          yield ['cache:keybundle:u1:d1'];
        },
      }),
      hset: jest.fn().mockResolvedValue(1),
      hdel: jest.fn().mockResolvedValue(1),
      hgetall: jest.fn().mockResolvedValue({}),
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRedisService],
    }).compile();

    redisService = module.get<UserRedisService>(UserRedisService);
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

  describe('Profile Cache', () => {
    it('should cache profile', async () => {
      const profile = { id: 'u1', name: 'User 1' };
      await redisService.cacheProfile('u1', profile);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'user:profile:u1',
        JSON.stringify(profile),
        'EX',
        3600,
      );
    });

    it('should get cached profile', async () => {
      const profile = { id: 'u1', name: 'User 1' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(profile));

      const res = await redisService.getCachedProfile('u1');
      expect(res).toEqual(profile);
      expect(mockRedisClient.get).toHaveBeenCalledWith('user:profile:u1');
    });

    it('should return null if no cached profile', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const res = await redisService.getCachedProfile('u1');
      expect(res).toBeNull();
    });

    it('should invalidate profile', async () => {
      await redisService.invalidateProfile('u1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('user:profile:u1');
    });
  });

  describe('Follower Cache', () => {
    it('should delete key when caching empty follower ids array', async () => {
      await redisService.cacheFollowerIds('u1', []);
      expect(mockRedisClient.del).toHaveBeenCalledWith('user:followers:u1');
    });

    it('should cache follower ids when array is not empty', async () => {
      await redisService.cacheFollowerIds('u1', ['f1', 'f2']);
      expect(mockRedisClient.del).toHaveBeenCalledWith('user:followers:u1');
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'user:followers:u1',
        'f1',
        'f2',
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'user:followers:u1',
        1800,
      );
    });

    it('should get follower ids', async () => {
      mockRedisClient.smembers.mockResolvedValue(['f1', 'f2']);
      const res = await redisService.getFollowerIds('u1');
      expect(res).toEqual(['f1', 'f2']);
    });

    it('should add follower', async () => {
      await redisService.addFollower('u1', 'f1');
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'user:followers:u1',
        'f1',
      );
    });

    it('should remove follower', async () => {
      await redisService.removeFollower('u1', 'f1');
      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        'user:followers:u1',
        'f1',
      );
    });

    it('should get mutual friends', async () => {
      mockRedisClient.sinter.mockResolvedValue(['m1']);
      const res = await redisService.getMutualFriends('u1', 'u2');
      expect(res).toEqual(['m1']);
      expect(mockRedisClient.sinter).toHaveBeenCalledWith(
        'user:followers:u1',
        'user:followers:u2',
      );
    });
  });

  describe('Online Presence', () => {
    it('should set online', async () => {
      await redisService.setOnline('u1');
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
    });

    it('should set offline', async () => {
      await redisService.setOffline('u1');
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
    });

    it('should check isOnline', async () => {
      mockRedisClient.sismember.mockResolvedValue(1);
      const isOnline = await redisService.isOnline('u1');
      expect(isOnline).toBe(true);
    });

    it('should get last seen timestamp', async () => {
      mockRedisClient.get.mockResolvedValue('123456789');
      const timestamp = await redisService.getLastSeen('u1');
      expect(timestamp).toBe(123456789);
    });

    it('should return empty set if getOnlineUsers called with empty array', async () => {
      const online = await redisService.getOnlineUsers([]);
      expect(online.size).toBe(0);
    });

    it('should get online users set', async () => {
      const mockPipeline = {
        sismember: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 0],
        ]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const online = await redisService.getOnlineUsers(['u1', 'u2']);
      expect(online.has('u1')).toBe(true);
      expect(online.has('u2')).toBe(false);
    });
  });

  describe('Search Cache', () => {
    it('should cache search results', async () => {
      await redisService.cacheSearch('John', [{ id: 'u1' }]);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'search:users:john',
        JSON.stringify([{ id: 'u1' }]),
        'EX',
        300,
      );
    });

    it('should get cached search', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([{ id: 'u1' }]));
      const res = await redisService.getCachedSearch('john');
      expect(res).toEqual([{ id: 'u1' }]);
    });
  });

  describe('General Cache', () => {
    it('should set, get, and invalidate cache', async () => {
      await redisService.setCache('test-key', { data: 123 }, 500);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'cache:test-key',
        JSON.stringify({ data: 123 }),
        'EX',
        500,
      );

      mockRedisClient.get.mockResolvedValue(JSON.stringify({ data: 123 }));
      const res = await redisService.getCache('test-key');
      expect(res).toEqual({ data: 123 });

      await redisService.invalidateCache('test-key');
      expect(mockRedisClient.del).toHaveBeenCalledWith('cache:test-key');
    });
  });

  describe('E2EE Key Bundle Cache', () => {
    it('should invalidate key bundle matching stream', async () => {
      await redisService.invalidateKeyBundle('u1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('cache:keybundle:u1:d1');
    });
  });

  describe('Device Socket Mapping', () => {
    it('should set, remove and get user sockets', async () => {
      await redisService.setDeviceSocket('u1', 'd1', 's1');
      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'user:sockets:u1',
        'd1',
        's1',
      );

      await redisService.removeDeviceSocket('u1', 'd1');
      expect(mockRedisClient.hdel).toHaveBeenCalledWith(
        'user:sockets:u1',
        'd1',
      );

      mockRedisClient.hgetall.mockResolvedValue({ d1: 's1' });
      const sockets = await redisService.getUserSockets('u1');
      expect(sockets).toEqual({ d1: 's1' });
    });
  });
});
