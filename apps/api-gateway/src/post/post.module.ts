import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { PostGrpcClient } from '@app/clients';

@Module({
  controllers: [PostController],
  providers: [PostGrpcClient, RateLimiterService],
  imports: [PostGrpcClient],
})
export class PostModule {}
