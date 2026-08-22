import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatResolver } from './chat.resolver';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  controllers: [ChatController],
  providers: [ChatResolver, RateLimiterService, RateLimitGuard],
  imports: [GrpcClientsModule],
})
export class ChatModule {}
