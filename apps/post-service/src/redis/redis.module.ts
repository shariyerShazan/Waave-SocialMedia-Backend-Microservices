import { Module } from '@nestjs/common';
import { PostRedisService } from './redis.service';

@Module({
  providers: [PostRedisService],
  exports: [PostRedisService],
})
export class PostRedisModule {}
