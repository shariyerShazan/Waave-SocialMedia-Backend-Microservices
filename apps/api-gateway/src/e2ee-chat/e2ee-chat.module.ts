import { Module } from '@nestjs/common';
import { E2eeChatController } from './e2ee-chat.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { E2eeChatGrpcClient } from '@app/clients/clients/e2ee-chat-grpc.client';

@Module({
  imports: [E2eeChatGrpcClient],
  controllers: [E2eeChatController],
  providers: [E2eeChatGrpcClient, RateLimiterService],
})
export class E2eeChatModule {}
