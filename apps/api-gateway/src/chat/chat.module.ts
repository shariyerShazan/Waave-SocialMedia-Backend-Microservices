import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatClient } from './chat.client';
import { RateLimiterService } from '../rateLimit/rateLimit.service';

@Module({
  controllers: [ChatController],
  providers: [ChatClient, RateLimiterService],
})
export class ChatModule {}
