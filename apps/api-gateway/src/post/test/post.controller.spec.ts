import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from '../post.controller';
import { PostGrpcClient } from 'libs/grpc-clients/src';
import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../../rateLimit/guard/rate-limit.guard';
import { PostPrivacy } from '@app/proto-schema/protos-types/post';

describe('PostController', () => {
  let controller: PostController;
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
      controllers: [PostController],
      providers: [{ provide: PostGrpcClient, useValue: mockPostGrpcClient }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PostController>(PostController);
    postClient = module.get(PostGrpcClient);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPost', () => {
    it('should call postClient.createPost', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = {
        content: 'hello world',
        mediaIds: ['m1'],
        feeling: 'happy',
        location: 'NYC',
        privacy: 'PUBLIC' as const,
      };
      postClient.createPost.mockResolvedValue({ id: 'p1' } as any);

      const res = await controller.createPost(req, dto);
      expect(postClient.createPost).toHaveBeenCalledWith({
        userId: 'u1',
        content: 'hello world',
        mediaIds: ['m1'],
        feeling: 'happy',
        location: 'NYC',
        privacy: PostPrivacy.PUBLIC,
      });
      expect(res).toEqual({ id: 'p1' });
    });
  });

  describe('getPost / updatePost / deletePost', () => {
    it('should call getPost', async () => {
      const req = { user: { userId: 'u1' } } as any;
      postClient.getPost.mockResolvedValue({ id: 'p1' } as any);

      const res = await controller.getPost('p1', req);
      expect(postClient.getPost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ id: 'p1' });
    });

    it('should call updatePost', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { content: 'updated', privacy: 'FRIENDS' as const };
      postClient.updatePost.mockResolvedValue({ success: true } as any);

      const res = await controller.updatePost('p1', req, dto);
      expect(postClient.updatePost).toHaveBeenCalledWith('p1', 'u1', {
        content: 'updated',
        privacy: PostPrivacy.FRIENDS,
      });
      expect(res).toEqual({ success: true });
    });

    it('should call deletePost', async () => {
      const req = { user: { userId: 'u1' } } as any;
      postClient.deletePost.mockResolvedValue({ success: true } as any);

      const res = await controller.deletePost('p1', req);
      expect(postClient.deletePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });
  });

  describe('getUserPosts', () => {
    it('should call postClient.getUserPosts', async () => {
      const req = { user: { userId: 'u1' } } as any;
      postClient.getUserPosts.mockResolvedValue({ posts: [] } as any);

      const res = await controller.getUserPosts('u2', req, '2', '10');
      expect(postClient.getUserPosts).toHaveBeenCalledWith('u2', 'u1', 2, 10);
      expect(res).toEqual({ posts: [] });
    });
  });

  describe('likePost / unlikePost / bookmarkPost / sharePost', () => {
    it('should call likePost', async () => {
      const req = { user: { userId: 'u1' } } as any;
      postClient.likePost.mockResolvedValue({ success: true } as any);

      const res = await controller.likePost('p1', req);
      expect(postClient.likePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call unlikePost', async () => {
      const req = { user: { userId: 'u1' } } as any;
      postClient.unlikePost.mockResolvedValue({ success: true } as any);

      const res = await controller.unlikePost('p1', req);
      expect(postClient.unlikePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call bookmarkPost', async () => {
      const req = { user: { userId: 'u1' } } as any;
      postClient.bookmarkPost.mockResolvedValue({ success: true } as any);

      const res = await controller.bookmarkPost('p1', req);
      expect(postClient.bookmarkPost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call sharePost', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { comment: 'cool' };
      postClient.sharePost.mockResolvedValue({ id: 'p2' } as any);

      const res = await controller.sharePost('p1', req, dto as any);
      expect(postClient.sharePost).toHaveBeenCalledWith('p1', 'u1', 'cool');
      expect(res).toEqual({ id: 'p2' });
    });
  });

  describe('comments and batch/view', () => {
    it('should call addComment', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { text: 'nice', parentId: 'c0' };
      postClient.addComment.mockResolvedValue({ id: 'c1' } as any);

      const res = await controller.addComment('p1', req, dto as any);
      expect(postClient.addComment).toHaveBeenCalledWith(
        'p1',
        'u1',
        'nice',
        'c0',
      );
      expect(res).toEqual({ id: 'c1' });
    });

    it('should call getComments', async () => {
      postClient.getComments.mockResolvedValue({ comments: [] } as any);

      const res = await controller.getComments('p1', 'c0', '1', '20');
      expect(postClient.getComments).toHaveBeenCalledWith('p1', 'c0', 1, 20);
      expect(res).toEqual({ comments: [] });
    });

    it('should call getPostsByIds', async () => {
      const req = { user: { userId: 'u1' } } as any;
      const dto = { postIds: ['p1', 'p2'] };
      postClient.getPostsByIds.mockResolvedValue({ posts: [] } as any);

      const res = await controller.getPostsByIds(req, dto);
      expect(postClient.getPostsByIds).toHaveBeenCalledWith(['p1', 'p2'], 'u1');
      expect(res).toEqual({ posts: [] });
    });

    it('should call incrementView', async () => {
      const req = { user: { userId: 'u1' } } as any;
      postClient.incrementView.mockResolvedValue({ success: true } as any);

      const res = await controller.incrementView('p1', req);
      expect(postClient.incrementView).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });
  });
});
