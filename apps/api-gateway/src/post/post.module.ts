import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { PostClient } from './post.clinet';
import { PostController } from './post.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';

@Module({
  imports: [MediaModule],
  controllers: [PostController],
  providers: [PostClient, RateLimiterService],
  exports: [PostClient],
})
export class PostModule {}
