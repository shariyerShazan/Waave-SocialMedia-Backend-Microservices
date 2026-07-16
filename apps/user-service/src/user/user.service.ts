/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// user/user.service.ts
import { KAFKA_TOPICS, KafkaService } from '@app/kafka';
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { UserRedisService } from '../redis/redis.service';
import { UpdateProfileDto } from '@app/common';
import { UserPrismaService } from '../prisma/prisma.service';
import { UserEnrichmentService } from './enrichments/enrichment.service';
import type {
  UserFollowEvent,
  UserUnfollowEvent,
} from '@app/kafka/constants/events.type';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: UserPrismaService,
    private redis: UserRedisService,
    private kafka: KafkaService,
    private enrichment: UserEnrichmentService,
  ) {}

  async createUser(data: { userId: string; email: string; name: string }) {
    await this.prisma.writeDb.profile.upsert({
      where: {
        id: data.userId,
      },
      update: {
        name: data.name,
        email: data.email,
      },
      create: {
        id: data.userId,
        name: data.name,
        email: data.email,
      },
    });
  }

  // ── Get Profile ───────────────────────────────
  async getProfile(userId: string, requesterId: string) {
    const cached = await this.redis.getCachedProfile(userId);
    if (cached) {
      const isFollowing =
        requesterId !== userId
          ? await this.checkIsFollowing(requesterId, userId)
          : false;
      const isOnline = await this.redis.isOnline(userId);
      const [hydrated] = await this.enrichment.enrichProfilesWithMedia([
        { ...cached, isFollowing, isOnline },
      ]);
      return this.buildResponse(hydrated);
    }

    const user = await this.prisma.readDb.profile.findUnique({
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

    const profile = this.createProfilePayload(user, {
      isFollowing,
      isOnline,
    });

    await this.redis.cacheProfile(userId, {
      ...profile,
      isFollowing: false,
    });

    const [hydratedProfile] = await this.enrichment.enrichProfilesWithMedia([profile]);
    return this.buildResponse(hydratedProfile);
  }

  // ── Update Profile ────────────────────────────
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.prisma.writeDb.profile.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarMediaId !== undefined && {
          avatarMediaId: data.avatarMediaId || null,
        }),
        ...(data.coverMediaId !== undefined && {
          coverMediaId: data.coverMediaId || null,
        }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.birthDate !== undefined && {
          birthDate: new Date(data.birthDate),
        }),
      },
    });

    await this.redis.invalidateProfile(userId);

    await this.kafka.emit(KAFKA_TOPICS.USER_PROFILE_UPDATED, {
      userId: user.id,
      name: user.name,
      avatarMediaId: user.avatarMediaId,
      coverMediaId: user.coverMediaId,
    });

    const [hydratedProfile] = await this.enrichment.enrichProfilesWithMedia([
      this.createProfilePayload(user, { isFollowing: false, isOnline: false }),
    ]);

    return this.buildResponse(hydratedProfile);
  }

  // ── Follow ────────────────────────────────────
  async followUser(followerId: string, targetId: string) {
    if (followerId === targetId) {
      throw new RpcException({
        code: 3,
        message: 'Cannot follow yourself',
      });
    }

    const existing = await this.prisma.readDb.follow.findUnique({
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

    const [, target] = await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.follow.create({
        data: { followerId, followingId: targetId },
      }),
      this.prisma.writeDb.profile.update({
        where: { id: targetId },
        data: { followersCount: { increment: 1 } },
      }),
      this.prisma.writeDb.profile.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
    ]);

    await this.redis.addFollower(targetId, followerId);
    await this.redis.invalidateProfile(targetId);
    await this.redis.invalidateProfile(followerId);

    const follower = await this.prisma.readDb.profile.findUnique({
      where: { id: followerId },
      select: { name: true },
    });
    if (!follower) {
      throw new RpcException({
        code: 5,
        message: 'Follower not found',
      });
    }

    const followEvent: UserFollowEvent = {
      followerId,
      targetId,
      followerName: follower?.name,
    };
    await this.kafka.emit(KAFKA_TOPICS.USER_PROFILE_FOLLOWED, followEvent);

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
    const existing = await this.prisma.readDb.follow.findUnique({
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

    const [, target] = await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId: targetId,
          },
        },
      }),
      this.prisma.writeDb.profile.update({
        where: { id: targetId },
        data: { followersCount: { decrement: 1 } },
      }),
      this.prisma.writeDb.profile.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      }),
    ]);

    await this.redis.removeFollower(targetId, followerId);
    await this.redis.invalidateProfile(targetId);
    await this.redis.invalidateProfile(followerId);

    const follower = await this.prisma.readDb.profile.findUnique({
      where: { id: followerId },
      select: { name: true },
    });
    if (!follower) {
      throw new RpcException({
        code: 5,
        message: 'Follower not found',
      });
    }

    const followEvent: UserUnfollowEvent = {
      followerId,
      targetId,
      followerName: follower.name,
    };

    await this.kafka.emit(KAFKA_TOPICS.USER_PROFILE_UNFOLLOWED, followEvent);

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
      this.prisma.readDb.follow.findMany({
        where: { followingId: userId },
        include: { follower: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.readDb.follow.count({
        where: { followingId: userId },
      }),
    ]);

    const userIds = follows.map((f) => f.followerId);
    const onlineSet = await this.redis.getOnlineUsers(userIds);

    const profiles = follows.map((f) =>
      this.createProfilePayload(f.follower, {
        isFollowing: false,
        isOnline: onlineSet.has(f.follower.id),
      }),
    );

    const users = await this.enrichment.enrichProfilesWithMedia(profiles);

    return { success: true, users, total, page };
  }

  // ── Get Following ─────────────────────────────
  async getFollowing(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.prisma.readDb.follow.findMany({
        where: { followerId: userId },
        include: { following: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.readDb.follow.count({
        where: { followerId: userId },
      }),
    ]);

    const userIds = follows.map((f) => f.followingId);
    const onlineSet = await this.redis.getOnlineUsers(userIds);

    const profiles = follows.map((f) =>
      this.createProfilePayload(f.following, {
        isFollowing: true,
        isOnline: onlineSet.has(f.following.id),
      }),
    );

    const users = await this.enrichment.enrichProfilesWithMedia(profiles);

    return { success: true, users, total, page };
  }

  // ── Search Users ──────────────────────────────
  async searchUsers(
    query: string,
    requesterId: string,
    page: number,
    limit: number,
  ) {
    const cacheKey = `${query}:${page}`;
    const cached = await this.redis.getCachedSearch(cacheKey);
    if (cached) {
      return { success: true, users: cached, total: cached.length, page };
    }

    const skip = (page - 1) * limit;

    const users = await this.prisma.readDb.profile.findMany({
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

    const followingSet = await this.getFollowingSet(requesterId, userIds);

    const profiles = users.map((u) =>
      this.createProfilePayload(u, {
        isFollowing: followingSet.has(u.id),
        isOnline: onlineSet.has(u.id),
      }),
    );

    const result = await this.enrichment.enrichProfilesWithMedia(profiles);

    await this.redis.cacheSearch(cacheKey, result);

    return { success: true, users: result, total: result.length, page };
  }

  // ── Friend Suggestions ────────────────────────
  async getSuggestions(userId: string, limit: number) {
    const myFollowingIds = await this.prisma.readDb.follow
      .findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
      .then((r) => r.map((f) => f.followingId));

    if (!myFollowingIds.length) {
      return this.getPopularUsers(userId, limit);
    }

    const suggestions = await this.prisma.readDb.profile.findMany({
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

    const profiles = suggestions.map((u) =>
      this.createProfilePayload(u, {
        isFollowing: false,
        isOnline: onlineSet.has(u.id),
      }),
    );

    const users = await this.enrichment.enrichProfilesWithMedia(profiles);

    return { success: true, users, total: users.length, page: 1 };
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    const cached = await this.redis.getFollowerIds(userId);
    if (cached.length > 0) return cached;

    const follows = await this.prisma.readDb.follow.findMany({
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
    const users = await this.prisma.readDb.profile.findMany({
      where: { id: { in: userIds } },
    });

    const onlineSet = await this.redis.getOnlineUsers(userIds);

    const profiles = users.map((u) =>
      this.createProfilePayload(u, {
        isFollowing: false,
        isOnline: onlineSet.has(u.id),
      }),
    );

    const result = await this.enrichment.enrichProfilesWithMedia(profiles);

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
    const follow = await this.prisma.readDb.follow.findUnique({
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
    const follows = await this.prisma.readDb.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: targetIds },
      },
      select: { followingId: true },
    });
    return new Set(follows.map((f) => f.followingId));
  }

  private async getPopularUsers(userId: string, limit: number) {
    const users = await this.prisma.readDb.profile.findMany({
      where: { id: { not: userId } },
      take: limit,
      orderBy: { followersCount: 'desc' },
    });

    const profiles = users.map((u) =>
      this.createProfilePayload(u, {
        isFollowing: false,
        isOnline: false,
      }),
    );

    const hydratedUsers = await this.enrichment.enrichProfilesWithMedia(profiles);

    return {
      success: true,
      users: hydratedUsers,
      total: users.length,
      page: 1,
    };
  }

  private createProfilePayload(user: any, overrides: Record<string, any> = {}) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: null,
      coverImg: null,
      avatarMediaId: user.avatarMediaId || null,
      coverMediaId: user.coverMediaId || null,
      location: user.location || '',
      website: user.website || '',
      birthDate: user.birthDate,
      followersCount: user.followersCount ?? 0,
      followingCount: user.followingCount ?? 0,
      postsCount: user.postsCount ?? 0,
      isFollowing: false,
      isOnline: false,
      createdAt: user.createdAt,
      ...overrides,
    };
  }



  private buildResponse(profile: any) {
    return { success: true, message: 'Success', user: profile };
  }
}
