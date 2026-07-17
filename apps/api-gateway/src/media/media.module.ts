import { Module } from '@nestjs/common';
import { MediaClient } from './media.client';
import { MediaController } from './media.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';

@Module({
  providers: [MediaClient, RateLimiterService],
  exports: [MediaClient],
  controllers: [MediaController],
})
export class MediaModule {}
