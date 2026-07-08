import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, UpdateProfileDto } from '@app/common';

import { UserClient } from './user.client';
import * as Express from 'express';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userClient: UserClient) {}

  @Get('profile/:userId')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getProfile(@Param('userId') userId: string, @Req() req: Express.Request) {
    return this.userClient.getProfile(userId, req?.user?.userId || '');
  }

  @Patch('profile')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  updateProfile(@Req() req: Express.Request, @Body() dto: UpdateProfileDto) {
    return this.userClient.updateProfile(req?.user?.userId, dto);
  }

  @Post(':targetId/follow')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  followUser(@Param('targetId') targetId: string, @Req() req: Express.Request) {
    return this.userClient.followUser(req?.user?.userId, targetId);
  }

  @Post(':targetId/unfollow')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  unfollowUser(
    @Param('targetId') targetId: string,
    @Req() req: Express.Request,
  ) {
    return this.userClient.unfollowUser(req?.user?.userId, targetId);
  }

  @Get(':userId/followers')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getFollowers(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userClient.getFollowers(
      userId,
      Number(page || 1),
      Number(limit || 20),
    );
  }

  @Get(':userId/following')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getFollowing(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userClient.getFollowing(
      userId,
      Number(page || 1),
      Number(limit || 20),
    );
  }

  @Get(':targetId/is-following')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  isFollowing(
    @Param('targetId') targetId: string,
    @Req() req: Express.Request,
  ) {
    return this.userClient.isFollowing(req?.user?.userId, targetId);
  }

  @Get('search/list')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  searchUsers(
    @Req() req: Express.Request,
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userClient.searchUsers(
      query,
      req?.user?.userId,
      Number(page || 1),
      Number(limit || 20),
    );
  }

  @Get('suggestions/list')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getSuggestions(@Req() req: Express.Request, @Query('limit') limit?: string) {
    return this.userClient.getSuggestions(
      req?.user?.userId,
      Number(limit || 10),
    );
  }

  @Get(':userId/online-status')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getOnlineStatus(@Param('userId') userId: string) {
    return this.userClient.getOnlineStatus(userId);
  }
}
