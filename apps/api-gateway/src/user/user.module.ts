import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { RateLimiterService } from '../rateLimit/rateLimit.service';
import { UserGrpcClient } from '@app/clients';

@Module({
  controllers: [UserController],
  providers: [UserGrpcClient, RateLimiterService],
  imports: [UserGrpcClient],
})
export class UserModule {}
