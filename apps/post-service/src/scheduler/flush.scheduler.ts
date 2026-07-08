/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostService } from '../post/post.service';

@Injectable()
export class FlushScheduler {
  constructor(private postService: PostService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async flushCounts() {
    await this.postService.flushCountsToDB();
  }
}
