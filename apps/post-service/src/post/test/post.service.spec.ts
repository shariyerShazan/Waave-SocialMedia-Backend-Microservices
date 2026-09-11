import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PostService } from '../post.service';
import { PostPrismaService } from '../../prisma/prisma.service';
import { PostRedisService } from '../../redis/redis.service';
import { KafkaService } from '@app/kafka';
import { PostEnrichmentService } from '../enrichments/enrichment.service';

describe('PostService', () => {
  let service: PostService;
  let prisma: any;
  let redis: any;
  let kafka: any;
  let enrichment: any;

  beforeEach(async () => {
    prisma = {
      writeDb: {
        post: {
          create: jest.fn(),
          update: jest.fn(),
        },
        reaction: {
          create: jest.fn(),
          delete: jest.fn(),
        },
        comment: {
          create: jest.fn(),
          update: jest.fn(),
        },
        share: {
          create: jest.fn(),
        },
        bookmark: {
          create: jest.fn(),
          delete: jest.fn(),
        },
        $transaction: jest.fn().mockImplementation((args) => {
          if (Array.isArray(args)) {
            return Promise.all(args);
          }
          return Promise.resolve();
        }),
      },
      readDb: {
        post: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
        reaction: {
          findUnique: jest.fn(),
        },
        bookmark: {
          findUnique: jest.fn(),
        },
        comment: {
          findMany: jest.fn(),
          count: jest.fn(),
        },
      },
    };

    redis = {
      client: {
        pipeline: jest.fn().mockReturnValue({
          get: jest.fn(),
          exec: jest.fn().mockResolvedValue([[null, '5']]),
        }),
      },
      addToTrending: jest.fn().mockResolvedValue(undefined),
      getCachedPost: jest.fn().mockResolvedValue(null),
      getLikeCount: jest.fn().mockResolvedValue(null),
      incrementView: jest.fn().mockResolvedValue(1),
      userLikedPost: jest.fn().mockResolvedValue(false),
      initLikeCount: jest.fn().mockResolvedValue(undefined),
      cachePost: jest.fn().mockResolvedValue(undefined),
      invalidatePost: jest.fn().mockResolvedValue(undefined),
      incrementLike: jest.fn().mockResolvedValue(1),
      decrementLike: jest.fn().mockResolvedValue(0),
      addUserLike: jest.fn().mockResolvedValue(undefined),
      removeUserLike: jest.fn().mockResolvedValue(undefined),
      getUserLikedSet: jest.fn().mockResolvedValue(new Set()),
      getDirtyPostIds: jest.fn().mockResolvedValue([]),
      clearDirty: jest.fn().mockResolvedValue(undefined),
    };

    kafka = {
      emitWithKey: jest.fn().mockResolvedValue(true),
    };

    enrichment = {
      enrichPost: jest.fn().mockImplementation((post) => Promise.resolve(post)),
      enrichPosts: jest
        .fn()
        .mockImplementation((posts) => Promise.resolve(posts)),
      enrichComments: jest
        .fn()
        .mockImplementation((comments) => Promise.resolve(comments)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: PostPrismaService, useValue: prisma },
        { provide: PostRedisService, useValue: redis },
        { provide: KafkaService, useValue: kafka },
        { provide: PostEnrichmentService, useValue: enrichment },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPost', () => {
    it('should create a post, add to trending, emit kafka event, and return enriched post', async () => {
      const now = new Date();
      prisma.writeDb.post.create.mockResolvedValue({
        id: 'p1',
        userId: 'u1',
        content: 'Test post',
        mediaIds: [],
        feeling: null,
        location: null,
        privacy: 'PUBLIC',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      const res = await service.createPost({
        userId: 'u1',
        content: 'Test post',
      });

      expect(res.success).toBe(true);
      expect(prisma.writeDb.post.create).toHaveBeenCalled();
      expect(redis.addToTrending).toHaveBeenCalledWith('p1', 0);
      expect(kafka.emitWithKey).toHaveBeenCalled();
    });
  });

  describe('getPost', () => {
    it('should return post from cache if available', async () => {
      const cachedPost = {
        id: 'p1',
        content: 'Cached',
        likesCount: 5,
      };
      redis.getCachedPost.mockResolvedValue(cachedPost);
      redis.userLikedPost.mockResolvedValue(true);
      redis.getLikeCount.mockResolvedValue(10);

      const res = await service.getPost('p1', 'u1');

      expect(res.success).toBe(true);
      expect(res.post.isLiked).toBe(true);
      expect(res.post.likesCount).toBe(10);
      expect(prisma.readDb.post.findFirst).not.toHaveBeenCalled();
    });

    it('should throw RpcException if post not found in DB', async () => {
      redis.getCachedPost.mockResolvedValue(null);
      prisma.readDb.post.findFirst.mockResolvedValue(null);

      await expect(service.getPost('p1', 'u1')).rejects.toThrow(RpcException);
    });

    it('should fetch post from DB, check reactions/bookmarks, and cache post', async () => {
      const now = new Date();
      redis.getCachedPost.mockResolvedValue(null);
      prisma.readDb.post.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'u1',
        content: 'DB Post',
        mediaIds: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      prisma.readDb.reaction.findUnique.mockResolvedValue({ id: 'r1' });
      prisma.readDb.bookmark.findUnique.mockResolvedValue(null);

      const res = await service.getPost('p1', 'u1');

      expect(res.success).toBe(true);
      expect(res.post.isLiked).toBe(true);
      expect(res.post.isBookmarked).toBe(false);
      expect(redis.cachePost).toHaveBeenCalled();
    });
  });

  describe('updatePost', () => {
    it('should throw RpcException if post not found or unauthorized', async () => {
      prisma.readDb.post.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePost('p1', 'u1', { content: 'New' }),
      ).rejects.toThrow(RpcException);
    });

    it('should update post and invalidate cache', async () => {
      const now = new Date();
      prisma.readDb.post.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'u1',
      });
      prisma.writeDb.post.update.mockResolvedValue({
        id: 'p1',
        userId: 'u1',
        content: 'Updated',
        mediaIds: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      const res = await service.updatePost('p1', 'u1', { content: 'Updated' });

      expect(res.success).toBe(true);
      expect(redis.invalidatePost).toHaveBeenCalledWith('p1');
    });
  });

  describe('deletePost', () => {
    it('should throw RpcException if post not found or unauthorized', async () => {
      prisma.readDb.post.findFirst.mockResolvedValue(null);

      await expect(service.deletePost('p1', 'u1')).rejects.toThrow(
        RpcException,
      );
    });

    it('should mark post as deleted, invalidate cache, and emit kafka event', async () => {
      prisma.readDb.post.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'u1',
      });

      const res = await service.deletePost('p1', 'u1');

      expect(res.success).toBe(true);
      expect(prisma.writeDb.post.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { isDeleted: true },
      });
      expect(redis.invalidatePost).toHaveBeenCalledWith('p1');
      expect(kafka.emitWithKey).toHaveBeenCalled();
    });
  });

  describe('getUserPosts', () => {
    it('should return paginated user posts with enriched details', async () => {
      const now = new Date();
      prisma.readDb.post.findMany.mockResolvedValue([
        {
          id: 'p1',
          userId: 'u1',
          content: 'P1',
          mediaIds: [],
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      prisma.readDb.post.count.mockResolvedValue(1);

      const res = await service.getUserPosts('u1', 'u2', 1, 10);

      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
      expect(res.posts).toHaveLength(1);
    });
  });

  describe('likePost and unlikePost', () => {
    it('should throw RpcException if already liked', async () => {
      prisma.readDb.reaction.findUnique.mockResolvedValue({ id: 'r1' });

      await expect(service.likePost('p1', 'u1')).rejects.toThrow(RpcException);
    });

    it('should like post successfully', async () => {
      prisma.readDb.reaction.findUnique.mockResolvedValue(null);
      prisma.readDb.post.findUnique.mockResolvedValue({ userId: 'author-1' });

      const res = await service.likePost('p1', 'u1');

      expect(res.success).toBe(true);
      expect(res.isLiked).toBe(true);
      expect(redis.incrementLike).toHaveBeenCalledWith('p1');
      expect(kafka.emitWithKey).toHaveBeenCalled();
    });

    it('should throw RpcException if unlikePost called on unliked post', async () => {
      prisma.readDb.reaction.findUnique.mockResolvedValue(null);

      await expect(service.unlikePost('p1', 'u1')).rejects.toThrow(
        RpcException,
      );
    });

    it('should unlike post successfully', async () => {
      prisma.readDb.reaction.findUnique.mockResolvedValue({ id: 'r1' });

      const res = await service.unlikePost('p1', 'u1');

      expect(res.success).toBe(true);
      expect(res.isLiked).toBe(false);
      expect(redis.decrementLike).toHaveBeenCalledWith('p1');
    });
  });

  describe('addComment and getComments', () => {
    it('should throw RpcException when adding comment to non-existent post', async () => {
      prisma.readDb.post.findFirst.mockResolvedValue(null);

      await expect(
        service.addComment({ postId: 'p1', userId: 'u1', text: 'Hi' }),
      ).rejects.toThrow(RpcException);
    });

    it('should add comment successfully', async () => {
      const now = new Date();
      prisma.readDb.post.findFirst.mockResolvedValue({
        id: 'p1',
        userId: 'u2',
      });
      prisma.writeDb.comment.create.mockResolvedValue({
        id: 'c1',
        postId: 'p1',
        userId: 'u1',
        text: 'Hi',
        parentId: null,
        createdAt: now,
      });

      const res = await service.addComment({
        postId: 'p1',
        userId: 'u1',
        text: 'Hi',
      });

      expect(res.success).toBe(true);
      expect(kafka.emitWithKey).toHaveBeenCalled();
    });

    it('should get comments for a post', async () => {
      const now = new Date();
      prisma.readDb.comment.findMany.mockResolvedValue([
        {
          id: 'c1',
          postId: 'p1',
          userId: 'u1',
          text: 'Comment',
          parentId: null,
          likesCount: 0,
          repliesCount: 0,
          createdAt: now,
        },
      ]);
      prisma.readDb.comment.count.mockResolvedValue(1);

      const res = await service.getComments('p1', null, 1, 10);

      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
      expect(res.comments).toHaveLength(1);
    });
  });

  describe('sharePost', () => {
    it('should throw RpcException if post not found', async () => {
      prisma.writeDb.share.create.mockResolvedValue({ id: 's1' });
      prisma.writeDb.post.update.mockResolvedValue({});
      prisma.readDb.post.findUnique.mockResolvedValue(null);

      await expect(service.sharePost('p1', 'u1')).rejects.toThrow(RpcException);
    });

    it('should share post and emit kafka event', async () => {
      prisma.writeDb.share.create.mockResolvedValue({ id: 's1' });
      prisma.writeDb.post.update.mockResolvedValue({});
      prisma.readDb.post.findUnique.mockResolvedValue({
        userId: 'author-1',
        sharesCount: 1,
      });

      const res = await service.sharePost('p1', 'u1');

      expect(res.success).toBe(true);
      expect(kafka.emitWithKey).toHaveBeenCalled();
    });
  });

  describe('bookmarkPost', () => {
    it('should remove bookmark if existing', async () => {
      prisma.readDb.bookmark.findUnique.mockResolvedValue({ id: 'b1' });

      const res = await service.bookmarkPost('p1', 'u1');

      expect(res.success).toBe(true);
      expect(res.message).toBe('Bookmark removed');
      expect(prisma.writeDb.bookmark.delete).toHaveBeenCalled();
    });

    it('should create bookmark if not existing', async () => {
      prisma.readDb.bookmark.findUnique.mockResolvedValue(null);

      const res = await service.bookmarkPost('p1', 'u1');

      expect(res.success).toBe(true);
      expect(res.message).toBe('Bookmarked');
      expect(prisma.writeDb.bookmark.create).toHaveBeenCalled();
    });
  });

  describe('getPostsByIds and getRecentPostsByAuthors', () => {
    it('should get posts by IDs', async () => {
      const now = new Date();
      prisma.readDb.post.findMany.mockResolvedValue([
        {
          id: 'p1',
          userId: 'u1',
          content: 'P1',
          mediaIds: [],
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const res = await service.getPostsByIds(['p1'], 'u1');

      expect(res.success).toBe(true);
      expect(res.posts).toHaveLength(1);
    });

    it('should return empty list if empty authorIds provided for getRecentPostsByAuthors', async () => {
      const res = await service.getRecentPostsByAuthors([], 'u1', 5);
      expect(res.success).toBe(true);
      expect(res.posts).toEqual([]);
    });

    it('should filter and return recent posts by authors up to limitPerAuthor', async () => {
      const now = new Date();
      prisma.readDb.post.findMany.mockResolvedValue([
        {
          id: 'p1',
          userId: 'a1',
          content: 'A1 P1',
          mediaIds: [],
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'p2',
          userId: 'a1',
          content: 'A1 P2',
          mediaIds: [],
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const res = await service.getRecentPostsByAuthors(['a1'], 'u1', 1);

      expect(res.success).toBe(true);
      expect(res.posts).toHaveLength(1);
    });
  });

  describe('flushCountsToDB', () => {
    it('should flush dirty like counts from redis to db', async () => {
      redis.getDirtyPostIds.mockResolvedValue(['p1']);
      redis.getLikeCount.mockResolvedValue(25);
      prisma.writeDb.post.update.mockResolvedValue({});

      await service.flushCountsToDB();

      expect(redis.clearDirty).toHaveBeenCalledWith('likes');
      expect(prisma.writeDb.post.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { likesCount: 25 },
      });
    });
  });
});
