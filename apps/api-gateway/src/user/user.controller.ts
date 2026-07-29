import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, UpdateProfileDto } from '@app/common';
import * as Express from 'express';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import {
  RefillOneTimePreKeysDto,
  RegisterDeviceDto,
  RotateSignedPreKeyDto,
  UploadKeysDto,
} from '@app/common/dto/e2ee/e2ee-keys.dto';
import { UserGrpcClient } from 'libs/grpc-clients/src';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userClient: UserGrpcClient) {}

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

  @Post('e2ee/devices')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  registerDevice(@Req() req: Express.Request, @Body() dto: RegisterDeviceDto) {
    return this.userClient.registerDevice({
      userId: req.user.userId,
      ...dto,
    });
  }

  @Get('e2ee/devices')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  listDevices(@Req() req: Express.Request) {
    return this.userClient.listDevices(req.user.userId);
  }

  @Delete('e2ee/devices/:deviceId')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  revokeDevice(
    @Req() req: Express.Request,
    @Param('deviceId') deviceId: string,
  ) {
    return this.userClient.revokeDevice(req.user.userId, deviceId);
  }

  @Post('e2ee/keys')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  uploadKeys(@Req() req: Express.Request, @Body() dto: UploadKeysDto) {
    return this.userClient.uploadKeys({
      userId: req.user.userId,
      deviceId: dto.deviceId,
      identityKey: dto.identityKey,
      signedPreKey: dto.signedPreKey,
      oneTimePreKeys: dto.oneTimePreKeys,
    });
  }

  @Post('e2ee/keys/rotate-signed')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  rotateSignedPreKey(
    @Req() req: Express.Request,
    @Body() dto: RotateSignedPreKeyDto,
  ) {
    return this.userClient.rotateSignedPreKey({
      userId: req.user.userId,
      deviceId: dto.deviceId,
      signedPreKey: dto.signedPreKey,
    });
  }

  @Post('e2ee/keys/refill')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  refillOneTimePreKeys(
    @Req() req: Express.Request,
    @Body() dto: RefillOneTimePreKeysDto,
  ) {
    return this.userClient.refillOneTimePreKeys({
      userId: req.user.userId,
      deviceId: dto.deviceId,
      oneTimePreKeys: dto.oneTimePreKeys,
    });
  }

  @Get('e2ee/keys/bundle/:targetUserId')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  getKeyBundle(
    @Req() req: Express.Request,
    @Param('targetUserId') targetUserId: string,
    @Query('deviceId') deviceId?: string,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.userClient.getKeyBundle(
      targetUserId,
      req.user.userId,
      deviceId || deviceHeader,
    );
  }

  @Get('e2ee/keys/otk-count')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  @ApiBearerAuth()
  countOneTimePreKeys(
    @Req() req: Express.Request,
    @Query('deviceId') deviceId?: string,
    @Headers('x-device-id') deviceHeader?: string,
  ) {
    return this.userClient.countOneTimePreKeys(
      req.user.userId,
      deviceId || deviceHeader || req.user.deviceId || '',
    );
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
