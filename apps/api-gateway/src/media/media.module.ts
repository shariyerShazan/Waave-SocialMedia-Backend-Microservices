import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaResolver } from './media.resolver';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  providers: [MediaResolver, RateLimiterService, RateLimitGuard],
  imports: [GrpcClientsModule],
  controllers: [MediaController],
})
export class MediaModule {}
