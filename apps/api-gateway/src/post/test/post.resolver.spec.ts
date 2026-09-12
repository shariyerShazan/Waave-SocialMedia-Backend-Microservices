import { Test, TestingModule } from '@nestjs/testing';
import { PostResolver } from '../post.resolver';
import { PostGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';
import { PostPrivacyGql } from '../dto/post.graphql.types';
import { PostPrivacy } from '@app/proto-schema/protos-types/post';

describe('PostResolver', () => {
  let resolver: PostResolver;
  let postClient: jest.Mocked<PostGrpcClient>;

  beforeEach(async () => {
    const mockPostGrpcClient = {
      createPost: jest.fn(),
      getPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn(),
      getUserPosts: jest.fn(),
      likePost: jest.fn(),
      unlikePost: jest.fn(),
      bookmarkPost: jest.fn(),
      sharePost: jest.fn(),
      addComment: jest.fn(),
      getComments: jest.fn(),
      getPostsByIds: jest.fn(),
      incrementView: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostResolver,
        { provide: PostGrpcClient, useValue: mockPostGrpcClient },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<PostResolver>(PostResolver);
    postClient = module.get(PostGrpcClient);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createPost', () => {
    it('should call postClient.createPost', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = { content: 'hello', privacy: PostPrivacyGql.PUBLIC };
      postClient.createPost.mockResolvedValue({ id: 'p1' } as any);

      const res = await resolver.createPost(ctx, input);
      expect(postClient.createPost).toHaveBeenCalledWith({
        userId: 'u1',
        content: 'hello',
        mediaIds: [],
        feeling: '',
        location: '',
        privacy: PostPrivacy.PUBLIC,
      });
      expect(res).toEqual({ id: 'p1' });
    });
  });

  describe('post / updatePost / deletePost / userPosts', () => {
    it('should call post', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      postClient.getPost.mockResolvedValue({ id: 'p1' } as any);

      const res = await resolver.post('p1', ctx);
      expect(postClient.getPost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ id: 'p1' });
    });

    it('should call updatePost', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      const input = { content: 'updated', privacy: PostPrivacyGql.PRIVATE };
      postClient.updatePost.mockResolvedValue({ success: true } as any);

      const res = await resolver.updatePost('p1', ctx, input);
      expect(postClient.updatePost).toHaveBeenCalledWith('p1', 'u1', {
        content: 'updated',
        privacy: PostPrivacy.PRIVATE,
      });
      expect(res).toEqual({ success: true });
    });

    it('should call deletePost', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      postClient.deletePost.mockResolvedValue({ success: true } as any);

      const res = await resolver.deletePost('p1', ctx);
      expect(postClient.deletePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call userPosts', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      postClient.getUserPosts.mockResolvedValue({ posts: [] } as any);

      const res = await resolver.userPosts('u2', ctx, 1, 20);
      expect(postClient.getUserPosts).toHaveBeenCalledWith('u2', 'u1', 1, 20);
      expect(res).toEqual({ posts: [] });
    });
  });

  describe('likes / bookmark / share / comments / postsByIds / incrementView', () => {
    it('should call likePost & unlikePost & bookmarkPost', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      postClient.likePost.mockResolvedValue({ success: true } as any);
      postClient.unlikePost.mockResolvedValue({ success: true } as any);
      postClient.bookmarkPost.mockResolvedValue({ success: true } as any);

      await resolver.likePost('p1', ctx);
      expect(postClient.likePost).toHaveBeenCalledWith('p1', 'u1');

      await resolver.unlikePost('p1', ctx);
      expect(postClient.unlikePost).toHaveBeenCalledWith('p1', 'u1');

      await resolver.bookmarkPost('p1', ctx);
      expect(postClient.bookmarkPost).toHaveBeenCalledWith('p1', 'u1');
    });

    it('should call sharePost', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      postClient.sharePost.mockResolvedValue({ id: 'p2' } as any);

      const res = await resolver.sharePost('p1', ctx, {
        comment: 'nice',
      });
      expect(postClient.sharePost).toHaveBeenCalledWith('p1', 'u1', 'nice');
      expect(res).toEqual({ id: 'p2' });
    });

    it('should call addComment & comments', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      postClient.addComment.mockResolvedValue({ id: 'c1' } as any);
      postClient.getComments.mockResolvedValue({ comments: [] } as any);

      await resolver.addComment('p1', ctx, {
        text: 'hi',
        parentId: 'p0',
      });
      expect(postClient.addComment).toHaveBeenCalledWith(
        'p1',
        'u1',
        'hi',
        'p0',
      );

      await resolver.comments('p1', undefined, 1, 20);
      expect(postClient.getComments).toHaveBeenCalledWith(
        'p1',
        undefined,
        1,
        20,
      );
    });

    it('should call postsByIds & incrementView', async () => {
      const ctx = { req: { user: { userId: 'u1' } } };
      postClient.getPostsByIds.mockResolvedValue({ posts: [] } as any);
      postClient.incrementView.mockResolvedValue({ success: true } as any);

      await resolver.postsByIds(ctx, ['p1', 'p2']);
      expect(postClient.getPostsByIds).toHaveBeenCalledWith(['p1', 'p2'], 'u1');

      await resolver.incrementView('p1', ctx);
      expect(postClient.incrementView).toHaveBeenCalledWith('p1', 'u1');
    });
  });
});
