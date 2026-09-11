import { Test, TestingModule } from '@nestjs/testing';
import { PostGrpcController } from '../post.grpc.controller';
import { PostService } from '../post.service';

describe('PostGrpcController', () => {
  let controller: PostGrpcController;
  let postService: any;

  beforeEach(async () => {
    postService = {
      createPost: jest.fn(),
      getPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn(),
      getUserPosts: jest.fn(),
      likePost: jest.fn(),
      unlikePost: jest.fn(),
      addComment: jest.fn(),
      getComments: jest.fn(),
      sharePost: jest.fn(),
      bookmarkPost: jest.fn(),
      getPostsByIds: jest.fn(),
      getRecentPostsByAuthors: jest.fn(),
      redis: {
        incrementView: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostGrpcController],
      providers: [{ provide: PostService, useValue: postService }],
    }).compile();

    controller = module.get<PostGrpcController>(PostGrpcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPost and getPost', () => {
    it('should call postService.createPost', async () => {
      postService.createPost.mockResolvedValue({ success: true });
      const data = { userId: 'u1', content: 'hello' };

      const res = await controller.createPost(data);
      expect(postService.createPost).toHaveBeenCalledWith(data);
      expect(res).toEqual({ success: true });
    });

    it('should call postService.getPost', async () => {
      postService.getPost.mockResolvedValue({ success: true });

      const res = await controller.getPost({
        postId: 'p1',
        requesterId: 'u1',
      });
      expect(postService.getPost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });
  });

  describe('updatePost and deletePost', () => {
    it('should call postService.updatePost', async () => {
      postService.updatePost.mockResolvedValue({ success: true });
      const data = { postId: 'p1', userId: 'u1', content: 'Updated' };

      const res = await controller.updatePost(data);
      expect(postService.updatePost).toHaveBeenCalledWith('p1', 'u1', data);
      expect(res).toEqual({ success: true });
    });

    it('should call postService.deletePost', async () => {
      postService.deletePost.mockResolvedValue({ success: true });

      const res = await controller.deletePost({ postId: 'p1', userId: 'u1' });
      expect(postService.deletePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });
  });

  describe('getUserPosts', () => {
    it('should call postService.getUserPosts with defaults', async () => {
      postService.getUserPosts.mockResolvedValue({ success: true });

      const res = await controller.getUserPosts({
        userId: 'u1',
        requesterId: 'req1',
      });
      expect(postService.getUserPosts).toHaveBeenCalledWith(
        'u1',
        'req1',
        1,
        20,
      );
      expect(res).toEqual({ success: true });
    });
  });

  describe('likePost, unlikePost, bookmarkPost, sharePost', () => {
    it('should call likePost', async () => {
      postService.likePost.mockResolvedValue({ success: true });

      const res = await controller.likePost({ postId: 'p1', userId: 'u1' });
      expect(postService.likePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call unlikePost', async () => {
      postService.unlikePost.mockResolvedValue({ success: true });

      const res = await controller.unlikePost({ postId: 'p1', userId: 'u1' });
      expect(postService.unlikePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call bookmarkPost', async () => {
      postService.bookmarkPost.mockResolvedValue({ success: true });

      const res = await controller.bookmarkPost({
        postId: 'p1',
        userId: 'u1',
      });
      expect(postService.bookmarkPost).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call sharePost', async () => {
      postService.sharePost.mockResolvedValue({ success: true });
      const data = { postId: 'p1', userId: 'u1', comment: 'nice' };

      const res = await controller.sharePost(data);
      expect(postService.sharePost).toHaveBeenCalledWith('p1', 'u1', 'nice');
      expect(res).toEqual({ success: true });
    });
  });

  describe('comments', () => {
    it('should call addComment', async () => {
      postService.addComment.mockResolvedValue({ success: true });
      const data = { postId: 'p1', userId: 'u1', text: 'hi' };

      const res = await controller.addComment(data);
      expect(postService.addComment).toHaveBeenCalledWith(data);
      expect(res).toEqual({ success: true });
    });

    it('should call getComments with defaults', async () => {
      postService.getComments.mockResolvedValue({ success: true });

      const res = await controller.getComments({ postId: 'p1' });
      expect(postService.getComments).toHaveBeenCalledWith('p1', null, 1, 20);
      expect(res).toEqual({ success: true });
    });
  });

  describe('getPostsByIds, getRecentPostsByAuthors, incrViewCount', () => {
    it('should call getPostsByIds', async () => {
      postService.getPostsByIds.mockResolvedValue({ success: true });

      const res = await controller.getPostsByIds({
        postIds: ['p1'],
        requesterId: 'u1',
      });
      expect(postService.getPostsByIds).toHaveBeenCalledWith(['p1'], 'u1');
      expect(res).toEqual({ success: true });
    });

    it('should call getRecentPostsByAuthors', async () => {
      postService.getRecentPostsByAuthors.mockResolvedValue({ success: true });
      const data = {
        authorIds: ['a1'],
        requesterId: 'u1',
        limitPerAuthor: 3,
      };

      const res = await controller.getRecentPostsByAuthors(data);
      expect(postService.getRecentPostsByAuthors).toHaveBeenCalledWith(
        ['a1'],
        'u1',
        3,
      );
      expect(res).toEqual({ success: true });
    });

    it('should call redis.incrementView in incrViewCount', async () => {
      postService.redis.incrementView.mockResolvedValue(5);

      const res = await controller.incrViewCount({
        postId: 'p1',
        userId: 'u1',
      });
      expect(postService.redis.incrementView).toHaveBeenCalledWith('p1', 'u1');
      expect(res).toEqual({ viewsCount: 5 });
    });
  });
});
