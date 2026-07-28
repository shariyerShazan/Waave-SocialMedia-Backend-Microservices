import { Module } from '@nestjs/common';
import { E2eeChatController } from './e2ee-chat.controller';
import { E2eeChatClient } from './e2ee-chat.client';
import { RateLimiterService } from '../rateLimit/rateLimit.service';

@Module({
  controllers: [E2eeChatController],
  providers: [E2eeChatClient, RateLimiterService],
})
export class E2eeChatModule {}
