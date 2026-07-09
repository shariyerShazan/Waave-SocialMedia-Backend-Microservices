/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// post/post.service.ts
import { KAFKA_TOPICS, KafkaService } from '@app/kafka';
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PostPrismaService } from '../prisma/prisma.service';
import { PostRedisService } from '../redis/redis.service';
import {
  PostCommentEvent,
  PostCreatedEvent,
  PostDeleteEvent,
  PostLikedEvent,
  PostSharedEvent,
} from '@app/kafka/constants/events.type';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    private prisma: PostPrismaService,
    private redis: PostRedisService,
    private kafka: KafkaService,
  ) {}

  // ── Create Post ───────────────────────────────
  async createPost(data: {
    userId: string;
    content: string;
    mediaIds?: string[];
    feeling?: string;
    location?: string;
    privacy?: string;
  }) {
    const post = await this.prisma.writeDb.post.create({
      data: {
        userId: data.userId,
        content: data.content,
        mediaIds: data.mediaIds || [],
        feeling: data.feeling,
        location: data.location,
        privacy: (data.privacy as any) || 'PUBLIC',
      },
    });

    // Trending score initialize
    await this.redis.addToTrending(post.id, 0);

    // Kafka event — Feed service + Notification service নেবে
    const CreatePostData: PostCreatedEvent = {
      postId: post.id,
      userId: data.userId,
      content: data.content,
      mediaIds: data.mediaIds || [],
      privacy: data.privacy || 'PUBLIC',
    };
    await this.kafka.emitWithKey(
      KAFKA_TOPICS.POST_CREATED,
      data.userId,
      CreatePostData,
    );

    this.logger.log(`✅ Post created: ${post.id}`);

    return {
      success: true,
      message: 'Post created',
      post: this.formatPost(post),
    };
  }

  // ── Get Post ──────────────────────────────────
  async getPost(postId: string, requesterId: string) {
    const cached = await this.redis.getCachedPost(postId);
    if (cached) {
      const isLiked = requesterId
        ? await this.redis.userLikedPost(requesterId, postId)
        : false;

      const cachedLikes = await this.redis.getLikeCount(postId);

      if (requesterId) {
        this.redis.incrementView(postId, requesterId).then((added) => {
          if (added > 0) {
            this.redis.addToTrending(postId, 1);
          }
        });
      }

      return {
        success: true,
        message: 'Success',
        post: {
          ...cached,
          isLiked,
          likesCount: cachedLikes ?? cached.likesCount,
        },
      };
    }

    // DB query
    const post = await this.prisma.readDb.post.findFirst({
      where: { id: postId, isDeleted: false },
    });

    if (!post) {
      throw new RpcException({ code: 5, message: 'Post not found' });
    }

    const isLiked = requesterId
      ? !!(await this.prisma.readDb.reaction.findUnique({
          where: {
            postId_userId: { postId, userId: requesterId },
          },
        }))
      : false;

    // isBookmarked check
    const isBookmarked = requesterId
      ? !!(await this.prisma.readDb.bookmark.findUnique({
          where: {
            postId_userId: { postId, userId: requesterId },
          },
        }))
      : false;

    await this.redis.initLikeCount(postId, post.likesCount);

    const formatted = {
      ...this.formatPost(post),
      isLiked,
      isBookmarked,
    };

    await this.redis.cachePost(postId, formatted);

    if (requesterId) {
      this.redis.incrementView(postId, requesterId).then((added) => {
        if (added > 0) this.redis.addToTrending(postId, 1);
      });
    }

    return { success: true, message: 'Success', post: formatted };
  }

  // ── Update Post ───────────────────────────────
  async updatePost(
    postId: string,
    userId: string,
    data: { content?: string; privacy?: string },
  ) {
    const post = await this.prisma.readDb.post.findFirst({
      where: { id: postId, userId, isDeleted: false },
    });

    if (!post) {
      throw new RpcException({
        code: 5,
        message: 'Post not found or unauthorized',
      });
    }

    const updated = await this.prisma.writeDb.post.update({
      where: { id: postId },
      data: {
        ...(data.content && { content: data.content }),
        ...(data.privacy && { privacy: data.privacy as any }),
      },
    });

    // Cache invalidate
    await this.redis.invalidatePost(postId);

    return {
      success: true,
      message: 'Post updated',
      post: this.formatPost(updated),
    };
  }

  // ── Delete Post ───────────────────────────────
  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.readDb.post.findFirst({
      where: { id: postId, userId, isDeleted: false },
    });

    if (!post) {
      throw new RpcException({
        code: 5,
        message: 'Post not found or unauthorized',
      });
    }

    await this.prisma.writeDb.post.update({
      where: { id: postId },
      data: { isDeleted: true },
    });

    await this.redis.invalidatePost(postId);

    // Kafka event
    const postDeleteData: PostDeleteEvent = {
      postId,
      userId,
    };
    await this.kafka.emitWithKey(
      KAFKA_TOPICS.POST_DELETED,
      postId,
      postDeleteData,
    );

    return { success: true, message: 'Post deleted' };
  }

  // ── Get User Posts ────────────────────────────
  async getUserPosts(
    userId: string,
    requesterId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.readDb.post.findMany({
        where: { userId, isDeleted: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.readDb.post.count({
        where: { userId, isDeleted: false },
      }),
    ]);

    const postIds = posts.map((p) => p.id);

    // Batch isLiked check
    const likedSet = requesterId
      ? await this.redis.getUserLikedSet(requesterId, postIds)
      : new Set<string>();

    // Batch like counts from Redis
    const likeCounts = await this.getBatchLikeCounts(postIds);

    const formatted = posts.map((p) => ({
      ...this.formatPost(p),
      isLiked: likedSet.has(p.id),
      likesCount: likeCounts[p.id] ?? p.likesCount,
    }));

    return { success: true, posts: formatted, total, page };
  }

  // ── Like Post ─────────────────────────────────
  async likePost(postId: string, userId: string) {
    // Already liked?
    const existing = await this.prisma.readDb.reaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      throw new RpcException({ code: 6, message: 'Already liked' });
    }

    // Transaction
    await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.reaction.create({
        data: { postId, userId, reactionType: 'LIKE' },
      }),
      this.prisma.writeDb.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    // Redis write-back
    const newCount = await this.redis.incrementLike(postId);
    await this.redis.addUserLike(userId, postId);
    await this.redis.invalidatePost(postId);

    // Trending score update
    await this.redis.addToTrending(postId, 3);

    // Get post author
    const post = await this.prisma.readDb.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    // Kafka event
    const likedData: PostLikedEvent = {
      postId,
      userId,
      authorId: post!.userId,
    };
    await this.kafka.emitWithKey(KAFKA_TOPICS.POST_LIKED, postId, likedData);

    return {
      success: true,
      message: 'Liked',
      likesCount: newCount,
      isLiked: true,
      reactionType: 'LIKE',
    };
  }

  // ── Unlike Post ───────────────────────────────
  async unlikePost(postId: string, userId: string) {
    const existing = await this.prisma.readDb.reaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (!existing) {
      throw new RpcException({ code: 5, message: 'Not liked yet' });
    }

    await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.reaction.delete({
        where: { postId_userId: { postId, userId } },
      }),
      this.prisma.writeDb.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    const newCount = await this.redis.decrementLike(postId);
    await this.redis.removeUserLike(userId, postId);
    await this.redis.invalidatePost(postId);

    return {
      success: true,
      message: 'Unliked',
      likesCount: newCount,
      isLiked: false,
      reactionType: '',
    };
  }

  // ── Add Comment ───────────────────────────────
  async addComment(data: {
    postId: string;
    userId: string;
    text: string;
    parentId?: string;
  }) {
    const post = await this.prisma.readDb.post.findFirst({
      where: { id: data.postId, isDeleted: false },
    });

    if (!post) {
      throw new RpcException({ code: 5, message: 'Post not found' });
    }

    // Transaction — comment + count update
    const [comment] = await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.comment.create({
        data: {
          postId: data.postId,
          userId: data.userId,
          text: data.text,
          parentId: data.parentId || null,
        },
      }),
      this.prisma.writeDb.post.update({
        where: { id: data.postId },
        data: { commentsCount: { increment: 1 } },
      }),
      ...(data.parentId
        ? [
            this.prisma.writeDb.comment.update({
              where: { id: data.parentId },
              data: { repliesCount: { increment: 1 } },
            }),
          ]
        : []),
    ]);

    await this.redis.invalidatePost(data.postId);

    // Trending boost
    await this.redis.addToTrending(data.postId, 2);

    // Kafka event
    const commentData: PostCommentEvent = {
      postId: data.postId,
      commentId: comment.id,
      userId: data.userId,
      authorId: post.userId,
      text: data.text,
      parentId: data.parentId,
    };
    await this.kafka.emitWithKey(
      KAFKA_TOPICS.POST_COMMENTED,
      data.postId,
      commentData,
    );

    return {
      success: true,
      message: 'Comment added',
      comment: {
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        userName: '',
        userAvatar: '',
        text: comment.text,
        parentId: comment.parentId || '',
        likesCount: 0,
        repliesCount: 0,
        isLiked: false,
        createdAt: comment.createdAt.toISOString(),
      },
    };
  }

  // ── Get Comments ──────────────────────────────
  async getComments(
    postId: string,
    parentId: string | null,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.readDb.comment.findMany({
        where: {
          postId,
          parentId: parentId || null,
          isDeleted: false,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.readDb.comment.count({
        where: {
          postId,
          parentId: parentId || null,
          isDeleted: false,
        },
      }),
    ]);

    const formatted = comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      userId: c.userId,
      userName: '',
      userAvatar: '',
      text: c.text,
      parentId: c.parentId || '',
      likesCount: c.likesCount,
      repliesCount: c.repliesCount,
      isLiked: false,
      createdAt: c.createdAt.toISOString(),
    }));

    return { success: true, comments: formatted, total, page };
  }

  // ── Share Post ────────────────────────────────
  async sharePost(postId: string, userId: string, comment?: string) {
    const [share] = await this.prisma.writeDb.$transaction([
      this.prisma.writeDb.share.create({
        data: { postId, userId, comment },
      }),
      this.prisma.writeDb.post.update({
        where: { id: postId },
        data: { sharesCount: { increment: 1 } },
      }),
    ]);

    await this.redis.addToTrending(postId, 5);
    await this.redis.invalidatePost(postId);

    const sharedData: PostSharedEvent = {
      postId,
      userId,
      shareId: share.id,
    };

    await this.kafka.emitWithKey(KAFKA_TOPICS.POST_SHARED, postId, sharedData);

    const updated = await this.prisma.readDb.post.findUnique({
      where: { id: postId },
      select: { sharesCount: true },
    });

    return {
      success: true,
      message: 'Shared',
      sharesCount: updated?.sharesCount || 0,
    };
  }

  // ── Bookmark ──────────────────────────────────
  async bookmarkPost(postId: string, userId: string) {
    const existing = await this.prisma.readDb.bookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      // Toggle — unbookmark
      await this.prisma.writeDb.bookmark.delete({
        where: { postId_userId: { postId, userId } },
      });
      return {
        success: true,
        message: 'Bookmark removed',
        isLiked: false,
        likesCount: 0,
        reactionType: '',
      };
    }

    await this.prisma.writeDb.bookmark.create({
      data: { postId, userId },
    });

    return {
      success: true,
      message: 'Bookmarked',
      isLiked: true,
      likesCount: 0,
      reactionType: '',
    };
  }

  // ── Internal: Get Posts By IDs ────────────────
  async getPostsByIds(postIds: string[], requesterId: string) {
    const posts = await this.prisma.readDb.post.findMany({
      where: { id: { in: postIds }, isDeleted: false },
    });

    // Sort by original order (feed order)
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const ordered = postIds
      .map((id) => postMap.get(id))
      .filter(Boolean) as any[];

    const likedSet = requesterId
      ? await this.redis.getUserLikedSet(requesterId, postIds)
      : new Set<string>();

    const likeCounts = await this.getBatchLikeCounts(postIds);

    const formatted = ordered.map((p) => ({
      ...this.formatPost(p),
      isLiked: likedSet.has(p.id),
      likesCount: likeCounts[p.id] ?? p.likesCount,
    }));

    return {
      success: true,
      posts: formatted,
      total: formatted.length,
      page: 1,
    };
  }

  async flushCountsToDB() {
    const dirtyLikes = await this.redis.getDirtyPostIds('likes');
    if (dirtyLikes.length > 0) {
      await this.redis.clearDirty('likes');
      for (const postId of dirtyLikes) {
        const count = await this.redis.getLikeCount(postId);
        if (count !== null) {
          await this.prisma.writeDb.post
            .update({
              where: { id: postId },
              data: { likesCount: count },
            })
            .catch((e) => this.logger.error(`Flush likes failed: ${e}`));
        }
      }
      this.logger.log(`Flushed likes for ${dirtyLikes.length} posts`);
    }
  }

  private formatPost(post: any) {
    return {
      id: post.id,
      userId: post.userId,
      userName: '',
      userAvatar: '',
      content: post.content,
      mediaIds: post.mediaIds || [],
      feeling: post.feeling || '',
      location: post.location || '',
      privacy: post.privacy || 'PUBLIC',
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      viewsCount: post.viewsCount,
      isLiked: false,
      isBookmarked: false,
      reactionType: '',
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private async getBatchLikeCounts(
    postIds: string[],
  ): Promise<Record<string, number>> {
    const pipeline = this.redis['client'].pipeline();
    for (const id of postIds) {
      pipeline.get(`post:${id}:likes`);
    }
    const results = await pipeline.exec();
    const counts: Record<string, number> = {};
    results?.forEach(([, val], i) => {
      if (val !== null) counts[postIds[i]] = parseInt(val as string);
    });
    return counts;
  }
}
