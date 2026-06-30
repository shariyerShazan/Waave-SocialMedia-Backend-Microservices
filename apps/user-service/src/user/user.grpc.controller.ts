// user/user.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserService } from './user.service';
import type {
  FollowRequest,
  GetFollowerIdsRequest,
  GetProfileRequest,
  GetUsersByIdsRequest,
  PaginationRequest,
  PresenceRequest,
  SearchRequest,
  SuggestionRequest,
  UpdateProfileRequest,
} from '@app/proto-schema/protos-types/user';

@Controller()
export class UserGrpcController {
  constructor(private userService: UserService) {}

  @GrpcMethod('UserService', 'GetProfile')
  getProfile(data: GetProfileRequest) {
    return this.userService.getProfile(data.userId, data.requesterId);
  }

  @GrpcMethod('UserService', 'UpdateProfile')
  updateProfile(data: UpdateProfileRequest) {
    const { userId, ...rest } = data;
    return this.userService.updateProfile(userId, rest);
  }

  @GrpcMethod('UserService', 'FollowUser')
  followUser(data: FollowRequest) {
    return this.userService.followUser(data.followerId, data.targetId);
  }

  @GrpcMethod('UserService', 'UnfollowUser')
  unfollowUser(data: FollowRequest) {
    return this.userService.unfollowUser(data.followerId, data.targetId);
  }

  @GrpcMethod('UserService', 'GetFollowers')
  getFollowers(data: PaginationRequest) {
    return this.userService.getFollowers(
      data.userId,
      data.page || 1,
      data.limit || 20,
    );
  }

  @GrpcMethod('UserService', 'GetFollowing')
  getFollowing(data: PaginationRequest) {
    return this.userService.getFollowing(
      data.userId,
      data.page || 1,
      data.limit || 20,
    );
  }

  @GrpcMethod('UserService', 'IsFollowing')
  isFollowing(data: FollowRequest) {
    return this.userService['checkIsFollowing'](
      data.followerId,
      data.targetId,
    ).then((r) => ({ isFollowing: r }));
  }

  @GrpcMethod('UserService', 'SearchUsers')
  searchUsers(data: SearchRequest) {
    return this.userService.searchUsers(
      data.query,
      data.requesterId,
      data.page || 1,
      data.limit || 20,
    );
  }

  @GrpcMethod('UserService', 'GetSuggestions')
  getSuggestions(data: SuggestionRequest) {
    return this.userService.getSuggestions(data.userId, data.limit || 10);
  }

  @GrpcMethod('UserService', 'SetOnline')
  setOnline(data: PresenceRequest) {
    return this.userService.setOnline(data.userId);
  }

  @GrpcMethod('UserService', 'SetOffline')
  setOffline(data: PresenceRequest) {
    return this.userService.setOffline(data.userId);
  }

  @GrpcMethod('UserService', 'GetOnlineStatus')
  getOnlineStatus(data: PresenceRequest) {
    return this.userService.getOnlineStatus(data.userId);
  }

  @GrpcMethod('UserService', 'GetUsersByIds')
  getUsersByIds(data: GetUsersByIdsRequest) {
    return this.userService.getUsersByIds(data.userIds);
  }

  @GrpcMethod('UserService', 'GetFollowerIds')
  getFollowerIds(data: GetFollowerIdsRequest) {
    return this.userService
      .getFollowerIds(data.userId)
      .then((ids) => ({ followerIds: ids }));
  }
}
