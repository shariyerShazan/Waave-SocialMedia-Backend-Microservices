import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { join } from 'path';

import { FeedServiceClient } from '@app/proto-schema/protos-types/feed';

@Injectable()
export class FeedClient implements OnModuleInit {
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

  getFeed(userId: string, page = 1, limit = 20, cursor?: string) {
    return firstValueFrom(
      this.feedService.getFeed({
        userId,
        page,
        limit,
        cursor: cursor ?? '',
      }),
    );
  }

  getExploreFeed(userId: string, page = 1, limit = 20) {
    return firstValueFrom(
      this.feedService.getExploreFeed({
        userId,
        page,
        limit,
      }),
    );
  }

  getTrendingPosts(limit = 20) {
    return firstValueFrom(
      this.feedService.getTrendingPosts({
        limit,
      }),
    );
  }

  invalidateFeed(userId: string) {
    return firstValueFrom(
      this.feedService.invalidateFeed({
        userId,
      }),
    );
  }
}
