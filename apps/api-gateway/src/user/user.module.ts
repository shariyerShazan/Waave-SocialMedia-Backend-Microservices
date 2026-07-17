import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserClient } from './user.client';
import { MediaModule } from '../media/media.module';
import { RateLimiterService } from '../rateLimit/rateLimit.service';

@Module({
  imports: [MediaModule],
  controllers: [UserController],
  providers: [UserClient, RateLimiterService],
  exports: [UserClient],
})
export class UserModule {}
