/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

interface UserGrpcService {
  getProfile(data: any): any;
  updateProfile(data: any): any;

  followUser(data: any): any;
  unfollowUser(data: any): any;

  getFollowers(data: any): any;
  getFollowing(data: any): any;

  isFollowing(data: any): any;

  searchUsers(data: any): any;
  getSuggestions(data: any): any;

  getOnlineStatus(data: any): any;
}

@Injectable()
export class UserClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/user.proto'),
      url: process.env.USER_SERVICE_URL || 'localhost:3002',
    },
  })
  private client: ClientGrpc;

  private userService: UserGrpcService;

  onModuleInit() {
    this.userService = this.client.getService<UserGrpcService>('UserService');
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

  async getFollowers(userId: string, page: number, limit: number) {
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

  async getFollowing(userId: string, page: number, limit: number) {
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

  async searchUsers(
    query: string,
    requesterId: string,
    page: number,
    limit: number,
  ) {
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

  async getSuggestions(userId: string, limit: number) {
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
}
