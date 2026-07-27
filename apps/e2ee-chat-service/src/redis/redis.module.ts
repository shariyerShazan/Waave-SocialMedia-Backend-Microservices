import { Module } from '@nestjs/common';
import { E2eeChatRedisService } from './redis.service';

@Module({
  providers: [E2eeChatRedisService],
  exports: [E2eeChatRedisService],
})
export class E2eeChatRedisModule {}
