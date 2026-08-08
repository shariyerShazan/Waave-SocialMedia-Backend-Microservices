/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  PostServiceClient,
  GetPostRequest,
  UpdatePostRequest,
  DeletePostRequest,
  ShareRequest,
  ReactionRequest,
  GetUserPostsRequest,
  AddCommentRequest,
  GetCommentsRequest,
  GetPostsByIdsRequest,
} from '@app/proto-schema/protos-types/post';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PostGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'post',
      protoPath: join(
        process.cwd(),
        'libs/proto-schema/src/proto/post.proto',
      ),
      url: process.env.POST_SERVICE_GRPC_URL || 'localhost:3003',
    },
  })
  private client: ClientGrpc;

  private postService: PostServiceClient;

  onModuleInit() {
    this.postService = this.client.getService<PostServiceClient>('PostService');
  }

  private handleError(err: any): never {
    const message = err?.message ?? err?.details ?? 'Something went wrong';

    throw new HttpException(
      {
        success: false,
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async createPost(data: any) {
    try {
      return await firstValueFrom(this.postService.createPost(data));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getPost(postId: string, requesterId: string) {
    try {
      const payload: GetPostRequest = {
        postId,
        requesterId,
      };

      return await firstValueFrom(this.postService.getPost(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async updatePost(
    postId: string,
    userId: string,
    data: Partial<UpdatePostRequest>,
  ) {
    try {
      const payload: UpdatePostRequest = {
        postId,
        userId,
        content: data.content ?? '',
        privacy: data.privacy!,
      };

      return await firstValueFrom(this.postService.updatePost(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async deletePost(postId: string, userId: string) {
    try {
      const payload: DeletePostRequest = {
        postId,
        userId,
      };

      return await firstValueFrom(this.postService.deletePost(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getUserPosts(
    userId: string,
    requesterId: string,
    page = 1,
    limit = 20,
  ) {
    try {
      const payload: GetUserPostsRequest = {
        userId,
        requesterId,
        page,
        limit,
      };

      return await firstValueFrom(this.postService.getUserPosts(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getPostsByIds(postIds: string[], requesterId: string) {
    try {
      const payload: GetPostsByIdsRequest = {
        postIds,
        requesterId,
      };

      return await firstValueFrom(this.postService.getPostsByIds(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async likePost(postId: string, userId: string) {
    try {
      const payload: ReactionRequest = {
        postId,
        userId,
      };

      return await firstValueFrom(this.postService.likePost(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async unlikePost(postId: string, userId: string) {
    try {
      const payload: ReactionRequest = {
        postId,
        userId,
      };

      return await firstValueFrom(this.postService.unlikePost(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async bookmarkPost(postId: string, userId: string) {
    try {
      const payload: ReactionRequest = {
        postId,
        userId,
      };

      return await firstValueFrom(this.postService.bookmarkPost(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async sharePost(postId: string, userId: string, comment?: string) {
    try {
      const payload: ShareRequest = {
        postId,
        userId,
        comment: comment || '',
      };

      return await firstValueFrom(this.postService.sharePost(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async addComment(
    postId: string,
    userId: string,
    text: string,
    parentId?: string,
  ) {
    try {
      const payload: AddCommentRequest = {
        postId,
        userId,
        text,
        parentId: parentId || '',
      };

      return await firstValueFrom(this.postService.addComment(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getComments(postId: string, parentId?: string, page = 1, limit = 20) {
    try {
      const payload: GetCommentsRequest = {
        postId,
        parentId: parentId || '',
        page,
        limit,
      };

      return await firstValueFrom(this.postService.getComments(payload));
    } catch (err) {
      this.handleError(err);
    }
  }

  async incrementView(postId: string, userId: string) {
    try {
      return await firstValueFrom(
        this.postService.incrViewCount({
          postId,
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getRecentPostsByAuthors(
    authorIds: string[],
    requesterId: string,
    limitPerAuthor: number,
  ) {
    try {
      return await firstValueFrom(
        this.postService.getRecentPostsByAuthors({
          authorIds,
          requesterId,
          limitPerAuthor,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }
}
