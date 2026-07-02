import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGrpcController } from './auth.grpc.controller';
import { AuthHttpController } from './auth.http.controller';
import { AuthRedisModule } from '../redis/redis.module';
import { TokenModule } from '../token/token.module';
import { KafkaModule } from '@app/kafka';
import { AuthPrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    AuthRedisModule,
    TokenModule,
    KafkaModule.register('auth-service'),
    AuthPrismaModule,
  ],
  providers: [AuthService],
  controllers: [AuthGrpcController, AuthHttpController],
})
export class AuthModule {}
