/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@app/common';
import { MediaGrpcClient } from 'libs/grpc-clients/src';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import {
  CreateMediaInput,
  GenericMediaActionResult,
  MediaExistsResponse,
  MediaListResponse,
  SingleMediaResponse,
  UpdateMediaStatusInput,
} from './dto/media.graphql.types';

@Resolver()
export class MediaResolver {
  constructor(private readonly mediaClient: MediaGrpcClient) {}

  @Mutation(() => SingleMediaResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  createMedia(@Context() ctx: any, @Args('input') input: CreateMediaInput) {
    return this.mediaClient.createMedia({
      ...input,
      userId: ctx.req.user.userId,
    });
  }

  @Query(() => SingleMediaResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  media(@Args('mediaId') mediaId: string) {
    return this.mediaClient.getMedia(mediaId);
  }

  @Query(() => MediaListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  mediaBatch(@Args('mediaIds', { type: () => [String] }) mediaIds: string[]) {
    return this.mediaClient.getMediaByIds(mediaIds);
  }

  @Query(() => MediaListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  userMedia(
    @Context() ctx: any,
    @Args('type', { nullable: true, defaultValue: 'all' }) type?: string,
    @Args('page', { nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit?: number,
  ) {
    return this.mediaClient.listUserMedia(
      ctx.req.user.userId,
      type || 'all',
      page || 1,
      limit || 20,
    );
  }

  @Mutation(() => GenericMediaActionResult)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  deleteMedia(@Context() ctx: any, @Args('mediaId') mediaId: string) {
    return this.mediaClient.deleteMedia(mediaId, ctx.req.user.userId);
  }

  @Mutation(() => SingleMediaResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  updateMediaStatus(
    @Args('mediaId') mediaId: string,
    @Args('input') input: UpdateMediaStatusInput,
  ) {
    return this.mediaClient.updateMediaStatus({
      mediaId,
      status: input.status,
    });
  }

  @Query(() => MediaExistsResponse)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP })
  mediaExists(@Args('mediaId') mediaId: string) {
    return this.mediaClient.exists(mediaId);
  }

  @Query(() => SingleMediaResponse)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP })
  mediaByPath(@Args('path') path: string) {
    return this.mediaClient.getMediaByPath(path);
  }
}
