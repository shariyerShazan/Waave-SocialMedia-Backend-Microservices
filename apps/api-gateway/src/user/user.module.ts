import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserResolver } from './user.resolver';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  controllers: [UserController],
  providers: [UserResolver, RateLimiterService, RateLimitGuard],
  imports: [GrpcClientsModule],
})
export class UserModule {}
