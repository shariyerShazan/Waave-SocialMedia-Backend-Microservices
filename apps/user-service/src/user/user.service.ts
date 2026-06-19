/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// user/user.service.ts
import { KAFKA_TOPICS, KafkaService } from '@app/kafka';
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { UserRedisService } from '../redis/redis.service';
import { UserPrismaService } from '@app/prisma';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: UserPrismaService,
    private redis: UserRedisService,
    private kafka: KafkaService,
  ) {}

  // ── Get Profile ───────────────────────────────
  async getProfile(userId: string, requesterId: string) {
    // Cache check
    const cached = await this.redis.getCachedProfile(userId);
    if (cached) {
      const isFollowing =
        requesterId !== userId
          ? await this.checkIsFollowing(requesterId, userId)
          : false;
      const isOnline = await this.redis.isOnline(userId);
      return this.buildResponse({ ...cached, isFollowing, isOnline });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({
        code: 5,
        message: 'User not found',
      });
    }

    const isFollowing =
      requesterId && requesterId !== userId
        ? await this.checkIsFollowing(requesterId, userId)
        : false;

    const isOnline = await this.redis.isOnline(userId);

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: user.avatar || '',
      coverImg: user.coverImg || '',
      location: user.location || '',
      website: user.website || '',
      birthDate: user.birthDate?.toISOString() || '',
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      postsCount: user.postsCount,
      isFollowing,
      isOnline,
      createdAt: user.createdAt.toISOString(),
    };

    await this.redis.cacheProfile(userId, {
      ...profile,
      isFollowing: false,
    });

    return this.buildResponse(profile);
  }

  // ── Update Profile ────────────────────────────
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      bio?: string;
      avatar?: string;
      coverImg?: string;
      location?: string;
      website?: string;
      birthDate?: string;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.bio && { bio: data.bio }),
        ...(data.avatar && { avatar: data.avatar }),
        ...(data.coverImg && { coverImg: data.coverImg }),
        ...(data.location && { location: data.location }),
        ...(data.website && { website: data.website }),
        ...(data.birthDate && {
          birthDate: new Date(data.birthDate),
        }),
      },
    });

    // Cache invalidate
    await this.redis.invalidateProfile(userId);

    // Kafka event
    await this.kafka.emit(KAFKA_TOPICS.USER_PROFILE_UPDATED, {
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
    });

    return this.buildResponse({
      ...user,
      bio: user.bio || '',
      avatar: user.avatar || '',
      coverImg: user.coverImg || '',
      location: user.location || '',
      website: user.website || '',
      birthDate: user.birthDate?.toISOString() || '',
      isFollowing: false,
      isOnline: false,
      createdAt: user.createdAt.toISOString(),
    });
  }

  // ── Follow ────────────────────────────────────
  async followUser(followerId: string, targetId: string) {
    if (followerId === targetId) {
      throw new RpcException({
        code: 3,
        message: 'Cannot follow yourself',
      });
    }

    // Already following?
    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetId,
        },
      },
    });

    if (existing) {
      throw new RpcException({
        code: 6,
        message: 'Already following',
      });
    }

    const [, target] = await this.prisma.$transaction([
      this.prisma.follow.create({
        data: { followerId, followingId: targetId },
      }),
      this.prisma.user.update({
        where: { id: targetId },
        data: { followersCount: { increment: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
    ]);

    // Redis cache update
    await this.redis.addFollower(targetId, followerId);
    await this.redis.invalidateProfile(targetId);
    await this.redis.invalidateProfile(followerId);

    const follower = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: { name: true },
    });

    await this.kafka.emit(KAFKA_TOPICS.USER_PROFILE_FOLLOWED, {
      followerId,
      targetId,
      followerName: follower?.name,
    });

    this.logger.log(`✅ ${followerId} followed ${targetId}`);

    return {
      success: true,
      message: 'Followed successfully',
      followersCount: target.followersCount,
      isFollowing: true,
    };
  }

  // ── Unfollow ──────────────────────────────────
  async unfollowUser(followerId: string, targetId: string) {
    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetId,
        },
      },
    });

    if (!existing) {
      throw new RpcException({
        code: 5,
        message: 'Not following this user',
      });
    }

    const [, target] = await this.prisma.$transaction([
      this.prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId: targetId,
          },
        },
      }),
      this.prisma.user.update({
        where: { id: targetId },
        data: { followersCount: { decrement: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      }),
    ]);

    // Redis cache update
    await this.redis.removeFollower(targetId, followerId);
    await this.redis.invalidateProfile(targetId);
    await this.redis.invalidateProfile(followerId);

    await this.kafka.emit(KAFKA_TOPICS.USER_PROFILE_UNFOLLOWED, {
      followerId,
      targetId,
    });

    return {
      success: true,
      message: 'Unfollowed successfully',
      followersCount: target.followersCount,
      isFollowing: false,
    };
  }

  // ── Get Followers ─────────────────────────────
  async getFollowers(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: userId },
        include: { follower: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.follow.count({
        where: { followingId: userId },
      }),
    ]);

    const userIds = follows.map((f) => f.followerId);
    const onlineSet = await this.redis.getOnlineUsers(userIds);

    const users = follows.map((f) => ({
      id: f.follower.id,
      name: f.follower.name,
      email: f.follower.email,
      bio: f.follower.bio || '',
      avatar: f.follower.avatar || '',
      coverImg: '',
      location: '',
      website: '',
      birthDate: '',
      followersCount: f.follower.followersCount,
      followingCount: f.follower.followingCount,
      postsCount: f.follower.postsCount,
      isFollowing: false,
      isOnline: onlineSet.has(f.follower.id),
      createdAt: f.follower.createdAt.toISOString(),
    }));

    return { success: true, users, total, page };
  }

  // ── Get Following ─────────────────────────────
  async getFollowing(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        include: { following: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.follow.count({
        where: { followerId: userId },
      }),
    ]);

    const userIds = follows.map((f) => f.followingId);
    const onlineSet = await this.redis.getOnlineUsers(userIds);

    const users = follows.map((f) => ({
      id: f.following.id,
      name: f.following.name,
      email: f.following.email,
      bio: f.following.bio || '',
      avatar: f.following.avatar || '',
      coverImg: '',
      location: '',
      website: '',
      birthDate: '',
      followersCount: f.following.followersCount,
      followingCount: f.following.followingCount,
      postsCount: f.following.postsCount,
      isFollowing: true,
      isOnline: onlineSet.has(f.following.id),
      createdAt: f.following.createdAt.toISOString(),
    }));

    return { success: true, users, total, page };
  }

  // ── Search Users ──────────────────────────────
  async searchUsers(
    query: string,
    requesterId: string,
    page: number,
    limit: number,
  ) {
    // Cache check
    const cacheKey = `${query}:${page}`;
    const cached = await this.redis.getCachedSearch(cacheKey);
    if (cached) {
      return { success: true, users: cached, total: cached.length, page };
    }

    const skip = (page - 1) * limit;

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        NOT: { id: requesterId },
      },
      skip,
      take: limit,
      orderBy: { followersCount: 'desc' },
    });

    const userIds = users.map((u) => u.id);
    const onlineSet = await this.redis.getOnlineUsers(userIds);

    // isFollowing batch check
    const followingSet = await this.getFollowingSet(requesterId, userIds);

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      bio: u.bio || '',
      avatar: u.avatar || '',
      coverImg: '',
      location: u.location || '',
      website: '',
      birthDate: '',
      followersCount: u.followersCount,
      followingCount: u.followingCount,
      postsCount: u.postsCount,
      isFollowing: followingSet.has(u.id),
      isOnline: onlineSet.has(u.id),
      createdAt: u.createdAt.toISOString(),
    }));

    await this.redis.cacheSearch(cacheKey, result);

    return { success: true, users: result, total: result.length, page };
  }

  // ── Friend Suggestions ────────────────────────
  async getSuggestions(userId: string, limit: number) {
    const myFollowingIds = await this.prisma.follow
      .findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
      .then((r) => r.map((f) => f.followingId));

    if (!myFollowingIds.length) {
      // Fallback: popular users
      return this.getPopularUsers(userId, limit);
    }

    const suggestions = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          { id: { notIn: myFollowingIds } },
          {
            followers: {
              some: {
                followerId: { in: myFollowingIds },
              },
            },
          },
        ],
      },
      take: limit,
      orderBy: { followersCount: 'desc' },
    });

    const userIds = suggestions.map((u) => u.id);
    const onlineSet = await this.redis.getOnlineUsers(userIds);

    const users = suggestions.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      bio: u.bio || '',
      avatar: u.avatar || '',
      coverImg: '',
      location: '',
      website: '',
      birthDate: '',
      followersCount: u.followersCount,
      followingCount: u.followingCount,
      postsCount: u.postsCount,
      isFollowing: false,
      isOnline: onlineSet.has(u.id),
      createdAt: u.createdAt.toISOString(),
    }));

    return { success: true, users, total: users.length, page: 1 };
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    const cached = await this.redis.getFollowerIds(userId);
    if (cached.length > 0) return cached;

    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    const ids = follows.map((f) => f.followerId);

    if (ids.length > 0) {
      await this.redis.cacheFollowerIds(userId, ids);
    }

    return ids;
  }

  async getUsersByIds(userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    const onlineSet = await this.redis.getOnlineUsers(userIds);

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      bio: u.bio || '',
      avatar: u.avatar || '',
      coverImg: '',
      location: '',
      website: '',
      birthDate: '',
      followersCount: u.followersCount,
      followingCount: u.followingCount,
      postsCount: u.postsCount,
      isFollowing: false,
      isOnline: onlineSet.has(u.id),
      createdAt: u.createdAt.toISOString(),
    }));

    return { success: true, users: result, total: result.length, page: 1 };
  }

  // ── Presence ──────────────────────────────────
  async setOnline(userId: string) {
    await this.redis.setOnline(userId);
    return { isOnline: true, lastSeen: Date.now() };
  }

  async setOffline(userId: string) {
    await this.redis.setOffline(userId);
    return { isOnline: false, lastSeen: Date.now() };
  }

  async getOnlineStatus(userId: string) {
    const isOnline = await this.redis.isOnline(userId);
    const lastSeen = await this.redis.getLastSeen(userId);
    return { isOnline, lastSeen };
  }

  // ── Private Helpers ───────────────────────────
  private async checkIsFollowing(
    followerId: string,
    targetId: string,
  ): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId: targetId },
      },
    });
    return !!follow;
  }

  private async getFollowingSet(
    userId: string,
    targetIds: string[],
  ): Promise<Set<string>> {
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: targetIds },
      },
      select: { followingId: true },
    });
    return new Set(follows.map((f) => f.followingId));
  }

  private async getPopularUsers(userId: string, limit: number) {
    const users = await this.prisma.user.findMany({
      where: { id: { not: userId } },
      take: limit,
      orderBy: { followersCount: 'desc' },
    });

    return {
      success: true,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        bio: u.bio || '',
        avatar: u.avatar || '',
        coverImg: '',
        location: '',
        website: '',
        birthDate: '',
        followersCount: u.followersCount,
        followingCount: u.followingCount,
        postsCount: u.postsCount,
        isFollowing: false,
        isOnline: false,
        createdAt: u.createdAt.toISOString(),
      })),
      total: users.length,
      page: 1,
    };
  }

  private buildResponse(profile: any) {
    return { success: true, message: 'Success', user: profile };
  }
}
