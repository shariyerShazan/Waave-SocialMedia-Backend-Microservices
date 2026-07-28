import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { FeedGrpcClient } from '@app/clients/clients/feed-grpc.client';

@Module({
  providers: [FeedGrpcClient, RateLimiterService],
  controllers: [FeedController],
  imports: [FeedGrpcClient],
})
export class FeedModule {}
