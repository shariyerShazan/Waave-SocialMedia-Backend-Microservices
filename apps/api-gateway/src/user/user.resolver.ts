/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@app/common';
import { UserGrpcClient } from 'libs/grpc-clients/src';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import {
  RateLimit,
  RateLimitKeyType,
} from '../rateLimit/decorator/rate-limit.decorator';
import {
  FollowListResponse,
  GenericUserResponse,
  IsFollowingResponse,
  KeyBundleResponse,
  ListDevicesResponse,
  OnlineStatusResponse,
  OtkCountResponse,
  RefillOneTimePreKeysInput,
  RegisterDeviceInput,
  RotateSignedPreKeyInput,
  UpdateProfileInput,
  UploadKeysInput,
} from './dto/user.graphql.types';

@Resolver()
export class UserResolver {
  constructor(private readonly userClient: UserGrpcClient) {}

  @Query(() => GenericUserResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  profile(@Args('userId') userId: string, @Context() ctx: any) {
    return this.userClient.getProfile(userId, ctx?.req?.user?.userId || '');
  }

  @Mutation(() => GenericUserResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(20, 60, { key: RateLimitKeyType.IP_USER_ID })
  updateProfile(@Context() ctx: any, @Args('input') input: UpdateProfileInput) {
    return this.userClient.updateProfile(ctx?.req?.user?.userId, input);
  }

  @Mutation(() => GenericUserResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  registerDevice(
    @Context() ctx: any,
    @Args('input') input: RegisterDeviceInput,
  ) {
    return this.userClient.registerDevice({
      userId: ctx.req.user.userId,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      platform: input.platform,
      osVersion: input.osVersion,
      appVersion: input.appVersion,
    });
  }

  @Query(() => ListDevicesResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  listDevices(@Context() ctx: any) {
    return this.userClient.listDevices(ctx.req.user.userId);
  }

  @Mutation(() => GenericUserResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  revokeDevice(@Context() ctx: any, @Args('deviceId') deviceId: string) {
    return this.userClient.revokeDevice(ctx.req.user.userId, deviceId);
  }

  @Mutation(() => GenericUserResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  uploadKeys(@Context() ctx: any, @Args('input') input: UploadKeysInput) {
    return this.userClient.uploadKeys({
      userId: ctx.req.user.userId,
      deviceId: input.deviceId,
      identityKey: input.identityKey,
      signedPreKey: input.signedPreKey,
      oneTimePreKeys: input.oneTimePreKeys,
    });
  }

  @Mutation(() => GenericUserResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  rotateSignedPreKey(
    @Context() ctx: any,
    @Args('input') input: RotateSignedPreKeyInput,
  ) {
    return this.userClient.rotateSignedPreKey({
      userId: ctx.req.user.userId,
      deviceId: input.deviceId,
      signedPreKey: input.signedPreKey,
    });
  }

  @Mutation(() => GenericUserResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60, { key: RateLimitKeyType.IP_USER_ID })
  refillOneTimePreKeys(
    @Context() ctx: any,
    @Args('input') input: RefillOneTimePreKeysInput,
  ) {
    return this.userClient.refillOneTimePreKeys({
      userId: ctx.req.user.userId,
      deviceId: input.deviceId,
      oneTimePreKeys: input.oneTimePreKeys,
    });
  }

  @Query(() => KeyBundleResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  keyBundle(
    @Context() ctx: any,
    @Args('targetUserId') targetUserId: string,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ) {
    return this.userClient.getKeyBundle(
      targetUserId,
      ctx.req.user.userId,
      deviceId,
    );
  }

  @Query(() => OtkCountResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(30, 60, { key: RateLimitKeyType.IP_USER_ID })
  oneTimePreKeysCount(
    @Context() ctx: any,
    @Args('deviceId', { nullable: true }) deviceId?: string,
  ) {
    return this.userClient.countOneTimePreKeys(
      ctx.req.user.userId,
      deviceId || ctx.req.user.deviceId || '',
    );
  }

  @Mutation(() => GenericUserResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  followUser(@Args('targetId') targetId: string, @Context() ctx: any) {
    return this.userClient.followUser(ctx?.req?.user?.userId, targetId);
  }

  @Mutation(() => GenericUserResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  unfollowUser(@Args('targetId') targetId: string, @Context() ctx: any) {
    return this.userClient.unfollowUser(ctx?.req?.user?.userId, targetId);
  }

  @Query(() => FollowListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  followers(
    @Args('userId') userId: string,
    @Args('page', { nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.userClient.getFollowers(userId, page, limit);
  }

  @Query(() => FollowListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  following(
    @Args('userId') userId: string,
    @Args('page', { nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.userClient.getFollowing(userId, page, limit);
  }

  @Query(() => IsFollowingResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  isFollowing(@Args('targetId') targetId: string, @Context() ctx: any) {
    return this.userClient.isFollowing(ctx?.req?.user?.userId, targetId);
  }

  @Query(() => FollowListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  searchUsers(
    @Context() ctx: any,
    @Args('q') query: string,
    @Args('page', { nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.userClient.searchUsers(
      query,
      ctx?.req?.user?.userId,
      page,
      limit,
    );
  }

  @Query(() => FollowListResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  userSuggestions(
    @Context() ctx: any,
    @Args('limit', { nullable: true, defaultValue: 10 }) limit: number,
  ) {
    return this.userClient.getSuggestions(ctx?.req?.user?.userId, limit);
  }

  @Query(() => OnlineStatusResponse)
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(60, 60, { key: RateLimitKeyType.IP_USER_ID })
  onlineStatus(@Args('userId') userId: string) {
    return this.userClient.getOnlineStatus(userId);
  }
}
