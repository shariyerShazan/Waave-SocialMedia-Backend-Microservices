import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatRedisModule } from './redis/redis.module';

@Module({
  imports: [
    ChatRedisModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.CHAT_MONGO_DB_URL!,
      }),
    }),
  ],
})
export class ChatServiceAppModule {}
