import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { GrpcClientsModule } from '@app/clients';

@Module({
  controllers: [PostController],
  providers: [RateLimiterService],
  imports: [GrpcClientsModule],
})
export class PostModule {}
