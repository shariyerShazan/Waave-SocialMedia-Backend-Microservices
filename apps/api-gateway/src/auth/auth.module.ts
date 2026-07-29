import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';
import { GrpcClientsModule } from '@app/clients';

@Module({
  imports: [GrpcClientsModule],
  controllers: [AuthController],
  providers: [RateLimiterService, RateLimitGuard],
})
export class AuthModule {}
