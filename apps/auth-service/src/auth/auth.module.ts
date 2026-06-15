import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RedisModule } from '../redis/redis.module';
import { TokenModule } from '../token/token.module';
import { KafkaModule } from '@app/kafka';
import { PrismaModule } from '@app/prisma';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    TokenModule,
    KafkaModule.register('auth-service'),
    PrismaModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
