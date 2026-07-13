import { Module } from '@nestjs/common';
import { FeedClient } from './feed.clinet';
import { FeedController } from './feed.controller';

@Module({
  providers: [FeedClient],
  exports: [FeedClient],
  controllers: [FeedController],
})
export class FeedModule {}
