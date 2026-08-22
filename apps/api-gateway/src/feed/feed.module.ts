import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedResolver } from './feed.resolver';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  providers: [FeedResolver, RateLimiterService, RateLimitGuard],
  controllers: [FeedController],
  imports: [GrpcClientsModule],
})
export class FeedModule {}
