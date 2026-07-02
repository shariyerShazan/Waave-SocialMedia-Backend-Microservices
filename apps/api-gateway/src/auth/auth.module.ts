import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthClient } from './auth.clinet';
import { UserModule } from '../user/user.module';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { RateLimitGuard } from '../rateLimit/guard/rate-limit.guard';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [AuthClient, RateLimiterService, RateLimitGuard],
})
export class AuthModule {}
