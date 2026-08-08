import { Module } from '@nestjs/common';
import { NotificationRedisService } from './redis.service';

@Module({
  providers: [NotificationRedisService],
  exports: [NotificationRedisService],
})
export class NotificationRedisModule {}
