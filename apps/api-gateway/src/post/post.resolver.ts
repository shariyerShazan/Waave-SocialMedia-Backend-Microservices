import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@app/common';
import { PostGrpcClient } from 'libs/grpc-clients/src';
import { PostPrivacy } from '@app/proto-schema/protos-types/post';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import {
  AddCommentInput,
  CommentListResponse,
  CommentResponse,
  CreatePostInput,
  GenericPostActionResult,
  PostListResponse,
  PostPrivacyGql,
  PostResponse,
  SharePostInput,
  UpdatePostInput,
} from './dto/post.graphql.types';

const privacyMap: Record<PostPrivacyGql, PostPrivacy> = {
  [PostPrivacyGql.PUBLIC]: PostPrivacy.PUBLIC,
  [PostPrivacyGql.FRIENDS]: PostPrivacy.FRIENDS,
  [PostPrivacyGql.PRIVATE]: PostPrivacy.PRIVATE,
};

@Resolver()
export class PostResolver {
  constructor(private readonly postClient: PostGrpcClient) {}

  @Mutation(() => PostResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  createPost(@Context() ctx: any, @Args('input') input: CreatePostInput) {
    return this.postClient.createPost({
      userId: ctx.req.user.userId,
      content: input.content,
      mediaIds: input.mediaIds ?? [],
      feeling: input.feeling ?? '',
      location: input.location ?? '',
      privacy: input.privacy ? privacyMap[input.privacy] : PostPrivacy.PUBLIC,
    });
  }

  @Query(() => PostResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  post(@Args('postId') postId: string, @Context() ctx: any) {
    return this.postClient.getPost(postId, ctx.req.user.userId);
  }

  @Mutation(() => PostResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  updatePost(
    @Args('postId') postId: string,
    @Context() ctx: any,
    @Args('input') input: UpdatePostInput,
  ) {
    return this.postClient.updatePost(postId, ctx.req.user.userId, {
      content: input.content,
      privacy: input.privacy ? privacyMap[input.privacy] : undefined,
    });
  }

  @Mutation(() => GenericPostActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  deletePost(@Args('postId') postId: string, @Context() ctx: any) {
    return this.postClient.deletePost(postId, ctx.req.user.userId);
  }

  @Query(() => PostListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  userPosts(
    @Args('userId') userId: string,
    @Context() ctx: any,
    @Args('page', { nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.postClient.getUserPosts(
      userId,
      ctx.req.user.userId,
      page,
      limit,
    );
  }

  @Mutation(() => GenericPostActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(100, 60, { key: RateLimitKeyType.IP_USER_ID })
  likePost(@Args('postId') postId: string, @Context() ctx: any) {
    return this.postClient.likePost(postId, ctx.req.user.userId);
  }

  @Mutation(() => GenericPostActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(100, 60, { key: RateLimitKeyType.IP_USER_ID })
  unlikePost(@Args('postId') postId: string, @Context() ctx: any) {
    return this.postClient.unlikePost(postId, ctx.req.user.userId);
  }

  @Mutation(() => GenericPostActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(100, 60, { key: RateLimitKeyType.IP_USER_ID })
  bookmarkPost(@Args('postId') postId: string, @Context() ctx: any) {
    return this.postClient.bookmarkPost(postId, ctx.req.user.userId);
  }

  @Mutation(() => PostResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  sharePost(
    @Args('postId') postId: string,
    @Context() ctx: any,
    @Args('input', { nullable: true }) input?: SharePostInput,
  ) {
    return this.postClient.sharePost(
      postId,
      ctx.req.user.userId,
      input?.comment,
    );
  }

  @Mutation(() => CommentResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  addComment(
    @Args('postId') postId: string,
    @Context() ctx: any,
    @Args('input') input: AddCommentInput,
  ) {
    return this.postClient.addComment(
      postId,
      ctx.req.user.userId,
      input.text,
      input.parentId,
    );
  }

  @Query(() => CommentListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(100, 60, { key: RateLimitKeyType.IP_USER_ID })
  comments(
    @Args('postId') postId: string,
    @Args('parentId', { nullable: true }) parentId?: string,
    @Args('page', { nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit?: number,
  ) {
    return this.postClient.getComments(
      postId,
      parentId,
      page || 1,
      limit || 20,
    );
  }

  @Query(() => PostListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  postsByIds(
    @Context() ctx: any,
    @Args('postIds', { type: () => [String] }) postIds: string[],
  ) {
    return this.postClient.getPostsByIds(postIds, ctx.req.user.userId);
  }

  @Mutation(() => GenericPostActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(200, 60, { key: RateLimitKeyType.IP_USER_ID })
  incrementView(@Args('postId') postId: string, @Context() ctx: any) {
    return this.postClient.incrementView(postId, ctx.req.user.userId);
  }
}
