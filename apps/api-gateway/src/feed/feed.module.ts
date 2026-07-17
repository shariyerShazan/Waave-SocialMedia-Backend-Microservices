import { Module } from '@nestjs/common';
import { FeedClient } from './feed.clinet';
import { FeedController } from './feed.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';

@Module({
  providers: [FeedClient, RateLimiterService],
  exports: [FeedClient],
  controllers: [FeedController],
})
export class FeedModule {}
