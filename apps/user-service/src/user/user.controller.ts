/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// user/user.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @GrpcMethod('UserService', 'GetProfile')
  getProfile(data: { userId: string; requesterId: string }) {
    return this.userService.getProfile(data.userId, data.requesterId);
  }

  @GrpcMethod('UserService', 'UpdateProfile')
  updateProfile(data: any) {
    const { userId, ...rest } = data;
    return this.userService.updateProfile(userId, rest);
  }

  @GrpcMethod('UserService', 'FollowUser')
  followUser(data: { followerId: string; targetId: string }) {
    return this.userService.followUser(data.followerId, data.targetId);
  }

  @GrpcMethod('UserService', 'UnfollowUser')
  unfollowUser(data: { followerId: string; targetId: string }) {
    return this.userService.unfollowUser(data.followerId, data.targetId);
  }

  @GrpcMethod('UserService', 'GetFollowers')
  getFollowers(data: { userId: string; page: number; limit: number }) {
    return this.userService.getFollowers(
      data.userId,
      data.page || 1,
      data.limit || 20,
    );
  }

  @GrpcMethod('UserService', 'GetFollowing')
  getFollowing(data: { userId: string; page: number; limit: number }) {
    return this.userService.getFollowing(
      data.userId,
      data.page || 1,
      data.limit || 20,
    );
  }

  @GrpcMethod('UserService', 'IsFollowing')
  isFollowing(data: { followerId: string; targetId: string }) {
    return this.userService['checkIsFollowing'](
      data.followerId,
      data.targetId,
    ).then((r) => ({ isFollowing: r }));
  }

  @GrpcMethod('UserService', 'SearchUsers')
  searchUsers(data: {
    query: string;
    requesterId: string;
    page: number;
    limit: number;
  }) {
    return this.userService.searchUsers(
      data.query,
      data.requesterId,
      data.page || 1,
      data.limit || 20,
    );
  }

  @GrpcMethod('UserService', 'GetSuggestions')
  getSuggestions(data: { userId: string; limit: number }) {
    return this.userService.getSuggestions(data.userId, data.limit || 10);
  }

  @GrpcMethod('UserService', 'SetOnline')
  setOnline(data: { userId: string }) {
    return this.userService.setOnline(data.userId);
  }

  @GrpcMethod('UserService', 'SetOffline')
  setOffline(data: { userId: string }) {
    return this.userService.setOffline(data.userId);
  }

  @GrpcMethod('UserService', 'GetOnlineStatus')
  getOnlineStatus(data: { userId: string }) {
    return this.userService.getOnlineStatus(data.userId);
  }

  @GrpcMethod('UserService', 'GetUsersByIds')
  getUsersByIds(data: { userIds: string[] }) {
    return this.userService.getUsersByIds(data.userIds);
  }

  @GrpcMethod('UserService', 'GetFollowerIds')
  getFollowerIds(data: { userId: string }) {
    return this.userService
      .getFollowerIds(data.userId)
      .then((ids) => ({ followerIds: ids }));
  }
}
