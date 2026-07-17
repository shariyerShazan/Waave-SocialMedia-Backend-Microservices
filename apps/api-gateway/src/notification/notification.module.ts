import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationClient } from './notification.client';
import { RateLimiterService } from '../rateLimit/rateLimit.service';

@Module({
  controllers: [NotificationController],
  exports: [NotificationClient],
  providers: [NotificationClient, RateLimiterService],
})
export class NotificationModule {}
