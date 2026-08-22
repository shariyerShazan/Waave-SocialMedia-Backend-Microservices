import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthResolver } from './auth.resolver';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  imports: [GrpcClientsModule],
  controllers: [AuthController],
  providers: [AuthResolver, RateLimiterService, RateLimitGuard],
})
export class AuthModule {}
