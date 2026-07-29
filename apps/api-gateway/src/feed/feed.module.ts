import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { GrpcClientsModule } from '@app/clients';

@Module({
  providers: [RateLimiterService],
  controllers: [FeedController],
  imports: [GrpcClientsModule],
})
export class FeedModule {}
