import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostResolver } from './post.resolver';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  controllers: [PostController],
  providers: [PostResolver, RateLimiterService, RateLimitGuard],
  imports: [GrpcClientsModule],
})
export class PostModule {}
