/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { UserServiceClient } from '@app/proto-schema/protos-types/user';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/user.proto'),
      url: process.env.USER_SERVICE_GRPC_URL || 'localhost:3002',
    },
  })
  private client: ClientGrpc;

  private userService: UserServiceClient;

  onModuleInit() {
    this.userService = this.client.getService<UserServiceClient>('UserService');
  }

  private handleError(err: any): never {
    const message = err?.message ?? err?.details ?? 'Something went wrong';

    throw new HttpException(
      {
        success: false,
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async getProfile(userId: string, requesterId: string) {
    try {
      return await firstValueFrom(
        this.userService.getProfile({
          userId,
          requesterId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async updateProfile(userId: string, data: any) {
    try {
      return await firstValueFrom(
        this.userService.updateProfile({
          userId,
          ...data,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async followUser(followerId: string, targetId: string) {
    try {
      return await firstValueFrom(
        this.userService.followUser({
          followerId,
          targetId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async unfollowUser(followerId: string, targetId: string) {
    try {
      return await firstValueFrom(
        this.userService.unfollowUser({
          followerId,
          targetId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getFollowers(userId: string, page = 1, limit = 20) {
    try {
      return await firstValueFrom(
        this.userService.getFollowers({
          userId,
          page,
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getFollowing(userId: string, page = 1, limit = 20) {
    try {
      return await firstValueFrom(
        this.userService.getFollowing({
          userId,
          page,
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async isFollowing(followerId: string, targetId: string) {
    try {
      return await firstValueFrom(
        this.userService.isFollowing({
          followerId,
          targetId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async searchUsers(query: string, requesterId: string, page = 1, limit = 20) {
    try {
      return await firstValueFrom(
        this.userService.searchUsers({
          query,
          requesterId,
          page,
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getSuggestions(userId: string, limit = 10) {
    try {
      return await firstValueFrom(
        this.userService.getSuggestions({
          userId,
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getOnlineStatus(userId: string) {
    try {
      return await firstValueFrom(
        this.userService.getOnlineStatus({
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    try {
      const result = await firstValueFrom(
        this.userService.getFollowerIds({ userId }),
      );
      return result?.followerIds || [];
    } catch (err) {
      this.handleError(err);
    }
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    try {
      const result = await firstValueFrom(
        this.userService.getFollowing({
          userId,
          page: 1,
          limit: 5000,
        }),
      );
      return result?.users?.map((u: any) => u.id) || [];
    } catch (err) {
      this.handleError(err);
    }
  }

  async getUsersByIds(userIds: string[]) {
    try {
      return await firstValueFrom(this.userService.getUsersByIds({ userIds }));
    } catch (err) {
      this.handleError(err);
    }
  }

  async registerDevice(data: {
    userId: string;
    deviceId: string;
    deviceName: string;
    platform: string;
    osVersion?: string;
    appVersion?: string;
  }) {
    try {
      return await firstValueFrom(
        this.userService.registerDevice({
          userId: data.userId,
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          platform: data.platform,
          osVersion: data.osVersion,
          appVersion: data.appVersion,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async listDevices(userId: string) {
    try {
      return await firstValueFrom(
        this.userService.listDevices({
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async revokeDevice(userId: string, deviceId: string) {
    try {
      return await firstValueFrom(
        this.userService.revokeDevice({
          userId,
          deviceId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async uploadKeys(data: {
    userId: string;
    deviceId: string;
    identityKey: { publicKey: string; registrationId: number };
    signedPreKey: { keyId: number; publicKey: string; signature: string };
    oneTimePreKeys: { keyId: number; publicKey: string }[];
  }) {
    try {
      return await firstValueFrom(
        this.userService.uploadKeys({
          userId: data.userId,
          deviceId: data.deviceId,
          identityKey: data.identityKey,
          signedPreKey: data.signedPreKey,
          oneTimePreKeys: data.oneTimePreKeys,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async rotateSignedPreKey(data: {
    userId: string;
    deviceId: string;
    signedPreKey: { keyId: number; publicKey: string; signature: string };
  }) {
    try {
      return await firstValueFrom(
        this.userService.rotateSignedPreKey({
          userId: data.userId,
          deviceId: data.deviceId,
          signedPreKey: data.signedPreKey,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async refillOneTimePreKeys(data: {
    userId: string;
    deviceId: string;
    oneTimePreKeys: { keyId: number; publicKey: string }[];
  }) {
    try {
      return await firstValueFrom(
        this.userService.refillOneTimePreKeys({
          userId: data.userId,
          deviceId: data.deviceId,
          oneTimePreKeys: data.oneTimePreKeys,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getKeyBundle(
    targetUserId: string,
    requesterId: string,
    deviceId?: string,
  ) {
    try {
      return await firstValueFrom(
        this.userService.getKeyBundle({
          targetUserId,
          requesterId,
          deviceId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getKeyBundlesForUsers(userIds: string[], requesterId: string) {
    try {
      return await firstValueFrom(
        this.userService.getKeyBundlesForUsers({
          userIds,
          requesterId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async countOneTimePreKeys(userId: string, deviceId: string) {
    try {
      return await firstValueFrom(
        this.userService.countOneTimePreKeys({
          userId,
          deviceId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }
}
