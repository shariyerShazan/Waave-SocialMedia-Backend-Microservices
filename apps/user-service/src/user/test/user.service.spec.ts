import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { UserService } from '../user.service';
import { UserPrismaService } from '../../prisma/prisma.service';
import { UserRedisService } from '../../redis/redis.service';
import { KafkaService } from '@app/kafka';
import { UserEnrichmentService } from '../enrichments/enrichment.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let redis: any;
  let kafka: any;
  let enrichment: any;

  beforeEach(async () => {
    prisma = {
      writeDb: {
        profile: {
          upsert: jest.fn(),
          update: jest.fn(),
        },
        follow: {
          create: jest.fn(),
          delete: jest.fn(),
        },
        $transaction: jest.fn().mockImplementation((args) => Promise.all(args)),
      },
      readDb: {
        profile: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
        follow: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
      },
    };

    redis = {
      getCachedProfile: jest.fn(),
      cacheProfile: jest.fn(),
      invalidateProfile: jest.fn(),
      isOnline: jest.fn().mockResolvedValue(false),
      setOnline: jest.fn().mockResolvedValue(true),
      setOffline: jest.fn().mockResolvedValue(true),
      getLastSeen: jest.fn().mockResolvedValue(12345),
      getOnlineUsers: jest.fn().mockResolvedValue(new Set()),
      addFollower: jest.fn().mockResolvedValue(true),
      removeFollower: jest.fn().mockResolvedValue(true),
      getCachedSearch: jest.fn(),
      cacheSearch: jest.fn(),
      getFollowerIds: jest.fn().mockResolvedValue([]),
      cacheFollowerIds: jest.fn(),
    };

    kafka = {
      emit: jest.fn().mockResolvedValue(true),
    };

    enrichment = {
      enrichProfilesWithMedia: jest
        .fn()
        .mockImplementation((profiles) => Promise.resolve(profiles)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserPrismaService, useValue: prisma },
        { provide: UserRedisService, useValue: redis },
        { provide: KafkaService, useValue: kafka },
        { provide: UserEnrichmentService, useValue: enrichment },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should upsert user profile in writeDb', async () => {
      prisma.writeDb.profile.upsert.mockResolvedValue({ id: 'u1' });

      await service.createUser({
        userId: 'u1',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(prisma.writeDb.profile.upsert).toHaveBeenCalledWith({
        where: { id: 'u1' },
        update: { name: 'Test User', email: 'test@example.com' },
        create: { id: 'u1', name: 'Test User', email: 'test@example.com' },
      });
    });
  });

  describe('getProfile', () => {
    it('should return profile from cache if present', async () => {
      redis.getCachedProfile.mockResolvedValue({
        id: 'u1',
        name: 'Cached User',
      });
      redis.isOnline.mockResolvedValue(true);
      prisma.readDb.follow.findUnique.mockResolvedValue({ followerId: 'u2' });

      const res = await service.getProfile('u1', 'u2');

      expect(res.success).toBe(true);
      expect(res.user.name).toBe('Cached User');
      expect(prisma.readDb.profile.findUnique).not.toHaveBeenCalled();
    });

    it('should throw RpcException if user not found in DB', async () => {
      redis.getCachedProfile.mockResolvedValue(null);
      prisma.readDb.profile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('u1', 'u2')).rejects.toThrow(
        RpcException,
      );
    });

    it('should fetch user from DB and cache profile if found', async () => {
      redis.getCachedProfile.mockResolvedValue(null);
      prisma.readDb.profile.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'DB User',
        email: 'db@example.com',
      });

      const res = await service.getProfile('u1', 'u2');

      expect(res.success).toBe(true);
      expect(res.user.name).toBe('DB User');
      expect(redis.cacheProfile).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update profile, invalidate cache, and emit kafka event', async () => {
      prisma.writeDb.profile.update.mockResolvedValue({
        id: 'u1',
        name: 'Updated Name',
        avatarMediaId: 'a1',
        coverMediaId: 'c1',
      });

      const res = await service.updateProfile('u1', { name: 'Updated Name' });

      expect(res.success).toBe(true);
      expect(prisma.writeDb.profile.update).toHaveBeenCalled();
      expect(redis.invalidateProfile).toHaveBeenCalledWith('u1');
      expect(kafka.emit).toHaveBeenCalled();
    });
  });

  describe('followUser', () => {
    it('should throw RpcException when user tries to follow self', async () => {
      await expect(service.followUser('u1', 'u1')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException if follower profile not found', async () => {
      prisma.readDb.profile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'u2' });

      await expect(service.followUser('u1', 'u2')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException if target profile not found', async () => {
      prisma.readDb.profile.findUnique
        .mockResolvedValueOnce({ id: 'u1' })
        .mockResolvedValueOnce(null);

      await expect(service.followUser('u1', 'u2')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException if already following', async () => {
      prisma.readDb.profile.findUnique
        .mockResolvedValueOnce({ id: 'u1' })
        .mockResolvedValueOnce({ id: 'u2' });
      prisma.readDb.follow.findUnique.mockResolvedValue({
        followerId: 'u1',
        followingId: 'u2',
      });

      await expect(service.followUser('u1', 'u2')).rejects.toThrow(
        RpcException,
      );
    });

    it('should create follow relationship and emit kafka event', async () => {
      prisma.readDb.profile.findUnique
        .mockResolvedValueOnce({ id: 'u1', name: 'User 1' })
        .mockResolvedValueOnce({ id: 'u2', followersCount: 0 });
      prisma.readDb.follow.findUnique.mockResolvedValue(null);
      prisma.writeDb.profile.update.mockResolvedValue({ followersCount: 1 });

      const res = await service.followUser('u1', 'u2');

      expect(res.success).toBe(true);
      expect(res.isFollowing).toBe(true);
      expect(redis.addFollower).toHaveBeenCalledWith('u2', 'u1');
      expect(kafka.emit).toHaveBeenCalled();
    });
  });

  describe('unfollowUser', () => {
    it('should throw RpcException if not currently following', async () => {
      prisma.readDb.profile.findUnique
        .mockResolvedValueOnce({ id: 'u1' })
        .mockResolvedValueOnce({ id: 'u2' });
      prisma.readDb.follow.findUnique.mockResolvedValue(null);

      await expect(service.unfollowUser('u1', 'u2')).rejects.toThrow(
        RpcException,
      );
    });

    it('should unfollow user successfully', async () => {
      prisma.readDb.profile.findUnique
        .mockResolvedValueOnce({ id: 'u1', name: 'User 1' })
        .mockResolvedValueOnce({ id: 'u2' });
      prisma.readDb.follow.findUnique.mockResolvedValue({
        followerId: 'u1',
        followingId: 'u2',
      });
      prisma.writeDb.profile.update.mockResolvedValue({ followersCount: 0 });

      const res = await service.unfollowUser('u1', 'u2');

      expect(res.success).toBe(true);
      expect(res.isFollowing).toBe(false);
      expect(redis.removeFollower).toHaveBeenCalledWith('u2', 'u1');
      expect(kafka.emit).toHaveBeenCalled();
    });
  });

  describe('getFollowers', () => {
    it('should return paginated followers list', async () => {
      prisma.readDb.follow.findMany.mockResolvedValue([
        { followerId: 'u2', follower: { id: 'u2', name: 'Follower 1' } },
      ]);
      prisma.readDb.follow.count.mockResolvedValue(1);

      const res = await service.getFollowers('u1', 1, 10);

      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
      expect(res.users).toHaveLength(1);
    });
  });

  describe('getFollowing', () => {
    it('should return paginated following list', async () => {
      prisma.readDb.follow.findMany.mockResolvedValue([
        { followingId: 'u2', following: { id: 'u2', name: 'Following 1' } },
      ]);
      prisma.readDb.follow.count.mockResolvedValue(1);

      const res = await service.getFollowing('u1', 1, 10);

      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
      expect(res.users).toHaveLength(1);
    });
  });

  describe('searchUsers', () => {
    it('should return cached search results if available', async () => {
      redis.getCachedSearch.mockResolvedValue([{ id: 'u2' }]);

      const res = await service.searchUsers('john', 'u1', 1, 10);

      expect(res.success).toBe(true);
      expect(res.users).toHaveLength(1);
      expect(prisma.readDb.profile.findMany).not.toHaveBeenCalled();
    });

    it('should query DB and cache search results if not in cache', async () => {
      redis.getCachedSearch.mockResolvedValue(null);
      prisma.readDb.profile.findMany.mockResolvedValue([{ id: 'u2' }]);
      prisma.readDb.follow.findMany.mockResolvedValue([]);

      const res = await service.searchUsers('john', 'u1', 1, 10);

      expect(res.success).toBe(true);
      expect(redis.cacheSearch).toHaveBeenCalled();
    });
  });

  describe('getSuggestions', () => {
    it('should return popular users if user is not following anyone', async () => {
      prisma.readDb.follow.findMany.mockResolvedValue([]);
      prisma.readDb.profile.findMany.mockResolvedValue([{ id: 'u2' }]);

      const res = await service.getSuggestions('u1', 10);

      expect(res.success).toBe(true);
      expect(res.users).toHaveLength(1);
    });

    it('should return friend-of-friends suggestions if user follows others', async () => {
      prisma.readDb.follow.findMany.mockResolvedValue([{ followingId: 'u2' }]);
      prisma.readDb.profile.findMany.mockResolvedValue([{ id: 'u3' }]);

      const res = await service.getSuggestions('u1', 10);

      expect(res.success).toBe(true);
      expect(res.users).toHaveLength(1);
    });
  });

  describe('getFollowerIds', () => {
    it('should return cached follower IDs if present', async () => {
      redis.getFollowerIds.mockResolvedValue(['f1', 'f2']);

      const ids = await service.getFollowerIds('u1');

      expect(ids).toEqual(['f1', 'f2']);
      expect(prisma.readDb.follow.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not in redis', async () => {
      redis.getFollowerIds.mockResolvedValue([]);
      prisma.readDb.follow.findMany.mockResolvedValue([{ followerId: 'f1' }]);

      const ids = await service.getFollowerIds('u1');

      expect(ids).toEqual(['f1']);
      expect(redis.cacheFollowerIds).toHaveBeenCalledWith('u1', ['f1']);
    });
  });

  describe('getUsersByIds', () => {
    it('should fetch profiles by IDs', async () => {
      prisma.readDb.profile.findMany.mockResolvedValue([{ id: 'u1' }]);

      const res = await service.getUsersByIds(['u1']);

      expect(res.success).toBe(true);
      expect(res.users).toHaveLength(1);
    });
  });

  describe('presence', () => {
    it('should set online', async () => {
      const res = await service.setOnline('u1');
      expect(res.isOnline).toBe(true);
      expect(redis.setOnline).toHaveBeenCalledWith('u1');
    });

    it('should set offline', async () => {
      const res = await service.setOffline('u1');
      expect(res.isOnline).toBe(false);
      expect(redis.setOffline).toHaveBeenCalledWith('u1');
    });

    it('should get online status', async () => {
      redis.isOnline.mockResolvedValue(true);
      redis.getLastSeen.mockResolvedValue(100);

      const res = await service.getOnlineStatus('u1');
      expect(res.isOnline).toBe(true);
      expect(res.lastSeen).toBe(100);
    });
  });
});
