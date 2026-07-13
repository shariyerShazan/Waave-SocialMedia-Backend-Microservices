import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import * as Express from 'express';

import { AuthGuard } from '@app/common';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import { FeedClient } from './feed.clinet';

@ApiTags('Feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedClient: FeedClient) {}

  @Get()
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized feed' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for cursor-based pagination',
  })
  getFeed(
    @Req() req: Express.Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.feedClient.getFeed(
      req.user?.userId,
      Number(page || 1),
      Number(limit || 20),
      cursor,
    );
  }

  @Get('explore')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get explore feed' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getExploreFeed(
    @Req() req: Express.Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedClient.getExploreFeed(
      req.user?.userId,
      Number(page || 1),
      Number(limit || 20),
    );
  }

  @Get('trending')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trending posts' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getTrendingPosts(@Query('limit') limit?: string) {
    return this.feedClient.getTrendingPosts(Number(limit || 20));
  }

  @Post('invalidate')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate current user feed cache' })
  invalidateFeed(@Req() req: Express.Request) {
    return this.feedClient.invalidateFeed(req.user?.userId);
  }
}
