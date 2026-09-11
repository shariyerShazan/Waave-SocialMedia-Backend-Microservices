import { Test, TestingModule } from '@nestjs/testing';
import { PostHttpController } from '../post.http.controller';
import { PostService } from '../post.service';

describe('PostHttpController', () => {
  let controller: PostHttpController;
  let postService: jest.Mocked<PostService>;

  beforeEach(async () => {
    const mockPostService = {
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
      flushCountsToDB: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostHttpController],
      providers: [{ provide: PostService, useValue: mockPostService }],
    }).compile();

    controller = module.get<PostHttpController>(PostHttpController);
    postService = module.get(PostService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPost', () => {
    it('should call postService.createPost', async () => {
      const dto = { content: 'hello' };
      postService.createPost.mockResolvedValue({ success: true } as any);

      const res = await controller.createPost('u1', dto);
      expect(postService.createPost).toHaveBeenCalledWith({
        userId: 'u1',
        ...dto,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('getPost', () => {
    it('should call postService.getPost', async () => {
      postService.getPost.mockResolvedValue({ success: true } as any);

      const res = await controller.getPost('p1', 'u1');
      expect(postService.getPost).toHaveBeenCalledWith('p1', 'u1');
      expect(res.success).toBe(true);
    });
  });

  describe('updatePost and deletePost', () => {
    it('should call postService.updatePost', async () => {
      const dto = { content: 'updated' };
      postService.updatePost.mockResolvedValue({ success: true } as any);

      const res = await controller.updatePost('p1', 'u1', dto);
      expect(postService.updatePost).toHaveBeenCalledWith('p1', 'u1', dto);
      expect(res.success).toBe(true);
    });

    it('should call postService.deletePost', async () => {
      postService.deletePost.mockResolvedValue({ success: true } as any);

      const res = await controller.deletePost('p1', 'u1');
      expect(postService.deletePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res.success).toBe(true);
    });
  });

  describe('getUserPosts', () => {
    it('should call postService.getUserPosts with parsed numbers', async () => {
      postService.getUserPosts.mockResolvedValue({ success: true } as any);

      await controller.getUserPosts('u1', 'req1', '2', '15');
      expect(postService.getUserPosts).toHaveBeenCalledWith(
        'u1',
        'req1',
        2,
        15,
      );
    });
  });

  describe('likePost, unlikePost, bookmarkPost', () => {
    it('should call likePost', async () => {
      postService.likePost.mockResolvedValue({ success: true } as any);

      const res = await controller.likePost('p1', 'u1');
      expect(postService.likePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res.success).toBe(true);
    });

    it('should call unlikePost', async () => {
      postService.unlikePost.mockResolvedValue({ success: true } as any);

      const res = await controller.unlikePost('p1', 'u1');
      expect(postService.unlikePost).toHaveBeenCalledWith('p1', 'u1');
      expect(res.success).toBe(true);
    });

    it('should call bookmarkPost', async () => {
      postService.bookmarkPost.mockResolvedValue({ success: true } as any);

      const res = await controller.bookmarkPost('p1', 'u1');
      expect(postService.bookmarkPost).toHaveBeenCalledWith('p1', 'u1');
      expect(res.success).toBe(true);
    });
  });

  describe('sharePost', () => {
    it('should call postService.sharePost', async () => {
      const dto = { comment: 'Check this out' };
      postService.sharePost.mockResolvedValue({ success: true } as any);

      const res = await controller.sharePost('p1', 'u1', dto as any);
      expect(postService.sharePost).toHaveBeenCalledWith(
        'p1',
        'u1',
        'Check this out',
      );
      expect(res.success).toBe(true);
    });
  });

  describe('addComment and getComments', () => {
    it('should call postService.addComment', async () => {
      const dto = { text: 'Great post', parentId: 'c1' };
      postService.addComment.mockResolvedValue({ success: true } as any);

      const res = await controller.addComment('p1', 'u1', dto as any);
      expect(postService.addComment).toHaveBeenCalledWith({
        postId: 'p1',
        userId: 'u1',
        text: 'Great post',
        parentId: 'c1',
      });
      expect(res.success).toBe(true);
    });

    it('should call postService.getComments', async () => {
      postService.getComments.mockResolvedValue({ success: true } as any);

      await controller.getComments('p1', 'c1', '1', '10');
      expect(postService.getComments).toHaveBeenCalledWith('p1', 'c1', 1, 10);
    });
  });

  describe('getPostsByIds and flushCounts', () => {
    it('should call postService.getPostsByIds', async () => {
      postService.getPostsByIds.mockResolvedValue({ success: true } as any);

      const res = await controller.getPostsByIds(
        { postIds: ['p1', 'p2'] },
        'req1',
      );
      expect(postService.getPostsByIds).toHaveBeenCalledWith(
        ['p1', 'p2'],
        'req1',
      );
      expect(res.success).toBe(true);
    });

    it('should call postService.flushCountsToDB', async () => {
      postService.flushCountsToDB.mockResolvedValue(undefined);

      await controller.flushCounts();
      expect(postService.flushCountsToDB).toHaveBeenCalled();
    });
  });
});
