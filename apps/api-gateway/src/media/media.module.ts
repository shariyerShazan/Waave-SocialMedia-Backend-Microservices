import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { MediaGrpcClient } from '@app/clients';
@Module({
  providers: [MediaGrpcClient, RateLimiterService],
  imports: [MediaGrpcClient],
  controllers: [MediaController],
})
export class MediaModule {}
