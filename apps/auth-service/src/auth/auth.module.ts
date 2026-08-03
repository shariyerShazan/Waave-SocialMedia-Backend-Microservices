import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGrpcController } from './auth.grpc.controller';
import { AuthHttpController } from './auth.http.controller';
import { AuthRedisModule } from '../redis/redis.module';
import { TokenModule } from '../token/token.module';
import { KAFKA_CLIENT_IDS, KafkaModule } from '@app/kafka';
import { AuthPrismaModule } from '../prisma/prisma.module';
import { SessionService } from './services/session.service';
import { DeviceService } from './services/device.service';
import { MfaService } from './services/mfa.service';

@Module({
  imports: [
    AuthRedisModule,
    TokenModule,
    KafkaModule.register(KAFKA_CLIENT_IDS.AUTH),
    AuthPrismaModule,
  ],
  providers: [AuthService, SessionService, DeviceService, MfaService],
  controllers: [AuthGrpcController, AuthHttpController],
})
export class AuthModule {}
