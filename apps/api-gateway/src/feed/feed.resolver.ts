/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */ import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@app/common';
import { FeedGrpcClient } from 'libs/grpc-clients/src';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import { FeedResponse, InvalidateFeedResponse } from './dto/feed.graphql.types';

@Resolver()
export class FeedResolver {
  constructor(private readonly feedClient: FeedGrpcClient) {}

  @Query(() => FeedResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  feed(
    @Context() ctx: any,
    @Args('page', { nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit?: number,
    @Args('cursor', { nullable: true }) cursor?: string,
  ) {
    return this.feedClient.getFeed(
      ctx.req.user?.userId,
      page || 1,
      limit || 20,
      cursor,
    );
  }

  @Query(() => FeedResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  exploreFeed(
    @Context() ctx: any,
    @Args('page', { nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit?: number,
  ) {
    return this.feedClient.getExploreFeed(
      ctx.req.user?.userId,
      page || 1,
      limit || 20,
    );
  }

  @Query(() => FeedResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  trendingPosts(
    @Args('limit', { nullable: true, defaultValue: 20 }) limit?: number,
  ) {
    return this.feedClient.getTrendingPosts(limit || 20);
  }

  @Mutation(() => InvalidateFeedResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  invalidateFeed(@Context() ctx: any) {
    return this.feedClient.invalidateFeed(ctx.req.user?.userId);
  }
}
