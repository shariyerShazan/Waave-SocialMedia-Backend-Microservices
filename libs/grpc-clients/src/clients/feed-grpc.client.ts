/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { FeedServiceClient } from '@app/proto-schema/protos-types/feed';
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
export class FeedGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'feed',
      protoPath: join(process.cwd(), 'libs/proto-schema/src/proto/feed.proto'),
      url: process.env.FEED_SERVICE_GRPC_URL || 'localhost:3004',
    },
  })
  private client!: ClientGrpc;

  private feedService!: FeedServiceClient;

  onModuleInit() {
    this.feedService = this.client.getService<FeedServiceClient>('FeedService');
  }

  private handleError(err: any): never {
    throw new HttpException(
      {
        success: false,
        message: err?.details ?? err?.message ?? 'Something went wrong',
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  async getFeed(userId: string, page = 1, limit = 20, cursor?: string) {
    try {
      return await firstValueFrom(
        this.feedService.getFeed({
          userId,
          page,
          limit,
          cursor: cursor ?? '',
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getExploreFeed(userId: string, page = 1, limit = 20) {
    try {
      return await firstValueFrom(
        this.feedService.getExploreFeed({
          userId,
          page,
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async getTrendingPosts(limit = 20) {
    try {
      return await firstValueFrom(
        this.feedService.getTrendingPosts({
          limit,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }

  async invalidateFeed(userId: string) {
    try {
      return await firstValueFrom(
        this.feedService.invalidateFeed({
          userId,
        }),
      );
    } catch (err) {
      this.handleError(err);
    }
  }
}
