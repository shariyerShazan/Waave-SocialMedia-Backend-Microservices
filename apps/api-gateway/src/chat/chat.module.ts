import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatClient } from './chat.client';

@Module({
  controllers: [ChatController],
  providers: [ChatClient],
})
export class ChatModule {}
