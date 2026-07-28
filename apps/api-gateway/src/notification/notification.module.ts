import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { NotificationGrpcClient } from '@app/clients/clients/notification-grpc.client';

@Module({
  controllers: [NotificationController],
  imports: [NotificationGrpcClient],
  providers: [NotificationGrpcClient, RateLimiterService],
})
export class NotificationModule {}
