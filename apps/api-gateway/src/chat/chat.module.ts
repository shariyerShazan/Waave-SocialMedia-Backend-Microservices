import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { GrpcClientsModule } from '@app/clients';

@Module({
  controllers: [ChatController],
  providers: [RateLimiterService],
  imports: [GrpcClientsModule],
})
export class ChatModule {}
