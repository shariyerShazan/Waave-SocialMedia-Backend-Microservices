/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
import { EnrichmentService } from '../shared/enrichment.service';

@Injectable()
export class UserClient implements OnModuleInit {
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

  constructor(private readonly enrichment: EnrichmentService) {}

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
      const response = await firstValueFrom(
        this.userService.getProfile({
          userId,
          requesterId,
        }),
      );
      if (response?.user) {
        const [enriched] = await this.enrichment.enrichProfilesWithMedia([
          response.user,
        ]);
        return { ...response, user: enriched };
      }
      return response;
    } catch (err) {
      this.handleError(err);
    }
  }

  async updateProfile(userId: string, data: any) {
    try {
      const response = await firstValueFrom(
        this.userService.updateProfile({
          userId,
          ...data,
        }),
      );

      if (response?.user) {
        const [enriched] = await this.enrichment.enrichProfilesWithMedia([
          response.user,
        ]);
        return { ...response, user: enriched };
      }

      return response;
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
      const response = await firstValueFrom(
        this.userService.getFollowers({
          userId,
          page,
          limit,
        }),
      );

      if (response?.users?.length > 0) {
        const enriched = await this.enrichment.enrichProfilesWithMedia(
          response.users,
        );
        return { ...response, users: enriched };
      }

      return response;
    } catch (err) {
      this.handleError(err);
    }
  }

  async getFollowing(userId: string, page: number, limit: number) {
    try {
      const response = await firstValueFrom(
        this.userService.getFollowing({
          userId,
          page,
          limit,
        }),
      );

      if (response?.users?.length > 0) {
        const enriched = await this.enrichment.enrichProfilesWithMedia(
          response.users,
        );
        return { ...response, users: enriched };
      }

      return response;
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
      const response = await firstValueFrom(
        this.userService.searchUsers({
          query,
          requesterId,
          page,
          limit,
        }),
      );

      if (response?.users?.length > 0) {
        const enriched = await this.enrichment.enrichProfilesWithMedia(
          response.users,
        );
        return { ...response, users: enriched };
      }

      return response;
    } catch (err) {
      this.handleError(err);
    }
  }

  async getSuggestions(userId: string, limit: number) {
    try {
      const response = await firstValueFrom(
        this.userService.getSuggestions({
          userId,
          limit,
        }),
      );

      if (response?.users?.length > 0) {
        const enriched = await this.enrichment.enrichProfilesWithMedia(
          response.users,
        );
        return { ...response, users: enriched };
      }

      return response;
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
