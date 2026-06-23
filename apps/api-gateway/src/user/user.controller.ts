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

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userClient: UserClient) {}

  @Get('profile/:userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getProfile(@Param('userId') userId: string, @Req() req: Express.Request) {
    return this.userClient.getProfile(userId, req?.user?.userId || '');
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  updateProfile(@Req() req: Express.Request, @Body() dto: UpdateProfileDto) {
    return this.userClient.updateProfile(req?.user?.userId, dto);
  }

  @Post(':targetId/follow')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  followUser(@Param('targetId') targetId: string, @Req() req: Express.Request) {
    return this.userClient.followUser(req?.user?.userId, targetId);
  }

  @Post(':targetId/unfollow')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  unfollowUser(
    @Param('targetId') targetId: string,
    @Req() req: Express.Request,
  ) {
    return this.userClient.unfollowUser(req?.user?.userId, targetId);
  }

  @Get(':userId/followers')
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  isFollowing(
    @Param('targetId') targetId: string,
    @Req() req: Express.Request,
  ) {
    return this.userClient.isFollowing(req?.user?.userId, targetId);
  }

  @Get('search/list')
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getSuggestions(@Req() req: Express.Request, @Query('limit') limit?: string) {
    return this.userClient.getSuggestions(
      req?.user?.userId,
      Number(limit || 10),
    );
  }

  @Get(':userId/online-status')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getOnlineStatus(@Param('userId') userId: string) {
    return this.userClient.getOnlineStatus(userId);
  }
}
