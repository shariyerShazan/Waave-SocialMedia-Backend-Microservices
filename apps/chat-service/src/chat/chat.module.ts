import { Module } from '@nestjs/common';
import { ChatHttpController } from './chat.http.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './gateway/chat.gateway';
import { ChatRedisService } from '../redis/redis.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationSchema,
} from '../schemas/conversation.schema';
import { Message, MessageSchema } from '../schemas/message.schema';
import { ChatGrpcController } from './chat.grpc.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Conversation.name,
        schema: ConversationSchema,
      },
      {
        name: Message.name,
        schema: MessageSchema,
      },
    ]),
  ],
  controllers: [ChatHttpController, ChatGateway, ChatGrpcController],
  providers: [ChatService, ChatRedisService],
})
export class ChatModule {}
