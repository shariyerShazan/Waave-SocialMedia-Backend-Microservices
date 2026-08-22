import { Module } from '@nestjs/common';
import { E2eeChatController } from './e2ee-chat.controller';
import { E2eeChatResolver } from './e2ee-chat.resolver';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  imports: [GrpcClientsModule],
  controllers: [E2eeChatController],
  providers: [E2eeChatResolver, RateLimiterService, RateLimitGuard],
})
export class E2eeChatModule {}
