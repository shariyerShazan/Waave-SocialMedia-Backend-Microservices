import { Module } from '@nestjs/common';
import { E2eeChatController } from './e2ee-chat.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { GrpcClientsModule } from '@app/clients';

@Module({
  imports: [GrpcClientsModule],
  controllers: [E2eeChatController],
  providers: [RateLimiterService],
})
export class E2eeChatModule {}
