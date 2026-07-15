import { Module } from '@nestjs/common';
import { ChatRedisService } from './redis.service';

@Module({
  providers: [ChatRedisService],
  exports: [ChatRedisService],
})
export class ChatRedisModule {}
