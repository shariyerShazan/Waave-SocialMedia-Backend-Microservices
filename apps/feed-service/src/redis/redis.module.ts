import { Module } from '@nestjs/common';
import { FeedRedisService } from './redis.service';

@Module({
  providers: [FeedRedisService],
  exports: [FeedRedisService],
})
export class FeedRedisModule {}
