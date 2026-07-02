import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateProfileDto } from '@app/common';
import { UserService } from './user.service';

class FollowDto {
  @ApiProperty({ example: 'follower-id' })
  followerId: string;

  @ApiProperty({ example: 'target-id' })
  targetId: string;
}

class PresenceDto {
  @ApiProperty({ example: 'user-id' })
  userId: string;
}

class UsersByIdsDto {
  @ApiProperty({ type: [String], example: ['id1', 'id2'] })
  userIds: string[];
}

class UpdateUserProfileDto extends UpdateProfileDto {
  @ApiProperty({ example: 'user-id' })
  userId: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserHttpController {
  constructor(private readonly userService: UserService) {}

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiParam({ name: 'userId' })
  @ApiQuery({ name: 'requesterId', required: false })
  getProfile(
    @Param('userId') userId: string,
    @Query('requesterId') requesterId?: string,
  ) {
    return this.userService.getProfile(userId, requesterId ?? '');
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@Body() dto: UpdateUserProfileDto) {
    return this.userService.updateProfile(dto.userId, dto);
  }

  @Post('follow')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiBody({ type: FollowDto })
  followUser(@Body() dto: FollowDto) {
    return this.userService.followUser(dto.followerId, dto.targetId);
  }

  @Post('unfollow')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiBody({ type: FollowDto })
  unfollowUser(@Body() dto: FollowDto) {
    return this.userService.unfollowUser(dto.followerId, dto.targetId);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get followers' })
  @ApiQuery({ name: 'userId' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getFollowers(
    @Query('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.userService.getFollowers(userId, Number(page), Number(limit));
  }

  @Get('following')
  @ApiOperation({ summary: 'Get following' })
  @ApiQuery({ name: 'userId' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getFollowing(
    @Query('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.userService.getFollowing(userId, Number(page), Number(limit));
  }

  @Get('is-following')
  @ApiOperation({ summary: 'Check if following' })
  @ApiQuery({ name: 'followerId' })
  @ApiQuery({ name: 'targetId' })
  async isFollowing(
    @Query('followerId') followerId: string,
    @Query('targetId') targetId: string,
  ) {
    const profile = await this.userService.getProfile(targetId, followerId);
    const user = profile?.user as { isFollowing?: boolean } | undefined;
    return { isFollowing: user?.isFollowing ?? false };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'query' })
  @ApiQuery({ name: 'requesterId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  searchUsers(
    @Query('query') query: string,
    @Query('requesterId') requesterId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.userService.searchUsers(
      query,
      requesterId ?? '',
      Number(page),
      Number(limit),
    );
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get user suggestions' })
  @ApiQuery({ name: 'userId' })
  @ApiQuery({ name: 'limit', required: false })
  getSuggestions(
    @Query('userId') userId: string,
    @Query('limit') limit = '10',
  ) {
    return this.userService.getSuggestions(userId, Number(limit));
  }

  @Post('online')
  @ApiOperation({ summary: 'Set user online' })
  @ApiBody({ type: PresenceDto })
  setOnline(@Body() dto: PresenceDto) {
    return this.userService.setOnline(dto.userId);
  }

  @Post('offline')
  @ApiOperation({ summary: 'Set user offline' })
  @ApiBody({ type: PresenceDto })
  setOffline(@Body() dto: PresenceDto) {
    return this.userService.setOffline(dto.userId);
  }

  @Get('online-status')
  @ApiOperation({ summary: 'Get online status' })
  @ApiQuery({ name: 'userId' })
  getOnlineStatus(@Query('userId') userId: string) {
    return this.userService.getOnlineStatus(userId);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Get users by ids' })
  @ApiBody({ type: UsersByIdsDto })
  getUsersByIds(@Body() dto: UsersByIdsDto) {
    return this.userService.getUsersByIds(dto.userIds);
  }

  @Get('follower-ids')
  @ApiOperation({ summary: 'Get follower ids' })
  @ApiQuery({ name: 'userId' })
  getFollowerIds(@Query('userId') userId: string) {
    return this.userService
      .getFollowerIds(userId)
      .then((followerIds) => ({ followerIds }));
  }
}
