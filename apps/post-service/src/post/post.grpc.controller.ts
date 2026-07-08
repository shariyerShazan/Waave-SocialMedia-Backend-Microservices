/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// post/post.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PostService } from './post.service';

@Controller()
export class PostGrpcController {
  constructor(private postService: PostService) {}

  @GrpcMethod('PostService', 'CreatePost')
  createPost(data: any) {
    return this.postService.createPost(data);
  }

  @GrpcMethod('PostService', 'GetPost')
  getPost(data: { postId: string; requesterId: string }) {
    return this.postService.getPost(data.postId, data.requesterId);
  }

  @GrpcMethod('PostService', 'UpdatePost')
  updatePost(data: any) {
    return this.postService.updatePost(data.postId, data.userId, data);
  }

  @GrpcMethod('PostService', 'DeletePost')
  deletePost(data: { postId: string; userId: string }) {
    return this.postService.deletePost(data.postId, data.userId);
  }

  @GrpcMethod('PostService', 'GetUserPosts')
  getUserPosts(data: any) {
    return this.postService.getUserPosts(
      data.userId,
      data.requesterId,
      data.page || 1,
      data.limit || 20,
    );
  }

  @GrpcMethod('PostService', 'LikePost')
  likePost(data: { postId: string; userId: string }) {
    return this.postService.likePost(data.postId, data.userId);
  }

  @GrpcMethod('PostService', 'UnlikePost')
  unlikePost(data: { postId: string; userId: string }) {
    return this.postService.unlikePost(data.postId, data.userId);
  }

  @GrpcMethod('PostService', 'AddComment')
  addComment(data: any) {
    return this.postService.addComment(data);
  }

  @GrpcMethod('PostService', 'GetComments')
  getComments(data: any) {
    return this.postService.getComments(
      data.postId,
      data.parentId || null,
      data.page || 1,
      data.limit || 20,
    );
  }

  @GrpcMethod('PostService', 'SharePost')
  sharePost(data: any) {
    return this.postService.sharePost(data.postId, data.userId, data.comment);
  }

  @GrpcMethod('PostService', 'BookmarkPost')
  bookmarkPost(data: { postId: string; userId: string }) {
    return this.postService.bookmarkPost(data.postId, data.userId);
  }

  @GrpcMethod('PostService', 'GetPostsByIds')
  getPostsByIds(data: { postIds: string[]; requesterId: string }) {
    return this.postService.getPostsByIds(data.postIds, data.requesterId);
  }

  @GrpcMethod('PostService', 'IncrViewCount')
  incrViewCount(data: { postId: string; userId: string }) {
    return this.postService['redis']
      .incrementView(data.postId, data.userId)
      .then((count) => ({ viewsCount: count }));
  }
}
