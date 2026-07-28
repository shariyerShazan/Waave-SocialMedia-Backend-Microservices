import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { ChatGrpcClient } from '@app/clients/clients/chat-grpc.client';

@Module({
  controllers: [ChatController],
  providers: [ChatGrpcClient, RateLimiterService],
  imports: [ChatGrpcClient],
})
export class ChatModule {}
