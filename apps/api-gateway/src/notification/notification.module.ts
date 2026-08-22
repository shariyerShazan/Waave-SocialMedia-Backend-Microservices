import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationResolver } from './notification.resolver';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  controllers: [NotificationController],
  providers: [NotificationResolver, RateLimiterService, RateLimitGuard],
  imports: [GrpcClientsModule],
})
export class NotificationModule {}
