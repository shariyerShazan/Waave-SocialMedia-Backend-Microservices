import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { AuthGrpcClient } from '@app/clients/clients/auth-grpc.client';

@Module({
  imports: [AuthGrpcClient],
  controllers: [AuthController],
  providers: [AuthGrpcClient, RateLimiterService, RateLimitGuard],
})
export class AuthModule {}
